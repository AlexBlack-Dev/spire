import { useEffect, useCallback, useState, useRef } from 'react';
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
  Pin, Star, Trash2, Lock, Pencil, Eye, Play,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useT } from '../i18n/useT';
import SpreadsheetEditor from './SpreadsheetEditor';
import TagRow from './TagRow';
import FormatToolbar from './FormatToolbar';
import { COLOR_HEX, COLOR_NAMES, getFileInfo, hexToRgba, sanitizeHtml } from '../utils/format';
import { sliceToText } from '../utils/tiptapText';
import { useFileNoteContent } from '../hooks/useFileNoteContent';

const SCRIPT_EXTS = ['bat', 'cmd', 'ps1', 'vbs', 'js', 'sh'];

export default function NoteEditor() {
  const notes = useStore((s) => s.notes);
  const activeNoteId = useStore((s) => s.activeNoteId);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const togglePin = useStore((s) => s.togglePin);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const showLockPrompt = useStore((s) => s.showLockPrompt);
  const showToast = useStore((s) => s.showToast);
  const addLog = useStore((s) => s.addLog);
  const language = useStore((s) => s.language);
  const t = useT();
  const note = notes.find((n) => n.id === activeNoteId);
  const [wordCount, setWordCount] = useState(0);
  const loadedNoteId = useRef<string | null>(null);
  const [running, setRunning] = useState(false);
  const pendingSaveRef = useRef<{ id: string; content: string } | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const flushSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (pendingSaveRef.current) {
      updateNote(pendingSaveRef.current.id, { content: pendingSaveRef.current.content });
      pendingSaveRef.current = null;
    }
  }, [updateNote]);

  useEffect(() => () => { flushSave(); }, [flushSave]);

  const runScript = useCallback(async () => {
    if (!note?.filePath || running) return;
    setRunning(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('run_script', { path: note.filePath });
      showToast(t('toast_run_ok'));
    } catch (e) {
      const msg = typeof e === 'string' ? e : String(e);
      addLog('runScript: ' + msg);
      showToast(t('toast_run_failed') + msg, 'error');
    } finally {
      setRunning(false);
    }
  }, [note?.filePath, running, showToast, addLog, t]);

  const { ext, isSpreadsheet, isPlainFile } = getFileInfo(note?.filePath);

  const {
    rawDraft, setRawDraft, rawPreview, setRawPreview, renderedContent, rawWordCount,
  } = useFileNoteContent(note, ext, isPlainFile);

  const displayWordCount = isPlainFile ? rawWordCount : wordCount;

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
        blur: () => { flushSave(); return undefined; },
      },
    },
    onUpdate: ({ editor }) => {
      if (note && loadedNoteId.current === note.id) {
        const html = editor.getHTML();
        const text = editor.getText().trim();
        setWordCount(text ? text.split(/\s+/).length : 0);
        pendingSaveRef.current = { id: note.id, content: html };
        if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(flushSave, 400);
      }
    },
  });

  useEffect(() => {
    if (!editor || !note) return;
    if (loadedNoteId.current !== note.id) {
      flushSave();
      loadedNoteId.current = note.id;
      if (!renderedContent && !isPlainFile) {
        editor.commands.setContent(note.content || '');
        const t = editor.getText().trim();
        setWordCount(t ? t.split(/\s+/).length : 0);
      }
    }
  }, [activeNoteId, editor, renderedContent, isPlainFile, flushSave]);

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
  const isScript = !!note.filePath && !isSpreadsheet && SCRIPT_EXTS.includes(ext);
  const previewCard: React.CSSProperties = {
    background: `linear-gradient(180deg, ${hexToRgba(accentColor, 0.14)} 0%, transparent 38%), var(--surface-1)`,
    borderRadius: 12,
    borderTop: `3px solid ${accentColor}`,
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
        <div className="editor-page">
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
            <ActionBtn icon={<Star size={14}/>}  active={note.isFavorite} activeColor="var(--c-amber)" onClick={() => toggleFavorite(note.id)} />
            {isScript && (
              <ActionBtn icon={<Play size={14}/>} active={false} activeColor={accentColor}
                title={t('run_script')} onClick={() => runScript()} />
            )}
            <ActionBtn icon={<Lock size={14}/>}  active={!!note.password} activeColor={accentColor} onClick={() => showLockPrompt(note.id, 'note', note.password ? 'remove' : 'set')} />
            <ActionBtn icon={<Trash2 size={14}/>} active={false}          activeColor="var(--c-rose)" onClick={() => deleteNote(note.id)} danger />
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
          <div className="editor-page">
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
                    if (note) {
                      pendingSaveRef.current = { id: note.id, content: e.target.value };
                      if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
                      saveTimerRef.current = window.setTimeout(flushSave, 400);
                    }
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
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 48px', userSelect: 'text', minWidth: 0 }}>
          <div className="editor-page">
          {!editMode ? (
            <div style={{ ...previewCard, padding: '24px 26px' }}>
              <div className="tiptap-editor" dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content) }} />
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
        background: active ? (danger ? 'color-mix(in srgb, var(--c-rose) 18%, transparent)' : 'var(--accent-dim)') : 'transparent',
        border: 'none', borderRadius: 7,
        color: active ? activeColor : danger ? 'color-mix(in srgb, var(--c-rose) 55%, var(--surface-1))' : 'var(--text-disabled)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? 'color-mix(in srgb, var(--c-rose) 18%, transparent)' : 'var(--surface-2)'; e.currentTarget.style.color = activeColor; }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? (danger ? 'color-mix(in srgb, var(--c-rose) 18%, transparent)' : 'var(--accent-dim)') : 'transparent'; e.currentTarget.style.color = active ? activeColor : danger ? 'color-mix(in srgb, var(--c-rose) 55%, var(--surface-1))' : 'var(--text-disabled)'; }}
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

