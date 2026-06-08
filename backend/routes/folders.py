from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from database import folders_collection, boards_collection, teams_collection
from models import Folder, FolderCreate, FolderUpdate
from auth import get_current_user
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/folders", tags=["Folders"])

def serialize_doc(doc):
    if not doc:
        return None
    doc = dict(doc)
    if "id" not in doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    elif "_id" in doc:
        del doc["_id"]
    return doc

def get_user_team_ids(user_id: str, user_email: str) -> list:
    owned_teams = teams_collection.find({"owner_id": user_id})
    member_teams = teams_collection.find({"members": user_email})
    team_ids = set()
    for t in (owned_teams + member_teams):
        tid = t.get("id")
        if tid:
            team_ids.add(tid)
    return list(team_ids)

def get_or_create_team_folder(team_id: str):
    team = teams_collection.find_one({"id": team_id})
    if not team:
        return None

    # Fetch all boards for this team
    team_boards = list(boards_collection.find({"team_id": team_id}))
    board_ids = [str(b.get("id") or b.get("_id")) for b in team_boards if b]

    existing = folders_collection.find_one({"team_id": team_id, "is_team_folder": True})
    if existing:
        # Keep name and board_ids in sync dynamically
        folders_collection.update_one(
            {"id": existing["id"]},
            {"$set": {
                "name": team["name"],
                "board_ids": board_ids,
                "updated_at": datetime.utcnow()
            }}
        )
        existing["name"] = team["name"]
        existing["board_ids"] = board_ids
        return existing

    new_folder = {
        "user_id": team["owner_id"],
        "name": team["name"],
        "color": None,
        "board_ids": board_ids,
        "is_team_folder": True,
        "team_id": team_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = folders_collection.insert_one(new_folder)
    new_folder["id"] = result.inserted_id
    return new_folder


@router.get("/", response_model=List[Folder])
def get_folders(user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    user_email = user.get("email")

    # 1. Fetch personal folders of user
    personal_folders = folders_collection.find({"user_id": user_id, "is_team_folder": False})
    
    # 2. Resolve/sync and fetch team folders of teams the user is member/owner of
    user_team_ids = get_user_team_ids(user_id, user_email)
    team_folders = []
    for tid in user_team_ids:
        tf = get_or_create_team_folder(tid)
        if tf:
            team_folders.append(tf)

    all_folders = [serialize_doc(f) for f in (personal_folders + team_folders)]
    return all_folders


@router.post("/", response_model=Folder)
def create_folder(folder_in: FolderCreate, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    
    new_folder = {
        "user_id": user_id,
        "name": folder_in.name,
        "color": folder_in.color,
        "board_ids": [],
        "is_team_folder": False,
        "team_id": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = folders_collection.insert_one(new_folder)
    new_folder["id"] = result.inserted_id
    return serialize_doc(new_folder)


@router.put("/{folder_id}", response_model=Folder)
def update_folder(folder_id: str, folder_in: FolderUpdate, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    folder = folders_collection.find_one({"id": folder_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Klasör bulunamadı.")

    if folder.get("is_team_folder"):
        team = teams_collection.find_one({"id": folder.get("team_id")})
        if not team:
            raise HTTPException(status_code=404, detail="Ekip bulunamadı.")
            
        if team.get("owner_id") != user_id and user.get("email") not in (team.get("members") or []):
            raise HTTPException(status_code=403, detail="Yetersiz yetki.")
            
        if folder_in.name is not None and team.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Yalnızca ekip sahibi ekip klasörünün adını değiştirebilir.")
            
        if folder_in.name is not None:
            teams_collection.update_one({"id": team["id"]}, {"$set": {"name": folder_in.name}})
    else:
        if folder.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Yalnızca klasör sahibi düzenleyebilir.")

    updates = {}
    if folder_in.name is not None:
        updates["name"] = folder_in.name
    if folder_in.color is not None:
        updates["color"] = folder_in.color
    if folder_in.board_ids is not None:
        updates["board_ids"] = folder_in.board_ids

    if updates:
        updates["updated_at"] = datetime.utcnow()
        folders_collection.update_one({"id": folder_id}, {"$set": updates})
        folder.update(updates)

    return serialize_doc(folder)


@router.delete("/{folder_id}")
def delete_folder(folder_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    folder = folders_collection.find_one({"id": folder_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Klasör bulunamadı.")

    if folder.get("is_team_folder"):
        raise HTTPException(status_code=400, detail="Ekip klasörleri silinemez.")

    if folder.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Yalnızca klasör sahibi silebilir.")

    folders_collection.delete_one({"id": folder_id})
    return {"status": "success", "message": "Klasör silindi."}


@router.post("/{folder_id}/boards/{board_id}", response_model=Folder)
def add_board_to_folder(folder_id: str, board_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    folder = folders_collection.find_one({"id": folder_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Klasör bulunamadı.")

    if folder.get("is_team_folder"):
        raise HTTPException(status_code=400, detail="Ekip klasörüne doğrudan pano eklenemez.")

    if folder.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Yetersiz yetki.")

    # Remove board from any other personal folders
    all_user_folders = folders_collection.find({"user_id": user_id, "is_team_folder": False})
    for f in all_user_folders:
        if board_id in f.get("board_ids", []):
            new_ids = [bid for bid in f["board_ids"] if bid != board_id]
            folders_collection.update_one({"id": f["id"]}, {"$set": {"board_ids": new_ids, "updated_at": datetime.utcnow()}})

    board_ids = folder.get("board_ids", [])
    if board_id not in board_ids:
        board_ids.append(board_id)
        folders_collection.update_one(
            {"id": folder_id},
            {"$set": {"board_ids": board_ids, "updated_at": datetime.utcnow()}}
        )
        folder["board_ids"] = board_ids

    return serialize_doc(folder)


@router.delete("/{folder_id}/boards/{board_id}", response_model=Folder)
def remove_board_from_folder(folder_id: str, board_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    folder = folders_collection.find_one({"id": folder_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Klasör bulunamadı.")

    if folder.get("is_team_folder"):
        raise HTTPException(status_code=400, detail="Ekip klasöründen doğrudan pano çıkarılamaz.")

    if folder.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Yetersiz yetki.")

    board_ids = folder.get("board_ids", [])
    if board_id in board_ids:
        board_ids = [bid for bid in board_ids if bid != board_id]
        folders_collection.update_one(
            {"id": folder_id},
            {"$set": {"board_ids": board_ids, "updated_at": datetime.utcnow()}}
        )
        folder["board_ids"] = board_ids

    return serialize_doc(folder)


@router.get("/team/{team_id}", response_model=Folder)
def get_team_folder(team_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    user_email = user.get("email")
    
    # Check team access
    team = teams_collection.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Ekip bulunamadı.")
        
    if team.get("owner_id") != user_id and user_email not in (team.get("members") or []):
        raise HTTPException(status_code=403, detail="Ekip erişiminiz yok.")
        
    tf = get_or_create_team_folder(team_id)
    if not tf:
        raise HTTPException(status_code=500, detail="Ekip klasörü oluşturulamadı.")
        
    return serialize_doc(tf)
