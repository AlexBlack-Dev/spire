import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import { ChevronLeft, Folder, Save } from 'lucide-react';
import { dim } from '../isMobile';

interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export default function FileBrowser({ noteTitle, onSave, onBack }: {
  noteTitle: string;
  onSave: (fullPath: string) => void;
  onBack: () => void;
}) {
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<string>('get_storage_root').then((root) => {
      setCurrentPath(root);
      loadDir(root);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  async function loadDir(path: string) {
    setLoading(true);
    try {
      const list = await invoke<DirEntry[]>('list_directory', { path });
      setEntries(list.filter((e) => e.is_dir));
    } catch (e) {
      console.error('list_directory error', e);
      setEntries([]);
    }
    setLoading(false);
  }

  function enterDir(path: string) {
    setCurrentPath(path);
    loadDir(path);
  }

  function goUp() {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length <= 1) return;
    parts.pop();
    const parent = '/' + parts.join('/');
    setCurrentPath(parent);
    loadDir(parent);
  }

  async function handleSave() {
    const fileName = noteTitle || 'untitled';
    const fullPath = `${currentPath}/${fileName}`;
    onSave(fullPath);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface-0)',
      paddingTop: 'var(--sat, 0px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: `0 ${dim.sp2}px`, flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.82 }} onClick={onBack} style={{
          width: dim.barH, height: dim.barH, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', borderRadius: dim.radiusSm, color: 'var(--accent)', cursor: 'pointer',
        }}>
          <ChevronLeft size={dim.iconLg} strokeWidth={2.5} />
        </motion.button>
        <span style={{ fontSize: dim.textMd, fontWeight: 700, color: 'var(--text-primary)' }}>Save to folder</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: dim.sp2, padding: `0 ${dim.sp4}px`, flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.82 }} onClick={goUp} style={{
          height: 28, padding: `0 8px`, display: 'flex', alignItems: 'center', gap: 3,
          background: 'var(--surface-2)', border: 'none', borderRadius: dim.radiusSm, color: 'var(--text-secondary)',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', lineHeight: 1,
        }}>
          <ChevronLeft size={14} /> Up
        </motion.button>
      </div>

      <div style={{ padding: `0 ${dim.sp4}px`, flexShrink: 0, fontSize: dim.textXs, fontWeight: 500, color: 'var(--text-disabled)', wordBreak: 'break-all' }}>
        {currentPath}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: `${dim.sp2}px ${dim.sp4}px ${dim.sp7}px` }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: dim.sp8, color: 'var(--text-disabled)', fontWeight: 600 }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: dim.sp8, color: 'var(--text-disabled)', fontWeight: 600 }}>Empty folder</div>
        ) : (
          entries.map((e) => (
            <motion.button key={e.path} whileTap={{ scale: 0.97 }} onClick={() => enterDir(e.path)} style={{
              display: 'flex', alignItems: 'center', gap: dim.sp3, width: '100%', padding: `${dim.sp2}px ${dim.sp3}px`,
              background: 'none', border: 'none', borderRadius: dim.radiusSm, cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: dim.textSm, fontWeight: 600,
            }}>
              <Folder size={dim.iconMd} color={e.is_dir ? '#4f8ef7' : '#888'} />
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
            </motion.button>
          ))
        )}
      </div>

      <div style={{ padding: `${dim.sp4}px ${dim.sp6}px calc(env(safe-area-inset-bottom, 8px) + ${dim.sp4}px)`, flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: dim.sp2, width: '100%',
          padding: `${dim.sp3}px 0`, background: 'var(--accent)', border: 'none', borderRadius: dim.radiusSm, cursor: 'pointer',
          color: '#fff', fontSize: dim.textMd, fontWeight: 700,
        }}>
          <Save size={dim.iconMd} />
          Save "{noteTitle || 'untitled'}" here
        </motion.button>
      </div>
    </div>
  );
}
