import { create } from 'zustand';
import { folderAPI } from '../services/api';

interface Folder {
  id: string;
  name: string;
  color?: string;
  board_ids: string[];
  is_team_folder: boolean;
  team_id?: string;
  user_id: string;
}

interface FolderState {
  folders: Folder[];
  isLoading: boolean;
  fetchFolders: () => Promise<void>;
  createFolder: (name: string, color?: string) => Promise<void>;
  updateFolder: (id: string, data: { name?: string; color?: string; board_ids?: string[] }) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  addBoardToFolder: (folderId: string, boardId: string) => Promise<void>;
  removeBoardFromFolder: (folderId: string, boardId: string) => Promise<void>;
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folders: [],
  isLoading: false,
  fetchFolders: async () => {
    set({ isLoading: true });
    try {
      const folders = await folderAPI.getFolders();
      set({ folders, isLoading: false });
    } catch { 
      set({ isLoading: false }); 
    }
  },
  createFolder: async (name, color) => {
    const f = await folderAPI.createFolder(name, color);
    set(s => ({ folders: [...s.folders, f] }));
  },
  updateFolder: async (id, data) => {
    await folderAPI.updateFolder(id, data);
    set(s => ({ folders: s.folders.map(f => f.id === id ? { ...f, ...data } : f) }));
  },
  deleteFolder: async (id) => {
    await folderAPI.deleteFolder(id);
    set(s => ({ folders: s.folders.filter(f => f.id !== id) }));
  },
  addBoardToFolder: async (folderId, boardId) => {
    await folderAPI.addBoardToFolder(folderId, boardId);
    set(s => ({
      folders: s.folders.map(f => {
        const bids = f.board_ids || [];
        if (f.id !== folderId && bids.includes(boardId)) {
          return { ...f, board_ids: bids.filter(id => id !== boardId) };
        }
        if (f.id === folderId) {
          return { ...f, board_ids: bids.includes(boardId) ? bids : [...bids, boardId] };
        }
        return f;
      })
    }));
  },
  removeBoardFromFolder: async (folderId, boardId) => {
    await folderAPI.removeBoardFromFolder(folderId, boardId);
    set(s => ({
      folders: s.folders.map(f =>
        f.id === folderId ? { ...f, board_ids: (f.board_ids || []).filter(id => id !== boardId) } : f
      )
    }));
  },
}));
