import { motion, useReducedMotion } from 'framer-motion';
import { useT } from '../i18n/useT';
import { dim } from '../isMobile';

export default function WelcomeScreen() {
  const t = useT();
  const reduced = useReducedMotion();

  const fade = reduced ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={fade}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `${dim.sp7}px ${dim.sp6}px`, background: 'var(--surface-0)',
        overflow: 'hidden', minWidth: 0,
      }}
    >
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={fade}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 320 }}
      >
        <img
          src="/favicon.png"
          width={56} height={56}
          alt=""
          style={{ display: 'block', marginBottom: 18 }}
        />
        <h1 style={{
          fontSize: 32, fontWeight: 800,
          color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 10,
        }}>
          Spire
        </h1>
        <p style={{
          fontSize: 15, fontWeight: 500,
          color: 'var(--text-tertiary)', lineHeight: 1.6,
        }}>
          {t('welcome_subtitle')}
        </p>
      </motion.div>
    </motion.div>
  );
}
