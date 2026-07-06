import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Square, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';

// Window controls via Tauri core invoke
const winMinimize       = () => invoke('plugin:window|minimize',        { label: 'main' }).catch(console.error);
const winToggleMaximize = () => invoke('plugin:window|toggle_maximize', { label: 'main' }).catch(console.error);
const winClose          = () => invoke('plugin:window|close',           { label: 'main' }).catch(console.error);

export default function TitleBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    notes, activeNoteId, deleteNote, togglePin, toggleFavorite,
    createNote, setViewMode, openFile, saveFile,
    saveFileAs, saveAsAny, getSaveFormats, setSettingsOpen, language,
  } = useStore();
  const t = (key: string) => translations[language][key] || key;
  const note = notes.find(n => n.id === activeNoteId);
  const saveFormats = getSaveFormats(note);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+S / Ctrl+O shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (note?.filePath) {
          saveFile(note.id).then(() => {});
        } else if (note) {
          saveAsAny(note.id).then(() => {});
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        openFile().then(() => {});
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNote();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [note]);

  const close = () => setMenuOpen(false);

  const onSuccess = (fn: () => Promise<boolean>) => fn().then(() => close());
  const onSuccessVoid = (fn: () => void) => { fn(); close(); };

  const menuItems = [
    { label: t('new_note'),    shortcut: 'Ctrl+N', action: () => onSuccessVoid(createNote) },
    { label: t('open_file'),   shortcut: 'Ctrl+O', action: () => onSuccess(openFile) },
    { sep: true },
    { label: note?.filePath ? t('save_to_file') : t('save'), shortcut: 'Ctrl+S', action: () => {
      if (note?.filePath) onSuccess(() => saveFile(note.id));
      else if (note) onSuccess(() => saveAsAny(note.id));
    }, disabled: !note },
    {
      label: t('save_as'),
      action: () => setSaveAsOpen(v => !v),
      disabled: !note,
      submenu: true,
      submenuOpen: saveAsOpen,
      submenuItems: [
        ...saveFormats.map((fmt) => ({
          label: fmt.label,
          action: () => onSuccess(() => saveFileAs(note!.id, fmt.ext)),
        })),
        { label: 'Save as...', action: () => onSuccess(() => saveAsAny(note!.id)) },
      ],
    },
    { sep: true },
    { label: t('copy_text'), action: () => { if(note) navigator.clipboard.writeText(note.content.replace(/<[^>]*>/g,'')); close(); }, disabled: !note },
    { sep: true },
    { label: note?.isPinned   ? t('unpin')     : t('pin'),      action: () => { if(note) togglePin(note.id);      close(); }, disabled: !note },
    { label: note?.isFavorite ? t('unfavorite') : t('favorite'), action: () => { if(note) toggleFavorite(note.id); close(); }, disabled: !note },
    { sep: true },
    { label: t('notes'),     action: () => { setViewMode('notes');     close(); } },
    { label: t('tasks'),     action: () => { setViewMode('tasks');     close(); } },
    { label: t('favorites'), action: () => { setViewMode('favorites'); close(); } },
    { sep: true },
    { label: t('settings'), action: () => { setSettingsOpen(true); close(); } },
    { sep: true },
    { label: t('delete_note'), action: () => { if(note) deleteNote(note.id); close(); }, disabled: !note, danger: true },
  ] as Array<{ label?: string; shortcut?: string; action?: () => void; disabled?: boolean; danger?: boolean; sep?: boolean; primary?: boolean; submenu?: boolean; submenuOpen?: boolean; submenuItems?: Array<{ label: string; action: () => void }> }>;

  return (
    <div style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      background: '#13131a',
      borderBottom: '1px solid #1e1e2a',
      flexShrink: 0,
      zIndex: 50,
      userSelect: 'none',
      position: 'relative',
      minWidth: 0,
    }}>

      {/* LEFT — logo button with dropdown */}
      <div ref={menuRef} style={{ padding: '0 14px', flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setMenuOpen(v => !v)}
          style={{
            background: menuOpen ? '#1a1a28' : 'none',
            border: 'none', cursor: 'pointer',
            padding: '5px 9px',
            display: 'flex', alignItems: 'center', gap: 9,
            borderRadius: 8,
            transition: 'background 0.15s',
          }}
        >
          <div style={{ position: 'relative', width: 26, height: 26, flexShrink: 0 }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 44, height: 44, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124,106,247,0.15) 0%, transparent 70%)',
              filter: 'blur(6px)', pointerEvents: 'none',
            }} />
            <img src="/favicon.png" width={26} height={26} alt="Spire"
              style={{ borderRadius: 5, display: 'block', position: 'relative',
                filter: 'drop-shadow(0 0 4px rgba(124,106,247,0.3))' }}
            />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#f0f0f8', letterSpacing: '-0.01em' }}>
            Spire
          </span>
        </motion.button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.13, ease: [0.16,1,0.3,1] }}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                background: '#16161f',
                border: '1px solid #252535',
                borderRadius: 12, padding: 5, minWidth: 220, zIndex: 100,
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              }}
            >
              {menuItems.map((item, i) =>
                item.sep ? (
                  <div key={i} style={{ height: 1, background: '#252535', margin: '3px 4px' }} />
                ) : item.submenu ? (
                  <div key={i} style={{ position: 'relative' }}>
                    <button
                      onClick={item.disabled ? undefined : item.action}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '7px 11px',
                        background: 'transparent', border: 'none', borderRadius: 7,
                        color: item.disabled ? '#3a3a52' : '#d0d0e8',
                        cursor: item.disabled ? 'default' : 'pointer',
                        fontSize: 13, fontWeight: 400,
                        opacity: item.disabled ? 0.4 : 1,
                        textAlign: 'left', transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = '#252535'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span>{item.label}</span>
                    </button>
                    <AnimatePresence>
                      {item.submenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          style={{
                            position: 'absolute', left: '100%', top: 0,
                            background: '#16161f',
                            border: '1px solid #252535',
                            borderRadius: 10, padding: 4, minWidth: 100,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                          }}
                        >
                          {item.submenuItems?.map((sub, j) => (
                            <button
                              key={j}
                              onClick={() => { sub.action(); close(); }}
                              style={{
                                display: 'block', width: '100%', padding: '6px 12px',
                                background: 'transparent', border: 'none', borderRadius: 6,
                                color: '#d0d0e8', fontSize: 13, fontWeight: 400,
                                textAlign: 'left', cursor: 'pointer',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#252535'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              {sub.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <button
                    key={i}
                    onClick={item.disabled ? undefined : item.action}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '7px 11px',
                      background: 'transparent', 
                      border: 'none',
                      borderRadius: 7,
                      color: item.disabled ? '#3a3a52' : item.danger ? '#f87171' : '#d0d0e8',
                      cursor: item.disabled ? 'default' : 'pointer',
                      fontSize: 13, fontWeight: 400,
                      opacity: item.disabled ? 0.4 : 1,
                      textAlign: 'left', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = '#252535'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span style={{ fontSize: 11, color: '#3a3a52', marginLeft: 20 }}>{item.shortcut}</span>
                    )}
                  </button>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CENTER — drag region */}
      <div
        data-tauri-drag-region
        style={{ flex: 1, height: '100%', cursor: 'default', zIndex: 1 }}
      />

      {/* RIGHT — window controls */}
      <div style={{ display: 'flex', gap: 3, padding: '0 10px', flexShrink: 0, zIndex: 2 }}>
        <WinBtn icon={<Minus size={12}/>}  onClick={winMinimize}       hoverBg="#1e1e2a" hoverColor="#9090b0" color="#5a5a78" title={t('minimize')}   />
        <WinBtn icon={<Square size={11}/>} onClick={winToggleMaximize} hoverBg="#1e1e2a" hoverColor="#9090b0" color="#5a5a78" title={t('maximize')} />
        <WinBtn icon={<X size={12}/>}      onClick={winClose}          hoverBg="#2d1515" hoverColor="#f87171" color="#6b3a3a" title={t('close')}    />
      </div>
    </div>
  );
}

function WinBtn({ icon, onClick, hoverBg, hoverColor, color, title }: {
  icon: React.ReactNode; onClick: () => void;
  hoverBg: string; hoverColor: string; color: string; title: string;
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        width: 34, height: 34,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none', borderRadius: 7,
        color, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = color; }}
    >
      {icon}
    </button>
  );
}
