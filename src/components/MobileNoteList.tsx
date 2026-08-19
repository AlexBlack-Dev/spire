import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Pin, Star, Trash2, Lock, Unlock, ChevronUp, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { dim } from '../isMobile';
import type { Note } from '../types';
import { COLOR_HEX, hexToRgba, formatDateFn, notePreview, getContentText } from '../utils/format';
import WelcomeScreen from './WelcomeScreen';

export default function MobileNoteList({ privateOnly }: { privateOnly?: boolean }) {
  const notes = useStore((s) => s.notes);
  const searchQuery = useStore((s) => s.searchQuery);
  const activeNoteId = useStore((s) => s.activeNoteId);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const setActiveNote = useStore((s) => s.setActiveNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const togglePin = useStore((s) => s.togglePin);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const moveNoteUp = useStore((s) => s.moveNoteUp);
  const moveNoteDown = useStore((s) => s.moveNoteDown);
  const showLockPrompt = useStore((s) => s.showLockPrompt);
  const accentColor = useStore((s) => s.accentColor);
  const t = useT();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accent = COLOR_HEX[accentColor];
  const accentRgba = (a: number) => hexToRgba(accent, a);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSearch = (val: string) => {
    setLocalQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(val), 200);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const strippedIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of notes) map.set(n.id, getContentText(n.content));
    return map;
  }, [notes]);

  const filtered = useMemo(() => {
    const q = localQuery.trim().toLowerCase();
    const base = privateOnly ? notes.filter((n) => n.password) : notes.filter((n) => !n.password);
    if (!q) return base;
    return base.filter((n) =>
      n.title.toLowerCase().includes(q) || (strippedIndex.get(n.id) ?? '').toLowerCase().includes(q)
    );
  }, [notes, localQuery, privateOnly, strippedIndex]);

  const handleLock = (noteId: string, hasPassword: boolean) => {
    showLockPrompt(noteId, 'note', hasPassword ? 'remove' : 'set');
  };

  const empty = notes.length === 0 && !privateOnly;

  if (empty) return <WelcomeScreen />;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: 'var(--surface-0)', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 'calc(0px - var(--sat, 0px))', left: 0, right: 0,
        height: 'calc(260px + var(--sat, 0px))',
        background: [
          `linear-gradient(180deg, ${accentRgba(0.05)} 0%, transparent 100%)`,
          `radial-gradient(ellipse 90% 60% at 50% 0%, ${accentRgba(0.05)} 0%, transparent 70%)`,
        ].join(', '),
        pointerEvents: 'none',
      }} />
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          padding: `${dim.sp3}px ${dim.sp6}px`,
          paddingRight: Math.round(dim.sp3 + 36 + dim.sp2),
          flexShrink: 0,
          borderBottom: '1px solid var(--surface-2)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: dim.sp3,
          background: 'var(--surface-2)', borderRadius: dim.radius, padding: `${dim.sp3}px ${dim.sp5}px`,
          boxShadow: `0 8px 32px ${accentRgba(0.04)}`,
        }}>
          <Search size={dim.iconSm} color="var(--text-disabled)" />
          <input
            value={localQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('search')}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: dim.textMd, fontWeight: 700,
              userSelect: 'text',
            }}
          />
        </div>
      </motion.div>

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `0 0 ${dim.sp7}px`,
      }}>
        {filtered.map((note) => (
          <NoteRow
            key={note.id} note={note}
            active={activeNoteId === note.id}
            onClick={() => setActiveNote(note.id)}
            onDelete={() => deleteNote(note.id)}
            onLock={() => handleLock(note.id, !!note.password)}
            onTogglePin={() => togglePin(note.id)}
            onToggleFav={() => toggleFavorite(note.id)}
            onMoveUp={() => moveNoteUp(note.id)}
            onMoveDown={() => moveNoteDown(note.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{
            padding: `${Math.round(window.innerHeight * 0.12)}px ${dim.sp6}px`,
            textAlign: 'center',
            color: 'var(--text-disabled)', fontSize: dim.textMd, fontWeight: 700,
          }}>
            {searchQuery ? t('nothing_found') : t('no_notes')}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteRow({ note, active, onClick, onDelete, onLock, onTogglePin, onToggleFav, onMoveUp, onMoveDown }: {
  note: Note; active: boolean;
  onClick: () => void;
  onDelete: () => void;
  onLock: () => void;
  onTogglePin: () => void;
  onToggleFav: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const t = useT();
  const color = COLOR_HEX[note.color] || COLOR_HEX.violet;
  const preview = notePreview(note.content, !!note.filePath);
  const showFileExtensions = useStore((s) => s.showFileExtensions);
  const language = useStore((s) => s.language);
  const ext = note.filePath ? (note.filePath.split('.').pop()?.toLowerCase() || '') : '';

  return (
    <motion.div
      draggable
      onDragStart={(e) => {
        const de = e as unknown as React.DragEvent;
        de.dataTransfer.setData('application/x-spire-note', note.id);
        de.dataTransfer.effectAllowed = 'copy';
      }}
      whileTap={{ scale: 0.995 }}
      className="note-row"
      style={{
        display: 'flex', alignItems: 'center',
        padding: `${dim.sp4}px ${dim.sp6}px`,
        background: active ? 'var(--surface-2)' : 'transparent',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{
        display: 'flex', flexDirection: 'column', gap: dim.sp1, flexShrink: 0,
        paddingRight: dim.sp2,
      }}>
        <motion.button whileTap={{ scale: 0.82 }} onClick={() => { navigator.vibrate?.(5); onMoveUp(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', display: 'flex', padding: 2, flexShrink: 0 }}>
          <ChevronUp size={dim.iconSm} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.82 }} onClick={() => { navigator.vibrate?.(5); onMoveDown(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', display: 'flex', padding: 2, flexShrink: 0 }}>
          <ChevronDown size={dim.iconSm} />
        </motion.button>
      </div>

      <div onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: dim.sp4, flex: 1, minWidth: 0,
      }}>
        <div style={{
          width: dim.dot, height: dim.dot, borderRadius: '50%',
          background: color, flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: dim.textMd, fontWeight: 700,
            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: dim.sp1,
            display: 'flex', alignItems: 'center', gap: dim.sp1,
          }}>
            {note.isFavorite && (
              <Star size={dim.iconSm} color="var(--c-amber)" fill="var(--c-amber)" style={{ flexShrink: 0 }} />
            )}
            {note.isPinned && (
              <Pin size={dim.iconSm} color={color} fill={color} style={{ flexShrink: 0 }} />
            )}
            {note.password && (
              <Lock size={dim.iconSm} color="var(--accent)" style={{ flexShrink: 0 }} />
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {note.title || t('untitled')}
            </span>
            {ext && showFileExtensions && (
              <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>.{ext}</span>
            )}
          </div>
          {preview && (
            <div style={{
              fontSize: dim.textSm, fontWeight: 500, color: 'var(--text-tertiary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {preview}
            </div>
          )}
        </div>
        <span style={{
          fontSize: dim.textXs, fontWeight: 700, color: 'var(--text-disabled)', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {formatDateFn(note.updatedAt, language)}
        </span>
      </div>
      <ActionBtn onClick={(e) => { e.stopPropagation(); onTogglePin(); }} color={note.isPinned ? color : 'var(--text-disabled)'}>
        <Pin size={dim.iconSm} fill={note.isPinned ? color : 'none'} />
      </ActionBtn>
      <ActionBtn onClick={(e) => { e.stopPropagation(); onToggleFav(); }} color={note.isFavorite ? 'var(--c-amber)' : 'var(--text-disabled)'}>
        <Star size={dim.iconSm} fill={note.isFavorite ? 'var(--c-amber)' : 'none'} />
      </ActionBtn>
      <ActionBtn onClick={(e) => { e.stopPropagation(); onLock(); }} color={note.password ? 'var(--accent)' : 'var(--text-disabled)'}>
        {note.password ? <Lock size={dim.iconSm} /> : <Unlock size={dim.iconSm} />}
      </ActionBtn>
      <ActionBtn onClick={(e) => { navigator.vibrate?.(10); e.stopPropagation(); onDelete(); }} color="var(--c-rose)">
        <Trash2 size={dim.iconSm} />
      </ActionBtn>
    </motion.div>
  );
}

function ActionBtn({ children, onClick, color }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; color: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.82 }}
      onClick={onClick}
      style={{
        width: Math.round(window.innerWidth * 0.08), height: Math.round(window.innerWidth * 0.08),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', borderRadius: dim.radiusSm,
        color, cursor: 'pointer', flexShrink: 0,
      }}
    >
      {children}
    </motion.button>
  );
}
