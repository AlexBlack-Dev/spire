import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { COLOR_HEX, hexToRgba } from '../utils/format';

export default function SplashScreen() {
  const splashDone = useStore((s) => s.splashDone);
  const setSplashDone = useStore((s) => s.setSplashDone);
  const accentColor = useStore((s) => s.accentColor);
  const accent = COLOR_HEX[accentColor];
  const accentRgba = (a: number) => hexToRgba(accent, a);

  useEffect(() => {
    const timer = setTimeout(setSplashDone, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {!splashDone && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-0)',
            zIndex: 9999,
          }}
        >
          {/* Logo container */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            {/* Glow */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 160, height: 160,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${accentRgba(0.3)} 0%, transparent 70%)`,
                filter: 'blur(20px)',
                pointerEvents: 'none',
              }}
            />

            {/* Logo icon */}
            <motion.div
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.02, 1],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'relative', marginBottom: 24 }}
            >
              <motion.img
                src="/favicon.png"
                width={88} height={88}
                alt="Spire"
                style={{
                  display: 'block',
                  borderRadius: 16,
                  filter: `drop-shadow(0 0 12px ${accentRgba(0.4)})`,
                }}
                initial={{ borderRadius: 16 }}
                animate={{ borderRadius: [16, 24, 16] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>

            {/* App name */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{
                fontSize: 48, fontWeight: 800,
                color: 'var(--text-primary)', letterSpacing: '-0.04em',
                marginBottom: 8,
              }}
            >
              Spire
            </motion.h1>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              style={{
                fontSize: 14, fontWeight: 500,
                color: 'var(--text-tertiary)',
              }}
            >
              Text & Task Editor
            </motion.p>

            {/* Accent bar */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 200 }}
              transition={{ delay: 0.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: 2,
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                marginTop: 32,
                borderRadius: 99,
              }}
            />
          </motion.div>

          {/* Corner decorations */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            style={{
              position: 'absolute', top: 40, left: 40,
              width: 60, height: 60,
              borderTop: `2px solid ${accent}`,
              borderLeft: `2px solid ${accent}`,
              borderRadius: 8,
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            style={{
              position: 'absolute', top: 40, right: 40,
              width: 60, height: 60,
              borderTop: `2px solid ${accent}`,
              borderRight: `2px solid ${accent}`,
              borderRadius: 8,
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ delay: 0.7, duration: 1 }}
            style={{
              position: 'absolute', bottom: 40, left: 40,
              width: 60, height: 60,
              borderBottom: `2px solid ${accent}`,
              borderLeft: `2px solid ${accent}`,
              borderRadius: 8,
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            style={{
              position: 'absolute', bottom: 40, right: 40,
              width: 60, height: 60,
              borderBottom: `2px solid ${accent}`,
              borderRight: `2px solid ${accent}`,
              borderRadius: 8,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
