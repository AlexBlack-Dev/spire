import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import { APP_VERSION } from '../version';
import { dim, isMobile, pathSep } from '../isMobile';
import { COLOR_HEX, hexToRgba } from '../utils/format';

const REPO_URL = 'https://api.github.com/repos/AlexBlack-Dev/spire/releases/latest';

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

function extractNotes(body: string): string[] {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-*•]/.test(l));
  const source = bullets.length >= 2
    ? bullets
    : lines.filter((l) => !/^#{1,4}\s/.test(l));
  const notes: string[] = [];
  for (const line of source) {
    if (notes.length >= 4) break;
    const text = line
      .replace(/^[-*•]\s*/, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim();
    if (!text) continue;
    notes.push(text.length > 120 ? text.slice(0, 119) + '…' : text);
  }
  return notes;
}

interface InstallerAsset {
  name: string;
  url: string;
}

interface LatestInfo {
  version: string;
  url: string;
  body: string;
  installer: InstallerAsset | null;
}

export default function UpdateChecker() {
  const accentColor = useStore((s) => s.accentColor);
  const updateCheckRequest = useStore((s) => s.updateCheckRequest);
  const t = useT();
  const [latest, setLatest] = useState<LatestInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDismissed(false);
    (async () => {
      try {
        const res = await fetch(REPO_URL, {
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const tag = String(data.tag_name || '');
        const htmlUrl = String(data.html_url || `https://github.com/AlexBlack-Dev/spire/releases`);
        const body = String(data.body || '');
        if (cancelled) return;
        if (tag && isNewer(tag, APP_VERSION)) {
          const assets: Array<{ name?: unknown; browser_download_url?: unknown }> =
            Array.isArray(data.assets) ? data.assets : [];
          const winAsset = assets
            .map((a) => ({
              name: String(a.name || ''),
              url: String(a.browser_download_url || ''),
            }))
            .filter((a) => a.name && a.url && /\.(exe|msi)$/i.test(a.name))
            .sort((a, b) => {
              const score = (n: string) => (n.endsWith('.exe') ? 0 : 1);
              return score(a.name) - score(b.name);
            })[0] ?? null;
          setLatest({
            version: tag.replace(/^v/i, ''),
            url: htmlUrl,
            body,
            installer: isMobile ? null : winAsset,
          });
        } else if (updateCheckRequest > 0) {
          useStore.getState().showToast(t('update_up_to_date'), 'success');
        }
      } catch (e) {
        if (cancelled) return;
        console.warn('update check failed', e);
        if (updateCheckRequest > 0) {
          useStore.getState().showToast(t('update_check_failed'), 'error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [updateCheckRequest]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    (async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<{ percent: number }>('update-progress', (e) => {
          setProgress(Math.max(0, Math.min(100, Number(e.payload?.percent) || 0)));
        });
      } catch (e) {
        console.warn('update-progress listen failed', e);
      }
    })();
    return () => { unlisten?.(); };
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

  const openChangelog = () => {
    const s = useStore.getState();
    if (isMobile) s.requestChangelog();
    else s.setViewMode('changelog');
    setDismissed(true);
  };

  const installUpdate = async () => {
    if (!latest?.installer) return;
    setInstalling(true);
    setProgress(0);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const { downloadDir } = await import('@tauri-apps/api/path');
      const { openPath } = await import('@tauri-apps/plugin-opener');
      const dir = await downloadDir();
      const target = `${dir}${pathSep}${latest.installer.name}`;
      await invoke('download_release', { url: latest.installer.url, dest: target });
      await openPath(target);
      useStore.getState().showToast(t('update_launched'), 'success');
      setDismissed(true);
    } catch (e) {
      console.warn('auto install failed', e);
      const msg = e instanceof Error ? e.message : String(e);
      useStore.getState().addLog(`update install: ${msg}`);
      useStore.getState().showToast(`${t('update_install_failed')} — ${msg}`, 'error');
      openRelease();
    } finally {
      setInstalling(false);
    }
  };

  if (!latest || dismissed) return null;

  const accent = COLOR_HEX[accentColor] || 'var(--accent)';
  const rgba = (a: number) => hexToRgba(accent, a);
  const notes = extractNotes(latest.body);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', padding: dim.sp5,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 26, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            width: '100%', maxWidth: 400, position: 'relative',
            background: 'var(--surface-1)', border: '1px solid var(--border-default)',
            borderRadius: 22, overflow: 'hidden',
            boxShadow: '0 32px 96px rgba(0,0,0,0.65), 0 0 24px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 110, pointerEvents: 'none',
            background: `linear-gradient(180deg, ${rgba(0.18)} 0%, transparent 100%)`,
          }} />

          <div style={{ padding: `${dim.sp6}px ${dim.sp6}px 0`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', marginBottom: dim.sp4 }}>
              <img src="/favicon.png" width={64} height={64} alt="Spire" />
              <motion.div
                style={{
                  position: 'absolute', top: -3, right: -6, width: 15, height: 15,
                  borderRadius: '50%', background: 'var(--c-green)',
                  border: '3px solid var(--surface-1)',
                }}
                animate={{ scale: [1, 1.25, 1], opacity: [1, 0.75, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            <div style={{
              fontSize: dim.textXxl, fontWeight: 800, color: 'var(--text-primary)',
              letterSpacing: '-0.02em', textAlign: 'center', marginBottom: dim.sp2,
            }}>
              {t('update_title')}
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: dim.sp2,
              padding: `${dim.sp1}px ${dim.sp3}px`,
              background: rgba(0.08), border: `1px solid ${rgba(0.22)}`,
              borderRadius: 999,
              fontSize: dim.textSm, fontWeight: 700,
            }}>
              <span style={{ color: 'var(--text-tertiary)' }}>v{APP_VERSION}</span>
              <ArrowRight size={13} style={{ color: 'var(--text-disabled)' }} />
              <span style={{ color: accent }}>v{latest.version}</span>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border-subtle)', margin: `${dim.sp5}px ${dim.sp6}px` }} />

          <div style={{ padding: `0 ${dim.sp6}px` }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: dim.sp2, marginBottom: dim.sp2,
              fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              <img src="/favicon.png" width={12} height={12} alt="" />
              {t('update_whats_new')}
            </div>
            {notes.length > 0 ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: dim.sp2 }}>
                {notes.map((n, i) => (
                  <li key={i} style={{ display: 'flex', gap: dim.sp2, alignItems: 'flex-start' }}>
                    <span style={{
                      flexShrink: 0, width: 5, height: 5, borderRadius: '50%',
                      background: accent, marginTop: 6,
                      boxShadow: `0 0 6px ${rgba(0.7)}`,
                    }} />
                    <span style={{
                      fontSize: dim.textSm, fontWeight: 500, color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}>
                      {n}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{
                fontSize: dim.textSm, fontWeight: 500, color: 'var(--text-secondary)',
                lineHeight: 1.55,
              }}>
                {t('update_desc')}
              </div>
            )}
          </div>

          <div style={{ padding: dim.sp6, display: 'flex', flexDirection: 'column', gap: dim.sp3 }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={latest.installer ? installUpdate : openRelease}
              style={{
                width: '100%', padding: `${dim.sp4}px 0`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: dim.sp2,
                background: accent, border: 'none', borderRadius: 12,
                color: '#fff', fontSize: dim.textMd, fontWeight: 800,
                cursor: 'pointer',
                boxShadow: `0 8px 28px ${rgba(0.45)}`,
              }}
            >
              <Download size={17} />
              {installing ? `${t('update_downloading')} ${progress}%` : (latest.installer ? t('update_install') : t('update_download'))}
            </motion.button>
            <button
              onClick={openChangelog}
              style={{
                width: '100%', padding: `${dim.sp3}px 0`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: rgba(0.1), border: `1px solid ${rgba(0.3)}`,
                borderRadius: 12,
                color: accent, fontSize: dim.textMd, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t('update_see_changes')}
            </button>
            <button
              onClick={() => setDismissed(true)}
              style={{
                width: '100%', padding: `${dim.sp1}px 0`,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-tertiary)',
              }}
            >
              {t('update_later')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}