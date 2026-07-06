import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckSquare, Star, Search, Plus, Pin, Trash2, ChevronLeft, Shuffle, ArrowUp, ArrowDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { format, isToday, isYesterday } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { translations } from '../i18n/translations';

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

export default function Sidebar() {
  const {
    notes, tasks, viewMode, searchQuery, activeNoteId, sidebarOpen,
    setViewMode, setSearchQuery, createNote, setActiveNote, deleteNote,
    moveNoteUp, moveNoteDown, toggleSidebar, language,
  } = useStore();
  const t = (key: string) => translations[language][key] || key;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [triggerHovered, setTriggerHovered] = useState(false);

  const filtered = notes.filter((n) => {
    const q = searchQuery.toLowerCase();
    if (viewMode === 'favorites') return n.isFavorite;
    return n.title.toLowerCase().includes(q) || n.content.replace(/<[^>]*>/g, '').toLowerCase().includes(q);
  });

  const pinned   = filtered.filter((n) => n.isPinned);
  const unpinned = filtered.filter((n) => !n.isPinned);
  const activeTasks = tasks.filter((t) => !t.completed).length;

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative', flexShrink: 0, minWidth: 0 }}>
      {/* Sidebar panel */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 272, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            style={{
              height: '100%',
              background: 'var(--surface-1)',
              borderRight: '1px solid var(--border-subtle)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Nav */}
            <div style={{ padding: '12px 10px 8px' }}>
              {[
                { id: 'notes'     as const, icon: <FileText size={16}/>,    label: t('notes'),     badge: notes.length },
                { id: 'tasks'     as const, icon: <CheckSquare size={16}/>, label: t('tasks'),     badge: activeTasks || undefined },
                { id: 'favorites' as const, icon: <Star size={16}/>,        label: t('favorites'), badge: notes.filter(n=>n.isFavorite).length || undefined },
                ...(navigator.userAgent.includes('Android') ? [] : [{ id: 'converter' as const, icon: <Shuffle size={16}/>, label: t('converter'), badge: undefined }]),
              ].map((item) => (
                <NavItem key={item.id} icon={item.icon} label={item.label}
                  badge={item.badge} active={viewMode === item.id}
                  onClick={() => setViewMode(item.id)}
                />
              ))}
            </div>

            <div style={{ height: 1, background: '#1e1e2a', margin: '2px 12px' }} />

            {viewMode !== 'tasks' && (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px 8px',
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#3a3a52',
                    letterSpacing: '0.09em', textTransform: 'uppercase',
                  }}>
                    {viewMode === 'favorites' ? t('favorites') : t('notes')}
                  </span>
                  {viewMode === 'notes' && (
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={createNote}
                      style={{
                        width: 26, height: 26,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: 'none', borderRadius: 5,
                        color: '#5a5a78', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#1a1a24'; e.currentTarget.style.color = '#9090b0'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5a5a78'; }}
                    >
                      <Plus size={15} />
                    </motion.button>
                  )}
                </div>

                <div style={{ padding: '0 10px 10px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#1a1a24', border: '1px solid #252535',
                    borderRadius: 8, padding: '8px 12px',
                  }}>
                    <Search size={14} color="#3a3a52" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('search')}
                      style={{
                        background: 'none', border: 'none', outline: 'none',
                        color: '#f0f0f8', fontSize: 14, fontWeight: 500,
                        width: '100%', userSelect: 'text',
                      }}
                    />
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 16px' }}>
                  {pinned.length > 0 && <SectionLabel icon={<Pin size={10}/>} label={t('pinned')} />}
                  {pinned.map((note, i) => (
                    <NoteRow key={note.id} note={note}
                      active={activeNoteId === note.id} hovered={hoveredId === note.id}
                      index={i} onClick={() => setActiveNote(note.id)}
                      onDelete={() => deleteNote(note.id)} onHover={setHoveredId}
                      onMoveUp={() => moveNoteUp(note.id)}
                      onMoveDown={() => moveNoteDown(note.id)}
                      isFirst={i === 0} isLast={i === pinned.length - 1 && unpinned.length === 0}
                    />
                  ))}
                  {unpinned.length > 0 && pinned.length > 0 && <SectionLabel label={t('all')} />}
                  {unpinned.map((note, i) => (
                    <NoteRow key={note.id} note={note}
                      active={activeNoteId === note.id} hovered={hoveredId === note.id}
                      index={i + pinned.length} onClick={() => setActiveNote(note.id)}
                      onDelete={() => deleteNote(note.id)} onHover={setHoveredId}
                      onMoveUp={() => moveNoteUp(note.id)}
                      onMoveDown={() => moveNoteDown(note.id)}
                      isFirst={i === 0 && pinned.length === 0} isLast={i === unpinned.length - 1}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <div style={{
                      padding: '40px 20px', textAlign: 'center',
                      color: '#3a3a52', fontSize: 13, fontWeight: 500,
                    }}>
                      {searchQuery ? t('nothing_found') : t('no_notes')}
                    </div>
                  )}
                </div>
              </>
            )}

            {viewMode === 'tasks' && (
              <div style={{ flex: 1, padding: '14px' }}>
                <div style={{
                  background: '#1a1a24', border: '1px solid #252535',
                  borderRadius: 12, padding: '18px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#3a3a52', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{t('progress')}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#f0f0f8', marginBottom: 2, letterSpacing: '-0.025em' }}>
                    {tasks.filter(t => t.completed).length}
                    <span style={{ fontSize: 16, fontWeight: 500, color: '#5a5a78' }}>/{tasks.length}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#5a5a78', marginBottom: 14 }}>{t('completed')}</div>
                  <div style={{ height: 4, background: '#21212e', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: tasks.length ? `${(tasks.filter(t=>t.completed).length/tasks.length)*100}%` : '0%' }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                      style={{ height: '100%', background: 'var(--accent)', borderRadius: 99 }}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar toggle — strip on the right edge of sidebar + half-oval tab */}
      <motion.div
        animate={{ left: sidebarOpen ? 272 : 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        style={{
          position: 'absolute',
          top: 0, bottom: 0,
          width: 0,
          zIndex: 10,
        }}
      >
        {/* 2px strip — right on the sidebar border */}
        <div style={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: -1,
          width: 2,
          background: 'linear-gradient(180deg, transparent 0%, #1e1e2e 15%, #1e1e2e 85%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Half-oval tab — tall, not reaching top/bottom edges, no border */}
        <motion.div
          onMouseEnter={() => setTriggerHovered(true)}
          onMouseLeave={() => setTriggerHovered(false)}
          onClick={toggleSidebar}
          animate={{
            background: triggerHovered
              ? 'linear-gradient(180deg, #7c6af7, #4f8ef7)'
              : '#181824',
            boxShadow: triggerHovered
              ? '4px 0 16px rgba(124,106,247,0.4)'
              : '1px 0 4px rgba(0,0,0,0.2)',
          }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'absolute',
            top: '10%',
            bottom: '10%',
            left: 1,
            width: 16,
            borderRadius: '0 24px 24px 0',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <motion.div
            animate={{ rotate: sidebarOpen ? 0 : 180 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}
          >
            <ChevronLeft
              size={12}
              color={triggerHovered ? 'white' : '#4a4a70'}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function NavItem({ icon, label, badge, active, onClick }: {
  icon: React.ReactNode; label: string; badge?: number;
  active: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '9px 11px',
        borderRadius: 8, border: 'none',
        background: active ? '#21212e' : 'transparent',
        color: active ? '#f0f0f8' : '#5a5a78',
        cursor: 'pointer', fontSize: 15, fontWeight: active ? 600 : 500,
        transition: 'all 0.15s', marginBottom: 2,
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#1a1a24'; e.currentTarget.style.color = '#9090b0'; }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5a5a78'; }}}
    >
      <span style={{ color: active ? '#7c6af7' : '#3a3a52', display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#7c6af7' : '#3a3a52' }}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

function MoveBtn({ onClick, children, danger }: { onClick: (e: React.MouseEvent) => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      style={{
        width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none', borderRadius: 4,
        color: danger ? '#7a4a4a' : '#3a3a52', cursor: 'pointer', transition: 'color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = danger ? '#f87171' : '#7c6af7')}
      onMouseLeave={e => (e.currentTarget.style.color = danger ? '#7a4a4a' : '#3a3a52')}
    >
      {children}
    </motion.button>
  );
}

function SectionLabel({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '10px 10px 4px',
      fontSize: 10, fontWeight: 700, color: '#3a3a52',
      letterSpacing: '0.09em', textTransform: 'uppercase',
    }}>
      {icon}{label}
    </div>
  );
}

function NoteRow({ note, active, hovered, index, onClick, onDelete, onHover, onMoveUp, onMoveDown, isFirst, isLast }: {
  note: any; active: boolean; hovered: boolean; index: number;
  onClick: () => void; onDelete: () => void;
  onHover: (id: string | null) => void;
  onMoveUp?: () => void; onMoveDown?: () => void;
  isFirst?: boolean; isLast?: boolean;
}) {
  const language = useStore((s) => s.language);
  const t = (key: string) => translations[language][key] || key;
  const color = COLOR_HEX[note.color] || '#7c6af7';
  const preview = note.content.replace(/<[^>]*>/g, '').trim().slice(0, 60);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025, duration: 0.2 }}
      onClick={onClick}
      onMouseEnter={() => onHover(note.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        padding: '9px 10px', borderRadius: 8, marginBottom: 2,
        cursor: 'pointer',
        background: active ? '#21212e' : hovered ? '#1a1a24' : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 6 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600,
            color: active ? '#f0f0f8' : '#9090b0',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {note.isFavorite && (
              <Star size={11} color="#fbbf24" fill="#fbbf24" style={{ flexShrink: 0 }} />
            )}
            {note.isPinned && (
              <Pin size={10} color={color} style={{ flexShrink: 0 }} />
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {note.title || t('untitled')}
            </span>
          </div>
          {preview && (
            <div style={{ fontSize: 12, fontWeight: 400, color: '#3a3a52', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {preview}
            </div>
          )}
          {note.tags && note.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {note.tags.slice(0, 3).map((tag: string) => (
                <span key={tag} style={{
                  fontSize: 10, fontWeight: 600, color: '#5a5a78',
                  background: '#1a1a24', border: '1px solid #252535',
                  borderRadius: 99, padding: '1px 6px',
                }}>
                  #{tag}
                </span>
              ))}
              {note.tags.length > 3 && (
                <span style={{ fontSize: 10, fontWeight: 600, color: '#3a3a52' }}>+{note.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 4 }}
                transition={{ duration: 0.12 }}
                style={{ display: 'flex', gap: 1 }}
              >
                {!isFirst && (
                  <MoveBtn onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}>
                    <ArrowUp size={11} />
                  </MoveBtn>
                )}
                {!isLast && (
                  <MoveBtn onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}>
                    <ArrowDown size={11} />
                  </MoveBtn>
                )}
                <MoveBtn onClick={(e) => { e.stopPropagation(); onDelete(); }} danger>
                  <Trash2 size={11} />
                </MoveBtn>
              </motion.div>
            )}
          </AnimatePresence>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#3a3a52', marginLeft: 4 }}>
            {formatDateFn(note.updatedAt, language)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
