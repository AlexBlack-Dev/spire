import { useEffect, useId, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { dim } from '../isMobile';

export default function BottomSheet({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 250,
            background: 'color-mix(in srgb, var(--surface-0) 70%, transparent)',
            backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <motion.div
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            initial={reduced ? {} : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduced ? {} : { y: '100%' }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              outline: 'none',
              background: 'var(--surface-1)',
              borderTopLeftRadius: dim.radiusLg,
              borderTopRightRadius: dim.radiusLg,
              borderTop: '1px solid var(--border-default)',
              padding: `${dim.sp3}px ${dim.sp5}px calc(env(safe-area-inset-bottom, 8px) + ${dim.sp4}px)`,
              maxHeight: '80dvh', overflowY: 'auto',
              boxShadow: '0 -12px 40px rgba(0,0,0,0.45)',
            }}
          >
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'var(--border-strong)', margin: `0 auto ${dim.sp4}px`,
            }} />
            {title && (
              <div id={titleId} style={{
                fontSize: dim.textLg, fontWeight: 800,
                color: 'var(--text-primary)', marginBottom: dim.sp3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {title}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SheetItem({ icon, label, onClick, danger, selected }: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  selected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: dim.sp3,
        width: '100%', minHeight: 46,
        padding: `${dim.sp2}px ${dim.sp3}px`,
        background: selected ? 'var(--accent-dim)' : 'transparent',
        border: 'none', borderRadius: dim.radiusSm,
        color: danger ? 'var(--c-rose)' : 'var(--text-secondary)',
        fontSize: dim.textMd, fontWeight: 600,
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.12s',
      }}
    >
      <span style={{
        display: 'flex', flexShrink: 0,
        color: danger ? 'var(--c-rose)' : selected ? 'var(--accent)' : 'var(--text-tertiary)',
      }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </button>
  );
}

export function SheetSeparator() {
  return <div style={{ height: 1, background: 'var(--border-subtle)', margin: `${dim.sp2}px 0` }} />;
}
