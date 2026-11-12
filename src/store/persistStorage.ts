import type { PersistStorage, StorageValue } from 'zustand/middleware';
import type { Folder, Note, NoteColor, SortMode, Task, ThemeMode, ViewMode } from '../types';
import type { Language } from '../i18n/translations';
import { sealNotes } from './noteCrypto';

export interface PersistedSpireState {
  notes: Note[];
  tasks: Task[];
  trash: Note[];
  noteFolders: Folder[];
  theme: ThemeMode;
  accentColor: NoteColor;
  language: Language;
  activeNoteId: string | null;
  viewMode: ViewMode;
  sortMode: SortMode;
  searchQuery: string;
  sidebarOpen: boolean;
  permBannerDismissed: boolean;
  showFileExtensions: boolean;
}

const DB_NAME = 'spire';
const DB_VERSION = 1;
const OBJECT_STORE = 'kv';
const LEGACY_STORAGE_KEY = 'spire-storage';
const LEGACY_RESTORE_KEY = 'spire-pre-import-backup';
const RESTORE_POINT_KEY = 'restore-point';
const MAX_RESTORE_POINT_BYTES = 64 * 1024 * 1024;

type FailureHandler = (message: string, error: unknown) => void;

let failureHandler: FailureHandler | null = null;
let databasePromise: Promise<IDBDatabase | null> | null = null;
let writeChain: Promise<void> = Promise.resolve();

export function onPersistenceFailure(handler: FailureHandler): void {
  failureHandler = handler;
}

function reportFailure(message: string, error: unknown): void {
  console.error(`[spire] ${message}`, error);
  failureHandler?.(message, error);
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    let settled = false;
    const settle = (db: IDBDatabase | null) => {
      if (settled) return;
      settled = true;
      resolve(db);
    };
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(OBJECT_STORE)) db.createObjectStore(OBJECT_STORE);
      };
      request.onsuccess = () => settle(request.result);
      request.onerror = () => {
        reportFailure('indexeddb open failed', request.error);
        settle(null);
      };
      request.onblocked = () => {
        reportFailure('indexeddb blocked by another window', undefined);
        settle(null);
      };
    } catch (e) {
      reportFailure('indexeddb unavailable', e);
      settle(null);
    }
  });
  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexeddb request failed'));
  });
}

async function readValue(key: string): Promise<string | null> {
  const db = await openDatabase();
  if (!db) return null;
  try {
    const transaction = db.transaction(OBJECT_STORE, 'readonly');
    const result = await requestResult(transaction.objectStore(OBJECT_STORE).get(key));
    return typeof result === 'string' ? result : null;
  } catch (e) {
    reportFailure(`indexeddb read failed (${key})`, e);
    return null;
  }
}

async function writeValue(key: string, value: string): Promise<boolean> {
  const db = await openDatabase();
  if (!db) return false;
  try {
    const transaction = db.transaction(OBJECT_STORE, 'readwrite');
    transaction.objectStore(OBJECT_STORE).put(value, key);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('indexeddb write failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('indexeddb write aborted'));
    });
    return true;
  } catch (e) {
    reportFailure(`indexeddb write failed (${key})`, e);
    return false;
  }
}

async function deleteValue(key: string): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  try {
    const transaction = db.transaction(OBJECT_STORE, 'readwrite');
    transaction.objectStore(OBJECT_STORE).delete(key);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('indexeddb delete failed'));
    });
  } catch (e) {
    reportFailure(`indexeddb delete failed (${key})`, e);
  }
}

function readLegacyStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    reportFailure(`localstorage read failed (${key})`, e);
    return null;
  }
}

function removeLegacyStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    reportFailure(`localstorage cleanup failed (${key})`, e);
  }
}

function parseStored(raw: string): StorageValue<PersistedSpireState> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as StorageValue<PersistedSpireState>;
    if (!value.state || typeof value.state !== 'object') return null;
    return value;
  } catch (e) {
    reportFailure('persisted state is not valid json', e);
    return null;
  }
}

function migrateLegacyState(raw: string): Promise<void> {
  writeChain = writeChain.then(async () => {
    const ok = await writeValue(LEGACY_STORAGE_KEY, raw);
    if (ok) removeLegacyStorage(LEGACY_STORAGE_KEY);
  }).catch((e) => reportFailure('legacy state migration failed', e));
  return writeChain;
}

export function createSpireStorage(): PersistStorage<PersistedSpireState> {
  return {
    getItem: async (name) => {
      const stored = await readValue(name);
      if (stored) return parseStored(stored);
      const legacy = readLegacyStorage(name);
      if (!legacy) return null;
      const parsed = parseStored(legacy);
      if (parsed) await migrateLegacyState(legacy);
      return parsed;
    },
    setItem: (name, value) => {
      writeChain = writeChain.then(async () => {
        const sealed: PersistedSpireState = {
          ...value.state,
          notes: await sealNotes(value.state.notes),
          trash: await sealNotes(value.state.trash),
        };
        const json = JSON.stringify({ ...value, state: sealed });
        const ok = await writeValue(name, json);
        if (!ok) throw new Error('indexeddb write returned no database');
      }).catch((e) => reportFailure('state persistence failed', e));
      return writeChain;
    },
    removeItem: async (name) => {
      await deleteValue(name);
      removeLegacyStorage(name);
    },
  };
}

export async function readRestorePoint(): Promise<string | null> {
  const stored = await readValue(RESTORE_POINT_KEY);
  if (stored) return stored;
  const legacy = readLegacyStorage(LEGACY_RESTORE_KEY);
  if (!legacy) return null;
  const ok = await writeValue(RESTORE_POINT_KEY, legacy);
  if (ok) removeLegacyStorage(LEGACY_RESTORE_KEY);
  return legacy;
}

export async function writeRestorePoint(snapshot: string): Promise<void> {
  if (snapshot.length > MAX_RESTORE_POINT_BYTES) {
    throw new Error(`restore point exceeds ${MAX_RESTORE_POINT_BYTES} bytes`);
  }
  const ok = await writeValue(RESTORE_POINT_KEY, snapshot);
  if (!ok) throw new Error('restore point storage unavailable');
}

export async function clearRestorePoint(): Promise<void> {
  await deleteValue(RESTORE_POINT_KEY);
  removeLegacyStorage(LEGACY_RESTORE_KEY);
}

export async function hasRestorePoint(): Promise<boolean> {
  return (await readRestorePoint()) !== null;
}
