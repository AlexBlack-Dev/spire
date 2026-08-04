import { v4 as uuidv4 } from 'uuid';
import type { Folder } from '../../types';
import type { SpireSlice } from '../types';

export const folderSlice: SpireSlice = (set) => ({
  noteFolders: [],

  createFolder: (name) => {
    const newFolder: Folder = { id: uuidv4(), name, noteIds: [] };
    set((s) => ({ noteFolders: [...s.noteFolders, newFolder] }));
  },

  renameFolder: (id, name) => {
    set((s) => ({
      noteFolders: s.noteFolders.map((f) => f.id === id ? { ...f, name } : f),
    }));
  },

  deleteFolder: (id) => {
    set((s) => ({ noteFolders: s.noteFolders.filter((f) => f.id !== id) }));
  },

  addNoteToFolder: (noteId, folderId) => {
    set((s) => ({
      noteFolders: s.noteFolders.map((f) =>
        f.id === folderId && !f.noteIds.includes(noteId)
          ? { ...f, noteIds: [...f.noteIds, noteId] } : f
      ),
    }));
  },

  removeNoteFromFolder: (noteId, folderId) => {
    set((s) => ({
      noteFolders: s.noteFolders.map((f) =>
        f.id === folderId ? { ...f, noteIds: f.noteIds.filter((nid) => nid !== noteId) } : f
      ),
    }));
  },
});