import { motion, useReducedMotion } from 'framer-motion';
import { BookMarked, CircleCheckBig, Lock, Wrench, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { dim } from '../isMobile';

export type MobileTab = 'notes' | 'tasks' | 'private' | 'tools';

export default function BottomNav({ activeTab, onTabChange }: {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}) {
  const createNote = useStore((s) => s.createNote);
  const t = useT();
  const reduced = useReducedMotion();

  const tabDefs: Array<{
    id: MobileTab; icon: React.ReactNode; iconActive: React.ReactNode; label: string;
  }> = [
    { id: 'notes', icon: <BookMarked size={dim.iconMd} />, iconActive: <BookMarked size={dim.iconMd} />, label: t('notes') },
    { id: 'tasks', icon: <CircleCheckBig size={dim.iconMd} />, iconActive: <CircleCheckBig size={dim.iconMd} />, label: t('tasks') },
    { id: 'private', icon: <Lock size={dim.iconMd} />, iconActive: <Lock size={dim.iconMd} />, label: t('nav_private') },
    { id: 'tools', icon: <Wrench size={dim.iconMd} />, iconActive: <Wrench size={dim.iconMd} />, label: t('tools') },
  ];

  const iw = window.innerWidth;
  const barH = Math.round(Math.max(64, Math.min(76, iw * 0.16)));
  const bottomGap = Math.round(Math.max(12, Math.min(24, iw * 0.05)));
  const plusSz = Math.round(barH * 0.75);
  const showLabels = iw >= 350;
  const labelSize = iw < 400 ? 10 : dim.textXs;

  return (
    <div style={{
      display: 'flex', justifyContent: 'center',
      padding: `0 ${dim.sp6}px calc(env(safe-area-inset-bottom, 8px) + ${bottomGap}px)`,
      flexShrink: 0, position: 'relative', zIndex: 50,
    }}>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        width: '100%', maxWidth: 440, margin: '0 auto', height: barH, position: 'relative',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: barH / 2,
      }}>
        {renderTab(tabDefs[0])}
        {renderTab(tabDefs[1])}

        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.button
            whileTap={reduced ? {} : { scale: 0.88 }}
            whileHover={reduced ? {} : { scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
            onClick={() => { createNote(); }}
            aria-label={t('new_note')}
            style={{
              position: 'absolute', top: Math.round((barH - plusSz) / 2),
              width: plusSz, height: plusSz, borderRadius: '50%',
              background: 'var(--accent)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Plus size={dim.iconMd} color="var(--on-accent)" strokeWidth={2.5} />
          </motion.button>
        </div>

        {renderTab(tabDefs[2])}
        {renderTab(tabDefs[3])}
      </div>
    </div>
  );

  function renderTab(tab: typeof tabDefs[number]) {
    const active = activeTab === tab.id;
    return (
      <motion.button
        key={tab.id}
        whileTap={reduced ? {} : { scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 500, damping: 12 }}
        onClick={() => onTabChange(tab.id)}
        aria-label={tab.label}
        aria-current={active ? 'page' : undefined}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: `0 ${Math.round(dim.sp1)}px`, minWidth: 44, minHeight: 44,
        }}
      >
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 1,
          padding: `${Math.round(barH * 0.06)}px 2px`,
          width: '100%', minWidth: 0, boxSizing: 'border-box',
          borderRadius: 999,
          background: active ? 'var(--accent-dim)' : 'transparent',
          color: active ? 'var(--accent)' : 'var(--text-tertiary)',
          transition: 'background 0.15s, color 0.15s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: Math.round(barH * 0.4) }}>
            {active ? tab.iconActive : tab.icon}
          </div>
          {showLabels && (
            <span style={{
              fontSize: labelSize, fontWeight: active ? 800 : 600,
              color: active ? 'var(--text-primary)' : 'inherit', letterSpacing: '-0.02em',
              lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', maxWidth: '100%',
            }}>
              {tab.label}
            </span>
          )}
        </div>
      </motion.button>
    );
  }
}
