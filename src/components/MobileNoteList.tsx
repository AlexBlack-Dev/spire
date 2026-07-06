import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Pin, Star, Trash2, Lock, Unlock, ChevronUp, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { format, isToday, isYesterday } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { translations } from '../i18n/translations';
import { dim } from '../isMobile';
import WelcomeScreen from './WelcomeScreen';

const COLOR_HEX: Record<string, string> = {
  violet: '#7c6af7', blue: '#4f8ef7', teal: '#2dd4bf',
  green: '#4ade80', amber: '#fbbf24', rose: '#f472b6',
};

function formatDateFn(iso: string, language: 'en' | 'ru') {
  const d = new Date(iso);
  const t = (key: string) => translations[language][key] || key;
  const locale = language === 'ru' ? ru : enUS;
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return t('yesterday');
  return format(d, 'd MMM', { locale });
}

export default function MobileNoteList({ favoritesOnly }: { favoritesOnly?: boolean }) {
  const {
    notes, searchQuery, activeNoteId,
    setSearchQuery, setActiveNote, language,
    deleteNote,
    togglePin, toggleFavorite, moveNoteUp, moveNoteDown, showLockPrompt,
  } = useStore();
  const t = (key: string) => translations[language][key] || key;
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSearch = (val: string) => {
    setLocalQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(val), 200);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const filtered = notes.filter((n) => {
    const q = localQuery.toLowerCase();
    if (favoritesOnly) return n.isFavorite;
    return n.title.toLowerCase().includes(q) || n.content.replace(/<[^>]*>/g, '').toLowerCase().includes(q);
  });

  const handleLock = (noteId: string, hasPassword: boolean) => {
    showLockPrompt(noteId, hasPassword ? 'remove' : 'set');
  };

  const empty = notes.length === 0 && !favoritesOnly;

  if (empty) return <WelcomeScreen />;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: 'var(--surface-0)', position: 'relative',
    }}>
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
        }}>
          <Search size={dim.iconSm} color="#3a3a52" />
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
        {filtered.map((note, i) => (
          <NoteRow
            key={note.id} note={note}
            active={activeNoteId === note.id}
            index={i}
            onClick={() => setActiveNote(note.id)}
            language={language}
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

function NoteRow({ note, active, index, onClick, language, onDelete, onLock, onTogglePin, onToggleFav, onMoveUp, onMoveDown }: {
  note: any; active: boolean; index: number;
  onClick: () => void;
  language: 'en' | 'ru';
  onDelete: () => void;
  onLock: () => void;
  onTogglePin: () => void;
  onToggleFav: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const t = (key: string) => translations[language][key] || key;
  const color = COLOR_HEX[note.color] || '#7c6af7';
  const preview = note.content.replace(/<[^>]*>/g, '').trim().slice(0, 60);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.12), type: 'spring', stiffness: 300, damping: 24 }}
      style={{
        display: 'flex', alignItems: 'center',
        padding: `${dim.sp4}px ${dim.sp6}px`,
        background: active ? '#1a1a28' : 'transparent',
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
              <Star size={dim.iconSm} color="#fbbf24" fill="#fbbf24" style={{ flexShrink: 0 }} />
            )}
            {note.isPinned && (
              <Pin size={dim.iconSm} color={color} fill={color} style={{ flexShrink: 0 }} />
            )}
            {note.password && (
              <Lock size={dim.iconSm} color="#7c6af7" style={{ flexShrink: 0 }} />
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {note.title || t('untitled')}
            </span>
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
      <ActionBtn onClick={(e) => { e.stopPropagation(); onToggleFav(); }} color={note.isFavorite ? '#fbbf24' : 'var(--text-disabled)'}>
        <Star size={dim.iconSm} fill={note.isFavorite ? '#fbbf24' : 'none'} />
      </ActionBtn>
      <ActionBtn onClick={(e) => { e.stopPropagation(); onLock(); }} color={note.password ? 'var(--accent)' : 'var(--text-disabled)'}>
        {note.password ? <Lock size={dim.iconSm} /> : <Unlock size={dim.iconSm} />}
      </ActionBtn>
      <ActionBtn onClick={(e) => { navigator.vibrate?.(10); e.stopPropagation(); onDelete(); }} color="#f87171">
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
