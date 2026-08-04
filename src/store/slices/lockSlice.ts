import { pwHash, pwVerify } from '../helpers';
import type { SpireSlice } from '../types';

export const lockSlice: SpireSlice = (set, get) => ({
  lockedNoteExpiries: {},
  lockedNoteOpens: {},
  folderLockExpiries: {},
  lockPromptState: null,

  setNotePassword: async (id, password) => {
    const hash = await pwHash(password);
    set((s) => ({ notes: s.notes.map((n) => n.id === id ? { ...n, password: hash } : n) }));
  },

  clearNotePassword: (id) => {
    set((s) => ({ notes: s.notes.map((n) => n.id === id ? { ...n, password: undefined } : n) }));
  },

  verifyNotePassword: (id, password) => {
    const note = get().notes.find((n) => n.id === id);
    return pwVerify(note?.password, password);
  },

  setFolderPassword: async (id, password) => {
    const hash = await pwHash(password);
    set((s) => ({ noteFolders: s.noteFolders.map((f) => f.id === id ? { ...f, password: hash } : f) }));
  },

  clearFolderPassword: (id) => {
    set((s) => ({ noteFolders: s.noteFolders.map((f) => f.id === id ? { ...f, password: undefined } : f) }));
  },

  verifyFolderPassword: (id, password) => {
    const folder = get().noteFolders.find((f) => f.id === id);
    return pwVerify(folder?.password, password);
  },

  unlockNote: (id, durationMs) => {
    const ms = durationMs > 0 ? durationMs : Number.MAX_SAFE_INTEGER;
    set((s) => ({ lockedNoteExpiries: { ...s.lockedNoteExpiries, [id]: Date.now() + ms } }));
  },

  unlockNoteOpens: (id, opens) => {
    set((s) => ({ lockedNoteOpens: { ...s.lockedNoteOpens, [id]: opens } }));
  },

  consumeNoteOpen: (id) => {
    set((s) => {
      const left = s.lockedNoteOpens[id];
      if (left === undefined) return s;
      if (left <= 1) {
        const { [id]: _, ...rest } = s.lockedNoteOpens;
        return { lockedNoteOpens: rest };
      }
      return { lockedNoteOpens: { ...s.lockedNoteOpens, [id]: left - 1 } };
    });
  },

  isNoteUnlocked: (id) => {
    const expiry = get().lockedNoteExpiries[id];
    if (expiry && Date.now() < expiry) return true;
    const opens = get().lockedNoteOpens[id];
    return !!opens && opens > 0;
  },

  lockNote: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.lockedNoteExpiries;
      const { [id]: __, ...restOpens } = s.lockedNoteOpens;
      return { lockedNoteExpiries: rest, lockedNoteOpens: restOpens };
    });
  },

  unlockFolder: (id, durationMs) => {
    const ms = durationMs > 0 ? durationMs : Number.MAX_SAFE_INTEGER;
    set((s) => ({ folderLockExpiries: { ...s.folderLockExpiries, [id]: Date.now() + ms } }));
  },

  lockFolder: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.folderLockExpiries;
      return { folderLockExpiries: rest };
    });
  },

  isFolderUnlocked: (id) => {
    const expiry = get().folderLockExpiries[id];
    return !!expiry && Date.now() < expiry;
  },

  showLockPrompt: (id, kind, mode) => set({ lockPromptState: { id, kind, mode } }),
  hideLockPrompt: () => set({ lockPromptState: null }),
});