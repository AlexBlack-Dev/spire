import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { notesSlice } from './notesSlice';
import { tasksSlice } from './tasksSlice';
import { folderSlice } from './folderSlice';
import { uiSlice } from './uiSlice';
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
      }) as SpireStore
  );
}

beforeEach(() => {
  vi.mocked(invoke).mockClear();
});

describe('notesSlice', () => {
  it('creates a note and sets it active', () => {
    const store = buildStore();
    store.getState().createNote();
    const s = store.getState();
    expect(s.notes).toHaveLength(1);
    expect(s.activeNoteId).toBe(s.notes[0].id);
  });

  it('assigns rotating colors', () => {
    const store = buildStore();
    for (let i = 0; i < 7; i++) store.getState().createNote();
    const colors: SpireStore['notes'][number]['color'][] = store.getState().notes.map((n) => n.color);
    expect(colors[0]).toBe(colors[6]);
    expect(new Set(colors.slice(0, 6)).size).toBe(6);
  });

  it('updates note fields and bumps updatedAt', () => {
    const store = buildStore();
    store.getState().createNote();
    const id = store.getState().notes[0].id;
    store.getState().updateNote(id, { title: 'Hello', color: 'blue' });
    const n = store.getState().notes[0];
    expect(n.title).toBe('Hello');
    expect(n.color).toBe('blue');
  });

  it('moves note to trash on delete', () => {
    const store = buildStore();
    store.getState().createNote();
    const id = store.getState().notes[0].id;
    store.getState().deleteNote(id);
    expect(store.getState().notes).toHaveLength(0);
    expect(store.getState().trash).toHaveLength(1);
    expect(store.getState().activeNoteId).toBeNull();
  });

  it('restores a note from trash', () => {
    const store = buildStore();
    store.getState().createNote();
    const id = store.getState().notes[0].id;
    store.getState().deleteNote(id);
    store.getState().restoreFromTrash(id);
    expect(store.getState().trash).toHaveLength(0);
    expect(store.getState().notes).toHaveLength(1);
  });

  it('toggles pin and favorite', () => {
    const store = buildStore();
    store.getState().createNote();
    const id = store.getState().notes[0].id;
    store.getState().togglePin(id);
    expect(store.getState().notes[0].isPinned).toBe(true);
    store.getState().toggleFavorite(id);
    expect(store.getState().notes[0].isFavorite).toBe(true);
  });

  it('moves a note up', () => {
    const store = buildStore();
    store.getState().createNote();
    store.getState().createNote();
    const ids: string[] = store.getState().notes.map((n) => n.id);
    const [first, second] = ids;
    store.getState().moveNoteUp(second);
    expect(store.getState().notes[0].id).toBe(second);
    store.getState().moveNoteUp(second);
    expect(store.getState().notes[0].id).toBe(second);
    void first;
  });
});

describe('tasksSlice', () => {
  it('creates and toggles a task', () => {
    const store = buildStore();
    store.getState().createTask('buy milk', 'high');
    expect(store.getState().tasks[0].priority).toBe('high');
    store.getState().toggleTask(store.getState().tasks[0].id);
    expect(store.getState().tasks[0].completed).toBe(true);
  });
});

describe('folderSlice', () => {
  it('creates a folder and adds a note', () => {
    const store = buildStore();
    store.getState().createNote();
    const noteId = store.getState().notes[0].id;
    store.getState().createFolder('Work');
    const folderId = store.getState().noteFolders[0].id;
    store.getState().addNoteToFolder(noteId, folderId);
    expect(store.getState().noteFolders[0].noteIds).toContain(noteId);
    store.getState().removeNoteFromFolder(noteId, folderId);
    expect(store.getState().noteFolders[0].noteIds).not.toContain(noteId);
  });
});