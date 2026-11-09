import { motion, useReducedMotion } from 'framer-motion';
import { BookMarked, CircleCheckBig, Lock, Wrench, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { dim } from '../isMobile';
import { COLOR_HEX, hexToRgba } from '../utils/format';

export type MobileTab = 'notes' | 'tasks' | 'private' | 'tools';

export default function BottomNav({ activeTab, onTabChange }: {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}) {
  const createNote = useStore((s) => s.createNote);
  const accentColor = useStore((s) => s.accentColor);
  const t = useT();
  const reduced = useReducedMotion();
  const accent = COLOR_HEX[accentColor];
  const accentRgba = (a: number) => hexToRgba(accent, a);

  const tabDefs: Array<{
    id: MobileTab; icon: React.ReactNode; iconActive: React.ReactNode; label: string;
  }> = [
    { id: 'notes', icon: <BookMarked size={dim.iconMd} />, iconActive: <BookMarked size={dim.iconMd} />, label: t('notes') },
    { id: 'tasks', icon: <CircleCheckBig size={dim.iconMd} />, iconActive: <CircleCheckBig size={dim.iconMd} />, label: t('tasks') },
    { id: 'private', icon: <Lock size={dim.iconMd} />, iconActive: <Lock size={dim.iconMd} />, label: t('private') },
    { id: 'tools', icon: <Wrench size={dim.iconMd} />, iconActive: <Wrench size={dim.iconMd} />, label: t('tools') },
  ];

  const iw = window.innerWidth;
  const barH = Math.round(Math.max(68, Math.min(88, iw * 0.16)));
  const bottomGap = Math.round(Math.max(12, Math.min(24, iw * 0.05)));
  const plusSz = Math.round(barH * 0.75);

  return (
    <div style={{
      display: 'flex', justifyContent: 'center',
      padding: `0 ${dim.sp6}px calc(env(safe-area-inset-bottom, 8px) + ${bottomGap}px)`,
      flexShrink: 0, position: 'relative', zIndex: 50,
    }}>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        width: '100%', height: barH, position: 'relative',
        background: 'color-mix(in srgb, var(--surface-1) 94%, transparent)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: barH / 2,
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 40px ${accentRgba(0.05)}`,
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: plusSz * 1.9, height: plusSz * 1.9, borderRadius: '50%',
          background: `radial-gradient(circle, ${accentRgba(0.10)} 0%, transparent 70%)`,
          filter: 'blur(10px)', pointerEvents: 'none',
        }} />
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
              boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 24px ${accentRgba(0.24)}`,
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
          padding: `${Math.round(barH * 0.06)}px ${Math.round(barH * 0.14)}px`,
          minWidth: 54,
          borderRadius: 999,
          background: active ? 'var(--accent-dim)' : 'transparent',
          color: active ? 'var(--accent)' : 'var(--text-tertiary)',
          transition: 'background 0.15s, color 0.15s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: Math.round(barH * 0.4) }}>
            {active ? tab.iconActive : tab.icon}
          </div>
          <span style={{
            fontSize: dim.textXs, fontWeight: active ? 800 : 600,
            color: 'inherit',
            lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', maxWidth: '100%',
          }}>
            {tab.label}
          </span>
        </div>
      </motion.button>
    );
  }
}
