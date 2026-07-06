import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, Github } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useStore } from '../store/useStore';
import { translations, type Language } from '../i18n/translations';

const APP_VERSION = '1.0.0';

export default function SettingsModal() {
  const { settingsOpen, setSettingsOpen, language, setLanguage, exportData, importData } = useStore();
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
              background: '#16161f',
              border: '1px solid #252535',
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
              <span style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f8' }}>
                {t('settings_title')}
              </span>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: 'none', borderRadius: 8,
                  color: '#3a3a52', cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1a1a24'; e.currentTarget.style.color = '#9090b0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3a3a52'; }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#5a5a78', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('settings_version')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#d0d0e8' }}>
                  {APP_VERSION}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#5a5a78', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('settings_language')}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['en', 'ru'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      style={{
                        flex: 1, padding: '10px 16px',
                        background: language === lang ? '#21212e' : 'transparent',
                        border: language === lang ? '1px solid #7c6af7' : '1px solid #252535',
                        borderRadius: 10,
                        color: language === lang ? '#f0f0f8' : '#5a5a78',
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
                <div style={{ fontSize: 12, fontWeight: 600, color: '#5a5a78', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('settings_developer')}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#1a1a24', borderRadius: 10, padding: '10px 14px',
                  border: '1px solid #252535',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#d0d0e8' }}>
                    alex black
                  </span>
                  <button
                    onClick={openGitHub}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 32, height: 32, borderRadius: 8,
                      background: 'transparent', border: 'none',
                      color: '#9090b0', cursor: 'pointer', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#21212e'; e.currentTarget.style.color = '#7c6af7'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9090b0'; }}
                  >
                    <Github size={18} />
                  </button>
                </div>
              </div>

              <div style={{ height: 1, background: '#1e1e2a' }} />

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#5a5a78', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Data
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { exportData(); setSettingsOpen(false); }}
                    style={{
                      flex: 1, padding: '10px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'transparent', border: '1px solid #252535',
                      borderRadius: 10,
                      color: '#d0d0e8', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1a1a24'; e.currentTarget.style.borderColor = '#7c6af7'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#252535'; }}
                  >
                    <Download size={14} /> Export
                  </button>
                  <button
                    onClick={() => { importData(); setSettingsOpen(false); }}
                    style={{
                      flex: 1, padding: '10px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'transparent', border: '1px solid #252535',
                      borderRadius: 10,
                      color: '#d0d0e8', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1a1a24'; e.currentTarget.style.borderColor = '#7c6af7'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#252535'; }}
                  >
                    <Upload size={14} /> Import
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
