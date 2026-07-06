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
import { useStore } from './store/useStore';
import { isMobile } from './isMobile';
import './index.css';

const COLOR_HEX_ACCENT: Record<string, string> = {
  violet: '#7c6af7', blue: '#4f8ef7', teal: '#2dd4bf',
  green: '#4ade80', amber: '#fbbf24', rose: '#f472b6',
};

export default function App() {
  const { viewMode, activeNoteId, openFileFromEvent, notes, migrateFromBlum, showToast, setSplashDone, theme, accentColor } = useStore();
  const [migrationDone, setMigrationDone] = useState(false);

  const showEditor  = viewMode === 'notes' || viewMode === 'favorites';
  const showWelcome = showEditor && !activeNoteId;

  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.removeEventListener('contextmenu', handler);
    if (!isMobile) document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--accent', COLOR_HEX_ACCENT[accentColor] || '#7c6af7');
    document.documentElement.style.setProperty('--accent-hover', '#8f7fff');
  }, [theme, accentColor]);

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
      if (ok) showToast('Data migrated from BLUM');
    });
  }, [notes, migrationDone]);

  if (isMobile) {
    return (
      <>
        <SplashScreen />
        <MobileLayout />
      </>
    );
  }

  return (
    <>
      <SplashScreen />

      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', background: '#0e0e14',
      }}>
        <TitleBar />

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          <Sidebar />

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
            <AnimatePresence mode="wait">
              {viewMode === 'tasks' ? (
                <motion.div key="tasks"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
                >
                  <TasksView />
                </motion.div>
              ) : viewMode === 'converter' ? (
                <motion.div key="converter"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
                >
                  <ConverterView />
                </motion.div>
              ) : showWelcome ? (
                <motion.div key="welcome"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
                >
                  <WelcomeScreen />
                </motion.div>
              ) : (
                <motion.div key={`note-${activeNoteId}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
                >
                  <NoteEditor />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <SettingsModal />
      </div>
    </>
  );
}
