import { readFile } from '@tauri-apps/plugin-fs';
import { translations, type Language, type Dict } from '../i18n/translations';
import type { NoteColor } from '../types';

export const HASH_PREFIX = 'v2$';

export const COLORS: NoteColor[] = ['violet', 'blue', 'teal', 'green', 'amber', 'rose'];

export function tKey(language: Language, key: keyof Dict): string {
  return translations[language][key] || key;
}

export function getContentText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
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
    .trim();
}

export function htmlToFullHtml(title: string, content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:system-ui;max-width:800px;margin:40px auto;line-height:1.7}</style></head><body><h1>${title}</h1>${content}</body></html>`;
}

export async function readFileAsBase64(path: string): Promise<string> {
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

export async function pwHash(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt, (b) => b.toString(16).padStart(2, '0')).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(saltHex + pw));
  const hashHex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${HASH_PREFIX}${saltHex}$${hashHex}`;
}

export async function pwVerify(stored: string | undefined, pw: string): Promise<boolean> {
  if (!stored) return true;
  if (stored.startsWith(HASH_PREFIX)) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [, saltHex, hashHex] = parts;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(saltHex + pw));
    const cur = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    return cur === hashHex;
  }
  return legacyPwHash(pw) === stored;
}

export function fileExt(path: string): string {
  return path.split('.').pop()?.toLowerCase() || '';
}