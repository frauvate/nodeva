from fastapi import APIRouter, Depends, HTTPException
from database import teams_collection, boards_collection, supabase_client, SUPABASE_AVAILABLE
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
                if u_email:
                    user_map[u_email] = str(u_id)

            for email in members_emails:
                member_list.append({
                    "email": email,
                    "id": user_map.get(email, ""),
                    "is_self": email == user.get("email"),
                })
        except Exception as e:
            print(f"[ERROR] Supabase üye eşleştirme hatası: {e}")
            member_list = [{"email": e_mail, "id": "", "is_self": e_mail == user.get("email")} for e_mail in members_emails]
    else:
        member_list = [{"email": e_mail, "id": "", "is_self": e_mail == user.get("email")} for e_mail in members_emails]

    print(f"[DEBUG] Dönen üye sayısı: {len(member_list)}")
    return member_list


