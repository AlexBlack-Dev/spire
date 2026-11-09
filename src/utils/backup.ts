import { v4 as uuidv4 } from 'uuid';
import type { Folder, Note, Task, NoteColor, ThemeMode, TaskPriority } from '../types';

export interface BackupData {
  notes: Note[];
  tasks: Task[];
  trash: Note[];
  noteFolders: Folder[];
  theme: ThemeMode;
  accentColor: NoteColor;
  language: 'en' | 'ru';
}

const NOTE_COLORS: NoteColor[] = ['violet', 'blue', 'teal', 'green', 'amber', 'rose'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
const THEMES: ThemeMode[] = ['dark', 'light'];
const LANGUAGES = ['en', 'ru'] as const;

const MAX_STRING = 10 * 1024 * 1024;
const MAX_ITEMS = 10000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback: string, maxLen = MAX_STRING): string {
  return typeof v === 'string' && v.length <= maxLen ? v : fallback;
}

function asOptString(v: unknown, maxLen = MAX_STRING): string | undefined {
  return typeof v === 'string' && v.length <= maxLen ? v : undefined;
}

function asBool(v: unknown): boolean {
  return v === true;
}

function asStringArray(v: unknown, maxItems = MAX_ITEMS): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is string => typeof item === 'string').slice(0, maxItems);
}

function asIsoDate(v: unknown): string {
  if (typeof v === 'string' && !Number.isNaN(Date.parse(v))) return v;
  return new Date().toISOString();
}

function asOneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function isAbsolutePath(p: string): boolean {
  return /^([A-Za-z]:[\\/]|\\\\|\/|content:\/\/)/.test(p);
}

function sanitizeNote(v: unknown): Note | null {
  if (!isRecord(v)) return null;
  const now = new Date().toISOString();
  const filePath = asOptString(v.filePath, 4096);
  const note: Note = {
    id: asOptString(v.id, 256) || uuidv4(),
    title: asString(v.title, '', 4096),
    content: asString(v.content, ''),
    color: asOneOf(v.color, NOTE_COLORS, 'violet'),
    tags: asStringArray(v.tags, 100),
    isPinned: asBool(v.isPinned),
    isFavorite: asBool(v.isFavorite),
    createdAt: asIsoDate(v.createdAt) || now,
    updatedAt: asIsoDate(v.updatedAt) || now,
  };
  if (filePath && isAbsolutePath(filePath)) note.filePath = filePath;
  const password = asOptString(v.password, 256);
  if (password) note.password = password;
  if (typeof v.editMode === 'boolean') note.editMode = v.editMode;
  return note;
}

function sanitizeTask(v: unknown): Task | null {
  if (!isRecord(v)) return null;
  const dueDate = asOptString(v.dueDate, 64);
  const noteId = asOptString(v.noteId, 256);
  const task: Task = {
    id: asOptString(v.id, 256) || uuidv4(),
    text: asString(v.text, '', 10000),
    completed: asBool(v.completed),
    priority: asOneOf(v.priority, PRIORITIES, 'medium'),
    createdAt: asIsoDate(v.createdAt) || new Date().toISOString(),
  };
  if (dueDate) task.dueDate = dueDate;
  if (noteId) task.noteId = noteId;
  return task;
}

function sanitizeFolder(v: unknown): Folder | null {
  if (!isRecord(v)) return null;
  const folder: Folder = {
    id: asOptString(v.id, 256) || uuidv4(),
    name: asString(v.name, 'Folder', 4096),
    noteIds: asStringArray(v.noteIds),
  };
  const password = asOptString(v.password, 256);
  if (password) folder.password = password;
  return folder;
}

function sanitizeList<T>(v: unknown, fn: (item: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v.slice(0, MAX_ITEMS)) {
    const parsed = fn(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function validateBackup(data: unknown): BackupData | null {
  if (!isRecord(data)) return null;
  if (!Array.isArray(data.notes) || !Array.isArray(data.tasks)) return null;
  const notes = sanitizeList(data.notes, sanitizeNote);
  const tasks = sanitizeList(data.tasks, sanitizeTask);
  const trash = sanitizeList(data.trash, sanitizeNote);
  const noteFolders = sanitizeList(data.noteFolders, sanitizeFolder);
  const liveIds = new Set(notes.map((n) => n.id));
  for (const folder of noteFolders) {
    folder.noteIds = folder.noteIds.filter((id) => liveIds.has(id));
  }
  return {
    notes,
    tasks,
    trash,
    noteFolders,
    theme: asOneOf(data.theme, THEMES, 'dark'),
    accentColor: asOneOf(data.accentColor, NOTE_COLORS, 'violet'),
    language: asOneOf(data.language, LANGUAGES, 'en'),
  };
}
