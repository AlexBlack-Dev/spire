import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, Github, Moon, Sun, Check, RefreshCw } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useStore } from '../store/useStore';
import { translations, type Language } from '../i18n/translations';
import { COLOR_HEX, COLOR_NAMES } from '../utils/format';
import { APP_VERSION } from '../version';

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen, language, setLanguage, exportData, importData, theme, setTheme, accentColor, setAccentColor, showFileExtensions, setShowFileExtensions, checkForUpdates } = useStore();
  const t = (key: string) => translations[language][key] || key;

  const openGitHub = () => openUrl('https://github.com/AlexBlack-Dev');

  return (
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSettingsOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 16,
              padding: 28,
              width: 380,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 24,
            }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('settings_title')}
              </span>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: 'none', borderRadius: 8,
                  color: 'var(--text-disabled)', cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-disabled)'; }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('settings_version')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {APP_VERSION}
                  </div>
                  <button
                    onClick={checkForUpdates}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 12px',
                      background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                      borderRadius: 9,
                      color: 'var(--accent)', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 18%, transparent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 10%, transparent)'; }}
                  >
                    <RefreshCw size={13} />
                    {t('update_check')}
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('settings_language')}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['en', 'ru'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      style={{
                        flex: 1, padding: '10px 16px',
                        background: language === lang ? 'var(--surface-3)' : 'transparent',
                        border: language === lang ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                        borderRadius: 10,
                        color: language === lang ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        fontSize: 14, fontWeight: language === lang ? 600 : 500,
                        cursor: 'pointer', transition: 'all 0.12s',
                      }}
                    >
                      {lang === 'en' ? 'English' : 'Русский'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('themes')}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button
                    onClick={() => setTheme('dark')}
                    style={{
                      flex: 1, padding: '10px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: theme === 'dark' ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'transparent',
                      border: theme === 'dark' ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                      borderRadius: 10,
                      color: theme === 'dark' ? 'var(--accent)' : 'var(--text-tertiary)',
                      fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                  >
                    <Moon size={14} /> {t('dark_mode')}
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    style={{
                      flex: 1, padding: '10px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: theme === 'light' ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'transparent',
                      border: theme === 'light' ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                      borderRadius: 10,
                      color: theme === 'light' ? 'var(--accent)' : 'var(--text-tertiary)',
                      fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                  >
                    <Sun size={14} /> {t('light_mode')}
                  </button>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--surface-2)', borderRadius: 12, padding: '14px 16px',
                  border: '1px solid var(--border-default)',
                }}>
                  {COLOR_NAMES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAccentColor(c)}
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: COLOR_HEX[c], border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'transform 0.12s, box-shadow 0.12s',
                        transform: accentColor === c ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: accentColor === c
                          ? `0 0 0 3px var(--surface-2), 0 0 0 5px ${COLOR_HEX[c]}`
                          : '0 0 0 1px rgba(255,255,255,0.14)',
                      }}
                      onMouseEnter={e => { if (accentColor !== c) e.currentTarget.style.transform = 'scale(1.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = accentColor === c ? 'scale(1.15)' : 'scale(1)'; }}
                    >
                      {accentColor === c && <Check size={16} color="white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border-subtle)' }} />

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('settings_show_extensions')}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--surface-2)', borderRadius: 10, padding: '10px 14px',
                  border: '1px solid var(--border-default)', cursor: 'pointer',
                }}
                  onClick={() => setShowFileExtensions(!showFileExtensions)}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {t('show_extensions_desc')}
                  </span>
                  <div style={{
                    width: 40, height: 22, borderRadius: 11, flexShrink: 0,
                    background: showFileExtensions ? 'var(--accent)' : 'var(--surface-4)',
                    position: 'relative', transition: 'background 0.2s',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 9, background: '#fff',
                      position: 'absolute', top: 2, left: showFileExtensions ? 20 : 2,
                      transition: 'left 0.2s',
                    }} />
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border-subtle)' }} />

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('settings_developer')}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--surface-2)', borderRadius: 10, padding: '10px 14px',
                  border: '1px solid var(--border-default)',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    alex black
                  </span>
                  <button
                    onClick={openGitHub}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 32, height: 32, borderRadius: 8,
                      background: 'transparent', border: 'none',
                      color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <Github size={18} />
                  </button>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border-subtle)' }} />

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('settings_data')}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { exportData(); setSettingsOpen(false); }}
                    style={{
                      flex: 1, padding: '10px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'transparent', border: '1px solid var(--border-default)',
                      borderRadius: 10,
                      color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                  >
                    <Download size={14} /> {t('settings_export')}
                  </button>
                  <button
                    onClick={() => { importData(); setSettingsOpen(false); }}
                    style={{
                      flex: 1, padding: '10px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'transparent', border: '1px solid var(--border-default)',
                      borderRadius: 10,
                      color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                  >
                    <Upload size={14} /> {t('settings_import')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
