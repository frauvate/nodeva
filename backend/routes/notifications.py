from fastapi import APIRouter, Depends
from typing import List
from database import notifications_collection
from models import Notification
from auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def serialize_notif(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    if "id" not in doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    elif "_id" in doc:
        del doc["_id"]
    return doc


# ── GET /notifications/ ──────────────────────────────────────────────────────
@router.get("/")
def get_notifications(user: dict = Depends(get_current_user)):
    """Kullanıcının bildirimlerini döndürür — okunmamışlar önce."""
    email = user.get("email")
    all_notifs = notifications_collection.find({"recipient_email": email})
    serialized = [serialize_notif(n) for n in all_notifs]
    # Okunmamışlar önce, sonra tarihe göre azalan
    serialized.sort(key=lambda n: (n.get("read", False), -(
        datetime.fromisoformat(n["created_at"]).timestamp()
        if isinstance(n.get("created_at"), str)
        else n.get("created_at", datetime.utcnow()).timestamp()
    )))
    return serialized


# ── POST /notifications/{id}/read ────────────────────────────────────────────
@router.post("/{notif_id}/read")
def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    email = user.get("email")
    notifications_collection.update_one(
        {"id": notif_id, "recipient_email": email},
        {"$set": {"read": True}}
    )
    return {"status": "success"}


# ── POST /notifications/read-all ─────────────────────────────────────────────
@router.post("/read-all")
def mark_all_read(user: dict = Depends(get_current_user)):
    email = user.get("email")
    # MockCollection tek tek günceller; Supabase toplu yapabilir
    all_notifs = notifications_collection.find({"recipient_email": email, "read": False})
    for n in all_notifs:
        nid = n.get("id") or n.get("_id")
        if nid:
            notifications_collection.update_one({"id": str(nid)}, {"$set": {"read": True}})
    return {"status": "success"}
