from fastapi import APIRouter, Depends, HTTPException, Body
from database import teams_collection, boards_collection, notifications_collection, supabase_client, SUPABASE_AVAILABLE
from auth import get_current_user
import os

print(f"[INIT] users.py: SUPABASE_AVAILABLE = {SUPABASE_AVAILABLE}")

router = APIRouter(prefix="/users", tags=["Users"])


# ── GET /users/search?email= ─────────────────────────────────────────────────
@router.get("/search")
def search_user(email: str, user: dict = Depends(get_current_user)):
    print(f"[DEBUG] Arama isteği: {email}")
    if not email or len(email) < 3:
        return []

    if SUPABASE_AVAILABLE and supabase_client:
        try:
            resp = supabase_client.auth.admin.list_users()
            # UserResponse nesnesinden listeyi al
            users_list = []
            if hasattr(resp, 'users'):
                users_list = resp.users
            elif isinstance(resp, list):
                users_list = resp
            else:
                # Bazı sürümlerde dict dönebilir
                users_list = resp.get('users', []) if isinstance(resp, dict) else []

            matched = []
            for u in users_list:
                # Nesne veya dict olmasına göre email/id al
                u_email = getattr(u, 'email', None) or (u.get('email') if isinstance(u, dict) else None)
                u_id = getattr(u, 'id', None) or (u.get('id') if isinstance(u, dict) else None)
                
                if u_email and email.lower() in u_email.lower():
                    if u_email != user.get("email"):
                        matched.append({"email": u_email, "id": str(u_id)})
            
            print(f"[DEBUG] Eşleşen kullanıcı sayısı: {len(matched)}")
            return matched[:10]
        except Exception as e:
            print(f"[ERROR] Arama hatası: {e}")
            return []
    return []


# ── GET /users/members/{board_id} ──────────────────────────────────────────
@router.get("/members/{board_id}")
def get_board_members(board_id: str, user: dict = Depends(get_current_user)):
    print(f"[DEBUG] Üye listesi isteği. Pano: {board_id}")
    from bson import ObjectId

    board = None
    # 1. Direkt ID ile ara (MockDB genellikle bunu kullanır)
    board = boards_collection.find_one({"id": board_id})
    
    # 2. ObjectId ile ara (MongoDB/SupabaseCollection için)
    if not board:
        try:
            board = boards_collection.find_one({"_id": ObjectId(board_id)})
        except:
            pass

    # 3. Manuel tarama (Kesin çözüm)
    if not board:
        all_b = boards_collection.find({})
        for b in all_b:
            if str(b.get("_id")) == board_id or b.get("id") == board_id:
                board = b
                break

    if not board:
        print(f"[WARNING] Pano bulunamadı: {board_id}")
        return [{"email": user.get("email"), "id": user.get("id"), "is_self": True}]

    team_id = board.get("team_id")
    print(f"[DEBUG] Pano bulundu. Ekip: {team_id}")

    if not team_id:
        return [{"email": user.get("email"), "id": user.get("id"), "is_self": True}]

    team = teams_collection.find_one({"id": team_id})
    if not team:
        return [{"email": user.get("email"), "id": user.get("id"), "is_self": True}]

    members_emails = team.get("members") or []
    
    member_list = []
    if SUPABASE_AVAILABLE and supabase_client:
        try:
            resp = supabase_client.auth.admin.list_users()
            all_users = getattr(resp, 'users', resp) if not isinstance(resp, list) else resp
            user_map = {}
            for u in all_users:
                u_email = getattr(u, 'email', None) or (u.get('email') if isinstance(u, dict) else None)
                u_id = getattr(u, 'id', None) or (u.get('id') if isinstance(u, dict) else None)
                u_meta = getattr(u, 'user_metadata', {}) or (u.get('user_metadata', {}) if isinstance(u, dict) else {})
                if u_email:
                    user_map[u_email] = {
                        "id": str(u_id),
                        "avatar_url": u_meta.get("avatar_url")
                    }

            for email in members_emails:
                user_data = user_map.get(email, {})
                member_list.append({
                    "email": email,
                    "id": user_data.get("id", ""),
                    "avatar_url": user_data.get("avatar_url"),
                    "is_self": email == user.get("email"),
                })
        except Exception as e:
            print(f"[ERROR] Supabase üye eşleştirme hatası: {e}")
            member_list = [{"email": e_mail, "id": "", "avatar_url": None, "is_self": e_mail == user.get("email")} for e_mail in members_emails]
    else:
        member_list = [{"email": e_mail, "id": "", "avatar_url": None, "is_self": e_mail == user.get("email")} for e_mail in members_emails]

    print(f"[DEBUG] Dönen üye sayısı: {len(member_list)}")
    return member_list


