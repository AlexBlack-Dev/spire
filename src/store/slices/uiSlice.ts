import { v4 as uuidv4 } from 'uuid';
import type { SpireSlice } from '../types';
import type { ChangelogEntry } from '../../utils/changelog';
import { parseChangelog } from '../../utils/changelog';

const CHANGELOG_URL = 'https://raw.githubusercontent.com/AlexBlack-Dev/spire/master/CHANGELOG.md';

const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const uiSlice: SpireSlice = (set, get) => ({
  theme: 'dark',
  accentColor: 'violet',
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
  changelogRequest: 0,
  updateCheckRequest: 0,
  changelogEntries: [] as ChangelogEntry[],
  changelogLoading: false,
  changelogFailed: false,
  changelogVersion: null,
  showFileExtensions: false,
  toasts: [],
  hydrated: false,

  setViewMode: (mode) => set({ viewMode: mode }),
  setSortMode: (mode) => set({ sortMode: mode }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  showToast: (message, type = 'success') => {
    const id = uuidv4();
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, type }] }));
    const timer = setTimeout(() => {
      toastTimers.delete(id);
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
    toastTimers.set(id, timer);
  },

  dismissToast: (id) => {
    const timer = toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.delete(id);
    }
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  setLanguage: (lang) => set({ language: lang }),
  setTheme: (theme) => set({ theme }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setShowFileExtensions: (show) => set({ showFileExtensions: show }),
  setHydrated: () => set({ hydrated: true }),
  setSplashDone: () => set({ splashDone: true }),
  setToolsSubPage: (page) => set({ toolsSubPage: page }),
  dismissPermBanner: () => set({ permBannerDismissed: true }),
  requestChangelog: () => set({ changelogRequest: Date.now() }),
  checkForUpdates: () => set({ updateCheckRequest: Date.now() }),
  fetchChangelog: () => {
    set({ changelogLoading: true, changelogFailed: false });
    fetch(CHANGELOG_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((body) => {
        const entries = parseChangelog(body);
        set((s) => ({
          changelogEntries: entries,
          changelogLoading: false,
          changelogVersion: s.changelogVersion ?? entries[0]?.version ?? null,
        }));
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        get().addLog('changelog fetch: ' + msg);
        set({ changelogFailed: true, changelogLoading: false });
      });
  },
  setChangelogVersion: (version) => set({ changelogVersion: version }),
  addLog: (msg) => set((s) => {
    const logs = [{ time: new Date().toLocaleString(), msg }, ...s.errorLogs].slice(0, 200);
    return { errorLogs: logs };
  }),
});
