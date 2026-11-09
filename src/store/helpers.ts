import { translations, type Language, type Dict } from '../i18n/translations';
import { escapeHtml } from '../utils/format';
import type { NoteColor } from '../types';

export const HASH_PREFIX = 'v2$';
export const PBKDF2_PREFIX = 'v3$';
export const PBKDF2_ITERATIONS = 210000;

export const COLORS: NoteColor[] = ['violet', 'blue', 'teal', 'green', 'amber', 'rose'];

export { getContentText } from '../utils/format';

export function tKey(language: Language, key: keyof Dict): string {
  return translations[language][key] || key;
}

export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function htmlToFullHtml(title: string, content: string): string {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>body{font-family:system-ui;max-width:800px;margin:40px auto;line-height:1.7}</style></head><body><h1>${safeTitle}</h1>${content}</body></html>`;
}

export async function readFileAsBase64(path: string): Promise<string> {
  const { readFile } = await import('@tauri-apps/plugin-fs');
  const buf = await readFile(path);
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function legacyPwHash(pw: string): string {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = ((h << 5) - h) + pw.charCodeAt(i);
    h |= 0;
  }
  return 'h' + Math.abs(h).toString(36);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.trim();
  const len = Math.floor(clean.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function pwHash(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pw),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(new Uint8Array(bits))}`;
}

export async function pwVerify(stored: string | undefined, pw: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith(PBKDF2_PREFIX)) {
    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations < 1) return false;
    try {
      const salt = fromHex(parts[2]);
      const expected = fromHex(parts[3]);
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(pw),
        'PBKDF2',
        false,
        ['deriveBits'],
      );
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
        key,
        expected.length * 8,
      );
      return constantTimeEqual(new Uint8Array(bits), expected);
    } catch {
      return false;
    }
  }
  if (stored.startsWith(HASH_PREFIX)) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [, saltHex, hashHex] = parts;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(saltHex + pw));
    const cur = toHex(new Uint8Array(digest));
    return cur === hashHex;
  }
  return legacyPwHash(pw) === stored;
}

export function needsRehash(stored: string | undefined): boolean {
  if (!stored) return false;
  if (stored.startsWith(PBKDF2_PREFIX)) {
    const iterations = parseInt(stored.split('$')[1] ?? '', 10);
    return !Number.isFinite(iterations) || iterations < PBKDF2_ITERATIONS;
  }
  return true;
}

export function fileExt(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? path;
  if (!name.includes('.')) return '';
  return name.split('.').pop()?.toLowerCase() || '';
}
