import { create } from 'zustand';
import { Board, NodeItem, EdgeItem, Position } from '../types/models';
import { boardAPI, userAPI, BASE_URL } from '../services/api';

interface BoardState {
  boards: Board[];
  activeBoard: Board | null;
  isLoading: boolean;
  error: string | null;
  boardMembers: any[];

  fetchBoards: () => Promise<void>;
  selectBoard: (id: string) => Promise<void>;
  createBoard: (title: string, template?: string) => Promise<Board | null>;
  addNode: (node: NodeItem) => void;
  deleteNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: Partial<NodeItem['data']>) => void;
  updateNodePosition: (nodeId: string, position: Position) => void;
  addEdge: (edge: EdgeItem) => void;
  deleteEdge: (edgeId: string) => void;
  saveBoard: () => Promise<void>;
  
  deleteBoard: (id: string) => Promise<boolean>;
  updateBoardDetails: (id: string, data: { title?: string; team_id?: string }) => Promise<void>;
  generateAI: (boardId: string, prompt: string) => Promise<void>;
  togglePin: (id: string) => void;
  shareBoard: (boardId: string, email: string) => Promise<void>;
  fetchMembers: (boardId: string) => Promise<void>;
  getMemberAvatar: (email: string) => string | null;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoard: null,
  isLoading: false,
  error: null,
  boardMembers: [],

  fetchBoards: async () => {
    set({ isLoading: true, error: null });
    try {
      const boards = await boardAPI.getBoards();
      set({ boards, isLoading: false });
    } catch (err: any) {
      set({ 
        error: `Sunucuya bağlanılamadı (${BASE_URL}). Lütfen backend'in çalıştığından emin ol.`, 
        isLoading: false 
      });
    }
  },

  selectBoard: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const board = await boardAPI.getBoard(id);
      set({ activeBoard: board, isLoading: false });
      // Fetch members too
      get().fetchMembers(id);
    } catch (err) {
      set({ error: 'Pano detayları yüklenemedi.', isLoading: false });
    }
  },

  createBoard: async (title: string, template?: string) => {
    set({ isLoading: true, error: null });
    try {
      const newBoard = await boardAPI.createBoard(title, undefined, template);
      set((state) => ({ 
        boards: [...state.boards, newBoard],
        isLoading: false 
      }));
      return newBoard;
    } catch (err) {
      set({ error: 'Pano oluşturulamadı.', isLoading: false });
      return null;
    }
  },

  addNode: (node: NodeItem) => {
    const { activeBoard } = get();
    if (!activeBoard) return;
    set({ activeBoard: { ...activeBoard, nodes: [...activeBoard.nodes, node] } });
  },

  deleteNode: (nodeId: string) => {
    const { activeBoard } = get();
    if (!activeBoard) return;
    const newNodes = activeBoard.nodes.filter((node) => node.id !== nodeId);
    set({ activeBoard: { ...activeBoard, nodes: newNodes } });
  },

  updateNode: (nodeId: string, data: Partial<NodeItem['data']>) => {
    const { activeBoard } = get();
    if (!activeBoard) return;
    const newNodes = activeBoard.nodes.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    );
    set({ activeBoard: { ...activeBoard, nodes: newNodes } });
  },

  updateNodePosition: (nodeId: string, position: Position) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const newNodes = activeBoard.nodes.map((node) =>
      node.id === nodeId ? { ...node, position } : node
    );

    set({ activeBoard: { ...activeBoard, nodes: newNodes } });
  },

  addEdge: (edge: EdgeItem) => {
    const { activeBoard } = get();
    if (!activeBoard) return;
    set({ activeBoard: { ...activeBoard, edges: [...(activeBoard.edges || []), edge] } });
  },

  deleteEdge: (edgeId: string) => {
    const { activeBoard } = get();
    if (!activeBoard) return;
    const newEdges = (activeBoard.edges || []).filter(e => e.id !== edgeId);
    set({ activeBoard: { ...activeBoard, edges: newEdges } });
  },

  saveBoard: async () => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    try {
      await boardAPI.updateBoard(activeBoard.id, {
        nodes: activeBoard.nodes,
        edges: activeBoard.edges,
      });
    } catch (err) {
      set({ error: 'Failed to save board' });
    }
  },

  deleteBoard: async (id: string) => {
    set({ isLoading: true });
    try {
      await boardAPI.deleteBoard(id);
      set((state) => ({
        boards: state.boards.filter((b) => b.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (err) {
      set({ error: 'Pano silinemedi.', isLoading: false });
      return false;
    }
  },

  updateBoardDetails: async (id: string, data: { title?: string; team_id?: string }) => {
    set({ isLoading: true });
    try {
      await boardAPI.updateBoard(id, data);
      set((state) => ({
        boards: state.boards.map((b) => (b.id === id ? { ...b, ...data } : b)),
        activeBoard: state.activeBoard?.id === id ? { ...state.activeBoard, ...data } : state.activeBoard,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: 'Pano bilgileri güncellenemedi.', isLoading: false });
    }
  },

  generateAI: async (boardId: string, prompt: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await boardAPI.generateAIWorkflow(boardId, prompt);
      if (result.status === 'success') {
        const updatedBoard = await boardAPI.getBoard(boardId);
        set((state) => ({
          activeBoard: updatedBoard,
          boards: state.boards.map(b => b.id === boardId ? updatedBoard : b),
          isLoading: false
        }));
      } else {
        throw new Error('AI generation failed');
      }
    } catch (err: any) {
      set({ error: 'AI ile oluşturma başarısız oldu.', isLoading: false });
    }
  },

  togglePin: (id: string) => {
    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === id ? { ...b, pinned: !b.pinned } : b
      ),
    }));
  },

  shareBoard: async (boardId: string, email: string) => {
    set({ isLoading: true, error: null });
    try {
      await userAPI.shareBoard(boardId, email);
      const boards = await boardAPI.getBoards(); // Refresh
      set({ boards, isLoading: false });
      get().fetchMembers(boardId); // Refresh members
    } catch (err) {
      set({ error: 'Paylaşım başarısız.', isLoading: false });
    }
  },

  fetchMembers: async (boardId: string) => {
    try {
      const members = await userAPI.getBoardMembers(boardId);
      set({ boardMembers: members });
    } catch (err) {
      console.log('Error fetching members:', err);
    }
  },

  getMemberAvatar: (email: string) => {
    const member = get().boardMembers.find(m => m.email === email);
    return member?.avatar_url || null;
  },
}));
