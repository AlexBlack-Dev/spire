import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Pin, Star, Trash2, Lock, Unlock, MoreVertical, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { dim } from '../isMobile';
import type { Note } from '../types';
import { COLOR_HEX, hexToRgba, formatDateFn, notePreview, getContentText } from '../utils/format';
import WelcomeScreen from './WelcomeScreen';
import BottomSheet, { SheetItem, SheetSeparator } from './BottomSheet';

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
  const language = useStore((s) => s.language);
  const t = useT();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [actionsFor, setActionsFor] = useState<Note | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accent = COLOR_HEX[accentColor];
  const accentRgba = (a: number) => hexToRgba(accent, a);
  const locale = language === 'ru' ? ru : enUS;

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSearch = (val: string) => {
    setLocalQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(val), 200);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const stripCache = useRef(new WeakMap<Note, string>());
  const strippedIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of notes) {
      let text = stripCache.current.get(n);
      if (text === undefined) {
        text = n.filePath ? n.content : getContentText(n.content);
        stripCache.current.set(n, text);
      }
      map.set(n.id, text);
    }
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

  const sections = useMemo(() => {
    const pinnedNotes = filtered.filter((n) => n.isPinned);
    const regular = filtered.filter((n) => !n.isPinned);
    const result: Array<{ key: string; label: string; notes: Note[] }> = [];
    if (pinnedNotes.length > 0) {
      result.push({ key: 'pinned', label: t('pinned'), notes: pinnedNotes });
    }
    let currentKey = '';
    for (const note of regular) {
      const date = new Date(note.updatedAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (key !== currentKey) {
        const label = isToday(date) ? t('today') : isYesterday(date) ? t('yesterday') : format(date, 'd MMMM yyyy', { locale });
        result.push({ key, label, notes: [] });
        currentKey = key;
      }
      result[result.length - 1].notes.push(note);
    }
    return result;
  }, [filtered, t, locale]);

  const handleLock = (noteId: string, hasPassword: boolean) => {
    showLockPrompt(noteId, 'note', hasPassword ? 'remove' : 'set');
  };

  const closeActions = () => setActionsFor(null);

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
          borderBottom: '1px solid var(--border-subtle)',
          background: 'color-mix(in srgb, var(--surface-0) 92%, transparent)',
          backdropFilter: 'blur(10px)',
          zIndex: 3,
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: dim.sp3,
          background: 'var(--surface-2)', borderRadius: dim.radius, padding: `${dim.sp3}px ${dim.sp5}px`,
          boxShadow: `0 8px 32px ${accentRgba(0.04)}`,
          border: '1px solid var(--border-subtle)',
        }}>
          <Search size={dim.iconSm} color="var(--text-disabled)" />
          <input
            value={localQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('search')}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: dim.textMd, fontWeight: 700,
              userSelect: 'text', minHeight: 28,
            }}
          />
        </div>
      </motion.div>

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `0 0 ${dim.sp7}px`,
      }}>
        {sections.map((section) => (
          <div key={section.key}>
            <div style={{
              position: 'sticky', top: 0, zIndex: 2,
              padding: `${dim.sp3}px ${dim.sp6}px ${dim.sp1}px`,
              fontSize: dim.textXs, fontWeight: 800,
              color: 'var(--text-disabled)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              background: 'color-mix(in srgb, var(--surface-0) 90%, transparent)',
              backdropFilter: 'blur(8px)',
            }}>
              {section.label}
            </div>
            {section.notes.map((note) => (
              <NoteRow
                key={note.id} note={note}
                active={activeNoteId === note.id}
                onClick={() => setActiveNote(note.id)}
                onOpenActions={() => setActionsFor(note)}
              />
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{
            padding: `${Math.round(window.innerHeight * 0.12)}px ${dim.sp6}px`,
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: dim.radiusLg,
              background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-disabled)', marginBottom: dim.sp3,
            }}>
              {localQuery ? <Search size={20} /> : privateOnly ? <Lock size={20} /> : <FileText size={20} />}
            </div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: dim.textMd, fontWeight: 700 }}>
              {localQuery ? t('nothing_found') : privateOnly ? t('private_empty_title') : t('no_notes')}
            </div>
            {privateOnly && !localQuery && (
              <div style={{ color: 'var(--text-disabled)', fontSize: dim.textSm, fontWeight: 600, marginTop: dim.sp2, maxWidth: 260 }}>
                {t('private_empty_desc')}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomSheet
        open={!!actionsFor}
        onClose={closeActions}
        title={actionsFor ? (actionsFor.title || t('untitled')) : undefined}
      >
        {actionsFor && (
          <>
            <SheetItem
              icon={<Pin size={dim.iconMd} />}
              label={actionsFor.isPinned ? t('unpin') : t('pin')}
              selected={actionsFor.isPinned}
              onClick={() => { togglePin(actionsFor.id); closeActions(); }}
            />
            <SheetItem
              icon={<Star size={dim.iconMd} />}
              label={actionsFor.isFavorite ? t('unfavorite') : t('favorite')}
              selected={actionsFor.isFavorite}
              onClick={() => { toggleFavorite(actionsFor.id); closeActions(); }}
            />
            <SheetItem
              icon={<ArrowUp size={dim.iconMd} />}
              label={t('move_up')}
              onClick={() => { moveNoteUp(actionsFor.id); closeActions(); }}
            />
            <SheetItem
              icon={<ArrowDown size={dim.iconMd} />}
              label={t('move_down')}
              onClick={() => { moveNoteDown(actionsFor.id); closeActions(); }}
            />
            <SheetItem
              icon={actionsFor.password ? <Lock size={dim.iconMd} /> : <Unlock size={dim.iconMd} />}
              label={actionsFor.password ? t('lock_remove_password') : t('lock_set_password')}
              selected={!!actionsFor.password}
              onClick={() => { handleLock(actionsFor.id, !!actionsFor.password); closeActions(); }}
            />
            <SheetSeparator />
            <SheetItem
              icon={<Trash2 size={dim.iconMd} />}
              label={t('delete_note')}
              danger
              onClick={() => { deleteNote(actionsFor.id); closeActions(); }}
            />
          </>
        )}
      </BottomSheet>
    </div>
  );
}

function NoteRow({ note, active, onClick, onOpenActions }: {
  note: Note; active: boolean;
  onClick: () => void;
  onOpenActions: () => void;
}) {
  const t = useT();
  const color = COLOR_HEX[note.color] || COLOR_HEX.violet;
  const preview = notePreview(note.content, !!note.filePath);
  const showFileExtensions = useStore((s) => s.showFileExtensions);
  const language = useStore((s) => s.language);
  const ext = note.filePath ? (note.filePath.split('.').pop()?.toLowerCase() || '') : '';
  const [dx, setDx] = useState(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const swipingRef = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY };
    swipingRef.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const start = touchRef.current;
    if (!start) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (!swipingRef.current) {
      if (Math.abs(deltaX) < 10 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      swipingRef.current = true;
    }
    if (deltaX < 0) setDx(Math.max(deltaX, -64));
  };

  const onTouchEnd = () => {
    if (dx <= -40) onOpenActions();
    setDx(0);
    swipingRef.current = false;
    touchRef.current = null;
  };

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
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onContextMenu={(e) => { e.preventDefault(); onOpenActions(); }}
      style={{
        display: 'flex', alignItems: 'center',
        padding: `${dim.sp3}px ${dim.sp6}px`,
        background: active ? 'var(--accent-dim)' : 'transparent',
        boxShadow: active ? 'inset 2px 0 0 var(--accent)' : 'none',
        borderBottom: '1px solid var(--border-subtle)',
        transform: `translateX(${dx}px)`,
        transition: dx === 0 ? 'transform 0.18s ease-out' : 'none',
        touchAction: 'pan-y',
      }}
    >
      <div onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: dim.sp4, flex: 1, minWidth: 0,
        minHeight: 44, cursor: 'pointer',
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
            <div className="clamp-2" style={{
              fontSize: dim.textSm, fontWeight: 500, color: 'var(--text-tertiary)',
              lineHeight: 1.5,
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
      <button
        onClick={(e) => { e.stopPropagation(); onOpenActions(); }}
        aria-label={t('more_actions')}
        style={{
          width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', borderRadius: dim.radiusSm,
          color: 'var(--text-disabled)', cursor: 'pointer', flexShrink: 0,
        }}
      >
        <MoreVertical size={dim.iconMd} />
      </button>
    </motion.div>
  );
}
