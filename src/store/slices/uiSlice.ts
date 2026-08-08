import { v4 as uuidv4 } from 'uuid';
import type { SpireSlice } from '../types';
import type { ChangelogEntry } from '../../utils/changelog';
import { parseChangelog } from '../../utils/changelog';

const CHANGELOG_URL = 'https://raw.githubusercontent.com/AlexBlack-Dev/spire/master/CHANGELOG.md';

export const uiSlice: SpireSlice = (set) => ({
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
  antiPaste: false,
  changelogRequest: 0,
  changelogEntries: [] as ChangelogEntry[],
  changelogLoading: false,
  changelogFailed: false,
  changelogVersion: null,
  showFileExtensions: false,
  toasts: [],

  setViewMode: (mode) => set({ viewMode: mode }),
  setSortMode: (mode) => set({ sortMode: mode }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  showToast: (message, type = 'success') => {
    const id = uuidv4();
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },

  dismissToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  setLanguage: (lang) => set({ language: lang }),
  setTheme: (theme) => set({ theme }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  toggleAntiPaste: () => set((s) => ({ antiPaste: !s.antiPaste })),
  setShowFileExtensions: (show) => set({ showFileExtensions: show }),
  setSplashDone: () => set({ splashDone: true }),
  setToolsSubPage: (page) => set({ toolsSubPage: page }),
  dismissPermBanner: () => set({ permBannerDismissed: true }),
  requestChangelog: () => set({ changelogRequest: Date.now() }),
  fetchChangelog: () => {
    set({ changelogLoading: true, changelogFailed: false });
    fetch(CHANGELOG_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((body) => set({ changelogEntries: parseChangelog(body), changelogLoading: false }))
      .catch((e) => {
        console.warn('changelog fetch failed', e);
        set({ changelogFailed: true, changelogLoading: false });
      });
  },
  setChangelogVersion: (version) => set({ changelogVersion: version }),
  addLog: (msg) => set((s) => {
    const logs = [{ time: new Date().toLocaleString(), msg }, ...s.errorLogs].slice(0, 200);
    return { errorLogs: logs };
  }),
});