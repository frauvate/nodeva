from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Dict, Any

class Edge(BaseModel):
    id: str
    source: str = ""
    target: str = ""
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def handle_legacy_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Mapping: from -> source, to -> target
            if "from" in data and not data.get("source"):
                data["source"] = data["from"]
            if "to" in data and not data.get("target"):
                data["target"] = data["to"]
        return data
from datetime import datetime
from bson import ObjectId

class Position(BaseModel):
    x: float
    y: float

class NodeData(BaseModel):
    title: Optional[str] = ""
    content: Optional[str] = ""
    color: Optional[str] = "#E3F2FD"
    assignee: Optional[str] = ""          # e-posta adresi (geriye dönük uyumluluk)
    assignee_name: Optional[str] = ""     # görünen ad (e-postanın baş kısmı)
    status: Optional[str] = None          # todo | in_progress | done

class Node(BaseModel):
    id: str
    type: str = "task"  # e.g. task, note, ai_output
    position: Position
    data: NodeData

class Edge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class Notification(BaseModel):
    id: str = ""
    recipient_email: str
    type: str                             # task_assigned | board_invite
    title: str
    body: str
    board_id: Optional[str] = None
    node_id: Optional[str] = None
    assigner_email: Optional[str] = None  # kim atadı
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Team(BaseModel):
    id: str
    name: str
    owner_id: str
    members: List[str] = []  # list of user emails
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TeamRequest(BaseModel):
    id: str
    team_id: str
    team_name: str
    sender_id: str
    recipient_email: str
    status: str = "pending"  # pending, accepted, rejected
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

