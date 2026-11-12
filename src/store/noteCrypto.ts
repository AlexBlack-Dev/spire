import type { Note } from '../types';

export const SEALED_PREFIX = 'enc:v1:';
export const SEAL_ITERATIONS = 600000;

const SALT_BYTES = 16;
const IV_BYTES = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const sessionKeys = new Map<string, CryptoKey>();

export function isSealedContent(content: string): boolean {
  return content.startsWith(SEALED_PREFIX);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function createSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

export async function deriveContentKey(password: string, salt: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(salt) as BufferSource, iterations: SEAL_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function rememberContentKey(noteId: string, key: CryptoKey): void {
  sessionKeys.set(noteId, key);
}

export function forgetContentKey(noteId: string): void {
  sessionKeys.delete(noteId);
}

export function hasContentKey(noteId: string): boolean {
  return sessionKeys.has(noteId);
}

export async function sealContent(noteId: string, plain: string): Promise<string> {
  const key = sessionKeys.get(noteId);
  if (!key) throw new Error(`no content key for note ${noteId}`);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plain));
  return `${SEALED_PREFIX}${toBase64(iv)}:${toBase64(new Uint8Array(data))}`;
}

export async function openContent(noteId: string, sealed: string): Promise<string> {
  const key = sessionKeys.get(noteId);
  if (!key) throw new Error(`no content key for note ${noteId}`);
  if (!isSealedContent(sealed)) throw new Error('content is not sealed');
  const body = sealed.slice(SEALED_PREFIX.length);
  const separator = body.indexOf(':');
  if (separator < 0) throw new Error('malformed sealed content');
  const iv = fromBase64(body.slice(0, separator));
  const data = fromBase64(body.slice(separator + 1));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return decoder.decode(plain);
}

export async function sealNote(note: Note): Promise<Note> {
  if (!note.password || isSealedContent(note.content)) return note;
  if (!note.salt || !sessionKeys.has(note.id)) return note;
  return { ...note, content: await sealContent(note.id, note.content) };
}

export async function sealNotes(notes: Note[]): Promise<Note[]> {
  const out: Note[] = [];
  for (const note of notes) out.push(await sealNote(note));
  return out;
}
