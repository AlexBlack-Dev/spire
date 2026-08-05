import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import NoteEditor from './components/NoteEditor';
import TasksView from './components/TasksView';
import WelcomeScreen from './components/WelcomeScreen';
import ConverterView from './components/ConverterView';
import SettingsModal from './components/SettingsModal';
import SplashScreen from './components/SplashScreen';
import MobileLayout from './components/MobileLayout';
import LockPrompt from './components/LockPrompt';
import Toasts from './components/Toasts';
import { Lock } from 'lucide-react';
import { useStore } from './store/useStore';
import { translations } from './i18n/translations';
import { isMobile } from './isMobile';
import { COLOR_HEX } from './utils/format';
import './index.css';

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const mix = (sa: number, sb: number) => Math.round(sa * (1 - t) + sb * t);
  const r = mix((pa >> 16) & 255, (pb >> 16) & 255);
  const g = mix((pa >> 8) & 255, (pb >> 8) & 255);
  const bl = mix(pa & 255, pb & 255);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

export default function App() {
  const { viewMode, activeNoteId, openFileFromEvent, notes, migrateFromBlum, showToast, setSplashDone, theme, accentColor, language } = useStore();
  const lockedNoteExpiries = useStore((s) => s.lockedNoteExpiries);
  const lockedNoteOpens = useStore((s) => s.lockedNoteOpens);
  const lockPromptState = useStore((s) => s.lockPromptState);
  const [migrationDone, setMigrationDone] = useState(false);
  const t = (key: string) => translations[language][key] || key;

  const showEditor  = viewMode === 'notes' || viewMode === 'private';
  const showWelcome = showEditor && !activeNoteId;

  const activeNote = notes.find((n) => n.id === activeNoteId);
  const expiry = activeNoteId ? (lockedNoteExpiries[activeNoteId] ?? 0) : 0;
  const opens = activeNoteId ? (lockedNoteOpens[activeNoteId] ?? 0) : 0;
  const noteLocked = showEditor && !!activeNote?.password && Date.now() > expiry && opens <= 0;

  useEffect(() => {
    if (!activeNoteId) return;
    const note = notes.find((n) => n.id === activeNoteId);
    if (!note?.password) return;
    if (viewMode !== 'private') {
      useStore.getState().setActiveNote(null);
      return;
    }
    const s = useStore.getState();
    const exp = s.lockedNoteExpiries[activeNoteId] ?? 0;
    const op = s.lockedNoteOpens[activeNoteId] ?? 0;
    if (Date.now() > exp) {
      if (op > 0) s.consumeNoteOpen(activeNoteId);
      else s.showLockPrompt(activeNoteId, 'note', 'unlock');
    }
  }, [activeNoteId, viewMode]);

  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.removeEventListener('contextmenu', handler);
    if (!isMobile) document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const accentHex = COLOR_HEX[accentColor];
    document.documentElement.style.setProperty('--accent', accentHex);
    document.documentElement.style.setProperty('--accent-hover', mixHex(accentHex, '#ffffff', 0.18));
  }, [theme, accentColor]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a')) return;
      const el = document.activeElement as HTMLElement | null;
      const editable = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (editable) return;
      e.preventDefault();
      const editor = document.querySelector<HTMLElement>('.tiptap-editor');
      const textarea = document.querySelector<HTMLTextAreaElement>('textarea');
      if (editor) {
        editor.focus();
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.selectNodeContents(editor);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else if (textarea) {
        textarea.focus();
        textarea.select();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);

  useEffect(() => {
    const un: Array<() => void> = [];
    (async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        un.push(await listen<{ path: string; content: string; binary?: boolean }>('open-file', (e) => {
          setSplashDone();
          openFileFromEvent(e.payload.path, e.payload.content);
        }));
      } catch { /* not in Tauri */ }
    })();
    return () => { un.forEach(fn => fn()); };
  }, []);

  // Auto-migrate from old BLUM/BLUNT data on first launch
  useEffect(() => {
    if (migrationDone || notes.length > 0) return;
    setMigrationDone(true);
    migrateFromBlum().then((ok: boolean) => {
      if (ok) showToast(t('toast_migrated'));
    });
  }, [notes, migrationDone]);

  if (isMobile) {
    return (
      <>
        <SplashScreen />
        <MobileLayout />
        <Toasts />
      </>
    );
  }

  return (
    <>
      <SplashScreen />

      <div className="app-desktop" style={{
        width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', background: 'var(--surface-0)',
        position: 'relative',
      }}>
        <TitleBar />

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          <Sidebar />

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
            <AnimatePresence mode="wait">
              {viewMode === 'tasks' ? (
                <motion.div key="tasks"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
                >
                  <TasksView />
                </motion.div>
              ) : viewMode === 'converter' ? (
                <motion.div key="converter"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
                >
                  <ConverterView />
                </motion.div>
              ) : showWelcome ? (
                <motion.div key="welcome"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
                >
                  <WelcomeScreen />
                </motion.div>
              ) : noteLocked ? (
                <motion.div key="note-locked"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
                >
                  <NoteLockedScreen />
                </motion.div>
              ) : (
                <motion.div key={`note-${activeNoteId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
                >
                  <NoteEditor />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <SettingsModal />
        <Toasts />

        {lockPromptState && (
          <LockPrompt
            key={`${lockPromptState.id}-${lockPromptState.mode}`}
            id={lockPromptState.id}
            kind={lockPromptState.kind}
            mode={lockPromptState.mode}
            onSuccess={() => useStore.getState().hideLockPrompt()}
            onClose={() => useStore.getState().hideLockPrompt()}
          />
        )}

        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 280,
          pointerEvents: 'none', zIndex: 5,
          background: 'radial-gradient(ellipse 90% 60% at 50% 0%, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 72%)',
        }} />
      </div>
    </>
  );
}

function NoteLockedScreen() {
  const { language } = useStore();
  const t = (key: string) => translations[language][key] || key;
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      background: 'var(--surface-0)',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Lock size={24} color="var(--accent)" />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
        {t('note_locked')}
      </div>
    </div>
  );
}
