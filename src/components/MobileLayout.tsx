import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, Pin, Star, Trash2, Menu, Save, Lock, Unlock, ShieldAlert, Pencil } from 'lucide-react';
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
import BottomNav from './BottomNav';
import MobileNoteList from './MobileNoteList';
import MobileSettings from './MobileSettings';
import TasksView from './TasksView';
import WelcomeScreen from './WelcomeScreen';
import SpreadsheetEditor from './SpreadsheetEditor';
import ToolsView from './ToolsView';
import FileBrowser from './FileBrowser';
import LockPrompt from './LockPrompt';
import FormatToolbar from './FormatToolbar';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { translations } from '../i18n/translations';
import type { MobileTab } from './BottomNav';
import { dim } from '../isMobile';
import { COLOR_HEX, COLOR_NAMES, getFileInfo, hexToRgba } from '../utils/format';
import { sliceToText } from '../utils/tiptapText';

export default function MobileLayout() {
  const viewMode = useStore((s) => s.viewMode);
  const activeNoteId = useStore((s) => s.activeNoteId);
  const setActiveNote = useStore((s) => s.setActiveNote);
  const createNote = useStore((s) => s.createNote);
  const openFile = useStore((s) => s.openFile);
  const language = useStore((s) => s.language);
  const splashDone = useStore((s) => s.splashDone);
  const notesCount = useStore((s) => s.notes.length);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const setToolsSubPage = useStore((s) => s.setToolsSubPage);
  const fileBrowserOpen = useStore((s) => s.fileBrowserOpen);
  const fileBrowserNoteId = useStore((s) => s.fileBrowserNoteId);
  const finishFileBrowserSave = useStore((s) => s.finishFileBrowserSave);
  const t = (key: string) => translations[language][key] || key;
  const [mobileView, setMobileView] = useState<'tab' | 'editor'>('tab');
  const [activeTab, setActiveTab] = useState<MobileTab>('notes');
  const [spireMenuOpen, setSpireMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const lockPromptState = useStore((s) => s.lockPromptState);
  const hideLockPrompt = useStore((s) => s.hideLockPrompt);
  const showLockPrompt = useStore((s) => s.showLockPrompt);
  const [storageGranted, setStorageGranted] = useState(true);
  const needsPermissionRedirect = useStore((s) => s.needsPermissionRedirect);

  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const ok = await invoke<boolean>('check_storage_permission');
        setStorageGranted(ok);
      } catch {
        setStorageGranted(false);
      }
    })();
  }, []);

  const prevNoteRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevNoteRef.current && prevNoteRef.current !== activeNoteId) {
      const s = useStore.getState();
      if ((s.lockedNoteOpens[prevNoteRef.current] ?? 0) > 0) {
        s.consumeNoteOpen(prevNoteRef.current);
      }
    }
    prevNoteRef.current = activeNoteId;

    if (!activeNoteId) { setMobileView('tab'); return; }
    const note = useStore.getState().notes.find((n) => n.id === activeNoteId);
    if (note?.password) {
      const s = useStore.getState();
      const expiry = s.lockedNoteExpiries[activeNoteId];
      if (expiry && Date.now() <= expiry) {
        setMobileView('editor');
        return;
      }
      if ((s.lockedNoteOpens[activeNoteId] ?? 0) > 0) {
        setMobileView('editor');
        return;
      }
      showLockPrompt(activeNoteId, 'note', 'unlock');
      return;
    }
    setMobileView('editor');
  }, [activeNoteId]);

  useEffect(() => {
    if (viewMode === 'tasks') setActiveTab('tasks');
    else if (viewMode === 'private') setActiveTab('private');
    else if (viewMode === 'notes' || viewMode === 'converter') setActiveTab('notes');
  }, [viewMode]);

  useEffect(() => {
    if (needsPermissionRedirect) {
      setToolsSubPage('permissions');
      setActiveTab('tools');
      setMobileView('tab');
      if (activeNoteId) setActiveNote(null);
      useStore.setState({ needsPermissionRedirect: false });
    }
  }, [needsPermissionRedirect]);

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const onResize = () => forceUpdate(n => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setSpireMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab);
    setMobileView('tab');
    if (activeNoteId) setActiveNote(null);
  };

  const handleBack = () => {
    setMobileView('tab');
    setActiveNote(null);
    if (lockPromptState) hideLockPrompt();
  };

  const handleBackNavigation = useCallback(() => {
    const state = useStore.getState();
    if (state.lockPromptState) {
      state.hideLockPrompt();
      return true;
    }
    if (mobileView === 'editor') {
      handleBack();
      return true;
    }
    if (state.toolsSubPage && state.toolsSubPage !== 'hub') {
      state.setToolsSubPage('hub');
      return true;
    }
    if (activeTab !== 'notes') {
      handleTabChange('notes');
      return true;
    }
    return false;
  }, [mobileView, activeTab, handleBack]);

  const handleBackRef = useRef(handleBackNavigation);
  handleBackRef.current = handleBackNavigation;

  // Handle Android back gesture/swipe (registered once, uses ref for latest handler)
  useEffect(() => {
    let unlisten: () => void;
    let unlistenEscape: () => void;
    (async () => {
      try {
        // Android: use onBackButtonPress API (Tauri v2.9.0+)
        const { onBackButtonPress } = await import('@tauri-apps/api/app');
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const listener = await onBackButtonPress(() => {
          if (!handleBackRef.current()) {
            getCurrentWindow().close().catch(() => {});
          }
        });
        unlisten = () => { listener.unregister(); };
      } catch {
        // Desktop/browser: simulate via Escape key + popstate
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            handleBackRef.current();
          }
        };
        window.addEventListener('keydown', onKeyDown);
        unlistenEscape = () => window.removeEventListener('keydown', onKeyDown);
        const onPopState = () => {
          if (handleBackRef.current()) {
            window.history.pushState(null, '', window.location.href);
          }
        };
        window.addEventListener('popstate', onPopState);
        const prevUnlisten = unlistenEscape;
        unlistenEscape = () => {
          prevUnlisten();
          window.removeEventListener('popstate', onPopState);
        };
      }
    })();
    return () => { unlisten?.(); unlistenEscape?.(); };
  }, []);

  const showEditor = mobileView === 'editor';
  const noAnim = prefersReduced;

  const iconSize = 22;
  const btnPad = 7;

  return (
    <div style={{
      width: '100vw', height: '100dvh',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: 'var(--surface-0)',
      paddingTop: 'var(--sat, 0px)',
    }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--surface-0)' }}>
        {showEditor ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
            <MobileEditorWrapper onBack={handleBack} noAnim={noAnim} />
          </div>
        ) : (
          <div key={activeTab} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'tools' ? (
              <ToolsView />
            ) : activeTab === 'tasks' ? (
              <TasksView />
            ) : (
              <MobileNoteList privateOnly={activeTab === 'private'} />
            )}
          </div>
        )}
      </div>

      {!showEditor && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}

      {/* Storage permission banner */}
      {!showEditor && !storageGranted && activeTab === 'notes' && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={() => { handleTabChange('tools'); setToolsSubPage('permissions'); }}
          style={{
            position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 8px) + 112px)',
            left: dim.sp4, right: dim.sp4,
            display: 'flex', alignItems: 'center', gap: dim.sp2,
            padding: `${dim.sp3}px ${dim.sp4}px`,
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: dim.radius,
            zIndex: 60, cursor: 'pointer',
          }}
        >
          <ShieldAlert size={dim.iconSm} color="#f87171" />
          <span style={{ flex: 1, fontSize: dim.textSm, fontWeight: 600, color: '#f87171', wordBreak: 'break-word' }}>
            {t('perm_banner_grant')}
          </span>
        </motion.div>
      )}

      {/* Spire menu */}
      {splashDone && !showEditor && !(activeTab === 'notes' && notesCount === 0) && (
      <div ref={menuRef} style={{ position: 'fixed', top: `calc(var(--sat, 0px) + ${dim.sp3}px)`, right: dim.sp3, zIndex: 200 }}>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setSpireMenuOpen(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: btnPad, display: 'flex',
            color: 'var(--text-secondary)',
          }}
        >
          <Menu size={iconSize} />
        </motion.button>

        <AnimatePresence>
          {spireMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.13, ease: [0.16,1,0.3,1] }}
              style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                background: 'var(--surface-1)', border: '1px solid var(--border-default)',
                borderRadius: 12, padding: 5, minWidth: 210, zIndex: 200,
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              }}
            >
              <MenuItem label={t('new_note')} onClick={() => { createNote(); setSpireMenuOpen(false); }} />
              <MenuItem label={t('open_file')} onClick={() => { openFile().catch(() => {}); setSpireMenuOpen(false); }} />
              <MenuSep />
              <MenuItem label={t('notes')} onClick={() => { handleTabChange('notes'); setSpireMenuOpen(false); }} />
              <MenuItem label={t('tasks')} onClick={() => { handleTabChange('tasks'); setSpireMenuOpen(false); }} />
              <MenuItem label={t('private')} onClick={() => { handleTabChange('private'); setSpireMenuOpen(false); }} />
              <MenuSep />
              <MenuItem label={t('statistics')} onClick={() => { setToolsSubPage('statistics'); handleTabChange('tools'); setSpireMenuOpen(false); }} />
              <MenuItem label={t('trash')} onClick={() => { setToolsSubPage('trash'); handleTabChange('tools'); setSpireMenuOpen(false); }} />
              <MenuItem label={t('themes')} onClick={() => { setToolsSubPage('themes'); handleTabChange('tools'); setSpireMenuOpen(false); }} />
              <MenuSep />
              <MenuItem label={t('settings')} onClick={() => { setSettingsOpen(true); setSpireMenuOpen(false); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* File browser */}
      {fileBrowserOpen && fileBrowserNoteId && (() => {
        const note = useStore.getState().notes.find(n => n.id === fileBrowserNoteId);
        return (
          <FileBrowser
            noteTitle={note?.title || 'untitled'}
            onSave={(path) => { finishFileBrowserSave(fileBrowserNoteId, path).catch(() => {}); }}
            onBack={() => { useStore.setState({ fileBrowserOpen: false, fileBrowserNoteId: null }); }}
          />
        );
      })()}

      {/* Lock prompt */}
      {lockPromptState && (
        <LockPrompt
          id={lockPromptState.id}
          kind={lockPromptState.kind}
          mode={lockPromptState.mode}
          onSuccess={() => {
            if (lockPromptState.mode === 'unlock') setMobileView('editor');
            hideLockPrompt();
          }}
          onClose={() => {
            if (lockPromptState.mode === 'unlock') setActiveNote(null);
            hideLockPrompt();
          }}
        />
      )}

      {/* Settings overlay */}
      {settingsOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          display: 'flex', flexDirection: 'column',
          background: 'var(--surface-0)',
          paddingTop: 'var(--sat, 0px)',
        }}>
          <MobileSettings onBack={() => setSettingsOpen(false)} />
        </div>
      )}
    </div>
  );
}

