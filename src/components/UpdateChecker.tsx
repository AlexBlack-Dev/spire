import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { APP_VERSION } from '../version';
import { dim } from '../isMobile';
import { COLOR_HEX } from '../utils/format';

const REPO_URL = 'https://api.github.com/repos/AlexBlack-Dev/spire/releases/latest';
const RELEASES_PAGE = 'https://github.com/AlexBlack-Dev/spire/releases';

function parseVersion(v: string): number[] {
  return v.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
}

function isNewer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

export default function UpdateChecker() {
  const language = useStore((s) => s.language);
  const accentColor = useStore((s) => s.accentColor);
  const t = (key: string) => translations[language][key] || key;
  const [latest, setLatest] = useState<{ version: string; url: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(REPO_URL, {
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const tag = String(data.tag_name || '');
        const htmlUrl = String(data.html_url || RELEASES_PAGE);
        if (cancelled) return;
        if (tag && isNewer(tag, APP_VERSION)) {
          setLatest({ version: tag.replace(/^v/i, ''), url: htmlUrl });
        }
      } catch {
        // offline / rate-limited — silent
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openRelease = async () => {
    if (!latest) return;
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(latest.url);
    } catch {
      window.open(latest.url, '_blank');
    }
  };

  if (!latest || dismissed) return null;

  const accent = COLOR_HEX[accentColor] || 'var(--accent)';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)', padding: dim.sp5,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%', maxWidth: 400,
            background: 'var(--surface-1)', border: '1px solid var(--border-default)',
            borderRadius: 18, padding: dim.sp5,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: dim.sp3, marginBottom: dim.sp3 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `color-mix(in srgb, ${accent} 16%, transparent)`,
              color: accent,
            }}>
              <Download size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: dim.textLg, fontWeight: 800, color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}>
                {t('update_title')}
              </div>
              <div style={{
                fontSize: dim.textXs, fontWeight: 600, color: 'var(--text-tertiary)', marginTop: 2,
              }}>
                v{APP_VERSION} → v{latest.version}
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-disabled)', padding: 4, display: 'flex', flexShrink: 0,
              }}
              aria-label={t('update_later')}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{
            fontSize: dim.textSm, fontWeight: 500, color: 'var(--text-secondary)',
            lineHeight: 1.55, marginBottom: dim.sp5,
          }}>
            {t('update_desc')}
          </div>

          <div style={{ display: 'flex', gap: dim.sp2 }}>
            <button
              onClick={() => setDismissed(true)}
              style={{
                flex: 1, padding: `${dim.sp2}px ${dim.sp3}px`,
                background: 'transparent', border: '1px solid var(--border-default)',
                borderRadius: 10, cursor: 'pointer',
                fontSize: dim.textSm, fontWeight: 700, color: 'var(--text-secondary)',
              }}
            >
              {t('update_later')}
            </button>
            <button
              onClick={openRelease}
              style={{
                flex: 1.4, padding: `${dim.sp2}px ${dim.sp3}px`,
                background: accent, border: 'none', borderRadius: 10, cursor: 'pointer',
                fontSize: dim.textSm, fontWeight: 800, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Download size={15} />
              {t('update_download')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}