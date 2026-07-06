import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  CheckSquare, Highlighter, Pin, Star, Trash2,
  Heading1, Heading2, Quote, Minus,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { translations } from '../i18n/translations';
import SpreadsheetEditor from './SpreadsheetEditor';

const COLOR_HEX: Record<string, string> = {
  violet: '#7c6af7', blue: '#4f8ef7', teal: '#2dd4bf',
  green: '#4ade80', amber: '#fbbf24', rose: '#f472b6',
};
const COLORS = ['violet', 'blue', 'teal', 'green', 'amber', 'rose'] as const;

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
                background: '#1a1a24', color: '#9090b0',
                fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderBottom: '2px solid #252535',
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
                background: ri % 2 === 0 ? 'transparent' : '#0a0a10',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#13131a'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ri % 2 === 0 ? 'transparent' : '#0a0a10'; }}
            >
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '6px 12px',
                  color: '#d0d0e8', borderBottom: '1px solid #1a1a24',
                  whiteSpace: 'nowrap',
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 12, color: '#3a3a52', marginTop: 8, textAlign: 'right' }}>
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
        color: '#d0d0e8', lineHeight: 1.6,
        background: '#0a0a10', borderRadius: 10,
        padding: '16px 20px', overflow: 'auto',
        border: '1px solid #1e1e2a', whiteSpace: 'pre',
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
      parts.push(<span key={idx++} style={{ color: '#5a5a78' }}>{escapeHtml(json.slice(last, match.index))}</span>);
    }
    if (match[1]) {
      parts.push(<span key={idx++} style={{ color: '#4f8ef7' }}>{escapeHtml(match[1])}</span>);
      parts.push(<span key={idx++} style={{ color: '#5a5a78' }}>:</span>);
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
    parts.push(<span key={idx++} style={{ color: '#5a5a78' }}>{escapeHtml(json.slice(last))}</span>);
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
    <div style={{ fontSize: 15, color: '#d0d0e8', lineHeight: 1.7 }}
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
  const { notes, activeNoteId, updateNote, deleteNote, togglePin, toggleFavorite, language, antiPaste } = useStore();
  const t = (key: string) => translations[language][key] || key;
  const note = notes.find((n) => n.id === activeNoteId);
  const [wordCount, setWordCount] = useState(0);
  const loadedNoteId = useRef<string | null>(null);
  const isUserEditing = useRef(false);

  const ext = note?.filePath ? note.filePath.split('.').pop()?.toLowerCase() : undefined;

  const renderedContent = useMemo(() => {
    if (!note) return null;
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
    ],
    content: '',
    editorProps: {
      attributes: { class: 'tiptap-editor' },
      handlePaste: () => antiPaste,
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
      if (!renderedContent) {
        editor.commands.setContent(note.content || '');
        const t = editor.getText().trim();
        setWordCount(t ? t.split(/\s+/).length : 0);
      }
    }
  }, [activeNoteId, editor, renderedContent]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (note) updateNote(note.id, { title: e.target.value });
  }, [note, updateNote]);

  if (!note) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 14, background: '#0e0e14',
      }}>
        <div style={{
          width: 60, height: 60, background: '#13131a',
          border: '1px solid #252535', borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src="/favicon.png" width={36} height={36} alt="Spire" style={{ opacity: 0.35 }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#5a5a78', marginBottom: 5 }}>
            {t('select_note')}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#3a3a52' }}>
            {t('or_create_new')}
          </div>
        </div>
      </div>
    );
  }

  const accentColor = COLOR_HEX[note.color] || '#7c6af7';

  const isSpreadsheet = ext === 'xlsx' || ext === 'xls' || ext === 'ods';

  return (
    <div
      key={note.id}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden', background: '#0e0e14',
      }}
    >
      {/* Header */}
      <div style={{ padding: isSpreadsheet ? '8px 14px 0' : '20px 24px 0', flexShrink: 0, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => updateNote(note.id, { color: c })}
                style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: COLOR_HEX[c],
                  border: note.color === c ? '2.5px solid #f0f0f8' : '2.5px solid transparent',
                  cursor: 'pointer', outline: 'none', transition: 'all 0.15s',
                  transform: note.color === c ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 3 }}>
            <ActionBtn icon={<Pin size={14}/>}   active={note.isPinned}   activeColor={accentColor} title={note.isPinned ? t('unpin') : t('pin')}  onClick={() => togglePin(note.id)} />
            <ActionBtn icon={<Star size={14}/>}  active={note.isFavorite} activeColor="#fbbf24"     title={note.isFavorite ? t('unfavorite') : t('favorite')}  onClick={() => toggleFavorite(note.id)} />
            <ActionBtn icon={<Trash2 size={14}/>} active={false}          activeColor="#f87171"     title={t('delete')}    onClick={() => deleteNote(note.id)} danger />
          </div>
        </div>

        {/* Title */}
        <input
          value={note.title}
          onChange={handleTitleChange}
          placeholder={t('title_placeholder')}
          style={{
            background: 'none', border: 'none', outline: 'none',
            width: '100%', fontSize: 28, fontWeight: 800,
            color: '#f0f0f8', letterSpacing: '-0.03em',
            userSelect: 'text', marginBottom: 8,
          }}
        />

        {/* Meta */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 16, fontSize: 12, fontWeight: 500, color: '#3a3a52',
        }}>
          <span>{format(new Date(note.updatedAt), 'd MMMM yyyy, HH:mm', { locale: language === 'ru' ? ru : enUS })}</span>
          <span style={{ color: '#1e1e2a' }}>·</span>
          <span>{wordCount} {t('words')}</span>
          {ext && (
            <>
              <span style={{ color: '#1e1e2a' }}>·</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>.{ext}</span>
            </>
          )}
          <TagRow note={note} updateNote={updateNote} />
        </div>

        <div style={{ height: 1, background: '#1e1e2a' }} />
      </div>

      {/* Toolbar - only show for editable formats */}
      {editor && !renderedContent && (
        <div style={{
          padding: '6px 16px',
          display: 'flex', gap: 1, alignItems: 'center',
          borderBottom: '1px solid #1e1e2a',
          flexShrink: 0, flexWrap: 'wrap', minWidth: 0,
        }}>
          <TB label="Bold"   icon={<Bold size={14}/>}         active={editor.isActive('bold')}              run={() => editor.chain().focus().toggleBold().run()} />
          <TB label="Italic" icon={<Italic size={14}/>}       active={editor.isActive('italic')}            run={() => editor.chain().focus().toggleItalic().run()} />
          <TB label="Strike" icon={<Strikethrough size={14}/>} active={editor.isActive('strike')}           run={() => editor.chain().focus().toggleStrike().run()} />
          <TB label="Code"   icon={<Code size={14}/>}         active={editor.isActive('code')}              run={() => editor.chain().focus().toggleCode().run()} />
          <TB label="Mark"   icon={<Highlighter size={14}/>}  active={editor.isActive('highlight')}         run={() => editor.chain().focus().toggleHighlight().run()} />
          <TBDiv />
          <TB label="H1"     icon={<Heading1 size={14}/>}     active={editor.isActive('heading',{level:1})} run={() => editor.chain().focus().toggleHeading({level:1}).run()} />
          <TB label="H2"     icon={<Heading2 size={14}/>}     active={editor.isActive('heading',{level:2})} run={() => editor.chain().focus().toggleHeading({level:2}).run()} />
          <TB label="Quote"  icon={<Quote size={14}/>}        active={editor.isActive('blockquote')}        run={() => editor.chain().focus().toggleBlockquote().run()} />
          <TBDiv />
          <TB label="UL"     icon={<List size={14}/>}         active={editor.isActive('bulletList')}        run={() => editor.chain().focus().toggleBulletList().run()} />
          <TB label="OL"     icon={<ListOrdered size={14}/>}  active={editor.isActive('orderedList')}       run={() => editor.chain().focus().toggleOrderedList().run()} />
          <TB label="Task"   icon={<CheckSquare size={14}/>}  active={editor.isActive('taskList')}          run={() => editor.chain().focus().toggleTaskList().run()} />
          <TBDiv />
          <TB label="HR"     icon={<Minus size={14}/>}        active={false}                                run={() => editor.chain().focus().setHorizontalRule().run()} />
        </div>
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
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 48px', userSelect: 'text', minWidth: 0 }}>
          {renderedContent ? (
            <div>
              <div style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#5a5a78',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                background: '#1a1a24', borderRadius: 6, padding: '3px 10px', marginBottom: 16,
                border: '1px solid #252535',
              }}>
                {ext === 'csv' ? 'Table View' : ext === 'json' ? 'Formatted JSON' : 'Preview'}
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

function ActionBtn({ icon, active, activeColor, title, onClick, danger }: {
  icon: React.ReactNode; active: boolean; activeColor: string;
  title: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? (danger ? '#2a1a1a' : '#1e1a3a') : 'transparent',
        border: 'none', borderRadius: 7,
        color: active ? activeColor : danger ? '#7a4a4a' : '#3a3a52',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? '#2a1a1a' : '#1a1a24'; e.currentTarget.style.color = activeColor; }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? (danger ? '#2a1a1a' : '#1e1a3a') : 'transparent'; e.currentTarget.style.color = active ? activeColor : danger ? '#7a4a4a' : '#3a3a52'; }}
    >
      {icon}
    </button>
  );
}

