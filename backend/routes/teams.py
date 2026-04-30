from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from database import teams_collection, requests_collection, boards_collection
from models import Team, TeamRequest
from auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/teams", tags=["Teams"])


def serialize_doc(doc):
    """Hem Supabase (uuid id) hem mock (ObjectId id) için normalize et."""
    if not doc:
        return None
    doc = dict(doc)
    # id alanını garanti et
    if "id" not in doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    elif "_id" in doc:
        del doc["_id"]
    # members None kontrolü
    if doc.get("members") is None:
        doc["members"] = []
    return doc


# ── GET /teams/ ──────────────────────────────────────────────────────────────
@router.get("/", response_model=List[Team])
def get_teams(user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    user_email = user.get("email")
    all_teams = teams_collection.find()
    my_teams = [
        serialize_doc(t) for t in all_teams
        if t.get("owner_id") == user_id or user_email in (t.get("members") or [])
    ]
    return my_teams


# ── POST /teams/ ─────────────────────────────────────────────────────────────
@router.post("/", response_model=Team)
def create_team(team_in: dict = Body(...), user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    name = team_in.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Ekip adı gerekli.")

    new_team = {
        "name": name,
        "owner_id": user_id,
        "members": [user.get("email")],
        "created_at": datetime.utcnow(),
    }
    result = teams_collection.insert_one(new_team)
    team_id_str = str(result.inserted_id)
    new_team["id"] = team_id_str

    # Otomatik ortak pano oluştur
    new_board = {
        "user_id": user_id,
        "team_id": team_id_str,
        "title": f"{name} Ortak Panosu",
        "nodes": [],
        "edges": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    boards_collection.insert_one(new_board)

    return serialize_doc(new_team)


# ── DELETE /teams/{team_id} ──────────────────────────────────────────────────
@router.delete("/{team_id}")
def delete_team(team_id: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    team = teams_collection.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Ekip bulunamadı.")
    if team.get("owner_id") != user_id:
        raise HTTPException(status_code=403, detail="Yalnızca ekip sahibi silebilir.")
    teams_collection.delete_one({"id": team_id})
    return {"status": "success", "message": "Ekip silindi."}


# ── DELETE /teams/{team_id}/members/{member_email} ───────────────────────────
@router.delete("/{team_id}/members/{member_email}")
def remove_member(team_id: str, member_email: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    user_email = user.get("email")
    team = teams_collection.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Ekip bulunamadı.")
    if team.get("owner_id") != user_id and user_email != member_email:
        raise HTTPException(status_code=403, detail="Yetersiz yetki.")
    if member_email == user_email and team.get("owner_id") == user_id:
        raise HTTPException(status_code=400, detail="Ekip sahibi ekipten çıkamaz. Ekibi silin.")
    members = [m for m in (team.get("members") or []) if m != member_email]
    teams_collection.update_one({"id": team_id}, {"$set": {"members": members}})
    return {"status": "success", "message": f"{member_email} ekipten çıkarıldı."}


# ── POST /teams/{team_id}/invite ─────────────────────────────────────────────
@router.post("/{team_id}/invite")
def invite_user(team_id: str, payload: dict = Body(...), user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    email = payload.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="Email gerekli.")

    team = teams_collection.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Ekip bulunamadı.")

    if team.get("owner_id") != user_id:
        raise HTTPException(status_code=403, detail="Yalnızca ekip sahibi davet gönderebilir.")

    members = team.get("members") or []
    if len(members) >= 3:
        raise HTTPException(
            status_code=403,
            detail="Ücretsiz paket sınırı aşıldı! Ekipler en fazla 3 kişiden oluşabilir.",
        )

    if email in members:
        raise HTTPException(status_code=400, detail="Kullanıcı zaten ekibe dahil.")

    existing = requests_collection.find_one(
        {"team_id": team_id, "recipient_email": email, "status": "pending"}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Bu kullanıcıya zaten bekleyen bir davet gönderildi.")

    new_req = {
        "team_id": team_id,
        "team_name": team.get("name"),
        "sender_id": user_id,
        "recipient_email": email,
        "status": "pending",
        "created_at": datetime.utcnow(),
    }
    requests_collection.insert_one(new_req)
    return {"status": "success", "message": "Davet başarıyla gönderildi."}


# ── GET /teams/requests/incoming ─────────────────────────────────────────────
@router.get("/requests/incoming")
def get_incoming_requests(user: dict = Depends(get_current_user)):
    user_email = user.get("email")
    all_reqs = requests_collection.find({"recipient_email": user_email, "status": "pending"})
    return [serialize_doc(req) for req in all_reqs]


# ── POST /teams/requests/{req_id}/accept ─────────────────────────────────────
@router.post("/requests/{req_id}/accept")
def accept_request(req_id: str, user: dict = Depends(get_current_user)):
    user_email = user.get("email")
    req = requests_collection.find_one({"id": req_id})

    if not req or req.get("recipient_email") != user_email or req.get("status") != "pending":
        raise HTTPException(status_code=404, detail="Davet bulunamadı veya geçersiz.")

    team_id = req.get("team_id")
    team = teams_collection.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Ekip bulunamadı.")

    members = team.get("members") or []
    if len(members) >= 3:
        raise HTTPException(status_code=403, detail="Ekip maksimum üye sınırına ulaşmış.")

    requests_collection.update_one({"id": req_id}, {"$set": {"status": "accepted"}})
    teams_collection.update_one({"id": team_id}, {"$push": {"members": user_email}})
    return {"status": "success"}


# ── POST /teams/requests/{req_id}/reject ─────────────────────────────────────
@router.post("/requests/{req_id}/reject")
def reject_request(req_id: str, user: dict = Depends(get_current_user)):
    user_email = user.get("email")
    req = requests_collection.find_one({"id": req_id})
    if not req or req.get("recipient_email") != user_email:
        raise HTTPException(status_code=404, detail="Davet bulunamadı.")
    requests_collection.update_one({"id": req_id}, {"$set": {"status": "rejected"}})
    return {"status": "success"}
