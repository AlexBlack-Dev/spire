import { describe, it, expect } from 'vitest';
import { validateBackup } from './backup';

const validNote = {
  id: 'note-1',
  title: 'Title',
  content: '<p>body</p>',
  color: 'blue',
  tags: ['a', 1],
  isPinned: true,
  isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  filePath: 'C:\\notes\\file.txt',
};

const validTask = {
  id: 'task-1',
  text: 'Do it',
  completed: false,
  priority: 'high',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('validateBackup', () => {
  it('rejects payloads without notes or tasks arrays', () => {
    expect(validateBackup(null)).toBeNull();
    expect(validateBackup({})).toBeNull();
    expect(validateBackup({ notes: 'nope', tasks: [] })).toBeNull();
    expect(validateBackup({ notes: [], tasks: 'nope' })).toBeNull();
  });

  it('keeps valid notes and tasks, dropping invalid entries', () => {
    const result = validateBackup({
      notes: [validNote, { title: 42 }],
      tasks: [validTask, 'bad'],
      trash: [],
      noteFolders: [],
      theme: 'light',
      accentColor: 'teal',
      language: 'ru',
    });
    expect(result).not.toBeNull();
    expect(result?.notes).toHaveLength(2);
    expect(result?.notes[0].title).toBe('Title');
    expect(result?.notes[0].tags).toEqual(['a']);
    expect(result?.tasks).toHaveLength(1);
    expect(result?.tasks[0].priority).toBe('high');
    expect(result?.theme).toBe('light');
    expect(result?.accentColor).toBe('teal');
    expect(result?.language).toBe('ru');
  });

  it('drops relative file paths but keeps absolute and content URIs', () => {
    const relative = validateBackup({
      notes: [{ ...validNote, filePath: 'relative/file.txt' }],
      tasks: [],
    });
    expect(relative?.notes[0].filePath).toBeUndefined();

    const absolute = validateBackup({
      notes: [{ ...validNote, filePath: '/home/user/notes.txt' }],
      tasks: [],
    });
    expect(absolute?.notes[0].filePath).toBe('/home/user/notes.txt');

    const uri = validateBackup({
      notes: [{ ...validNote, filePath: 'content://com.android.providers/document/1' }],
      tasks: [],
    });
    expect(uri?.notes[0].filePath).toBe('content://com.android.providers/document/1');
  });

  it('falls back to safe defaults for unknown enums', () => {
    const result = validateBackup({
      notes: [],
      tasks: [],
      theme: 'neon',
      accentColor: 'pink',
      language: 'de',
    });
    expect(result?.theme).toBe('dark');
    expect(result?.accentColor).toBe('violet');
    expect(result?.language).toBe('en');
  });

  it('removes dangling folder references', () => {
    const result = validateBackup({
      notes: [{ ...validNote, id: 'kept' }],
      tasks: [],
      noteFolders: [
        { id: 'folder-1', name: 'Work', noteIds: ['kept', 'missing'] },
      ],
    });
    expect(result?.noteFolders[0].noteIds).toEqual(['kept']);
  });
});
