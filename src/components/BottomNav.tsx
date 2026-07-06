import { motion, useReducedMotion } from 'framer-motion';
import { BookMarked, CircleCheckBig, Star, Wrench, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { dim } from '../isMobile';

export type MobileTab = 'notes' | 'tasks' | 'favorites' | 'tools';

export default function BottomNav({ activeTab, onTabChange }: {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}) {
  const { language, createNote } = useStore();
  const t = (key: string) => translations[language][key] || key;
  const reduced = useReducedMotion();

  const tabDefs: Array<{
    id: MobileTab; icon: React.ReactNode; iconActive: React.ReactNode; label: string;
  }> = [
    { id: 'notes', icon: <BookMarked size={dim.iconMd} />, iconActive: <BookMarked size={dim.iconMd} />, label: t('notes') },
    { id: 'tasks', icon: <CircleCheckBig size={dim.iconMd} />, iconActive: <CircleCheckBig size={dim.iconMd} />, label: t('tasks') },
    { id: 'favorites', icon: <Star size={dim.iconMd} />, iconActive: <Star size={dim.iconMd} />, label: t('favorites') },
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
        background: 'var(--surface-1)',
        borderRadius: barH / 2,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}>
        {renderTab(tabDefs[0])}
        {renderTab(tabDefs[1])}

        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.button
            whileTap={reduced ? {} : { scale: 0.88 }}
            whileHover={reduced ? {} : { scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
            onClick={() => { createNote(); }}
            style={{
              position: 'absolute', top: Math.round((barH - plusSz) / 2),
              width: plusSz, height: plusSz, borderRadius: '50%',
              background: 'var(--accent)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              cursor: 'pointer',
            }}
          >
            <Plus size={dim.iconMd} color="white" strokeWidth={2.5} />
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
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 1,
          background: 'none', border: 'none', cursor: 'pointer',
          outline: 'none', padding: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: Math.round(barH * 0.48), color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}>
          {active ? tab.iconActive : tab.icon}
        </div>
        <span style={{
          fontSize: dim.textXs, fontWeight: active ? 800 : 600,
          color: active ? 'var(--accent)' : 'var(--text-tertiary)',
          lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', maxWidth: '100%',
        }}>
          {tab.label}
        </span>
      </motion.button>
    );
  }
}
