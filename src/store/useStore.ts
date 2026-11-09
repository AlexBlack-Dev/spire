import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notesSlice } from './slices/notesSlice';
import { tasksSlice } from './slices/tasksSlice';
import { folderSlice } from './slices/folderSlice';
import { lockSlice } from './slices/lockSlice';
import { uiSlice } from './slices/uiSlice';
import { settingsSlice } from './slices/settingsSlice';
import { converterSlice } from './slices/converterSlice';
import { validateBackup } from '../utils/backup';
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
      version: 3,
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== 'object') {
          return persisted as SpireStore;
        }
        const raw = persisted as Record<string, unknown>;
        if (version < 3) {
          const validated = validateBackup({
            ...raw,
            trash: raw.trash ?? [],
            noteFolders: raw.noteFolders ?? [],
          });
          if (validated) {
            return { ...raw, ...validated } as SpireStore;
          }
        }
        return raw as unknown as SpireStore;
      },
      partialize: (s) => ({
        notes: s.notes,
        tasks: s.tasks,
        trash: s.trash,
        noteFolders: s.noteFolders,
        theme: s.theme,
        accentColor: s.accentColor,
        language: s.language,
        activeNoteId: s.activeNoteId,
        viewMode: s.viewMode,
        sortMode: s.sortMode,
        searchQuery: s.searchQuery,
        sidebarOpen: s.sidebarOpen,
        permBannerDismissed: s.permBannerDismissed,
        showFileExtensions: s.showFileExtensions,
      }),
    }
  )
);

export type { SpireStore, LogEntry, ToastItem, SaveFormat } from './types';
export { tKey, COLORS, getContentText, htmlToMarkdown } from './helpers';
