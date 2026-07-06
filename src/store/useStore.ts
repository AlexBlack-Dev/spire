import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile, readFile, writeFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import type { Note, Task, ViewMode, SortMode, NoteColor, Folder, ThemeMode } from '../types';
import type { Language } from '../i18n/translations';
import { isMobile, pathSep } from '../isMobile';
import { conversionFormats } from '../types';

function pwHash(pw: string): string {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = ((h << 5) - h) + pw.charCodeAt(i);
    h |= 0;
  }
  return 'h' + Math.abs(h).toString(36);
}

export interface LogEntry {
  time: string;
  msg: string;
}

export interface SaveFormat {
  label: string;
  ext: string;
  isOriginal: boolean;
}

interface SpireStore {
  notes: Note[];
  tasks: Task[];
  trash: Note[];
  noteFolders: Folder[];
  theme: ThemeMode;
  accentColor: NoteColor;
  activeNoteId: string | null;
  viewMode: ViewMode;
  sortMode: SortMode;
  searchQuery: string;
  sidebarOpen: boolean;
  language: Language;
  settingsOpen: boolean;
  splashDone: boolean;
  toolsSubPage: string | null;
  permBannerDismissed: boolean;
  errorLogs: LogEntry[];
  fileBrowserOpen: boolean;
  fileBrowserNoteId: string | null;
  needsPermissionRedirect: boolean;
  antiPaste: boolean;

  // Converter
  converterInputFile: string | null;
  converterOutputFormat: string;
  converterPreview: string | null;
  converterLoading: boolean;

  // Lock
  setNotePassword: (id: string, password: string) => void;
  clearNotePassword: (id: string) => void;
  verifyNotePassword: (id: string, password: string) => boolean;
  setFolderPassword: (id: string, password: string) => void;
  clearFolderPassword: (id: string) => void;
  verifyFolderPassword: (id: string, password: string) => boolean;
  lockedNoteExpiries: Record<string, number>;
  unlockNote: (id: string, durationMs: number) => void;
  lockNote: (id: string) => void;
  lockPromptState: { noteId: string; mode: 'unlock' | 'set' | 'remove' } | null;
  showLockPrompt: (noteId: string, mode: 'unlock' | 'set' | 'remove') => void;
  hideLockPrompt: () => void;

  // Notes
  createNote: () => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  restoreFromTrash: (id: string) => void;
  permanentDelete: (id: string) => void;
  emptyTrash: () => void;
  moveNoteUp: (id: string) => void;
  moveNoteDown: (id: string) => void;
  moveNoteToIndex: (id: string, toIndex: number) => void;
  setActiveNote: (id: string | null) => void;
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  openFile: () => Promise<boolean>;
  saveFile: (id: string) => Promise<boolean>;
  finishFileBrowserSave: (id: string, path: string) => Promise<boolean>;
  openFileFromEvent: (path: string, content: string) => void;
  getSaveFormats: (note: Note | undefined) => SaveFormat[];
  saveFileAs: (id: string, ext: string) => Promise<boolean>;
  saveAsAny: (id: string) => Promise<boolean>;

  // Tasks
  createTask: (text: string, priority?: Task['priority']) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  moveTaskUp: (id: string) => void;
  moveTaskDown: (id: string) => void;

  // UI
  setViewMode: (mode: ViewMode) => void;
  setSortMode: (mode: SortMode) => void;
  setSearchQuery: (q: string) => void;
  toggleSidebar: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;

  // Settings
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: NoteColor) => void;
  setSettingsOpen: (open: boolean) => void;
  toggleAntiPaste: () => void;
  setSplashDone: () => void;
  setToolsSubPage: (page: string | null) => void;
  dismissPermBanner: () => void;
  addLog: (msg: string) => void;
  exportData: () => Promise<void>;
  importData: () => Promise<void>;
  migrateFromBlum: () => Promise<boolean>;

  // Folders
  createFolder: (name: string) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  addNoteToFolder: (noteId: string, folderId: string) => void;
  removeNoteFromFolder: (noteId: string, folderId: string) => void;

  // Converter
  converterSelectFile: () => Promise<void>;
  setConverterOutputFormat: (fmt: string) => void;
  runConversion: () => Promise<void>;
  resetConverter: () => void;
}

const COLORS: NoteColor[] = ['violet', 'blue', 'teal', 'green', 'amber', 'rose'];

