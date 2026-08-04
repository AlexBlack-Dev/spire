import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { dim } from '../isMobile';

const ICONS = {
  success: <CheckCircle2 size={16} color="#4ade80" />,
  error: <AlertTriangle size={16} color="#f87171" />,
  info: <Info size={16} color="#4f8ef7" />,
} as const;

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);

  return (
    <div style={{
      position: 'fixed', bottom: dim.sp7, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9998, display: 'flex', flexDirection: 'column', gap: dim.sp2,
      alignItems: 'center', pointerEvents: 'none', maxWidth: '90vw',
    }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex', alignItems: 'center', gap: dim.sp2,
              background: 'var(--surface-1)', border: '1px solid var(--border-default)',
              borderRadius: dim.radius, padding: `${dim.sp2}px ${dim.sp3}px`,
              boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
              pointerEvents: 'auto', maxWidth: '100%',
            }}
          >
            {ICONS[t.type]}
            <span style={{
              fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-secondary)',
              wordBreak: 'break-word',
            }}>
              {t.message}
            </span>
            <button
              onClick={() => dismissToast(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-disabled)', display: 'flex', padding: 2, flexShrink: 0,
              }}
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
