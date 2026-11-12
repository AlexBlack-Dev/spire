import { tKey } from '../helpers';
import { sealNotes } from '../noteCrypto';
import { clearRestorePoint, readRestorePoint, writeRestorePoint } from '../persistStorage';
import { validateBackup } from '../../utils/backup';
import type { SpireSlice, SpireStore } from '../types';

async function takePreImportSnapshot(s: {
  notes: unknown; tasks: unknown; trash: unknown; noteFolders: unknown;
  theme: unknown; accentColor: unknown; language: unknown; activeNoteId: unknown; viewMode: unknown;
}): Promise<string | null> {
  try {
    const snapshot = JSON.stringify({
      notes: s.notes, tasks: s.tasks, trash: s.trash, noteFolders: s.noteFolders,
      theme: s.theme, accentColor: s.accentColor, language: s.language,
      activeNoteId: s.activeNoteId, viewMode: s.viewMode,
    });
    await writeRestorePoint(snapshot);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export const settingsSlice: SpireSlice = (set, get) => ({
  exportData: async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const s = get();
      const payload = {
        version: 3,
        notes: await sealNotes(s.notes),
        tasks: s.tasks,
        trash: await sealNotes(s.trash),
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
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const path = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!path || typeof path !== 'string') return;
      const json = await readTextFile(path);
      let data: unknown;
      try {
        data = JSON.parse(json);
      } catch {
        get().showToast(tKey(get().language, 'toast_invalid_backup'), 'error');
        return;
      }
      const backup = validateBackup(data);
      if (!backup) {
        get().showToast(tKey(get().language, 'toast_invalid_backup'), 'error');
        return;
      }
      const s = get();
      const snapErr = await takePreImportSnapshot(s);
      if (snapErr) get().addLog('pre-import snapshot: ' + snapErr);
      set({
        ...backup,
        activeNoteId: null,
        viewMode: 'notes',
      });
      get().showToast(tKey(get().language, 'toast_imported'));
    } catch (e) {
      const msg = typeof e === 'string' ? e : String(e);
      get().addLog('importData: ' + msg);
      get().showToast(tKey(get().language, 'toast_import_failed') + msg, 'error');
    }
  },

  restorePreImportBackup: async () => {
    try {
      const raw = await readRestorePoint();
      if (!raw) {
        get().showToast(tKey(get().language, 'toast_no_pre_import_backup'), 'error');
        return;
      }
      const backup = validateBackup(JSON.parse(raw));
      if (!backup) {
        await clearRestorePoint();
        get().showToast(tKey(get().language, 'toast_invalid_backup'), 'error');
        return;
      }
      set({ ...backup, activeNoteId: null, viewMode: 'notes' });
      await clearRestorePoint();
      get().showToast(tKey(get().language, 'toast_pre_import_restored'));
    } catch (e) {
      const msg = typeof e === 'string' ? e : String(e);
      get().addLog('restorePreImportBackup: ' + msg);
      get().showToast(tKey(get().language, 'toast_import_failed') + msg, 'error');
    }
  },

  migrateFromBlum: async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const raw = await invoke<string | null>('migrate_from_blum');
      if (!raw) return false;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;
      const state = (parsed as Record<string, unknown>).state;
      if (!state || typeof state !== 'object') return false;
      const s = state as Record<string, unknown>;
      const backup = validateBackup({
        notes: s.notes ?? [],
        tasks: s.tasks ?? [],
        trash: Array.isArray(s.trash) ? s.trash : [],
        noteFolders: Array.isArray(s.noteFolders) ? s.noteFolders : [],
        theme: s.theme,
        accentColor: s.accentColor,
        language: s.language,
      });
      if (!backup) return false;
      set({ ...backup });
      if (typeof s.viewMode === 'string') set({ viewMode: s.viewMode as SpireStore['viewMode'] });
      if (typeof s.sortMode === 'string') set({ sortMode: s.sortMode as SpireStore['sortMode'] });
      if (s.searchQuery !== undefined) set({ searchQuery: String(s.searchQuery) });
      if (s.sidebarOpen !== undefined) set({ sidebarOpen: !!s.sidebarOpen });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      get().addLog('migrateFromBlum: ' + msg);
      return false;
    }
  },
});
