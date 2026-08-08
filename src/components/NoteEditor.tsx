import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import {
  Pin, Star, Trash2, Lock, Pencil, Eye,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { translations } from '../i18n/translations';
import SpreadsheetEditor from './SpreadsheetEditor';
import TagRow from './TagRow';
import FormatToolbar from './FormatToolbar';
import { COLOR_HEX, COLOR_NAMES, getFileInfo, hexToRgba } from '../utils/format';
import { sliceToText } from '../utils/tiptapText';

function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    const row: string[] = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuote = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === ',') { row.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
    }
    row.push(cur.trim());
    return row;
  });
}

function escapeHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderCSVTable(text: string) {
  const rows = parseCSV(text);
  if (rows.length < 2) return null;
  const headers = rows[0];
  const data = rows.slice(1);
  const zebra = 'color-mix(in srgb, var(--surface-3) 30%, transparent)';
  return (
    <div style={{ overflowX: 'auto', padding: '12px 0' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: 13, fontFamily: 'ui-monospace, monospace',
      }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                textAlign: 'left', padding: '8px 12px',
                background: 'var(--surface-2)', color: 'var(--text-secondary)',
                fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderBottom: '2px solid var(--border-default)',
                whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri}
              style={{
                background: ri % 2 === 0 ? 'transparent' : zebra,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ri % 2 === 0 ? 'transparent' : zebra; }}
            >
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '6px 12px',
                  color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap',
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 8, textAlign: 'right' }}>
        {data.length} rows · {headers.length} columns
      </div>
    </div>
  );
}

function renderFormattedJSON(text: string) {
  try {
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
    return (
      <pre style={{
        fontSize: 13, fontFamily: 'ui-monospace, monospace',
        color: 'var(--text-primary)', lineHeight: 1.6,
        background: 'var(--surface-1)', borderRadius: 10,
        padding: '16px 20px', overflow: 'auto',
        border: '1px solid var(--border-subtle)', whiteSpace: 'pre',
      }}>
        {syntaxHighlightJSON(formatted)}
      </pre>
    );
  } catch {
    return null;
  }
}

