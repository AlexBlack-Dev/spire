export type NoteColor = 'violet' | 'blue' | 'teal' | 'green' | 'amber' | 'rose';

export interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  filePath?: string;
  password?: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  noteId?: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  noteIds: string[];
  password?: string;
}

export type ThemeMode = 'dark' | 'light';

export type ViewMode = 'notes' | 'tasks' | 'favorites' | 'converter';
export type SortMode = 'date' | 'title' | 'color';

export type FormatCategory = 'text' | 'image' | 'document';

export const conversionFormats: Record<string, { label: string; ext: string; category: FormatCategory }> = {
  txt:  { label: 'Plain Text',     ext: 'txt',  category: 'text' },
  md:   { label: 'Markdown',       ext: 'md',   category: 'text' },
  html: { label: 'HTML',           ext: 'html', category: 'text' },
  json: { label: 'JSON',           ext: 'json', category: 'text' },
  xml:  { label: 'XML',            ext: 'xml',  category: 'text' },
  csv:  { label: 'CSV',            ext: 'csv',  category: 'text' },
  yaml: { label: 'YAML',           ext: 'yaml', category: 'text' },
  css:  { label: 'CSS',            ext: 'css',  category: 'text' },
  js:   { label: 'JavaScript',     ext: 'js',   category: 'text' },
  ts:   { label: 'TypeScript',     ext: 'ts',   category: 'text' },
  py:   { label: 'Python',         ext: 'py',   category: 'text' },
  rs:   { label: 'Rust',           ext: 'rs',   category: 'text' },
  java: { label: 'Java',           ext: 'java', category: 'text' },
  c:    { label: 'C',              ext: 'c',    category: 'text' },
  cpp:  { label: 'C++',            ext: 'cpp',  category: 'text' },
  sh:   { label: 'Shell',          ext: 'sh',   category: 'text' },
  bat:  { label: 'Batch',          ext: 'bat',  category: 'text' },
  ps1:  { label: 'PowerShell',     ext: 'ps1',  category: 'text' },
  sql:  { label: 'SQL',            ext: 'sql',  category: 'text' },
  toml: { label: 'TOML',           ext: 'toml', category: 'text' },
  ini:  { label: 'INI',            ext: 'ini',  category: 'text' },
  log:  { label: 'Log',            ext: 'log',  category: 'text' },
  svg:  { label: 'SVG',            ext: 'svg',  category: 'text' },
  png:  { label: 'PNG Image',      ext: 'png',  category: 'image' },
  jpg:  { label: 'JPEG Image',     ext: 'jpg',  category: 'image' },
  gif:  { label: 'GIF Image',      ext: 'gif',  category: 'image' },
  webp: { label: 'WebP Image',     ext: 'webp', category: 'image' },
  bmp:  { label: 'BMP Image',      ext: 'bmp',  category: 'image' },
  ico:  { label: 'ICO Icon',       ext: 'ico',  category: 'image' },
  xlsx: { label: 'Excel Workbook',  ext: 'xlsx', category: 'document' },
  xls:  { label: 'Excel 97-2004',   ext: 'xls',  category: 'document' },
  ods:  { label: 'OpenDocument',    ext: 'ods',  category: 'document' },
};
