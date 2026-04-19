import { create } from 'zustand';
import { Board, NodeItem, EdgeItem, Position } from '../types/models';
import { boardAPI, BASE_URL } from '../services/api';

interface BoardState {
  boards: Board[];
  activeBoard: Board | null;
  isLoading: boolean;
  error: string | null;

  fetchBoards: () => Promise<void>;
  selectBoard: (id: string) => Promise<void>;
  createBoard: (title: string) => Promise<Board | null>;
  addNode: (node: NodeItem) => void;
  deleteNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, position: Position) => void;
  saveBoard: () => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoard: null,
  isLoading: false,
  error: null,

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
    } catch (err) {
      set({ error: 'Pano detayları yüklenemedi.', isLoading: false });
    }
  },

  createBoard: async (title: string) => {
    set({ isLoading: true, error: null });
    try {
      const newBoard = await boardAPI.createBoard(title);
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

  updateNodePosition: (nodeId: string, position: Position) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const newNodes = activeBoard.nodes.map((node) =>
      node.id === nodeId ? { ...node, position } : node
    );

    set({ activeBoard: { ...activeBoard, nodes: newNodes } });
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
}));