function TB({ icon, active, run }: { icon: React.ReactNode; active: boolean; run: () => void; label: string }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); run(); }}
      style={{
        width: 30, height: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? '#21212e' : 'transparent',
        border: 'none', borderRadius: 5,
        color: active ? 'var(--accent)' : '#3a3a52',
        cursor: 'pointer', transition: 'all 0.12s',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#1a1a24'; e.currentTarget.style.color = '#9090b0'; }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3a3a52'; }}}
    >
      {icon}
    </button>
  );
}

function TBDiv() {
  return <div style={{ width: 1, height: 18, background: '#1e1e2a', margin: '0 4px' }} />;
}

function TagRow({ note, updateNote }: { note: any; updateNote: any }) {
  const language = useStore((s) => s.language);
  const t = (key: string) => translations[language][key] || key;
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = (e.target as HTMLInputElement).value.trim().replace(',', '');
      if (val && !note.tags.includes(val)) {
        updateNote(note.id, { tags: [...note.tags, val] });
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
      <AnimatePresence>
        {note.tags.map((tag: string) => (
          <span
            key={tag}
            onClick={() => updateNote(note.id, { tags: note.tags.filter((t: string) => t !== tag) })}
            style={{
              background: '#1a1a24', border: '1px solid #252535',
              borderRadius: 99, padding: '1px 8px',
              fontSize: 11, fontWeight: 600, color: '#5a5a78',
              cursor: 'pointer', transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#9090b0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#5a5a78')}
          >
            #{tag}
          </span>
        ))}
      </AnimatePresence>
      <input
        onKeyDown={handleKeyDown}
        placeholder={t('add_tag')}
        style={{
          background: 'none', border: 'none', outline: 'none',
          fontSize: 12, fontWeight: 500, color: '#3a3a52',
          width: 55, userSelect: 'text',
        }}
      />
    </div>
  );
}
