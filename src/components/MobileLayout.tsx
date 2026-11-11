import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, Pin, Star, Trash2, Menu, Save, Lock, Unlock, ShieldAlert, Pencil, Eye, Play, MoreVertical, Plus, FolderOpen, BarChart3, Palette, Settings, FileText, CheckSquare, X } from 'lucide-react';
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
import TagRow from './TagRow';
import LockedNoteView from './LockedNoteView';
import BottomSheet, { SheetItem, SheetSeparator } from './BottomSheet';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useT } from '../i18n/useT';
import type { MobileTab } from './BottomNav';
import { dim, isMobile, useViewport } from '../isMobile';
import { COLOR_HEX, COLOR_NAMES, getFileInfo, sanitizeHtml } from '../utils/format';
import { sliceToText } from '../utils/tiptapText';
import { useFileNoteContent } from '../hooks/useFileNoteContent';

const SCRIPT_EXTS = ['bat', 'cmd', 'ps1', 'vbs', 'js', 'sh'];

export default function MobileLayout() {
  const viewMode = useStore((s) => s.viewMode);
  const activeNoteId = useStore((s) => s.activeNoteId);
  const setActiveNote = useStore((s) => s.setActiveNote);
  const createNote = useStore((s) => s.createNote);
  const openFile = useStore((s) => s.openFile);
  const splashDone = useStore((s) => s.splashDone);
  const notesCount = useStore((s) => s.notes.length);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const setToolsSubPage = useStore((s) => s.setToolsSubPage);
  const fileBrowserOpen = useStore((s) => s.fileBrowserOpen);
  const fileBrowserNoteId = useStore((s) => s.fileBrowserNoteId);
  const finishFileBrowserSave = useStore((s) => s.finishFileBrowserSave);
  const t = useT();
  const [mobileView, setMobileView] = useState<'tab' | 'editor'>('tab');
  const [activeTab, setActiveTab] = useState<MobileTab>('notes');
  const [spireMenuOpen, setSpireMenuOpen] = useState(false);
  const prefersReduced = useReducedMotion();
  const lockPromptState = useStore((s) => s.lockPromptState);
  const hideLockPrompt = useStore((s) => s.hideLockPrompt);
  const showLockPrompt = useStore((s) => s.showLockPrompt);
  const [storageGranted, setStorageGranted] = useState(true);
  const needsPermissionRedirect = useStore((s) => s.needsPermissionRedirect);
  const changelogRequest = useStore((s) => s.changelogRequest);
  const rootNotes = useStore((s) => s.notes);
  const permBannerDismissed = useStore((s) => s.permBannerDismissed);
  const dismissPermBanner = useStore((s) => s.dismissPermBanner);
  const lockedNoteExpiries = useStore((s) => s.lockedNoteExpiries);
  const lockedNoteOpens = useStore((s) => s.lockedNoteOpens);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (!Object.values(lockedNoteExpiries).some((v) => v > Date.now())) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedNoteExpiries]);

  const activeNote = activeNoteId ? rootNotes.find((n) => n.id === activeNoteId) : undefined;
  const mobileNoteLocked = !!activeNote?.password
    && !(activeNoteId && ((lockedNoteExpiries[activeNoteId] ?? 0) > nowTick || (lockedNoteOpens[activeNoteId] ?? 0) > 0));

  useEffect(() => {
    const check = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const ok = await invoke<boolean>('check_storage_permission');
        setStorageGranted(ok);
      } catch {
        setStorageGranted(false);
      }
    };
    check();
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
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

  useEffect(() => {
    if (!changelogRequest) return;
    setToolsSubPage('changelog');
    setActiveTab('tools');
    setMobileView('tab');
  }, [changelogRequest]);

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const onResize = () => forceUpdate(n => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
            {mobileNoteLocked && activeNoteId ? (
              <LockedNoteView noteId={activeNoteId} />
            ) : (
              <MobileEditorWrapper onBack={handleBack} noAnim={noAnim} />
            )}
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
      {!showEditor && !storageGranted && !permBannerDismissed && activeTab === 'notes' && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          style={{
            position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 8px) + 112px)',
            left: dim.sp4, right: dim.sp4,
            display: 'flex', alignItems: 'center', gap: dim.sp2,
            padding: `${dim.sp2}px ${dim.sp2}px ${dim.sp2}px ${dim.sp4}px`,
            background: 'var(--surface-2)',
            border: '1px solid color-mix(in srgb, var(--c-rose) 40%, transparent)',
            borderRadius: dim.radius,
            zIndex: 60,
          }}
        >
          <ShieldAlert size={dim.iconSm} color="var(--c-rose)" style={{ flexShrink: 0 }} />
          <button
            type="button"
            onClick={() => { handleTabChange('tools'); setToolsSubPage('permissions'); }}
            style={{
              flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, fontSize: dim.textSm, fontWeight: 600, color: 'var(--c-rose)',
              wordBreak: 'break-word', minHeight: 32,
            }}
          >
            {t('perm_banner_grant')}
          </button>
          <button
            type="button"
            onClick={dismissPermBanner}
            aria-label={t('close')}
            style={{
              width: 36, height: 36, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', borderRadius: dim.radiusSm,
            }}
          >
            <X size={dim.iconSm} />
          </button>
        </motion.div>
      )}

      {/* Spire menu */}
      {splashDone && !showEditor && !(activeTab === 'notes' && notesCount === 0) && (
      <div style={{ position: 'fixed', top: `calc(var(--sat, 0px) + ${dim.sp3}px)`, right: dim.sp3, zIndex: 200 }}>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setSpireMenuOpen(true)}
          aria-label={t('more_actions')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: btnPad, display: 'flex',
            color: 'var(--text-secondary)',
            borderRadius: dim.radiusSm,
          }}
        >
          <Menu size={iconSize} />
        </motion.button>
      </div>
      )}

      <BottomSheet open={spireMenuOpen} onClose={() => setSpireMenuOpen(false)} title="SPIRE">
        <SheetItem
          icon={<Plus size={dim.iconMd} />}
          label={t('new_note')}
          onClick={() => { createNote(); setSpireMenuOpen(false); }}
        />
        <SheetItem
          icon={<FolderOpen size={dim.iconMd} />}
          label={t('open_file')}
          onClick={() => { openFile().catch(() => {}); setSpireMenuOpen(false); }}
        />
        <SheetSeparator />
        <SheetItem
          icon={<FileText size={dim.iconMd} />}
          label={t('notes')}
          selected={activeTab === 'notes'}
          onClick={() => { handleTabChange('notes'); setSpireMenuOpen(false); }}
        />
        <SheetItem
          icon={<CheckSquare size={dim.iconMd} />}
          label={t('tasks')}
          selected={activeTab === 'tasks'}
          onClick={() => { handleTabChange('tasks'); setSpireMenuOpen(false); }}
        />
        <SheetItem
          icon={<Lock size={dim.iconMd} />}
          label={t('private')}
          selected={activeTab === 'private'}
          onClick={() => { handleTabChange('private'); setSpireMenuOpen(false); }}
        />
        <SheetSeparator />
        <SheetItem
          icon={<BarChart3 size={dim.iconMd} />}
          label={t('statistics')}
          onClick={() => { setToolsSubPage('statistics'); handleTabChange('tools'); setSpireMenuOpen(false); }}
        />
        <SheetItem
          icon={<Trash2 size={dim.iconMd} />}
          label={t('trash')}
          onClick={() => { setToolsSubPage('trash'); handleTabChange('tools'); setSpireMenuOpen(false); }}
        />
        <SheetItem
          icon={<Palette size={dim.iconMd} />}
          label={t('themes')}
          onClick={() => { setToolsSubPage('themes'); handleTabChange('tools'); setSpireMenuOpen(false); }}
        />
        <SheetSeparator />
        <SheetItem
          icon={<Settings size={dim.iconMd} />}
          label={t('settings')}
          onClick={() => { setSettingsOpen(true); setSpireMenuOpen(false); }}
        />
      </BottomSheet>

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

