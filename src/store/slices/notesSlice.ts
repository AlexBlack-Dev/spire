import { v4 as uuidv4 } from 'uuid';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import type { Note } from '../../types';
import { isMobile, pathSep } from '../../isMobile';
import {
  COLORS, tKey, getContentText, htmlToMarkdown, htmlToFullHtml,
  readFileAsBase64, fileExt,
} from '../helpers';
import type { SpireSlice, SaveFormat } from '../types';

const binaryExts = ['xlsx', 'xls', 'ods'];

export const notesSlice: SpireSlice = (set, get) => ({
  notes: [],
  trash: [],
  activeNoteId: null,
  fileBrowserOpen: false,
  fileBrowserNoteId: null,
  needsPermissionRedirect: false,

  createNote: () => {
    const notes = get().notes;
    const colorIndex = notes.length % COLORS.length;
    const newNote: Note = {
      id: uuidv4(),
      title: '',
      content: '',
      color: COLORS[colorIndex],
      tags: [],
      isPinned: false,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editMode: true,
    };
    set((s) => ({ notes: [newNote, ...s.notes], activeNoteId: newNote.id }));
  },

  updateNote: (id, updates) => {
    set((s) => {
      const target = s.notes.find((n) => n.id === id);
      if (!target) return s;
      const entries = Object.entries(updates) as [keyof Note, unknown][];
      const changed = entries.some(([k, v]) => target[k] !== v);
      if (!changed) return s;
      return {
        notes: s.notes.map((n) =>
          n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
        ),
      };
    });
  },

  deleteNote: (id) => {
    set((s) => {
      const note = s.notes.find((n) => n.id === id);
      if (!note) return s;
      return {
        notes: s.notes.filter((n) => n.id !== id),
        trash: [{ ...note, updatedAt: new Date().toISOString() }, ...s.trash],
        activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
      };
    });
  },

  restoreFromTrash: (id) => {
    set((s) => {
      const note = s.trash.find((n) => n.id === id);
      if (!note) return s;
      return {
        trash: s.trash.filter((n) => n.id !== id),
        notes: [{ ...note, updatedAt: new Date().toISOString() }, ...s.notes],
      };
    });
  },

  permanentDelete: (id) => {
    set((s) => ({ trash: s.trash.filter((n) => n.id !== id) }));
  },

  emptyTrash: () => set({ trash: [] }),

  moveNoteUp: (id) => set((s) => {
    const idx = s.notes.findIndex((n) => n.id === id);
    if (idx <= 0) return s;
    const arr = [...s.notes];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    return { notes: arr };
  }),

  moveNoteDown: (id) => set((s) => {
    const idx = s.notes.findIndex((n) => n.id === id);
    if (idx < 0 || idx >= s.notes.length - 1) return s;
    const arr = [...s.notes];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    return { notes: arr };
  }),

  moveNoteToIndex: (id, toIndex) => set((s) => {
    const idx = s.notes.findIndex((n) => n.id === id);
    if (idx < 0 || toIndex < 0 || toIndex >= s.notes.length) return s;
    const arr = [...s.notes];
    const [item] = arr.splice(idx, 1);
    arr.splice(toIndex, 0, item);
    return { notes: arr };
  }),

  setActiveNote: (id) => set({ activeNoteId: id }),

  togglePin: (id) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)),
    }));
  },

  toggleFavorite: (id) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, isFavorite: !n.isFavorite } : n)),
    }));
  },

  openFile: async () => {
    const path = await open({
      multiple: false,
      filters: [],
    });
    if (!path || typeof path !== 'string') return false;
    const ext = fileExt(path);
    const isBinary = binaryExts.includes(ext);
    const content: string = isBinary
      ? await readFileAsBase64(path)
      : await readTextFile(path);
    const fileName = path.split(/[\\/]/).pop() ?? path;
    const title = fileName.replace(/\.[^.]+$/, '');
    const existing = get().notes.find((n) => n.filePath === path);
    if (existing) {
      set({ activeNoteId: existing.id, viewMode: 'notes' });
      return true;
    }
    const notes = get().notes;
    const colorIndex = notes.length % COLORS.length;
    const newNote: Note = {
      id: uuidv4(), title, content,
      color: COLORS[colorIndex], tags: [],
      isPinned: false, isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      filePath: path,
      editMode: true,
    };
    set((s) => ({ notes: [newNote, ...s.notes], activeNoteId: newNote.id, viewMode: 'notes' }));
    return true;
  },

  saveFile: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) { get().showToast(tKey(get().language, 'toast_note_not_found')); return false; }
    if (isMobile) {
      try {
        const { invoke: invokeMobile } = await import('@tauri-apps/api/core');
        const ok = await invokeMobile<boolean>('check_storage_permission');
        if (!ok) {
          get().showToast(tKey(get().language, 'toast_grant_storage'));
          set({ needsPermissionRedirect: true });
          return false;
        }
      } catch {
        get().showToast(tKey(get().language, 'toast_grant_storage'));
        set({ needsPermissionRedirect: true });
        return false;
      }
    }
    const text = note.filePath ? note.content : getContentText(note.content);
    if (!note.filePath) {
      if (isMobile) {
        get().showToast(tKey(get().language, 'toast_choose_save_location'));
        set({ fileBrowserOpen: true, fileBrowserNoteId: id });
        return false;
      }
      get().showToast(tKey(get().language, 'toast_opening_save_dialog'));
      try {
        const uri = await invoke<string | null>('save_file_dialog', {
          fileName: `${note.title || 'untitled'}.txt`,
          content: text,
        });
        if (!uri) { get().showToast(tKey(get().language, 'toast_save_cancelled')); return false; }
        get().updateNote(id, { filePath: uri, content: text });
        get().showToast(tKey(get().language, 'toast_saved'));
        return true;
      } catch (e) {
        const msg = typeof e === 'string' ? e : String(e);
        get().addLog('saveFile: ' + msg);
        get().showToast(tKey(get().language, 'toast_save_failed') + msg, 'error');
        return false;
      }
    }
    const ext = fileExt(note.filePath);
    const isBinary = binaryExts.includes(ext);
    const isContentUri = note.filePath.startsWith('content://');
    if (isContentUri) {
      try {
        if (isBinary) {
          await invoke('write_content_to_uri', { uri: note.filePath, content: note.content });
        } else {
          await invoke('write_content_to_uri', { uri: note.filePath, content: text });
        }
      } catch (e) {
        const msg = typeof e === 'string' ? e : String(e);
        get().addLog(`saveFile(write_content_to_uri): ${msg}`);
        get().showToast(tKey(get().language, 'toast_save_failed') + msg, 'error');
        return false;
      }
      return true;
    }
    const dir = note.filePath.replace(/[\\/][^\\/]+$/, '');
    const fileExtOf = note.filePath.match(/\.[^.]+$/)?.[0] ?? (isBinary ? '.xlsx' : '.txt');
    const newPath = `${dir}${pathSep}${note.title || 'untitled'}${fileExtOf}`;
    if (newPath !== note.filePath) {
      try {
        await invoke('rename_file', { oldPath: note.filePath, newPath });
      } catch (e) {
        const msg = typeof e === 'string' ? e : String(e);
        get().addLog('saveFile(rename_file): ' + msg);
        get().showToast(tKey(get().language, 'toast_rename_failed') + msg, 'error');
        return false;
      }
      get().updateNote(id, { filePath: newPath });
    }
    try {
      if (isBinary) {
        await invoke('save_binary', { path: newPath, content: note.content });
      } else {
        await invoke('save_to_path', { filePath: newPath, content: text });
      }
      get().showToast(tKey(get().language, 'toast_saved'));
      return true;
    } catch (e) {
      const msg = typeof e === 'string' ? e : String(e);
      get().addLog('saveFile(write): ' + msg);
      get().showToast(tKey(get().language, 'toast_save_failed') + msg, 'error');
      return false;
    }
  },

  finishFileBrowserSave: async (id, path) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) { set({ fileBrowserOpen: false, fileBrowserNoteId: null }); return false; }
    const ext = fileExt(path);
    let text = note.content;
    if (note.filePath) {
      text = note.content;
    } else if (ext === 'md') {
      text = `# ${note.title}\n\n${htmlToMarkdown(note.content)}`;
    } else if (ext === 'html') {
      text = htmlToFullHtml(note.title, note.content);
    } else {
      text = getContentText(note.content);
    }
    try {
      await invoke('save_to_path', { filePath: path, content: text });
      get().updateNote(id, { filePath: path, content: text });
      get().showToast(tKey(get().language, 'toast_saved'));
      set({ fileBrowserOpen: false, fileBrowserNoteId: null });
      return true;
    } catch (e) {
      const msg = typeof e === 'string' ? e : String(e);
      get().addLog('finishFileBrowserSave: ' + msg);
      get().showToast(tKey(get().language, 'toast_save_failed') + msg);
      set({ fileBrowserOpen: false, fileBrowserNoteId: null });
      return false;
    }
  },

  saveFileAs: async (id, ext) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return false;
    let content = note.content;
    if (note.filePath) {
      content = note.content;
    } else if (ext === 'txt') {
      content = getContentText(note.content);
    } else if (ext === 'md') {
      content = `# ${note.title}\n\n${htmlToMarkdown(note.content)}`;
    } else if (ext === 'html') {
      content = htmlToFullHtml(note.title, note.content);
    } else {
      content = getContentText(note.content);
    }
    try {
      const uri = await invoke<string | null>('save_file_dialog', {
        fileName: `${note.title || 'untitled'}.${ext}`,
        content,
      });
      if (!uri) return false;
      get().updateNote(id, { filePath: uri });
      return true;
    } catch (e) {
      const msg = typeof e === 'string' ? e : String(e);
      get().addLog('saveFileAs: ' + msg);
      get().showToast(tKey(get().language, 'toast_save_failed') + msg);
      return false;
    }
  },

  saveAsAny: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return false;
    const text = getContentText(note.content);
    try {
      const uri = await invoke<string | null>('save_file_dialog', {
        fileName: `${note.title || 'untitled'}.txt`,
        content: text,
      });
      if (!uri) return false;
      get().updateNote(id, { filePath: uri });
      return true;
    } catch (e) {
      const msg = typeof e === 'string' ? e : String(e);
      get().addLog('saveAsAny: ' + msg);
      get().showToast(tKey(get().language, 'toast_save_failed') + msg);
      return false;
    }
  },

  getSaveFormats: (note) => {
    const formats: SaveFormat[] = [];
    if (!note) return formats;
    const origExt = note.filePath ? note.filePath.match(/\.([^.]+)$/)?.[1] : null;
    if (origExt) {
      formats.push({ label: origExt.toUpperCase(), ext: origExt, isOriginal: true });
    } else {
      const common = ['txt', 'html', 'md', 'json', 'xml', 'csv', 'css', 'js', 'py'];
      for (const ext of common) {
        formats.push({ label: ext.toUpperCase(), ext, isOriginal: false });
      }
    }
    return formats;
  },

  openFileFromEvent: (path, content) => {
    const existing = get().notes.find((n) => n.filePath === path);
    if (existing) {
      set({ activeNoteId: existing.id, viewMode: 'notes' });
      return;
    }
    const fileName = path.split(/[\\/]/).pop() ?? path;
    const title = fileName.replace(/\.[^.]+$/, '');
    const notes = get().notes;
    const colorIndex = notes.length % COLORS.length;
    const newNote: Note = {
      id: uuidv4(),
      title,
      content,
      color: COLORS[colorIndex],
      tags: [],
      isPinned: false,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      filePath: path,
      editMode: true,
    };
    set((s) => ({ notes: [newNote, ...s.notes], activeNoteId: newNote.id, viewMode: 'notes' }));
  },
});