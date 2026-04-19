from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Dijital İş Akışı Yöneticisi API")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081", 
        "http://127.0.0.1:8081",
        "http://0.0.0.0:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Dijital İş Akışı Yöneticisi Backend is running."}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

from routes.boards import router as boards_router
from routes.auth import router as auth_router

app.include_router(auth_router)
app.include_router(boards_router)
