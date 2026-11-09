import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { dim } from '../isMobile';

export default function LockedNoteView({ noteId }: { noteId: string }) {
  const t = useT();
  const showLockPrompt = useStore((s) => s.showLockPrompt);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: dim.sp4,
      overflow: 'hidden', background: 'var(--surface-0)', textAlign: 'center',
      padding: `0 ${dim.sp6}px`,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 36,
        background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Lock size={32} color="var(--accent)" />
      </div>
      <div style={{ fontSize: dim.textLg, fontWeight: 800, color: 'var(--text-primary)' }}>
        {t('note_locked_title')}
      </div>
      <div style={{ fontSize: dim.textSm, fontWeight: 500, color: 'var(--text-tertiary)', maxWidth: 320, lineHeight: 1.6 }}>
        {t('note_locked_desc')}
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => showLockPrompt(noteId, 'note', 'unlock')}
        style={{
          padding: `${dim.sp3}px ${dim.sp6}px`,
          background: 'var(--accent)', border: 'none', borderRadius: dim.radiusSm,
          color: 'var(--on-accent)', fontSize: dim.textMd, fontWeight: 800, cursor: 'pointer',
        }}
      >
        {t('note_locked_unlock')}
      </motion.button>
    </div>
  );
}
