import { motion } from 'framer-motion';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ChevronLeft, Download, Upload, Github } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations, type Language } from '../i18n/translations';
import { dim } from '../isMobile';

const APP_VERSION = '1.0.0';

export default function MobileSettings({ onBack }: { onBack?: () => void }) {
  const { language, setLanguage, exportData, importData } = useStore();
  const t = (key: string) => translations[language][key] || key;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: 'var(--surface-0)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: dim.sp2,
        padding: `${dim.sp4}px ${dim.sp6}px`,
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        {onBack && (
          <motion.button
            whileTap={{ scale: 0.82 }}
            onClick={onBack}
            style={{
              width: dim.barH, height: dim.barH,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', borderRadius: dim.radiusSm,
              color: 'var(--accent)', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <ChevronLeft size={dim.iconLg} strokeWidth={2.5} />
          </motion.button>
        )}
        <span style={{ fontSize: dim.textXl, fontWeight: 800, color: 'var(--text-primary)' }}>
          {t('settings_title')}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${dim.sp7}px ${dim.sp6}px` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: dim.sp8 }}>
          <Section label={t('settings_version')}>
            <div style={{ fontSize: dim.textMd, fontWeight: 800, color: 'var(--text-secondary)' }}>
              {APP_VERSION}
            </div>
          </Section>

          <Section label={t('settings_language')}>
            <div style={{ display: 'flex', gap: dim.sp3 }}>
              {(['en', 'ru'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  style={{
                    flex: 1, padding: `${dim.sp5}px ${dim.sp7}px`,
                    background: language === lang ? 'var(--surface-3)' : 'transparent',
                    border: language === lang ? `1px solid var(--accent)` : '1px solid var(--border-default)',
                    borderRadius: dim.radius,
                    color: language === lang ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontSize: dim.textMd, fontWeight: language === lang ? 700 : 600,
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >
                  {lang === 'en' ? 'English' : 'Русский'}
                </button>
              ))}
            </div>
          </Section>

          <Section label={t('settings_developer')}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--surface-2)', borderRadius: dim.radius,
              padding: `${dim.sp5}px ${dim.sp6}px`,
              border: '1px solid var(--border-default)',
            }}>
              <span style={{ fontSize: dim.textMd, fontWeight: 800, color: 'var(--text-secondary)' }}>
                alex black
              </span>
              <button
                onClick={() => openUrl('https://github.com/AlexBlack-Dev')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: dim.barH, height: dim.barH, borderRadius: dim.radiusSm,
                  background: 'transparent', border: 'none',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                <Github size={dim.iconMd} />
              </button>
            </div>
          </Section>

          <div style={{ height: 1, background: 'var(--border-subtle)' }} />

          <Section label="Data">
            <div style={{ display: 'flex', gap: dim.sp3 }}>
              <ActionBtn
                icon={<Download size={dim.iconSm} />}
                label="Export"
                onClick={() => { exportData(); }}
              />
              <ActionBtn
                icon={<Upload size={dim.iconSm} />}
                label="Import"
                onClick={() => { importData(); }}
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: dim.textXs, fontWeight: 800, color: 'var(--text-tertiary)',
        marginBottom: dim.sp3, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ActionBtn({ icon, label, onClick }: {
  icon: React.ReactNode; label: string; onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        flex: 1, padding: `${dim.sp5}px ${dim.sp7}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: dim.sp2,
        background: 'transparent', border: '1px solid var(--border-default)',
        borderRadius: dim.radius,
        color: 'var(--text-secondary)', fontSize: dim.textMd, fontWeight: 800,
        cursor: 'pointer',
      }}
    >
      {icon} {label}
    </motion.button>
  );
}
