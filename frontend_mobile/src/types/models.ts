export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface NodeData {
  title: string;
  content: string;
  color: string;
  assignee?: string;
  status?: TaskStatus;
  startDate?: string;  // "YYYY-MM-DD"
  endDate?: string;    // "YYYY-MM-DD"
  progress?: number;   // 0-100
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
  team_id?: string;
  template?: string;
  nodes: NodeItem[];
  edges: EdgeItem[];
  created_at?: string;
  updated_at?: string;
  pinned?: boolean;
}
