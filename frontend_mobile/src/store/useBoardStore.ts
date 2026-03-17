import { create } from 'zustand';
import { Board, NodeItem, EdgeItem, Position } from '../types/models';
import { boardAPI } from '../services/api';

interface BoardState {
  boards: Board[];
  activeBoard: Board | null;
  isLoading: boolean;
  error: string | null;

  fetchBoards: () => Promise<void>;
  selectBoard: (id: string) => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  updateNodePosition: (nodeId: string, position: Position) => void;
  saveBoard: () => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoard: null,
  isLoading: false,
  error: null,

  fetchBoards: async () => {
    set({ isLoading: true });
    try {
      const boards = await boardAPI.getBoards();
      set({ boards, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch boards', isLoading: false });
    }
  },

  selectBoard: async (id: string) => {
    set({ isLoading: true });
    try {
      const board = await boardAPI.getBoard(id);
      set({ activeBoard: board, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch board details', isLoading: false });
    }
  },

  createBoard: async (title: string) => {
    try {
      const newBoard = await boardAPI.createBoard(title);
      set((state) => ({ boards: [...state.boards, newBoard] }));
    } catch (err) {
      set({ error: 'Failed to create board' });
    }
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
