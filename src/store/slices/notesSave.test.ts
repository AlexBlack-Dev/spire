import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { create } from 'zustand';
import { notesSlice } from './notesSlice';
import { uiSlice } from './uiSlice';
import { pathSep } from '../../isMobile';
import type { SpireStore } from '../types';
import type { Note } from '../../types';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';

function buildStore() {
  return create<SpireStore>()(
    (set, get) =>
      ({
        ...uiSlice(set, get),
        ...notesSlice(set, get),
      }) as SpireStore
  );
}

function makeFileNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'note',
    content: '<p>raw &amp; untouched</p>',
    color: 'violet',
    tags: [],
    isPinned: false,
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    filePath: `C:\\notes\\note.txt`,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(invoke).mockReset();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('notesSlice.saveFile', () => {
  it('writes raw file content without HTML conversion', async () => {
    const store = buildStore();
    store.setState({ notes: [makeFileNote()] });
    vi.mocked(invoke).mockResolvedValue(undefined);

    const ok = await store.getState().saveFile('note-1');

    expect(ok).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('save_to_path', {
      filePath: 'C:\\notes\\note.txt',
      content: '<p>raw &amp; untouched</p>',
    });
  });

  it('writes before renaming and updates the path', async () => {
    const store = buildStore();
    store.setState({ notes: [makeFileNote({ title: 'Renamed' })] });
    vi.mocked(invoke).mockResolvedValue(undefined);

    const ok = await store.getState().saveFile('note-1');

    expect(ok).toBe(true);
    expect(invoke).toHaveBeenNthCalledWith(1, 'save_to_path', {
      filePath: 'C:\\notes\\note.txt',
      content: '<p>raw &amp; untouched</p>',
    });
    expect(invoke).toHaveBeenNthCalledWith(2, 'rename_file', {
      oldPath: 'C:\\notes\\note.txt',
      newPath: `C:\\notes${pathSep}Renamed.txt`,
    });
    expect(store.getState().notes[0].filePath).toBe(`C:\\notes${pathSep}Renamed.txt`);
  });

  it('does not rename when the write fails', async () => {
    const store = buildStore();
    store.setState({ notes: [makeFileNote({ title: 'Renamed' })] });
    vi.mocked(invoke).mockRejectedValueOnce(new Error('disk full'));

    const ok = await store.getState().saveFile('note-1');

    expect(ok).toBe(false);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('save_to_path', expect.any(Object));
    expect(store.getState().notes[0].filePath).toBe('C:\\notes\\note.txt');
  });
});
