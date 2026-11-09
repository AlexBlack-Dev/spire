import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { lockSlice } from './lockSlice';
import { uiSlice } from './uiSlice';
import { PBKDF2_ITERATIONS } from '../helpers';
import type { SpireStore } from '../types';
import type { Note } from '../../types';

function buildStore() {
  return create<SpireStore>()(
    (set, get) =>
      ({
        ...uiSlice(set, get),
        ...lockSlice(set, get),
      }) as SpireStore
  );
}

function makeNote(password?: string): Note {
  return {
    id: 'note-1',
    title: 'Secret',
    content: 'hidden',
    color: 'violet',
    tags: [],
    isPinned: false,
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    password,
  };
}

async function legacyHash(password: string): Promise<string> {
  const salt = '00112233445566778899aabbccddeeff';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + password));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return `v2$${salt}$${hex}`;
}

describe('lockSlice', () => {
  it('sets a PBKDF2 hash and verifies it', async () => {
    const store = buildStore();
    store.setState({ notes: [makeNote()] });

    await store.getState().setNotePassword('note-1', 'secret');
    const hash = store.getState().notes[0].password;
    expect(hash).toMatch(new RegExp(`^v3\\$${PBKDF2_ITERATIONS}\\$`));

    expect(await store.getState().verifyNotePassword('note-1', 'secret')).toBe(true);
    expect(await store.getState().verifyNotePassword('note-1', 'wrong')).toBe(false);
  });

  it('rehashes legacy hashes after a successful unlock', async () => {
    const store = buildStore();
    store.setState({ notes: [makeNote(await legacyHash('legacy'))] });

    expect(await store.getState().verifyNotePassword('note-1', 'legacy')).toBe(true);
    expect(store.getState().notes[0].password).toMatch(/^v3\$/);
  });

  it('does not rehash after a failed unlock', async () => {
    const store = buildStore();
    const legacy = await legacyHash('legacy');
    store.setState({ notes: [makeNote(legacy)] });

    expect(await store.getState().verifyNotePassword('note-1', 'wrong')).toBe(false);
    expect(store.getState().notes[0].password).toBe(legacy);
  });
});
