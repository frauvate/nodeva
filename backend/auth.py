from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    # Mock token validation
    if token == "mock-jwt-token-123":
        return {"id": "dev-user-id", "email": "test@test.com"}
    
    if not supabase:
        raise HTTPException(status_code=401, detail="Supabase not configured")
        
    try:
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        u = user.user
        return {"id": u.id, "email": u.email}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