function getContentText(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function htmlToFullHtml(title: string, content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:system-ui;max-width:800px;margin:40px auto;line-height:1.7}</style></head><body><h1>${title}</h1>${content}</body></html>`;
}

async function readFileAsBase64(path: string): Promise<string> {
  const buf = await readFile(path);
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const useStore = create<SpireStore>()(
  persist(
    (set, get) => ({
      notes: [],
      tasks: [],
      trash: [],
      noteFolders: [],
      theme: 'dark',
      accentColor: 'violet',
      activeNoteId: null,
      viewMode: 'notes',
      sortMode: 'date',
      searchQuery: '',
      sidebarOpen: true,
      language: 'en',
      settingsOpen: false,
      splashDone: false,
      toolsSubPage: null,
      permBannerDismissed: false,
      errorLogs: [],
      fileBrowserOpen: false,
      fileBrowserNoteId: null,
      needsPermissionRedirect: false,
      antiPaste: false,
      lockedNoteExpiries: {},
      lockPromptState: null,
      converterInputFile: null,
      converterOutputFormat: 'txt',
      converterPreview: null,
      converterLoading: false,

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
        };
        set((s) => ({ notes: [newNote, ...s.notes], activeNoteId: newNote.id }));
      },

      updateNote: (id, updates) => {
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
          ),
        }));
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
        const ext = path.split('.').pop()?.toLowerCase() || '';
        const binaryExts = ['xlsx', 'xls', 'ods'];
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
        };
        set((s) => ({ notes: [newNote, ...s.notes], activeNoteId: newNote.id, viewMode: 'notes' }));
        return true;
      },

      saveFile: async (id) => {
        const note = get().notes.find((n) => n.id === id);
        if (!note) { get().showToast('Note not found'); return false; }
        // Check storage permission on mobile
        if (isMobile) {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            const ok = await invoke<boolean>('check_storage_permission');
            if (!ok) {
              get().showToast('Grant storage permission to save files');
              set({ needsPermissionRedirect: true });
              return false;
            }
          } catch {
            get().showToast('Grant storage permission to save files');
            set({ needsPermissionRedirect: true });
            return false;
          }
        }
        const text = getContentText(note.content);
        if (!note.filePath) {
          // On Android, use in-app file browser instead of SAF dialog
          if (isMobile) {
            get().showToast('Choose save location...');
            set({ fileBrowserOpen: true, fileBrowserNoteId: id });
            return false;
          }
          get().showToast('Opening save dialog...');
          try {
            console.log('saveFile: invoking save_file_dialog...');
            const uri = await invoke<string | null>('save_file_dialog', {
              fileName: `${note.title || 'untitled'}.txt`,
              content: text,
            });
            console.log('saveFile: result=', uri);
            if (!uri) { get().showToast('Save cancelled'); return false; }
            get().updateNote(id, { filePath: uri });
            get().showToast('Saved!');
            console.log('saveFile: OK, filePath=', uri);
            return true;
          } catch (e) {
            const msg = typeof e === 'string' ? e : String(e);
            console.error('saveFile: ERROR', msg);
            get().addLog('saveFile: ' + msg);
            get().showToast('Save failed: ' + msg);
            return false;
          }
        }
        const ext = note.filePath.split('.').pop()?.toLowerCase() || '';
        const binaryExts = ['xlsx', 'xls', 'ods'];
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
            get().showToast('Save failed: ' + msg);
            return false;
          }
          return true;
        }
        const dir = note.filePath.replace(/[\\/][^\\/]+$/, '');
        const fileExt = note.filePath.match(/\.[^.]+$/)?.[0] ?? (isBinary ? '.xlsx' : '.txt');
        const newPath = `${dir}${pathSep}${note.title || 'untitled'}${fileExt}`;
        if (newPath !== note.filePath) {
          await invoke('rename_file', { oldPath: note.filePath, newPath });
          get().updateNote(id, { filePath: newPath });
        }
        const targetPath = newPath !== note.filePath ? newPath : note.filePath;
        if (isBinary) {
          await writeFile(targetPath, base64ToBytes(note.content));
        } else {
          await writeTextFile(targetPath, text);
        }
        return true;
      },

      finishFileBrowserSave: async (id, path) => {
        const note = get().notes.find((n) => n.id === id);
        if (!note) { set({ fileBrowserOpen: false, fileBrowserNoteId: null }); return false; }
        const text = getContentText(note.content);
        try {
          await invoke('save_to_path', { filePath: path, content: text });
          get().updateNote(id, { filePath: path });
          get().showToast('Saved!');
          set({ fileBrowserOpen: false, fileBrowserNoteId: null });
          return true;
        } catch (e) {
          const msg = typeof e === 'string' ? e : String(e);
          get().addLog('finishFileBrowserSave: ' + msg);
          get().showToast('Save failed: ' + msg);
          set({ fileBrowserOpen: false, fileBrowserNoteId: null });
          return false;
        }
      },

      saveFileAs: async (id, ext) => {
        const note = get().notes.find((n) => n.id === id);
        if (!note) return false;
        let content = note.content;
        if (ext === 'txt') {
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
          set((s) => ({
            notes: s.notes.map((n) => n.id === id ? { ...n, filePath: uri } : n),
          }));
          return true;
        } catch (e) {
          const msg = typeof e === 'string' ? e : String(e);
          get().addLog('saveFileAs: ' + msg);
          get().showToast('Save failed: ' + msg);
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
          set((s) => ({
            notes: s.notes.map((n) => n.id === id ? { ...n, filePath: uri } : n),
          }));
          return true;
        } catch (e) {
          const msg = typeof e === 'string' ? e : String(e);
          get().addLog('saveAsAny: ' + msg);
          get().showToast('Save failed: ' + msg);
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
        };
        set((s) => ({ notes: [newNote, ...s.notes], activeNoteId: newNote.id, viewMode: 'notes' }));
      },

      createTask: (text, priority = 'medium') => {
        const newTask: Task = {
          id: uuidv4(),
          text,
          completed: false,
          priority,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ tasks: [newTask, ...s.tasks] }));
      },

      updateTask: (id, updates) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      deleteTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      },

      toggleTask: (id) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
        }));
      },

      moveTaskUp: (id) => set((s) => {
        const idx = s.tasks.findIndex((t) => t.id === id);
        if (idx <= 0) return s;
        const arr = [...s.tasks];
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        return { tasks: arr };
      }),

      moveTaskDown: (id) => set((s) => {
        const idx = s.tasks.findIndex((t) => t.id === id);
        if (idx < 0 || idx >= s.tasks.length - 1) return s;
        const arr = [...s.tasks];
        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
        return { tasks: arr };
      }),

      setViewMode: (mode) => set({ viewMode: mode }),
      setSortMode: (mode) => set({ sortMode: mode }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      showToast: () => {},

      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      toggleAntiPaste: () => set((s) => ({ antiPaste: !s.antiPaste })),
      setSplashDone: () => set({ splashDone: true }),
      setToolsSubPage: (page) => set({ toolsSubPage: page }),
      dismissPermBanner: () => set({ permBannerDismissed: true }),
      addLog: (msg) => set((s) => {
        const logs = [{ time: new Date().toLocaleString(), msg }, ...s.errorLogs].slice(0, 200);
        return { errorLogs: logs };
      }),

      exportData: async () => {
        try {
          const s = get();
          const payload = {
            notes: s.notes,
            tasks: s.tasks,
            language: s.language,
            exportedAt: new Date().toISOString(),
            app: 'SPIRE',
          };
          const json = JSON.stringify(payload, null, 2);
          const uri = await invoke<string | null>('save_file_dialog', {
            fileName: 'spire-backup.json',
            content: json,
          });
          if (!uri) return;
          get().showToast('Data exported successfully');
        } catch (e) {
          const msg = typeof e === 'string' ? e : String(e);
          get().addLog('exportData: ' + msg);
          get().showToast('Export failed: ' + msg, 'error');
        }
      },

      importData: async () => {
        const path = await open({
          multiple: false,
          filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (!path || typeof path !== 'string') return;
        try {
          const json = await readTextFile(path);
          const data = JSON.parse(json);
          if (!data.notes || !data.tasks) {
            get().showToast('Invalid backup file', 'error');
            return;
          }
          set({
            notes: data.notes,
            tasks: data.tasks,
            language: data.language || 'en',
          });
          get().showToast('Data imported successfully');
        } catch {
          get().showToast('Failed to import data', 'error');
        }
      },

      migrateFromBlum: async () => {
        try {
          const raw = await invoke<string | null>('migrate_from_blum');
          if (!raw) return false;
          const data = JSON.parse(raw);
          if (!data.state) return false;
          const s = data.state;
          if (s.notes) set({ notes: s.notes });
          if (s.tasks) set({ tasks: s.tasks });
          if (s.language) set({ language: s.language });
          if (s.viewMode) set({ viewMode: s.viewMode });
          if (s.sortMode) set({ sortMode: s.sortMode });
          if (s.searchQuery !== undefined) set({ searchQuery: s.searchQuery });
          if (s.sidebarOpen !== undefined) set({ sidebarOpen: s.sidebarOpen });
          return true;
        } catch {
          return false;
        }
      },

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

      converterSelectFile: async () => {
        const path = await open({ multiple: false, filters: [] });
        if (!path || typeof path !== 'string') return;
        const ext = path.split('.').pop()?.toLowerCase() || '';
        const fmt = conversionFormats[ext] ? ext : 'txt';
        set({ converterInputFile: path, converterOutputFormat: fmt, converterPreview: null });
      },

      setConverterOutputFormat: (fmt) => set({ converterOutputFormat: fmt }),

      runConversion: async () => {
        const st = get();
        const inputPath = st.converterInputFile;
        const outFmt = st.converterOutputFormat;
        if (!inputPath) return;
        set({ converterLoading: true });
        try {
          const inputExt = (inputPath.split('.').pop() || '').toLowerCase();
          const inputCat = conversionFormats[inputExt]?.category;
          const outputCat = conversionFormats[outFmt]?.category;

          if (inputCat === 'image' && outputCat === 'image') {
            const outDir = inputPath.replace(/[\\/][^\\/]+$/, '');
            const outName = (inputPath.split(/[\\/]/).pop() || 'output').replace(/\.[^.]+$/, '');
            const outPath = outDir + pathSep + outName + '.' + outFmt;
            await invoke('convert_image', { inputPath, outputPath: outPath });
            const b64 = await invoke('read_image_base64', { path: outPath }) as string;
            set({ converterPreview: b64, converterLoading: false });
            get().showToast('Converted to .' + outFmt);
            return;
          }

          if (inputCat === 'text' && outputCat === 'text') {
            const content = await readTextFile(inputPath);
            const outDir = inputPath.replace(/[\\/][^\\/]+$/, '');
            const outName = (inputPath.split(/[\\/]/).pop() || 'output').replace(/\.[^.]+$/, '');
            const outPath = outDir + pathSep + outName + '.' + outFmt;
            await writeTextFile(outPath, content);
            set({ converterPreview: content, converterLoading: false });
            get().showToast('Converted to .' + outFmt);
            return;
          }

          get().showToast('Unsupported conversion', 'error');
          set({ converterLoading: false });
        } catch (e) {
          get().showToast('Conversion failed: ' + e, 'error');
          set({ converterLoading: false });
        }
      },

      resetConverter: () => set({ converterInputFile: null, converterOutputFormat: 'txt', converterPreview: null }),

      setNotePassword: (id, password) => {
        const hash = pwHash(password);
        set((s) => ({ notes: s.notes.map((n) => n.id === id ? { ...n, password: hash } : n) }));
      },
      clearNotePassword: (id) => {
        set((s) => ({ notes: s.notes.map((n) => n.id === id ? { ...n, password: undefined } : n) }));
      },
      verifyNotePassword: (id, password) => {
        const note = get().notes.find((n) => n.id === id);
        if (!note?.password) return true;
        return pwHash(password) === note.password;
      },
      setFolderPassword: (id, password) => {
        const hash = pwHash(password);
        set((s) => ({ noteFolders: s.noteFolders.map((f) => f.id === id ? { ...f, password: hash } : f) }));
      },
      clearFolderPassword: (id) => {
        set((s) => ({ noteFolders: s.noteFolders.map((f) => f.id === id ? { ...f, password: undefined } : f) }));
      },
      verifyFolderPassword: (id, password) => {
        const folder = get().noteFolders.find((f) => f.id === id);
        if (!folder?.password) return true;
        return pwHash(password) === folder.password;
      },
      unlockNote: (id, durationMs) => {
        set((s) => ({ lockedNoteExpiries: { ...s.lockedNoteExpiries, [id]: Date.now() + durationMs } }));
      },
      lockNote: (id) => {
        set((s) => {
          const { [id]: _, ...rest } = s.lockedNoteExpiries;
          return { lockedNoteExpiries: rest };
        });
      },
      showLockPrompt: (noteId, mode) => set({ lockPromptState: { noteId, mode } }),
      hideLockPrompt: () => set({ lockPromptState: null }),
    }),
    {
      name: 'spire-storage',
      partialize: (s) => ({
        notes: s.notes, tasks: s.tasks, trash: s.trash, noteFolders: s.noteFolders, theme: s.theme, accentColor: s.accentColor,
        activeNoteId: s.activeNoteId,
        viewMode: s.viewMode, sortMode: s.sortMode,
        searchQuery: s.searchQuery, sidebarOpen: s.sidebarOpen,
        permBannerDismissed: s.permBannerDismissed,
      }),
    }
  )
);