function syntaxHighlightJSON(json: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  const re = /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = re.exec(json)) !== null) {
    if (match.index > last) {
      parts.push(<span key={idx++} style={{ color: 'var(--text-tertiary)' }}>{escapeHtml(json.slice(last, match.index))}</span>);
    }
    if (match[1]) {
      parts.push(<span key={idx++} style={{ color: '#4f8ef7' }}>{escapeHtml(match[1])}</span>);
      parts.push(<span key={idx++} style={{ color: 'var(--text-tertiary)' }}>:</span>);
    } else if (match[2]) {
      parts.push(<span key={idx++} style={{ color: '#4ade80' }}>{escapeHtml(match[2])}</span>);
    } else if (match[3]) {
      parts.push(<span key={idx++} style={{ color: '#fbbf24' }}>{escapeHtml(match[3])}</span>);
    } else if (match[4]) {
      parts.push(<span key={idx++} style={{ color: '#f87171' }}>{escapeHtml(match[4])}</span>);
    }
    last = re.lastIndex;
  }
  if (last < json.length) {
    parts.push(<span key={idx++} style={{ color: 'var(--text-tertiary)' }}>{escapeHtml(json.slice(last))}</span>);
  }
  return parts;
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const html = lines.map(line => {
    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const content = line.replace(/^#+\s*/, '');
      return `<h${level}>${escapeHtml(content)}</h${level}>`;
    }
    if (/^- /.test(line)) return `<li>${escapeHtml(line.replace(/^- /, ''))}</li>`;
    if (/^\d+\. /.test(line)) return `<li>${escapeHtml(line.replace(/^\d+\. /, ''))}</li>`;
    if (/^```/.test(line)) return `<pre><code>...</code></pre>`;
    return `<p>${escapeHtml(line)}</p>`;
  }).join('\n');
  return (
    <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7 }}
      dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function isMarkdown(text: string) {
  return /^#|^[-*]\s|^\d+\.\s|^```|[*_]{2,}|\[.*\]\(.*\)/.test(text);
}

function isCSV(text: string) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return false;
  const cols = lines[0].split(',').length;
  if (cols < 2) return false;
  return lines.slice(1).every(l => l.split(',').length === cols) && lines.slice(1).length <= 500;
}

function isJSON(text: string) {
  const s = text.trim();
  if (s.length < 2) return false;
  try { JSON.parse(s); return true; } catch { return false; }
}

export default function NoteEditor() {
  const { notes, activeNoteId, updateNote, deleteNote, togglePin, toggleFavorite, language, antiPaste, showLockPrompt } = useStore();
  const t = (key: string) => translations[language][key] || key;
  const note = notes.find((n) => n.id === activeNoteId);
  const [wordCount, setWordCount] = useState(0);
  const loadedNoteId = useRef<string | null>(null);
  const isUserEditing = useRef(false);

  const { ext, isSpreadsheet, isPlainFile } = getFileInfo(note?.filePath);

  // Raw text state for file-backed notes (byte-for-byte fidelity, no HTML mangling)
  const [rawDraft, setRawDraft] = useState('');
  const [rawPreview, setRawPreview] = useState(false);
  const rawLoadedId = useRef<string | null>(null);
  useEffect(() => {
    if (!isPlainFile || !note) return;
    if (rawLoadedId.current !== note.id || rawDraft !== note.content) {
      rawLoadedId.current = note.id;
      setRawDraft(note.content);
      setRawPreview(false);
    }
  }, [note?.id, isPlainFile, note?.content, rawDraft]);

  const displayWordCount = isPlainFile
    ? (rawDraft.trim() ? rawDraft.trim().split(/\s+/).length : 0)
    : wordCount;

  const renderedContent = useMemo(() => {
    if (!note || !note.filePath) return null;
    const text = note.content;
    if (ext === 'csv' || isCSV(text)) return renderCSVTable(text);
    if (ext === 'json' || isJSON(text)) return renderFormattedJSON(text);
    if (ext === 'md' || ext === 'markdown' || isMarkdown(text)) return renderMarkdown(text);
    return null;
  }, [note?.content, note?.filePath]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: t('start_writing') }),
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '',
    editorProps: {
      attributes: { class: 'tiptap-editor' },
      clipboardTextSerializer: (slice) => sliceToText(slice),
      handlePaste: (view, event) => {
        if (antiPaste) return true;
        const text = event.clipboardData?.getData('text/plain');
        if (text && text.trim().length > 0) {
          const clean = text
            .replace(/\u00a0/g, ' ')
            .replace(/[\u200b-\u200d\ufeff]/g, '')
            .replace(/\r\n?/g, '\n');
          view.pasteText(clean);
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        copy: () => antiPaste ? true : undefined,
        cut: () => antiPaste ? true : undefined,
      },
    },
    onUpdate: ({ editor }) => {
      if (note && loadedNoteId.current === note.id) {
        isUserEditing.current = true;
        updateNote(note.id, { content: editor.getHTML() });
        const t = editor.getText().trim();
        setWordCount(t ? t.split(/\s+/).length : 0);
        setTimeout(() => { isUserEditing.current = false; }, 0);
      }
    },
  });

  useEffect(() => {
    if (!editor || !note) return;
    if (loadedNoteId.current !== note.id) {
      loadedNoteId.current = note.id;
      if (!renderedContent && !isPlainFile) {
        editor.commands.setContent(note.content || '');
        const t = editor.getText().trim();
        setWordCount(t ? t.split(/\s+/).length : 0);
      }
    }
  }, [activeNoteId, editor, renderedContent, isPlainFile]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (note) updateNote(note.id, { title: e.target.value });
  }, [note, updateNote]);

  if (!note) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 14, background: 'var(--surface-0)',
      }}>
        <div style={{
          width: 60, height: 60, background: 'var(--surface-2)',
          border: '1px solid var(--border-default)', borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src="/favicon.png" width={36} height={36} alt="Spire" style={{ opacity: 0.35 }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 5 }}>
            {t('select_note')}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-disabled)' }}>
            {t('or_create_new')}
          </div>
        </div>
      </div>
    );
  }

  const accentColor = COLOR_HEX[note.color] || COLOR_HEX.violet;
  const editMode = note.editMode !== false;
  const previewCard: React.CSSProperties = {
    background: 'var(--surface-1)',
    borderRadius: 12,
    boxShadow: [
      `0 0 40px ${hexToRgba(accentColor, 0.28)}`,
      `0 0 96px ${hexToRgba(accentColor, 0.12)}`,
      '0 16px 48px rgba(0,0,0,0.35)',
    ].join(', '),
  };

  return (
    <div
      key={note.id}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden', background: 'var(--surface-0)',
      }}
    >
      {/* Header */}
      <div style={{ padding: isSpreadsheet ? '8px 14px 0' : '20px 24px 0', flexShrink: 0, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {editMode && COLOR_NAMES.map((c) => (
              <button
                key={c}
                onClick={() => updateNote(note.id, { color: c })}
                style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: COLOR_HEX[c],
                  border: note.color === c ? '2.5px solid var(--text-primary)' : '2.5px solid transparent',
                  cursor: 'pointer', outline: 'none', transition: 'all 0.15s',
                  transform: note.color === c ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <div style={{
              display: 'flex', gap: 2, background: 'var(--surface-2)',
              borderRadius: 8, padding: 2, marginRight: 6,
            }}>
              <SegItem active={editMode} activeColor={accentColor}
                icon={<Pencil size={11}/>} label={t('edit_mode')}
                onClick={() => { if (!editMode) updateNote(note.id, { editMode: true }); }} />
              <SegItem active={!editMode} activeColor={accentColor}
                icon={<Eye size={11}/>} label={t('view_mode')}
                onClick={() => { if (editMode) updateNote(note.id, { editMode: false }); }} />
            </div>
            <ActionBtn icon={<Pin size={14}/>}   active={note.isPinned}   activeColor={accentColor} onClick={() => togglePin(note.id)} />
            <ActionBtn icon={<Star size={14}/>}  active={note.isFavorite} activeColor="#fbbf24"     onClick={() => toggleFavorite(note.id)} />
            <ActionBtn icon={<Lock size={14}/>}  active={!!note.password} activeColor={accentColor} onClick={() => showLockPrompt(note.id, 'note', note.password ? 'remove' : 'set')} />
            <ActionBtn icon={<Trash2 size={14}/>} active={false}          activeColor="#f87171"     onClick={() => deleteNote(note.id)} danger />
          </div>
        </div>

        {/* Title */}
        {editMode ? (
          <input
            value={note.title}
            onChange={handleTitleChange}
            placeholder={t('title_placeholder')}
            style={{
              background: 'none', border: 'none', outline: 'none',
              width: '100%', fontSize: 28, fontWeight: 800,
              color: 'var(--text-primary)', letterSpacing: '-0.03em',
              userSelect: 'text', marginBottom: 8,
            }}
          />
        ) : (
          <div style={{
            width: '100%', fontSize: 28, fontWeight: 800,
            color: 'var(--text-primary)', letterSpacing: '-0.03em',
            userSelect: 'text', marginBottom: 8, wordBreak: 'break-word',
          }}>
            {note.title}
          </div>
        )}

        {/* Meta */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 16, fontSize: 12, fontWeight: 500, color: 'var(--text-disabled)',
        }}>
          <span>{format(new Date(note.updatedAt), 'd MMMM yyyy, HH:mm', { locale: language === 'ru' ? ru : enUS })}</span>
          <span style={{ color: 'var(--border-subtle)' }}>·</span>
          <span>{displayWordCount} {t('words')}</span>
          {ext && (
            <>
              <span style={{ color: 'var(--border-subtle)' }}>·</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>.{ext}</span>
            </>
          )}
          {editMode && <TagRow note={note} updateNote={updateNote} />}
        </div>

        <div style={{ height: 1, background: 'var(--border-subtle)' }} />
      </div>

      {/* Toolbar - only show for editable rich-text formats */}
      {editMode && editor && !renderedContent && !isPlainFile && (
        <FormatToolbar editor={editor} />
      )}

      {/* Editor / Rendered content */}
      {isSpreadsheet ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <SpreadsheetEditor
            base64={note.content}
            ext={ext}
            filePath={note.filePath}
            noteId={note.id}
          />
        </div>
      ) : isPlainFile ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 48px', userSelect: 'text', minWidth: 0 }}>
          {!editMode ? (
            <div style={{ ...previewCard, padding: '20px 22px', minHeight: '50vh' }}>
              {renderedContent ? (
                <div>{renderedContent}</div>
              ) : (
                <pre style={{
                  margin: 0, fontSize: 13.5, lineHeight: 1.6,
                  fontFamily: "'JetBrains Mono', 'Inter', ui-monospace, monospace",
                  color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {note.content}
                </pre>
              )}
            </div>
          ) : (
            <>
              {renderedContent && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <ModeBtn active={!rawPreview} onClick={() => setRawPreview(false)} label={t('source_mode')} />
                  <ModeBtn active={rawPreview} onClick={() => setRawPreview(true)} label={t('badge_preview')} />
                </div>
              )}
              {rawPreview && renderedContent ? (
                <div>{renderedContent}</div>
              ) : (
                <textarea
                  value={rawDraft}
                  onChange={(e) => {
                    setRawDraft(e.target.value);
                    if (note) updateNote(note.id, { content: e.target.value });
                  }}
                  spellCheck={false}
                  wrap="off"
                  style={{
                    width: '100%', minHeight: '55vh',
                    background: 'none', border: 'none', outline: 'none', resize: 'none',
                    fontFamily: "'JetBrains Mono', 'Inter', ui-monospace, monospace",
                    fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-primary)',
                    userSelect: 'text', tabSize: 4, padding: 0,
                  }}
                />
              )}
            </>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 48px', userSelect: 'text', minWidth: 0 }}>
          {!editMode ? (
            <div style={{ ...previewCard, padding: '24px 26px' }}>
              <div className="tiptap-editor" dangerouslySetInnerHTML={{ __html: note.content }} />
            </div>
          ) : renderedContent ? (
            <div>
              <div style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                background: 'var(--surface-2)', borderRadius: 6, padding: '3px 10px', marginBottom: 16,
                border: '1px solid var(--border-default)',
              }}>
                {ext === 'csv' ? t('badge_table_view') : ext === 'json' ? t('badge_formatted_json') : t('badge_preview')}
              </div>
              {renderedContent}
            </div>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
      )}
    </div>
  );
}

function SegItem({ active, activeColor, icon, label, onClick }: {
  active: boolean; activeColor: string; icon: React.ReactNode;
  label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 9px', border: 'none', borderRadius: 6, cursor: 'pointer',
        background: active ? 'var(--accent-dim)' : 'transparent',
        color: active ? activeColor : 'var(--text-tertiary)',
        fontSize: 11, fontWeight: 800, transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface-3)'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; } }}
    >
      {icon}
      {label}
    </button>
  );
}

function ActionBtn({ icon, active, activeColor, onClick, danger, title }: {
  icon: React.ReactNode; active: boolean; activeColor: string;
  onClick: () => void; danger?: boolean; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? (danger ? 'color-mix(in srgb, #f87171 18%, transparent)' : 'var(--accent-dim)') : 'transparent',
        border: 'none', borderRadius: 7,
        color: active ? activeColor : danger ? '#7a4a4a' : 'var(--text-disabled)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? 'color-mix(in srgb, #f87171 18%, transparent)' : 'var(--surface-2)'; e.currentTarget.style.color = activeColor; }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? (danger ? 'color-mix(in srgb, #f87171 18%, transparent)' : 'var(--accent-dim)') : 'transparent'; e.currentTarget.style.color = active ? activeColor : danger ? '#7a4a4a' : 'var(--text-disabled)'; }}
    >
      {icon}
    </button>
  );
}

function ModeBtn({ active, onClick, label }: {
  active: boolean; onClick: () => void; label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-block', fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        background: active ? 'var(--accent-dim)' : 'var(--surface-2)',
        borderRadius: 6, padding: '5px 10px',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
        color: active ? 'var(--accent)' : 'var(--text-tertiary)',
        cursor: 'pointer', transition: 'all 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = active ? 'var(--accent-dim)' : 'var(--surface-3)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? 'var(--accent-dim)' : 'var(--surface-2)'; }}
    >
      {label}
    </button>
  );
}
