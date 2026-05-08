print("\n[!!!] BACKEND PROCESS STARTING...")
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Dijital İş Akışı Yöneticisi API")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, # '*' ile credentials True olamaz, False yaparak çakışmayı önleyelim
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Dijital İş Akışı Yöneticisi Backend is running."}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# ── Log Middleware ───────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"[ACCESS] {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"[RESPONSE] {response.status_code}")
    return response

# ── Routes ───────────────────────────────────────────────────────────
from routes.boards import router as boards_router
from routes.auth import router as auth_router
from routes.teams import router as teams_router
from routes.notifications import router as notifications_router
from routes.users import router as users_router

app.include_router(auth_router)
app.include_router(boards_router)
app.include_router(teams_router)
app.include_router(notifications_router)
app.include_router(users_router)
