import type { Note, Task, ViewMode, SortMode, NoteColor, Folder, ThemeMode } from '../types';
import type { Language } from '../i18n/translations';

export interface LogEntry {
  time: string;
  msg: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface SaveFormat {
  label: string;
  ext: string;
  isOriginal: boolean;
}

export interface SpireStore {
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
  changelogRequest: number;
  showFileExtensions: boolean;
  toasts: ToastItem[];

  // Converter
  converterInputFile: string | null;
  converterOutputFormat: string;
  converterPreview: string | null;
  converterLoading: boolean;

  // Lock
  setNotePassword: (id: string, password: string) => Promise<void>;
  clearNotePassword: (id: string) => void;
  verifyNotePassword: (id: string, password: string) => Promise<boolean>;
  setFolderPassword: (id: string, password: string) => Promise<void>;
  clearFolderPassword: (id: string) => void;
  verifyFolderPassword: (id: string, password: string) => Promise<boolean>;
  lockedNoteExpiries: Record<string, number>;
  lockedNoteOpens: Record<string, number>;
  unlockNote: (id: string, durationMs: number) => void;
  unlockNoteOpens: (id: string, opens: number) => void;
  consumeNoteOpen: (id: string) => void;
  isNoteUnlocked: (id: string) => boolean;
  lockNote: (id: string) => void;
  folderLockExpiries: Record<string, number>;
  unlockFolder: (id: string, durationMs: number) => void;
  lockFolder: (id: string) => void;
  isFolderUnlocked: (id: string) => boolean;
  lockPromptState: { id: string; kind: 'note' | 'folder'; mode: 'unlock' | 'set' | 'remove' } | null;
  showLockPrompt: (id: string, kind: 'note' | 'folder', mode: 'unlock' | 'set' | 'remove') => void;
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

  // UI
  setViewMode: (mode: ViewMode) => void;
  setSortMode: (mode: SortMode) => void;
  setSearchQuery: (q: string) => void;
  toggleSidebar: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  dismissToast: (id: string) => void;

  // Settings
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: NoteColor) => void;
  setSettingsOpen: (open: boolean) => void;
  toggleAntiPaste: () => void;
  setShowFileExtensions: (show: boolean) => void;
  setSplashDone: () => void;
  setToolsSubPage: (page: string | null) => void;
  dismissPermBanner: () => void;
  requestChangelog: () => void;
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
  converterDropNote: (noteId: string) => boolean;
}

export type SpireSet = (
  partial: Partial<SpireStore> | ((state: SpireStore) => Partial<SpireStore>)
) => void;

export type SpireSlice = (set: SpireSet, get: () => SpireStore) => Partial<SpireStore>;