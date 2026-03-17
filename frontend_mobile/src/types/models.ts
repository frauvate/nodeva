export interface NodeData {
  title: string;
  content: string;
  color: string;
  assignee?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface NodeItem {
  id: string;
  type: string;
  position: Position;
  data: NodeData;
}

export interface EdgeItem {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export interface Board {
  id: string;
  user_id: string;
  title: string;
  nodes: NodeItem[];
  edges: EdgeItem[];
  created_at?: string;
  updated_at?: string;
}
