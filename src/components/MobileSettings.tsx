import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Download, Upload, Github, RefreshCw, Undo2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { hasRestorePoint } from '../store/persistStorage';
import { useT } from '../i18n/useT';
import type { Language } from '../i18n/translations';
import { dim } from '../isMobile';
import { COLOR_HEX, hexToRgba } from '../utils/format';
import { APP_VERSION } from '../version';

export default function MobileSettings({ onBack }: { onBack?: () => void }) {
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const restorePreImportBackup = useStore((s) => s.restorePreImportBackup);
  const [hasPreImportBackup, setHasPreImportBackup] = useState(false);
  useEffect(() => {
    let cancelled = false;
    hasRestorePoint()
      .then((value) => { if (!cancelled) setHasPreImportBackup(value); })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        useStore.getState().addLog('hasRestorePoint: ' + msg);
      });
    return () => { cancelled = true; };
  }, []);
  const accentColor = useStore((s) => s.accentColor);
  const showFileExtensions = useStore((s) => s.showFileExtensions);
  const setShowFileExtensions = useStore((s) => s.setShowFileExtensions);
  const checkForUpdates = useStore((s) => s.checkForUpdates);
  const t = useT();
  const accent = COLOR_HEX[accentColor];
  const accentRgba = (a: number) => hexToRgba(accent, a);

  const openGitHub = async () => {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl('https://github.com/AlexBlack-Dev');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      useStore.getState().addLog('openGitHub: ' + msg);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: 'var(--surface-0)', position: 'relative',
    }}>
      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: dim.sp2,
        padding: `${dim.sp3}px ${dim.sp4}px`,
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--surface-0)',
        flexShrink: 0, zIndex: 2,
      }}>
        {onBack && (
          <motion.button
            whileTap={{ scale: 0.82 }}
            onClick={onBack}
            aria-label={t('back')}
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
        <span style={{
          flex: 1, minWidth: 0,
          fontSize: dim.textXl, fontWeight: 800, color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          {t('settings_title')}
        </span>
        {onBack && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            aria-label={t('close')}
            title={t('close')}
            style={{
              width: dim.barH, height: dim.barH,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
              borderRadius: dim.radiusSm,
              color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={dim.iconMd} />
          </motion.button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${dim.sp5}px ${dim.sp5}px ${dim.sp8}px` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: dim.sp5 }}>
          <Section label={t('settings_version')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: dim.sp3 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: dim.textMd, fontWeight: 800, color: 'var(--text-secondary)' }}>
                  Spire
                </span>
                <span style={{ fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                  v{APP_VERSION}
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={checkForUpdates}
                style={{
                  display: 'flex', alignItems: 'center', gap: dim.sp2,
                  minHeight: 44, padding: `0 ${dim.sp4}px`,
                  background: 'var(--accent-dim)', border: `1px solid ${accentRgba(0.35)}`,
                  borderRadius: dim.radiusSm,
                  color: 'var(--text-primary)', fontSize: dim.textSm, fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <RefreshCw size={dim.iconSm} />
                {t('update_check')}
              </motion.button>
            </div>
          </Section>

          <Section label={t('settings_language')}>
            <div style={{ display: 'flex', gap: dim.sp3 }}>
              {(['en', 'ru'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  aria-pressed={language === lang}
                  style={{
                    flex: 1, minHeight: 48, padding: `0 ${dim.sp4}px`,
                    background: language === lang ? 'var(--accent-dim)' : 'var(--surface-2)',
                    border: language === lang ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                    borderRadius: dim.radiusSm,
                    color: language === lang ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontSize: dim.textMd, fontWeight: language === lang ? 800 : 600,
                    cursor: 'pointer', transition: 'background 0.12s, border-color 0.12s, color 0.12s',
                  }}
                >
                  {lang === 'en' ? 'English' : 'Русский'}
                </button>
              ))}
            </div>
          </Section>

          <Section label={t('settings_show_extensions')}>
            <Row
              label={t('show_extensions_desc')}
              onClick={() => setShowFileExtensions(!showFileExtensions)}
            >
              <div
                role="switch"
                aria-checked={showFileExtensions}
                aria-label={t('show_extensions_desc')}
                style={{
                  width: 52, height: 30, borderRadius: 15,
                  background: showFileExtensions ? 'var(--accent)' : 'var(--surface-4)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 13,
                  background: 'var(--on-accent)', position: 'absolute', top: 2,
                  left: showFileExtensions ? 24 : 2,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
            </Row>
          </Section>

          <Section label={t('settings_data')}>
            <div style={{ display: 'flex', gap: dim.sp3 }}>
              <ActionBtn
                icon={<Download size={dim.iconSm} />}
                label={t('settings_export')}
                onClick={() => { exportData(); }}
              />
              <ActionBtn
                icon={<Upload size={dim.iconSm} />}
                label={t('settings_import')}
                onClick={() => { importData(); }}
              />
            </div>
            {hasPreImportBackup && (
              <ActionBtn
                icon={<Undo2 size={dim.iconSm} />}
                label={t('undo_import')}
                onClick={() => { restorePreImportBackup(); }}
                danger
              />
            )}
          </Section>

          <Section label={t('settings_developer')}>
            <Row label="alex black">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => openGitHub()}
                aria-label="GitHub"
                title="GitHub"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, borderRadius: dim.radiusSm,
                  background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <Github size={dim.iconMd} />
              </motion.button>
            </Row>
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
        margin: `0 ${dim.sp2}px ${dim.sp2}px`, textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: dim.sp3,
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: dim.radiusLg,
        padding: dim.sp4,
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, children, onClick }: {
  label: string; children: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: dim.sp3, minHeight: 44,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ fontSize: dim.textMd, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 0 }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function ActionBtn({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{
        flex: 1, minHeight: 48, padding: `0 ${dim.sp4}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: dim.sp2,
        background: 'var(--surface-2)',
        border: danger ? '1px solid var(--c-amber)' : '1px solid var(--border-subtle)',
        borderRadius: dim.radiusSm,
        color: danger ? 'var(--c-amber)' : 'var(--text-secondary)',
        fontSize: dim.textMd, fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {icon} {label}
    </motion.button>
  );
}
