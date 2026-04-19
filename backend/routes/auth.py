from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])

class AuthData(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(data: AuthData):
    # Complete mock for development/restricted environments
    if data.email == "test@test.com" and data.password == "password":
        return {
            "access_token": "mock-jwt-token-123", 
            "user": {"id": "dev-user-id", "email": data.email}
        }
    raise HTTPException(status_code=401, detail="Geçersiz e-posta veya şifre.")

@router.post("/register")
def register(data: AuthData):
    return {"message": "Mock registration successful."}
