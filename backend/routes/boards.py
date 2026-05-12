from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from database import boards_collection, teams_collection, notifications_collection
from models import Board, BoardCreate, Node, Edge
from auth import get_current_user
from services.ai import generate_workflow_from_prompt, rate_limiter
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
    # Tüm ekipleri çekmek yerine sadece kullanıcının sahibi olduğu veya üyesi olduğu ekipleri filtrele
    owned_teams = teams_collection.find({"owner_id": user_id})
    member_teams = teams_collection.find({"members": user_email})
    
    team_ids = set()
    for t in (owned_teams + member_teams):
        tid = t.get("id")
        if tid:
            team_ids.add(tid)
    return list(team_ids)

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
    
    # 1. Kullanıcının kendi panoları
    # 2. Üyesi/sahibi olduğu ekip panoları
    # 3. Kendisine görev atanmış olan panolar
    query = {
        "$or": [
            {"user_id": user_id},
            {"nodes.data.assignee": user_email}
        ]
    }
    
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

    # ── Assignee değişiminde bildirim oluştur ──────────────────────────────
    if "nodes" in board_update:
        old_nodes = {n["id"]: n for n in (board.get("nodes") or [])}
        for new_node in board_update["nodes"]:
            node_id = new_node.get("id")
            old_node = old_nodes.get(node_id)
            new_assignee = (new_node.get("data") or {}).get("assignee", "")
            old_assignee = (old_node.get("data") or {}).get("assignee", "") if old_node else ""
            if new_assignee and new_assignee != old_assignee and new_assignee != user_email:
                node_title = (new_node.get("data") or {}).get("title", "Görev")
                try:
                    notifications_collection.insert_one({
                        "recipient_email": new_assignee,
                        "type": "task_assigned",
                        "title": "Size bir görev atandı",
                        "body": f'"{node_title}" görevi size atandı.',
                        "board_id": board_id,
                        "node_id": node_id,
                        "assigner_email": user_email,
                        "read": False,
                        "created_at": datetime.utcnow(),
                    })
                except Exception as e:
                    print(f"[bildirim oluşturma hatası]: {e}")
    # ────────────────────────────────────────────────────────────────────────

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
    print(f"\n[!!!] AI REQUEST RECEIVED for board: {board_id}")
    user_id = user.get("id")
    user_email = user.get("email")
    
    board = boards_collection.find_one({"_id": ObjectId(board_id)})
    if not board or not check_board_access(board, user_id, user_email):
        raise HTTPException(status_code=404, detail="Board not found")

    # ── Rate limit ön kontrolü ──
    allowed, reason = rate_limiter.check()
    if not allowed:
        raise HTTPException(status_code=429, detail=reason)

    ai_nodes, ai_edges = generate_workflow_from_prompt(prompt)
    if not ai_nodes:
         raise HTTPException(status_code=500, detail="Failed to generate AI workflow.")
         
    boards_collection.update_one(
        {"_id": ObjectId(board_id)},
        {"$set": {"nodes": ai_nodes, "edges": ai_edges, "updated_at": datetime.utcnow()}}
    )
    
    return {"status": "success", "nodes": ai_nodes, "edges": ai_edges, "usage": rate_limiter.get_usage()}

@router.get("/ai-usage")
def get_ai_usage(user: dict = Depends(get_current_user)):
    """Mevcut AI kullanım bilgisini döner."""
    return rate_limiter.get_usage()
