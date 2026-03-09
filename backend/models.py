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

class Node(BaseModel):
    id: str
    type: str = "task" # e.g. task, note, ai_output
    position: Position
    data: NodeData

class Edge(BaseModel):
    id: str
    source: str
    target: str

class BoardCreate(BaseModel):
    title: str

class Board(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    title: str
    nodes: List[Node] = []
    edges: List[Edge] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
