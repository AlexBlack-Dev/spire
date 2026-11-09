import { pwHash, pwVerify, needsRehash } from '../helpers';
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

  verifyNotePassword: async (id, password) => {
    const note = get().notes.find((n) => n.id === id);
    const ok = await pwVerify(note?.password, password);
    if (ok && note && needsRehash(note.password)) {
      try {
        const hash = await pwHash(password);
        set((s) => ({ notes: s.notes.map((n) => n.id === id ? { ...n, password: hash } : n) }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        get().addLog('note password rehash: ' + msg);
      }
    }
    return ok;
  },

  setFolderPassword: async (id, password) => {
    const hash = await pwHash(password);
    set((s) => ({ noteFolders: s.noteFolders.map((f) => f.id === id ? { ...f, password: hash } : f) }));
  },

  clearFolderPassword: (id) => {
    set((s) => ({ noteFolders: s.noteFolders.map((f) => f.id === id ? { ...f, password: undefined } : f) }));
  },

  verifyFolderPassword: async (id, password) => {
    const folder = get().noteFolders.find((f) => f.id === id);
    const ok = await pwVerify(folder?.password, password);
    if (ok && folder && needsRehash(folder.password)) {
      try {
        const hash = await pwHash(password);
        set((s) => ({ noteFolders: s.noteFolders.map((f) => f.id === id ? { ...f, password: hash } : f) }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        get().addLog('folder password rehash: ' + msg);
      }
    }
    return ok;
  },

  unlockNote: (id, durationMs) => {
    const ms = durationMs > 0 ? Date.now() + durationMs : Infinity;
    set((s) => {
      const expiries = pruneExpired(s.lockedNoteExpiries);
      return { lockedNoteExpiries: { ...expiries, [id]: ms } };
    });
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
      const expiries = pruneExpired(s.lockedNoteExpiries);
      const { [id]: _, ...rest } = expiries;
      const { [id]: __, ...restOpens } = s.lockedNoteOpens;
      return { lockedNoteExpiries: rest, lockedNoteOpens: restOpens };
    });
  },

  unlockFolder: (id, durationMs) => {
    const ms = durationMs > 0 ? Date.now() + durationMs : Infinity;
    set((s) => {
      const expiries = pruneExpired(s.folderLockExpiries);
      return { folderLockExpiries: { ...expiries, [id]: ms } };
    });
  },

  lockFolder: (id) => {
    set((s) => {
      const expiries = pruneExpired(s.folderLockExpiries);
      const { [id]: _, ...rest } = expiries;
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

function pruneExpired(expiries: Record<string, number>): Record<string, number> {
  const now = Date.now();
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(expiries)) {
    if (v > now) out[k] = v;
  }
  return out;
}
