from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

class Position(BaseModel):
    x: float
    y: float

class NodeData(BaseModel):
    title: Optional[str] = ""
    content: Optional[str] = ""
    color: Optional[str] = "#E3F2FD"
    assignee: Optional[str] = ""

class Node(BaseModel):
    id: str
    type: str = "task" # e.g. task, note, ai_output
    position: Position
    data: NodeData

class Edge(BaseModel):
    id: str
    source: str
    target: str

class Team(BaseModel):
    id: str
    name: str
    owner_id: str
    members: List[str] = [] # list of user emails
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TeamRequest(BaseModel):
    id: str
    team_id: str
    team_name: str
    sender_id: str
    recipient_email: str
    status: str = "pending" # pending, accepted, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BoardCreate(BaseModel):
    title: str
    team_id: Optional[str] = None

class Board(BaseModel):
    id: str
    user_id: str
    team_id: Optional[str] = None
    title: str
    nodes: List[Node] = []
    edges: List[Edge] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
