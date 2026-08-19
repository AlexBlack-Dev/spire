import { format, isToday, isYesterday } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import type { NoteColor } from '../types';
import { translations, type Dict } from '../i18n/translations';

export const COLOR_HEX: Record<NoteColor, string> = {
  violet: '#7c6af7', blue: '#4f8ef7', teal: '#2dd4bf',
  green: '#4ade80', amber: '#fbbf24', rose: '#f472b6',
};

export const COLOR_NAMES: readonly NoteColor[] = ['violet', 'blue', 'teal', 'green', 'amber', 'rose'];

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
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, link, meta, style, base').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      else if ((name === 'href' || name === 'src' || name === 'xlink:href') && /^\s*javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}

export function notePreview(content: string, isFile: boolean): string {
  return (isFile ? content : getContentText(content)).trim().slice(0, 60);
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
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
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