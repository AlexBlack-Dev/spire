import { Lock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';

export default function PrivateEmpty() {
  const language = useStore((s) => s.language);
  const t = (key: string) => translations[language][key] || key;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      background: 'var(--surface-0)', padding: 24,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
        color: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Lock size={30} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 5 }}>
          {t('private_empty_title')}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-disabled)', maxWidth: 320, lineHeight: 1.5 }}>
          {t('private_empty_desc')}
        </div>
      </div>
    </div>
  );
}