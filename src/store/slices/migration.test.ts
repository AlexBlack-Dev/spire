import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { notesSlice } from './notesSlice';
import { tasksSlice } from './tasksSlice';
import { folderSlice } from './folderSlice';
import { uiSlice } from './uiSlice';
import { settingsSlice } from './settingsSlice';
import type { SpireStore } from '../types';

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';

function buildStore() {
  return create<SpireStore>()(
    (set, get) =>
      ({
        ...uiSlice(set, get),
        ...notesSlice(set, get),
        ...tasksSlice(set, get),
        ...folderSlice(set, get),
        ...settingsSlice(set, get),
      }) as SpireStore
  );
}

beforeEach(() => {
  vi.mocked(invoke).mockClear();
});

describe('migrateFromBlum', () => {
  it('returns false when invoke fails', async () => {
    vi.mocked(invoke).mockResolvedValue(null);
    const store = buildStore();
    expect(await store.getState().migrateFromBlum()).toBe(false);
  });

  it('returns false on malformed data', async () => {
    vi.mocked(invoke).mockResolvedValue(JSON.stringify({ noState: true }));
    const store = buildStore();
    expect(await store.getState().migrateFromBlum()).toBe(false);
  });

  it('imports notes, tasks, language and keeps defaults', async () => {
    vi.mocked(invoke).mockResolvedValue(
      JSON.stringify({
        state: {
          notes: [{ id: 'n1', title: 'Migrated', content: '', color: 'violet', tags: [], isPinned: false, isFavorite: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' }],
          tasks: [{ id: 't1', text: 'task', completed: false, priority: 'medium', createdAt: '2024-01-01' }],
          language: 'ru',
        },
      })
    );
    const store = buildStore();
    expect(await store.getState().migrateFromBlum()).toBe(true);
    const s = store.getState();
    expect(s.notes[0].title).toBe('Migrated');
    expect(s.tasks[0].text).toBe('task');
    expect(s.language).toBe('ru');
    expect(s.viewMode).toBe('notes');
  });
});