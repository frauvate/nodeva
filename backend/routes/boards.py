from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from database import boards_collection
from models import Board, BoardCreate, Node, Edge
from auth import get_current_user
from services.ai import generate_workflow_from_prompt
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/boards", tags=["Boards"])

def serialize_doc(doc):
    if not doc:
        return None
    doc["id"] = str(doc.get("_id") or doc.get("id") or "")
    if "_id" in doc:
        del doc["_id"]
    return doc

@router.get("/", response_model=List[Board])
def get_boards(user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    boards = list(boards_collection.find({"user_id": user_id}))
    return [serialize_doc(b) for b in boards]

@router.post("/", response_model=Board)
def create_board(board_in: BoardCreate, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    new_board = {
        "user_id": user_id,
        "title": board_in.title,
        "nodes": [],
        "edges": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = boards_collection.insert_one(new_board)
    new_board["_id"] = result.inserted_id
    return serialize_doc(new_board)

@router.get("/{board_id}", response_model=Board)
def get_board(board_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    board = boards_collection.find_one({"_id": ObjectId(board_id), "user_id": user_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return serialize_doc(board)

@router.put("/{board_id}")
def update_board(board_id: str, board_update: dict = Body(...), user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    # Only allow updating nodes, edges, or title for now
    update_data = {}
    if "nodes" in board_update:
        update_data["nodes"] = board_update["nodes"]
    if "edges" in board_update:
        update_data["edges"] = board_update["edges"]
    if "title" in board_update:
        update_data["title"] = board_update["title"]
        
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid update fields.")

    update_data["updated_at"] = datetime.utcnow()    

    result = boards_collection.update_one(
        {"_id": ObjectId(board_id), "user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Board not found")
    return {"status": "success"}

@router.delete("/{board_id}")
def delete_board(board_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    result = boards_collection.delete_one({"_id": ObjectId(board_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Board not found")
    return {"status": "deleted"}

@router.post("/{board_id}/generate_ai")
def generate_ai_workflow(board_id: str, prompt: str = Body(..., embed=True), user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    board = boards_collection.find_one({"_id": ObjectId(board_id), "user_id": user_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
        
    ai_nodes = generate_workflow_from_prompt(prompt)
    if not ai_nodes:
         raise HTTPException(status_code=500, detail="Failed to generate AI workflow.")
         
    # Merge or replace depending on logic. Here we just replace or append. Let's append unique to avoid id collision.
    # To keep simple, we can replace the layout. User should use empty boards for fresh prompts
    result = boards_collection.update_one(
        {"_id": ObjectId(board_id), "user_id": user_id},
        {"$set": {"nodes": ai_nodes, "edges": [], "updated_at": datetime.utcnow()}}
    )
    
    return {"status": "success", "nodes": ai_nodes}
