import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function SplashScreen() {
  const splashDone = useStore((s) => s.splashDone);
  const setSplashDone = useStore((s) => s.setSplashDone);

  useEffect(() => {
    const timer = setTimeout(setSplashDone, 1400);
    return () => clearTimeout(timer);
  }, [setSplashDone]);

  return (
    <AnimatePresence>
      {!splashDone && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-0)',
            zIndex: 9999,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <img
              src="/favicon.png"
              width={88} height={88}
              alt="Spire"
              style={{ display: 'block', borderRadius: 16, marginBottom: 24 }}
            />

            <motion.h1
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              style={{
                fontSize: 40, fontWeight: 800,
                color: 'var(--text-primary)', letterSpacing: '-0.04em',
                marginBottom: 8,
              }}
            >
              Spire
            </motion.h1>

            <motion.p
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.18, duration: 0.3 }}
              style={{
                fontSize: 14, fontWeight: 500,
                color: 'var(--text-tertiary)',
              }}
            >
              Text & Task Editor
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
