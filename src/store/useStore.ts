import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notesSlice } from './slices/notesSlice';
import { tasksSlice } from './slices/tasksSlice';
import { folderSlice } from './slices/folderSlice';
import { lockSlice } from './slices/lockSlice';
import { uiSlice } from './slices/uiSlice';
import { settingsSlice } from './slices/settingsSlice';
import { converterSlice } from './slices/converterSlice';
import type { SpireStore } from './types';

export const useStore = create<SpireStore>()(
  persist(
    (set, get) => ({
      ...converterSlice(set, get),
      ...uiSlice(set, get),
      ...lockSlice(set, get),
      ...notesSlice(set, get),
      ...tasksSlice(set, get),
      ...folderSlice(set, get),
      ...settingsSlice(set, get),
    }) as SpireStore,
    {
      name: 'spire-storage',
      partialize: (s) => ({
        notes: s.notes,
        tasks: s.tasks,
        trash: s.trash,
        noteFolders: s.noteFolders,
        theme: s.theme,
        accentColor: s.accentColor,
        activeNoteId: s.activeNoteId,
        viewMode: s.viewMode,
        sortMode: s.sortMode,
        searchQuery: s.searchQuery,
        sidebarOpen: s.sidebarOpen,
        permBannerDismissed: s.permBannerDismissed,
        antiPaste: s.antiPaste,
      }),
    }
  )
);

export type { SpireStore, LogEntry, ToastItem, SaveFormat } from './types';
export { tKey, COLORS, getContentText, htmlToMarkdown } from './helpers';