import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Trash2, RotateCcw, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { COLOR_HEX } from '../utils/format';
import { format } from 'date-fns';
import { dim, isMobile, useViewport } from '../isMobile';

export default function TrashView({ onBack }: { onBack?: () => void }) {
  const trash = useStore((s) => s.trash);
  const restoreFromTrash = useStore((s) => s.restoreFromTrash);
  const permanentDelete = useStore((s) => s.permanentDelete);
  const emptyTrash = useStore((s) => s.emptyTrash);
  const t = useT();
  const ih = useViewport();
  const [armed, setArmed] = useState<string | null>(null);

  const confirmDelete = (key: string, action: () => void) => {
    if (armed === key) {
      action();
      setArmed(null);
      return;
    }
    setArmed(key);
    window.setTimeout(() => setArmed((v) => (v === key ? null : v)), 3000);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      flex: 1, minWidth: 0,
      background: 'var(--surface-0)', overflow: 'hidden',
    }}>
      {onBack && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: dim.sp2,
          padding: `${dim.sp4}px ${dim.sp6}px`,
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <motion.button
            whileTap={{ scale: 0.82 }}
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
          <span style={{ fontSize: dim.textXl, fontWeight: 800, color: 'var(--text-primary)' }}>
            {t('trash')}
          </span>
        </div>
      )}

      {trash.length > 0 && (
        <div className={isMobile ? undefined : 'editor-page'} style={{ padding: `${onBack ? dim.sp4 : dim.sp5}px ${isMobile ? `${dim.sp6}px` : 'var(--page-pad)'} ${dim.sp3}px`, flexShrink: 0 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => confirmDelete('__all__', () => emptyTrash())}
            style={{
              display: 'flex', alignItems: 'center', gap: dim.sp2,
              padding: `${dim.sp2}px ${dim.sp4}px`,
              background: 'color-mix(in srgb, var(--c-rose) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--c-rose) 20%, transparent)',
              borderRadius: dim.radiusSm,
              color: 'var(--c-rose)', fontSize: dim.textSm, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={dim.iconSm} />
            {armed === '__all__' ? t('confirm_delete_all') : t('empty_trash')}
          </motion.button>
        </div>
      )}

      <div className={isMobile ? undefined : 'editor-page'} style={{
        flex: 1, overflowY: 'auto',
        padding: `0 ${isMobile ? `${dim.sp6}px` : 'var(--page-pad)'} ${dim.sp7}px`,
        display: 'flex', flexDirection: 'column', gap: dim.sp2,
      }}>
        {trash.length === 0 && (
          <div style={{
            padding: `${Math.round(ih * 0.12)}px ${dim.sp6}px`,
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: dim.radiusLg,
              background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-disabled)', marginBottom: dim.sp3,
            }}>
              <Trash2 size={24} />
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: dim.textMd, fontWeight: 800 }}>
              {t('trash_empty')}
            </div>
            <div style={{
              color: 'var(--text-tertiary)', fontSize: dim.textSm, fontWeight: 600,
              marginTop: dim.sp2, maxWidth: 280, lineHeight: 1.5,
            }}>
              {t('trash_empty_desc')}
            </div>
          </div>
        )}
        {trash.map((note) => (
          <motion.div
            key={note.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: dim.sp3,
              padding: dim.sp4,
              borderRadius: dim.radiusSm,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{
              width: dim.dot, height: dim.dot, borderRadius: '50%',
              background: COLOR_HEX[note.color] || 'var(--accent)', flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: dim.textMd, fontWeight: 700, color: 'var(--text-secondary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {note.title || t('untitled')}
              </div>
              <div style={{ fontSize: dim.textXs, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {format(new Date(note.updatedAt), 'd MMM yyyy, HH:mm')}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.82 }}
              onClick={() => restoreFromTrash(note.id)}
              aria-label={t('restore')}
              style={{
                width: dim.barH, height: dim.barH,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'color-mix(in srgb, var(--c-green) 12%, transparent)', border: 'none',
                borderRadius: dim.radiusSm, cursor: 'pointer', color: 'var(--c-green)',
              }}
            >
              <RotateCcw size={dim.iconMd} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.82 }}
              onClick={() => confirmDelete(note.id, () => permanentDelete(note.id))}
              aria-label={armed === note.id ? t('confirm_delete_forever') : t('delete_forever')}
              style={{
                width: dim.barH, height: dim.barH,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: armed === note.id
                  ? 'color-mix(in srgb, var(--c-rose) 32%, transparent)'
                  : 'color-mix(in srgb, var(--c-rose) 12%, transparent)',
                border: armed === note.id ? '1px solid var(--c-rose)' : 'none',
                borderRadius: dim.radiusSm, cursor: 'pointer', color: 'var(--c-rose)',
              }}
            >
              <X size={dim.iconMd} />
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
