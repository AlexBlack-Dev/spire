import { v4 as uuidv4 } from 'uuid';
import type { SpireSlice } from '../types';

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
  setSplashDone: () => set({ splashDone: true }),
  setToolsSubPage: (page) => set({ toolsSubPage: page }),
  dismissPermBanner: () => set({ permBannerDismissed: true }),
  addLog: (msg) => set((s) => {
    const logs = [{ time: new Date().toLocaleString(), msg }, ...s.errorLogs].slice(0, 200);
    return { errorLogs: logs };
  }),
});