const ih = window.innerHeight;

function MobileEditorWrapper({ onBack, noAnim }: { onBack: () => void; noAnim: boolean | null }) {
  const {
    notes, activeNoteId, updateNote, deleteNote, togglePin, toggleFavorite,
    saveFile,
    language, accentColor, antiPaste,
  } = useStore();
  const t = (key: string) => translations[language][key] || key;
  const note = notes.find((n) => n.id === activeNoteId);
  const { ext, isSpreadsheet, isPlainFile } = getFileInfo(note?.filePath);

  const [rawDraft, setRawDraft] = useState('');
  const rawLoadedId = useRef<string | null>(null);
  useEffect(() => {
    if (isPlainFile && note && rawLoadedId.current !== note.id) {
      rawLoadedId.current = note.id;
      setRawDraft(note.content);
    }
  }, [note?.id, isPlainFile]);
  const accent = COLOR_HEX[accentColor];
  const accentRgba = (a: number) => hexToRgba(accent, a);

  const [kbOpen, setKbOpen] = useState(false);
  const editMode = note ? note.editMode !== false : true;
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const origH = vv.height;
    const onResize = () => {
      setKbOpen(vv.height < origH * 0.8);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

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
    content: note?.content || '',
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
      if (note) {
        updateNote(note.id, { content: editor.getHTML() });
      }
    },
  });

  if (!note) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'var(--surface-0)', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 'calc(0px - var(--sat, 0px))', left: 0, right: 0,
          height: 'calc(180px + var(--sat, 0px))',
          background: [
            `linear-gradient(180deg, ${accentRgba(0.05)} 0%, transparent 100%)`,
            `radial-gradient(ellipse 90% 60% at 50% 0%, ${accentRgba(0.05)} 0%, transparent 70%)`,
          ].join(', '),
          pointerEvents: 'none',
        }} />
        <EditorTopBar onBack={onBack} />
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <WelcomeScreen />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: 'var(--surface-0)', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 'calc(0px - var(--sat, 0px))', left: 0, right: 0,
        height: 'calc(180px + var(--sat, 0px))',
        background: [
          `linear-gradient(180deg, ${accentRgba(0.05)} 0%, transparent 100%)`,
          `radial-gradient(ellipse 90% 60% at 50% 0%, ${accentRgba(0.05)} 0%, transparent 70%)`,
        ].join(', '),
        pointerEvents: 'none',
      }} />
      <div style={{
        display: 'flex', alignItems: 'center',
        flexShrink: 0, padding: `0 ${dim.sp2}px`,
      }}>
        <motion.button
          whileTap={noAnim ? {} : { scale: 0.82 }}
          transition={noAnim ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 12 }}
          onClick={onBack}
          style={{
            width: dim.barH, height: dim.barH,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none',
            color: 'var(--accent)', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ChevronLeft size={dim.iconLg} strokeWidth={2.5} />
        </motion.button>
        <div style={{ flex: 1 }} />
        <IconBtn onClick={() => { saveFile(note.id).catch((e) => console.warn('save failed', e)); }} active={false} activeColor="#4ade80" noAnim={noAnim}>
          <Save size={dim.iconMd} />
        </IconBtn>
        <IconBtn onClick={() => updateNote(note.id, { editMode: !editMode })} active={!editMode} activeColor={accent} noAnim={noAnim}>
          <Pencil size={dim.iconMd} />
        </IconBtn>
        <IconBtn onClick={() => togglePin(note.id)} active={note.isPinned} activeColor={accent} noAnim={noAnim}>
          <Pin size={dim.iconMd} />
        </IconBtn>
        <IconBtn onClick={() => toggleFavorite(note.id)} active={note.isFavorite} activeColor="#fbbf24" noAnim={noAnim}>
          <Star size={dim.iconMd} fill={note.isFavorite ? '#fbbf24' : 'none'} />
        </IconBtn>
        <IconBtn onClick={() => {
          useStore.getState().showLockPrompt(note.id, 'note', note.password ? 'remove' : 'set');
        }} active={!!note.password} activeColor={accent} noAnim={noAnim}>
          {note.password ? <Lock size={dim.iconMd} /> : <Unlock size={dim.iconMd} />}
        </IconBtn>
        <IconBtn onClick={() => { deleteNote(note.id); onBack(); }} active={false} activeColor="#f87171" noAnim={noAnim}>
          <Trash2 size={dim.iconMd} />
        </IconBtn>
      </div>

      <div style={{ padding: `0 ${dim.sp6}px`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: dim.sp3, marginBottom: dim.sp3 }}>
          {editMode && COLOR_NAMES.map((c) => (
            <motion.button
              key={c}
              whileTap={noAnim ? {} : { scale: 0.75 }}
              transition={noAnim ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 10 }}
              onClick={() => updateNote(note.id, { color: c })}
              style={{
                width: dim.dot, height: dim.dot, borderRadius: '50%',
                background: COLOR_HEX[c],
                border: 'none',
                opacity: note.color === c ? 1 : 0.3,
                cursor: 'pointer', outline: 'none',
              }}
            />
          ))}
        </div>

        {editMode ? (
          <input
            value={note.title}
            onChange={(e) => updateNote(note.id, { title: e.target.value })}
            placeholder={t('title_placeholder')}
            style={{
              background: 'none', border: 'none', outline: 'none',
              width: '100%', fontSize: dim.textXxl, fontWeight: 800,
              color: 'var(--text-primary)', letterSpacing: '-0.03em',
              userSelect: 'text', padding: `${dim.sp2}px 0`,
              marginBottom: dim.sp1, minHeight: dim.barH,
            }}
          />
        ) : (
          <div style={{
            width: '100%', fontSize: dim.textXxl, fontWeight: 800,
            color: 'var(--text-primary)', letterSpacing: '-0.03em',
            userSelect: 'text', padding: `${dim.sp2}px 0`,
            marginBottom: dim.sp1, wordBreak: 'break-word',
          }}>
            {note.title}
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: dim.sp2, marginBottom: dim.sp3,
          fontSize: dim.textXs, fontWeight: 600, color: 'var(--text-disabled)',
        }}>
          <span>{format(new Date(note.updatedAt), 'd MMM yyyy, HH:mm', { locale: language === 'ru' ? ru : enUS })}</span>
          {ext && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>.{ext}</span>}

        </div>

        <div style={{ height: 1, background: 'var(--border-subtle)' }} />
      </div>

      {editMode && editor && !isSpreadsheet && !isPlainFile && (
        <FormatToolbar editor={editor} noAnim={noAnim} />
      )}

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
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: `${dim.sp5}px ${dim.sp6}px ${kbOpen ? Math.round(ih * 0.25) : Math.round(ih * 0.1)}px`,
          userSelect: 'text', minWidth: 0,
        }}>
          {!editMode ? (
            <div style={{
              background: 'var(--surface-1)', borderRadius: 14,
              border: `1px solid ${accentRgba(0.4)}`,
              boxShadow: `0 0 32px ${accentRgba(0.12)}`,
              padding: `${dim.sp4}px ${dim.sp4}px`, minHeight: '45vh',
            }}>
              <pre style={{
                margin: 0, fontSize: 13, lineHeight: 1.6,
                fontFamily: "'JetBrains Mono', 'Inter', ui-monospace, monospace",
                color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {note.content}
              </pre>
            </div>
          ) : (
            <textarea
              value={rawDraft}
              onChange={(e) => {
                setRawDraft(e.target.value);
                updateNote(note.id, { content: e.target.value });
              }}
              spellCheck={false}
              wrap="off"
              style={{
                width: '100%', minHeight: '50vh',
                background: 'none', border: 'none', outline: 'none', resize: 'none',
                fontFamily: "'JetBrains Mono', 'Inter', ui-monospace, monospace",
                fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)',
                userSelect: 'text', tabSize: 4, padding: 0,
              }}
            />
          )}
        </div>
      ) : (
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: `${dim.sp5}px ${dim.sp6}px ${kbOpen ? Math.round(ih * 0.25) : Math.round(ih * 0.1)}px`,
          userSelect: 'text', minWidth: 0,
        }}>
          {!editMode ? (
            <div style={{
              background: 'var(--surface-1)', borderRadius: 14,
              border: `1px solid ${accentRgba(0.4)}`,
              boxShadow: `0 0 32px ${accentRgba(0.12)}`,
              padding: `${dim.sp4}px ${dim.sp4}px`,
            }}>
              <div className="tiptap-editor" dangerouslySetInnerHTML={{ __html: note.content }} />
            </div>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
      )}
    </div>
  );
}

function EditorTopBar({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <button
        onClick={onBack}
        style={{
          width: dim.barH, height: dim.barH,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none',
          color: 'var(--accent)', cursor: 'pointer',
        }}
      >
        <ChevronLeft size={dim.iconLg} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', width: '100%', padding: '8px 12px',
        background: 'none', border: 'none', borderRadius: 8,
        color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
        cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-default)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}

function MenuSep() {
  return <div style={{ height: 1, background: 'var(--border-default)', margin: '3px 4px' }} />;
}

function IconBtn({ children, onClick, active, activeColor, noAnim }: {
  children: React.ReactNode; onClick: () => void;
  active: boolean; activeColor: string; noAnim?: boolean | null;
}) {
  return (
    <motion.button
      whileTap={noAnim ? {} : { scale: 0.82 }}
      whileHover={noAnim ? {} : { scale: 1.08 }}
      transition={noAnim ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 12 }}
      onClick={onClick}
      style={{
        width: dim.barH, height: dim.barH,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', borderRadius: dim.radiusSm,
        color: active ? activeColor : 'var(--text-disabled)',
        cursor: 'pointer',
      }}
    >
      <motion.div
        animate={active ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        {children}
      </motion.div>
    </motion.button>
  );
}
