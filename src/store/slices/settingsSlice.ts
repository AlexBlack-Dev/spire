import { invoke } from '@tauri-apps/api/core';
import { open, } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { tKey } from '../helpers';
import type { SpireSlice } from '../types';

export const settingsSlice: SpireSlice = (set, get) => ({
  exportData: async () => {
    try {
      const s = get();
      const payload = {
        notes: s.notes,
        tasks: s.tasks,
        trash: s.trash,
        noteFolders: s.noteFolders,
        theme: s.theme,
        accentColor: s.accentColor,
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
      get().showToast(tKey(get().language, 'toast_exported'));
    } catch (e) {
      const msg = typeof e === 'string' ? e : String(e);
      get().addLog('exportData: ' + msg);
      get().showToast(tKey(get().language, 'toast_export_failed') + msg, 'error');
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
        get().showToast(tKey(get().language, 'toast_invalid_backup'), 'error');
        return;
      }
      set({
        notes: data.notes,
        tasks: data.tasks,
        trash: Array.isArray(data.trash) ? data.trash : [],
        noteFolders: Array.isArray(data.noteFolders) ? data.noteFolders : [],
        theme: data.theme || 'dark',
        accentColor: data.accentColor || 'violet',
        language: data.language || 'en',
      });
      get().showToast(tKey(get().language, 'toast_imported'));
    } catch {
      get().showToast(tKey(get().language, 'toast_import_failed'), 'error');
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
});