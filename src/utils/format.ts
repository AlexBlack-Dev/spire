import DOMPurify from 'dompurify';
import { format, isToday, isYesterday } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import type { NoteColor } from '../types';
import { translations, type Dict } from '../i18n/translations';
import { isSealedContent } from '../store/noteCrypto';

export const COLOR_HEX: Record<NoteColor, string> = {
  violet: '#7c6af7', blue: '#4f8ef7', teal: '#2dd4bf',
  green: '#4ade80', amber: '#fbbf24', rose: '#f472b6',
};

export const COLOR_NAMES: readonly NoteColor[] = ['violet', 'blue', 'teal', 'green', 'amber', 'rose'];

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'textarea', 'select', 'button', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'svg', 'math'],
    FORBID_ATTR: ['style', 'srcset', 'formaction', 'action', 'xlink:href'],
  });
}

export function notePreview(content: string, isFile: boolean): string {
  if (isSealedContent(content)) return '';
  return (isFile ? content : getContentText(content)).trim().slice(0, 60);
}

export function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) => (value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function readableOn(background: string): string {
  return relativeLuminance(background) > 0.179 ? '#0e0e14' : '#ffffff';
}

export interface FileInfo {
  ext: string;
  isSpreadsheet: boolean;
  isPlainFile: boolean;
}

export function getFileInfo(filePath: string | undefined): FileInfo {
  const ext = (filePath ? filePath.split('.').pop()?.toLowerCase() : '') || '';
  const isSpreadsheet = ext === 'xlsx' || ext === 'xls' || ext === 'ods';
  const isPlainFile = !!filePath && !isSpreadsheet;
  return { ext, isSpreadsheet, isPlainFile };
}

export function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return `rgba(124,106,247,${alpha})`;
  let h = match[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function formatDateFn(iso: string, language: 'en' | 'ru', todayLabel?: boolean): string {
  const d = new Date(iso);
  const t = (key: keyof Dict) => translations[language][key] || key;
  const locale = language === 'ru' ? ru : enUS;
  if (isToday(d)) return todayLabel ? t('today') : format(d, 'HH:mm');
  if (isYesterday(d)) return t('yesterday');
  return format(d, 'd MMM', { locale });
}