function MobileEditorWrapper({ onBack, noAnim }: { onBack: () => void; noAnim: boolean | null }) {
  const notes = useStore((s) => s.notes);
  const activeNoteId = useStore((s) => s.activeNoteId);
  const updateNote = useStore((s) => s.updateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const togglePin = useStore((s) => s.togglePin);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const saveFile = useStore((s) => s.saveFile);
  const language = useStore((s) => s.language);
  const accentColor = useStore((s) => s.accentColor);
  const showToast = useStore((s) => s.showToast);
  const addLog = useStore((s) => s.addLog);
  const t = useT();
  const ih = useViewport();
  const note = notes.find((n) => n.id === activeNoteId);
  const { ext, isSpreadsheet, isPlainFile } = getFileInfo(note?.filePath);

  const {
    rawDraft, setRawDraft, rawPreview, setRawPreview, renderedContent, rawWordCount,
  } = useFileNoteContent(note, ext, isPlainFile);

  const accent = COLOR_HEX[accentColor];
  const noteAccent = COLOR_HEX[(note?.color ?? 'violet') as keyof typeof COLOR_HEX];

  const [kbOpen, setKbOpen] = useState(false);
  const [editorMenuOpen, setEditorMenuOpen] = useState(false);
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

  const [wordCount, setWordCount] = useState(0);
  const noteRef = useRef(note);
  noteRef.current = note;
  const loadedNoteId = useRef<string | null>(null);

  const displayWordCount = isPlainFile ? rawWordCount : wordCount;

  const pendingSaveRef = useRef<{ id: string; content: string } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [note?.title, note?.id, editMode]);
  const flushSave = useCallback(() => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    if (pendingSaveRef.current) {
      updateNote(pendingSaveRef.current.id, { content: pendingSaveRef.current.content });
      pendingSaveRef.current = null;
    }
  }, [updateNote]);

  useEffect(() => () => flushSave(), [flushSave]);

  const isScript = !!note?.filePath && !isSpreadsheet && SCRIPT_EXTS.includes(ext);
  const runScript = useCallback(async () => {
    if (!note?.filePath) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('run_script', { path: note.filePath });
      showToast(t('toast_run_ok'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(t('toast_run_failed') + msg);
      addLog('runScript: ' + msg);
    }
  }, [note?.filePath, showToast, t, addLog]);

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
      const current = noteRef.current;
      if (current) {
        pendingSaveRef.current = { id: current.id, content: editor.getHTML() };
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(flushSave, 400);
        const text = editor.getText().trim();
        setWordCount(text ? text.split(/\s+/).length : 0);
      }
    },
  });

  useEffect(() => {
    if (!editor || !note) return;
    if (loadedNoteId.current !== note.id) {
      flushSave();
      loadedNoteId.current = note.id;
      setRawPreview(false);
      if (!isPlainFile && !isSpreadsheet) {
        editor.commands.setContent(note.content || '');
        const text = editor.getText().trim();
        setWordCount(text ? text.split(/\s+/).length : 0);
      }
    }
  }, [note?.id, editor, isPlainFile, isSpreadsheet, flushSave]);

  if (!note) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'var(--surface-0)', position: 'relative',
      }}>
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
        display: 'flex', alignItems: 'center', gap: dim.sp1,
        flexShrink: 0, padding: `0 ${dim.sp2}px`, minHeight: dim.barH,
      }}>
        <motion.button
          whileTap={noAnim ? {} : { scale: 0.82 }}
          transition={noAnim ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 12 }}
          onClick={onBack}
          aria-label={t('back')}
          style={{
            width: dim.barH, height: dim.barH,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', borderRadius: dim.radiusSm,
            color: 'var(--accent)', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ChevronLeft size={dim.iconLg} strokeWidth={2.5} />
        </motion.button>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface-2)', borderRadius: 8, padding: 2, marginRight: dim.sp1 }}>
          <SegBtn active={editMode} activeColor={noteAccent} icon={<Pencil size={12} />} label={t('edit_mode')} iconOnly
            onClick={() => { if (!editMode) updateNote(note.id, { editMode: true }); }} />
          <SegBtn active={!editMode} activeColor={noteAccent} icon={<Eye size={12} />} label={t('view_mode')} iconOnly
            onClick={() => { if (editMode) updateNote(note.id, { editMode: false }); }} />
        </div>
        <IconBtn onClick={() => setEditorMenuOpen(true)} active={false} activeColor={accent} noAnim={noAnim} label={t('more_actions')}>
          <MoreVertical size={dim.iconMd} />
        </IconBtn>
      </div>

      <BottomSheet open={editorMenuOpen} onClose={() => setEditorMenuOpen(false)} title={note.title || t('untitled')}>
        <SheetItem
          icon={<Save size={dim.iconMd} />}
          label={t('save')}
          onClick={() => {
            setEditorMenuOpen(false);
            saveFile(note.id).catch((e) => {
              const msg = e instanceof Error ? e.message : String(e);
              useStore.getState().addLog('saveFile: ' + msg);
            });
          }}
        />
        {!isMobile && isScript && (
          <SheetItem
            icon={<Play size={dim.iconMd} />}
            label={t('run_script')}
            onClick={() => { setEditorMenuOpen(false); runScript(); }}
          />
        )}
        <SheetItem
          icon={<Pin size={dim.iconMd} />}
          label={note.isPinned ? t('unpin') : t('pin')}
          selected={note.isPinned}
          onClick={() => { togglePin(note.id); setEditorMenuOpen(false); }}
        />
        <SheetItem
          icon={<Star size={dim.iconMd} />}
          label={note.isFavorite ? t('unfavorite') : t('favorite')}
          selected={note.isFavorite}
          onClick={() => { toggleFavorite(note.id); setEditorMenuOpen(false); }}
        />
        <SheetItem
          icon={note.password ? <Lock size={dim.iconMd} /> : <Unlock size={dim.iconMd} />}
          label={note.password ? t('lock_remove_password') : t('lock_set_password')}
          selected={!!note.password}
          onClick={() => {
            setEditorMenuOpen(false);
            useStore.getState().showLockPrompt(note.id, 'note', note.password ? 'remove' : 'set');
          }}
        />
        <SheetSeparator />
        <SheetItem
          icon={<Trash2 size={dim.iconMd} />}
          label={t('delete_note')}
          danger
          onClick={() => { setEditorMenuOpen(false); deleteNote(note.id); onBack(); }}
        />
      </BottomSheet>

      {!kbOpen && editMode && (
      <div style={{ padding: `0 ${dim.sp6}px`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: dim.sp2 }}>
        <div style={{ display: 'flex' }}>
          {COLOR_NAMES.map((c) => (
            <motion.button
              key={c}
              whileTap={noAnim ? {} : { scale: 0.9 }}
              transition={noAnim ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 22 }}
              onClick={() => updateNote(note.id, { color: c })}
              aria-label={c}
              aria-pressed={note.color === c}
              style={{
                width: 44, height: 44, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none',
                borderRadius: '50%', cursor: 'pointer', outline: 'none',
              }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: COLOR_HEX[c],
                border: `2px solid ${note.color === c ? 'var(--text-primary)' : 'transparent'}`,
                opacity: note.color === c ? 1 : 0.5,
                transition: 'border-color 0.15s, opacity 0.15s',
              }} />
            </motion.button>
          ))}
        </div>
      </div>
      </div>
      )}

      <div style={{ padding: `0 ${dim.sp6}px`, flexShrink: 0 }}>
        {editMode ? (
          <textarea
            ref={titleRef}
            rows={1}
            value={note.title}
            onChange={(e) => updateNote(note.id, { title: e.target.value })}
            placeholder={t('title_placeholder')}
            spellCheck={false}
            style={{
              background: 'none', border: 'none', outline: 'none', resize: 'none',
              display: 'block', width: '100%', overflow: 'hidden',
              fontFamily: 'inherit', fontSize: dim.textXxl, fontWeight: 800, lineHeight: 1.2,
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

        {!kbOpen && (
        <div style={{
          display: 'flex', flexDirection: window.innerWidth < 360 ? 'column' : 'row',
          alignItems: window.innerWidth < 360 ? 'flex-start' : 'center',
          justifyContent: 'space-between', gap: dim.sp2, marginBottom: dim.sp3,
          fontSize: dim.textXs, fontWeight: 600, color: 'var(--text-tertiary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: dim.sp2, minWidth: 0, whiteSpace: 'nowrap' }}>
            <span>{format(new Date(note.updatedAt), 'd MMM yyyy, HH:mm', { locale: language === 'ru' ? ru : enUS })}</span>
            {ext && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>.{ext}</span>}
            <span>{displayWordCount} {t('words')}</span>
          </div>
          <TagRow note={note} updateNote={updateNote} />
        </div>
        )}

        {!kbOpen && <div style={{ height: 1, background: 'var(--border-subtle)' }} />}
      </div>

      {editMode && editor && !isSpreadsheet && !isPlainFile && !renderedContent && (
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
              background: 'var(--surface-1)',
              borderTop: `3px solid ${noteAccent}`,
              borderRadius: 14,
              padding: `${dim.sp4}px ${dim.sp4}px`, minHeight: '45vh',
            }}>
              {renderedContent ? (
                <div>{renderedContent}</div>
              ) : (
                <pre style={{
                  margin: 0, fontSize: 13, lineHeight: 1.6,
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
                <div style={{ display: 'flex', gap: dim.sp2, marginBottom: dim.sp3, flexWrap: 'wrap' }}>
                  <button onClick={() => setRawPreview(false)} style={{
                    padding: `${dim.sp2}px ${dim.sp4}px`, borderRadius: dim.radiusSm, border: 'none',
                    background: !rawPreview ? 'var(--accent)' : 'var(--surface-2)',
                    color: !rawPreview ? 'var(--on-accent)' : 'var(--text-secondary)',
                    fontSize: dim.textXs, fontWeight: 700, cursor: 'pointer',
                  }}>{t('source_mode')}</button>
                  <button onClick={() => setRawPreview(true)} style={{
                    padding: `${dim.sp2}px ${dim.sp4}px`, borderRadius: dim.radiusSm, border: 'none',
                    background: rawPreview ? 'var(--accent)' : 'var(--surface-2)',
                    color: rawPreview ? 'var(--on-accent)' : 'var(--text-secondary)',
                    fontSize: dim.textXs, fontWeight: 700, cursor: 'pointer',
                  }}>{t('badge_preview')}</button>
                </div>
              )}
              {rawPreview && renderedContent ? (
                <div>{renderedContent}</div>
              ) : (
                <textarea
                  value={rawDraft}
                  onChange={(e) => {
                    setRawDraft(e.target.value);
                    pendingSaveRef.current = { id: note.id, content: e.target.value };
                    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                    saveTimerRef.current = setTimeout(flushSave, 400);
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
            </>
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
              background: 'var(--surface-1)',
              borderTop: `3px solid ${noteAccent}`,
              borderRadius: 14,
              padding: `${dim.sp4}px ${dim.sp4}px`,
            }}>
              <div className="tiptap-editor" dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content) }} />
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
  const t = useT();
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <button
        onClick={onBack}
        aria-label={t('back')}
        style={{
          width: dim.barH, height: dim.barH,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', borderRadius: dim.radiusSm,
          color: 'var(--accent)', cursor: 'pointer',
        }}
      >
        <ChevronLeft size={dim.iconLg} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function SegBtn({ active, activeColor, icon, label, iconOnly, onClick }: {
  active: boolean; activeColor: string; icon: React.ReactNode;
  label: string; iconOnly?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
        minHeight: 34, minWidth: 34, padding: '6px 8px', border: 'none', borderRadius: 6,
        background: active ? 'var(--accent-dim)' : 'transparent',
        color: active ? activeColor : 'var(--text-tertiary)',
        fontSize: 11, fontWeight: 800, cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {icon}
      {!iconOnly && label}
    </button>
  );
}

function IconBtn({ children, onClick, active, activeColor, noAnim, label }: {
  children: React.ReactNode; onClick: () => void;
  active: boolean; activeColor: string; noAnim?: boolean | null; label?: string;
}) {
  return (
    <motion.button
      whileTap={noAnim ? {} : { scale: 0.82 }}
      whileHover={noAnim ? {} : { scale: 1.08 }}
      transition={noAnim ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 12 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: dim.barH, height: dim.barH,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', borderRadius: dim.radiusSm,
        color: active ? activeColor : 'var(--text-tertiary)',
        cursor: 'pointer', flexShrink: 0,
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
