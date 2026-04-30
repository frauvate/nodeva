from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from database import boards_collection, teams_collection
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

def get_user_team_ids(user_id: str, user_email: str) -> list:
    all_teams = teams_collection.find()
    return [
        t.get("id") for t in all_teams
        if t.get("owner_id") == user_id or user_email in (t.get("members") or [])
    ]

def check_board_access(board: dict, user_id: str, user_email: str) -> bool:
    if not board:
        return False
    if board.get("user_id") == user_id:
        return True
    team_id = board.get("team_id")
    if team_id:
        team = teams_collection.find_one({"id": team_id})
        if team and (team.get("owner_id") == user_id or user_email in (team.get("members") or [])):
            return True
    return False

@router.get("/", response_model=List[Board])
def get_boards(user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    user_email = user.get("email")
    
    my_team_ids = get_user_team_ids(user_id, user_email)
    query = {"$or": [{"user_id": user_id}]}
    if my_team_ids:
        query["$or"].append({"team_id": {"$in": my_team_ids}})
        
    boards = list(boards_collection.find(query))
    return [serialize_doc(b) for b in boards]

@router.post("/", response_model=Board)
def create_board(board_in: BoardCreate, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    
    if board_in.team_id:
        team = teams_collection.find_one({"id": board_in.team_id})
        if not team:
            raise HTTPException(status_code=404, detail="Ekip bulunamadı")
        if team.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Yalnızca ekip sahibi yeni pano oluşturabilir")
            
    new_board = {
        "user_id": user_id,
        "team_id": board_in.team_id,
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
    user_email = user.get("email")
    
    board = boards_collection.find_one({"_id": ObjectId(board_id)})
    if not board or not check_board_access(board, user_id, user_email):
        raise HTTPException(status_code=404, detail="Board not found")
    return serialize_doc(board)

@router.put("/{board_id}")
def update_board(board_id: str, board_update: dict = Body(...), user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    user_email = user.get("email")
    
    board = boards_collection.find_one({"_id": ObjectId(board_id)})
    if not board or not check_board_access(board, user_id, user_email):
        raise HTTPException(status_code=404, detail="Board not found")

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

    boards_collection.update_one(
        {"_id": ObjectId(board_id)},
        {"$set": update_data}
    )
    return {"status": "success"}

@router.delete("/{board_id}")
def delete_board(board_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    
    board = boards_collection.find_one({"_id": ObjectId(board_id)})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
        
    # Sadece panoyu oluşturan (kurucu) silebilir
    if board.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Yalnızca pano sahibi silebilir")
        
    boards_collection.delete_one({"_id": ObjectId(board_id)})
    return {"status": "deleted"}

@router.post("/{board_id}/generate_ai")
def generate_ai_workflow(board_id: str, prompt: str = Body(..., embed=True), user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    user_email = user.get("email")
    
    board = boards_collection.find_one({"_id": ObjectId(board_id)})
    if not board or not check_board_access(board, user_id, user_email):
        raise HTTPException(status_code=404, detail="Board not found")
        
    ai_nodes, ai_edges = generate_workflow_from_prompt(prompt)
    if not ai_nodes:
         raise HTTPException(status_code=500, detail="Failed to generate AI workflow.")
         
    boards_collection.update_one(
        {"_id": ObjectId(board_id)},
        {"$set": {"nodes": ai_nodes, "edges": ai_edges, "updated_at": datetime.utcnow()}}
    )
    
    return {"status": "success", "nodes": ai_nodes, "edges": ai_edges}
