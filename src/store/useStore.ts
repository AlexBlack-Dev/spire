import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notesSlice } from './slices/notesSlice';
import { tasksSlice } from './slices/tasksSlice';
import { folderSlice } from './slices/folderSlice';
import { lockSlice } from './slices/lockSlice';
import { uiSlice } from './slices/uiSlice';
import { settingsSlice } from './slices/settingsSlice';
import { converterSlice } from './slices/converterSlice';
import { createSpireStorage, onPersistenceFailure, type PersistedSpireState } from './persistStorage';
import { tKey } from './helpers';
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
      version: 4,
      storage: createSpireStorage(),
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
      partialize: (s): PersistedSpireState => ({
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
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          state?.addLog('state hydration failed: ' + (error instanceof Error ? error.message : String(error)));
          useStore.setState({ hydrated: true, splashDone: true });
          return;
        }
        state?.setHydrated();
      },
    }
  )
);

let lastFailureNotice = 0;

onPersistenceFailure((message, error) => {
  const detail = error instanceof Error ? error.message : String(error ?? '');
  try {
    useStore.getState().addLog(`${message}: ${detail}`);
  } catch {
    console.error('[spire] persistence failure before store init', message, detail);
  }
  const now = Date.now();
  if (now - lastFailureNotice < 30000) return;
  lastFailureNotice = now;
  const state = useStore.getState();
  state.showToast(tKey(state.language, 'toast_storage_failed'), 'error');
});

export type { SpireStore, LogEntry, ToastItem, SaveFormat } from './types';
export { tKey, COLORS, getContentText, htmlToMarkdown } from './helpers';
