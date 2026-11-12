import { describe, expect, it } from 'vitest';
import {
  SEALED_PREFIX, createSalt, deriveContentKey, forgetContentKey,
  isSealedContent, openContent, rememberContentKey, sealContent, sealNotes,
} from './noteCrypto';
import type { Note } from '../types';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Note',
    content: '<p>plain</p>',
    color: 'violet',
    tags: [],
    isPinned: false,
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('noteCrypto', () => {
  it('seals and opens content with a password derived key', async () => {
    const salt = createSalt();
    const key = await deriveContentKey('secret', salt);
    rememberContentKey('note-1', key);
    const sealed = await sealContent('note-1', '<p>classified</p>');
    expect(sealed.startsWith(SEALED_PREFIX)).toBe(true);
    expect(isSealedContent(sealed)).toBe(true);
    expect(sealed).not.toContain('classified');
    expect(await openContent('note-1', sealed)).toBe('<p>classified</p>');
    forgetContentKey('note-1');
  });

  it('fails to open content with the wrong password', async () => {
    const salt = createSalt();
    rememberContentKey('note-1', await deriveContentKey('secret', salt));
    const sealed = await sealContent('note-1', 'classified');
    forgetContentKey('note-1');
    rememberContentKey('note-1', await deriveContentKey('wrong', salt));
    await expect(openContent('note-1', sealed)).rejects.toBeTruthy();
    forgetContentKey('note-1');
  });

  it('refuses to seal without a session key', async () => {
    await expect(sealContent('missing', 'text')).rejects.toThrow('no content key');
  });

  it('seals only locked notes that have a key', async () => {
    const salt = createSalt();
    rememberContentKey('locked', await deriveContentKey('pw', salt));
    const notes = await sealNotes([
      makeNote({ id: 'locked', password: 'v3$hash', salt }),
      makeNote({ id: 'legacy-locked', password: 'v3$hash', salt }),
      makeNote({ id: 'open' }),
    ]);
    expect(isSealedContent(notes[0].content)).toBe(true);
    expect(isSealedContent(notes[1].content)).toBe(false);
    expect(notes[2].content).toBe('<p>plain</p>');
    forgetContentKey('locked');
  });
});
