import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { dim } from '../isMobile';
import { COLOR_HEX, hexToRgba } from '../utils/format';

const CHANGELOG_URL = 'https://raw.githubusercontent.com/AlexBlack-Dev/spire/master/CHANGELOG.md';

const SECTION_COLORS: Record<string, string> = {
  Added: '#4ade80',
  Changed: '#fbbf24',
  Fixed: '#4f8ef7',
  Removed: '#f87171',
};

interface ReleaseSection {
  heading: string;
  items: string[];
}

interface ReleaseEntry {
  version: string;
  date: string;
  sections: ReleaseSection[];
}

function parseChangelog(text: string): ReleaseEntry[] {
  const entries: ReleaseEntry[] = [];
  let current: ReleaseEntry | null = null;
  let section: ReleaseSection | null = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#{1,4}\s/.test(line)) continue;
    const releaseMatch = line.match(/^## \[([^\]]+)\]\s*-?\s*(.*)$/);
    if (releaseMatch) {
      current = { version: releaseMatch[1], date: releaseMatch[2] || '', sections: [] };
      entries.push(current);
      section = null;
      continue;
    }
    const sectionMatch = line.match(/^###\s+(.+)$/);
    if (sectionMatch && current) {
      section = { heading: sectionMatch[1], items: [] };
      current.sections.push(section);
      continue;
    }
    if (line.startsWith('-') && current) {
      const item = line.replace(/^-\s*/, '').trim();
      if (item && section) section.items.push(item);
    }
  }
  return entries.filter((e) => /^\d+\.\d+\.\d+/.test(e.version));
}

export default function ChangelogView({ onBack }: { onBack?: () => void }) {
  const language = useStore((s) => s.language);
  const accentColor = useStore((s) => s.accentColor);
  const t = (key: string) => translations[language][key] || key;
  const [text, setText] = useState('');
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(CHANGELOG_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.text();
        if (!cancelled) setText(body);
      } catch (e) {
        if (!cancelled) setFailed(true);
        console.warn('changelog fetch failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [retry]);

  const entries = text ? parseChangelog(text) : [];
  const accent = COLOR_HEX[accentColor] || 'var(--accent)';

  const header = onBack ? (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, padding: `${dim.sp2}px ${dim.sp2}px 0` }}>
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
      <span style={{
        fontSize: dim.textXl, fontWeight: 800, color: 'var(--text-primary)',
        letterSpacing: '-0.02em',
      }}>
        {t('changelog')}
      </span>
    </div>
  ) : (
    <div style={{ padding: '20px 26px 12px', flexShrink: 0, minWidth: 0 }}>
      <div style={{
        fontSize: 20, fontWeight: 800, color: 'var(--text-primary)',
        letterSpacing: '-0.02em',
      }}>
        {t('changelog')}
      </div>
    </div>
  );

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--surface-0)', overflow: 'hidden', minHeight: 0,
    }}>
      {header}
      <div style={{
        flex: 1, overflowY: 'auto', minHeight: 0,
        padding: onBack ? `0 ${dim.sp6}px ${dim.sp7}px` : '4px 26px 24px',
      }}>
        {failed ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: dim.sp3, paddingTop: dim.sp7, textAlign: 'center',
          }}>
            <div style={{
              fontSize: dim.textMd, fontWeight: 700, color: 'var(--text-secondary)',
            }}>
              {t('changelog_failed')}
            </div>
            <button
              onClick={() => { setFailed(false); setText(''); setRetry((r) => r + 1); }}
              style={{
                background: 'none', border: `1px solid ${hexToRgba(accent, 0.4)}`,
                borderRadius: 10, padding: `${dim.sp2}px ${dim.sp4}px`,
                color: accent, fontSize: dim.textSm, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {t('retry')}
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            height: '100%', fontSize: dim.textMd, fontWeight: 600,
            color: 'var(--text-tertiary)',
          }}>
            {t('loading')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: dim.sp5 }}>
            {entries.map((entry) => (
              <div key={entry.version} style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                borderRadius: 14,
                padding: `${dim.sp4}px ${dim.sp5}px`,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: dim.sp3,
                  marginBottom: dim.sp3,
                }}>
                  <span style={{
                    fontSize: onBack ? dim.textMd : 15, fontWeight: 800,
                    color: accent, letterSpacing: '-0.01em',
                  }}>
                    v{entry.version}
                  </span>
                  {entry.date && (
                    <span style={{
                      fontSize: dim.textXs, fontWeight: 600,
                      color: 'var(--text-disabled)',
                    }}>
                      {entry.date}
                    </span>
                  )}
                </div>
                {entry.sections.map((s) => {
                  const color = SECTION_COLORS[s.heading] || accent;
                  return (
                    <div key={s.heading} style={{ marginBottom: dim.sp3 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: dim.sp2,
                        marginBottom: dim.sp2,
                        fontSize: 11, fontWeight: 800, color,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%', background: color,
                        }} />
                        {s.heading}
                      </div>
                      <ul style={{
                        listStyle: 'none', margin: 0, padding: 0,
                        display: 'flex', flexDirection: 'column', gap: dim.sp1,
                      }}>
                        {s.items.map((item, i) => (
                          <li key={i} style={{
                            display: 'flex', gap: dim.sp2, alignItems: 'flex-start',
                          }}>
                            <span style={{
                              flexShrink: 0, width: 4, height: 4, borderRadius: '50%',
                              background: 'var(--text-disabled)', marginTop: 7,
                            }} />
                            <span style={{
                              fontSize: dim.textSm, fontWeight: 500,
                              color: 'var(--text-secondary)', lineHeight: 1.55,
                            }}>
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
