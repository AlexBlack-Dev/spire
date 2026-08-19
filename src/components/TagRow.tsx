import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '../i18n/useT';
import type { Note } from '../types';

export default function TagRow({ note, updateNote }: { note: Note; updateNote: (id: string, updates: Partial<Note>) => void }) {
  const t = useT();
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = (e.target as HTMLInputElement).value.trim().replace(',', '');
      if (val && !note.tags.includes(val)) {
        updateNote(note.id, { tags: [...note.tags, val] });
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
      <AnimatePresence>
        {note.tags.map((tag) => (
          <motion.span
            key={tag}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => updateNote(note.id, { tags: note.tags.filter((x) => x !== tag) })}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border-default)',
              borderRadius: 99, padding: '1px 8px',
              fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
              cursor: 'pointer', transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            #{tag}
          </motion.span>
        ))}
      </AnimatePresence>
      <input
        onKeyDown={handleKeyDown}
        placeholder={t('add_tag')}
        style={{
          background: 'none', border: 'none', outline: 'none',
          fontSize: 12, fontWeight: 500, color: 'var(--text-disabled)',
          width: 55, userSelect: 'text',
        }}
      />
    </div>
  );
}