import { motion, useReducedMotion } from 'framer-motion';
import { FileText, CheckSquare, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { dim } from '../isMobile';

export default function WelcomeScreen() {
  const { createNote, setViewMode, language } = useStore();
  const t = (key: string) => translations[language][key] || key;
  const reduced = useReducedMotion();

  const fade = reduced ? { duration: 0 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={fade}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `${dim.sp7}px ${dim.sp6}px`, background: 'var(--surface-0)',
        overflow: 'hidden', minWidth: 0,
      }}
    >
      <motion.div
        initial={reduced ? {} : { opacity: 0, scale: 0.3, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : {
          type: 'spring', stiffness: 220, damping: 14,
          delay: 0.06,
        }}
        style={{ textAlign: 'center', marginBottom: 24 }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ marginBottom: 14, display: 'inline-block', position: 'relative' }}
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 100, height: 100,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124,106,247,0.2) 0%, transparent 70%)',
              filter: 'blur(12px)',
              pointerEvents: 'none',
            }}
          />
          <img
            src="/favicon.png"
            width={60} height={60}
            alt="Spire"
            style={{ imageRendering: 'auto', display: 'block', position: 'relative', filter: 'drop-shadow(0 0 6px rgba(124,106,247,0.3))' }}
          />
        </motion.div>

        <motion.h1
          initial={reduced ? {} : { opacity: 0, y: 12, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={reduced ? { duration: 0 } : { duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: 36, fontWeight: 800,
            color: 'var(--text-primary)', letterSpacing: '-0.035em', marginBottom: 8,
          }}
        >
          Spire
        </motion.h1>
        <motion.p
          initial={reduced ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.35, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: 16, fontWeight: 600,
            color: 'var(--text-tertiary)', maxWidth: 320, lineHeight: 1.65,
          }}
        >
          {t('welcome_subtitle')}
        </motion.p>
      </motion.div>

      <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 500, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          {
            icon: <FileText size={20} />,
            title: t('card_notes_title'),
            desc: t('card_notes_desc'),
            action: createNote,
            label: t('card_notes_action'),
          },
          {
            icon: <CheckSquare size={20} />,
            title: t('card_tasks_title'),
            desc: t('card_tasks_desc'),
            action: () => setViewMode('tasks'),
            label: t('card_tasks_action'),
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={reduced ? {} : { opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={reduced ? { duration: 0 } : {
              type: 'spring', stiffness: 280, damping: 18,
              delay: 0.3 + i * 0.12,
            }}
            whileHover={reduced ? {} : { y: -4, borderColor: '#32324a', scale: 1.02 }}
            whileTap={reduced ? {} : { scale: 0.97 }}
            onClick={card.action}
            style={{
              flex: 1,
              background: 'var(--surface-1)',
border: '1px solid var(--border-default)',
              borderRadius: '16px',
              padding: '18px 18px',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 42, height: 42,
              background: 'var(--surface-2)', border: '1px solid var(--border-default)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', marginBottom: 16,
            }}>
              {card.icon}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              {card.title}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: 20 }}>
              {card.desc}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 13, fontWeight: 700, color: 'var(--accent)',
            }}>
              {card.label} <ArrowRight size={14} />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={reduced ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduced ? { duration: 0 } : { delay: 0.55, duration: 0.4 }}
        style={{ marginTop: 20, fontSize: 12, fontWeight: 600, color: 'var(--text-disabled)' }}
      >
        {t('welcome_footer')}
      </motion.p>
    </motion.div>
  );
}