# ── PUT /users/profile ──────────────────────────────────────────────────────
@router.put("/profile")
def update_profile(updates: dict = Body(...), user: dict = Depends(get_current_user)):
    if not SUPABASE_AVAILABLE or not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not available")
    
    try:
        # Update user metadata in Supabase
        resp = supabase_client.auth.admin.update_user_by_id(
            user.get("id"),
            {"user_metadata": updates}
        )
        return {"status": "success", "user": resp.user}
    except Exception as e:
        print(f"[ERROR] Profil güncelleme hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── POST /users/share-board ───────────────────────────────────────────────
@router.post("/share-board")
def share_board(data: dict = Body(...), user: dict = Depends(get_current_user)):
    from bson import ObjectId
    from datetime import datetime
    
    board_id = data.get("board_id")
    email = data.get("email")
    
    if not board_id or not email:
        raise HTTPException(status_code=400, detail="Missing board_id or email")
        
    board = boards_collection.find_one({"_id": ObjectId(board_id)})
    if not board or board.get("user_id") != user.get("id"):
        raise HTTPException(status_code=403, detail="Yalnızca pano sahibi paylaşabilir")
        
    team_id = board.get("team_id")
    
    # Eğer pano bireysel ise, yeni bir ekip oluştur (Pano adıyla)
    if not team_id:
        import uuid
        new_team_id = str(uuid.uuid4())
        new_team = {
            "id": new_team_id,
            "name": f"{board.get('title')} Ekibi",
            "owner_id": user.get("id"),
            "members": [user.get("email"), email],
            "created_at": datetime.utcnow()
        }
        teams_collection.insert_one(new_team)
        
        # Panoyu bu ekibe ata
        boards_collection.update_one(
            {"_id": ObjectId(board_id)},
            {"$set": {"team_id": new_team_id, "updated_at": datetime.utcnow()}}
        )
        
        # ── BİLDİRİM OLUŞTUR ──
        try:
            notifications_collection.insert_one({
                "recipient_email": email,
                "type": "board_shared",
                "title": "Pano Paylaşıldı",
                "body": f'"{board.get("title")}" panosu sizinle paylaşıldı.',
                "board_id": board_id,
                "sender_email": user.get("email"),
                "read": False,
                "created_at": datetime.utcnow(),
            })
        except Exception as e:
            print(f"[ERROR] Pano paylaşım bildirimi hatası: {e}")
        # ──────────────────────
        return {"status": "success", "action": "converted_to_team", "team_id": new_team_id}
    else:
        # Zaten bir ekip panosuysa, üyeyi ekibe davet et
        team = teams_collection.find_one({"id": team_id})
        if team and email not in (team.get("members") or []):
            teams_collection.update_one(
                {"id": team_id},
                {"$push": {"members": email}}
            )
            # ── BİLDİRİM OLUŞTUR ──
            try:
                notifications_collection.insert_one({
                    "recipient_email": email,
                    "type": "board_shared",
                    "title": "Pano Paylaşıldı",
                    "body": f'"{board.get("title")}" panosu sizinle paylaşıldı.',
                    "board_id": board_id,
                    "sender_email": user.get("email"),
                    "read": False,
                    "created_at": datetime.utcnow(),
                })
            except Exception as e:
                print(f"[ERROR] Pano paylaşım bildirimi hatası: {e}")
            # ──────────────────────
        return {"status": "success", "action": "member_added", "team_id": team_id}
