import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { dim } from '../isMobile';
import { COLOR_HEX, hexToRgba } from '../utils/format';
import type { ChangelogEntry } from '../utils/changelog';

const SECTION_COLORS: Record<string, string> = {
  Added: '#4ade80',
  Changed: '#fbbf24',
  Fixed: '#4f8ef7',
  Removed: '#f87171',
};

export default function ChangelogView({ onBack }: { onBack?: () => void }) {
  const language = useStore((s) => s.language);
  const accentColor = useStore((s) => s.accentColor);
  const entries = useStore((s) => s.changelogEntries);
  const changelogLoading = useStore((s) => s.changelogLoading);
  const changelogFailed = useStore((s) => s.changelogFailed);
  const changelogVersion = useStore((s) => s.changelogVersion);
  const fetchChangelog = useStore((s) => s.fetchChangelog);
  const setChangelogVersion = useStore((s) => s.setChangelogVersion);
  const t = (key: string) => translations[language][key] || key;

  useEffect(() => {
    if (entries.length === 0 && !changelogLoading) fetchChangelog();
  }, [entries.length, changelogLoading, fetchChangelog]);

  const selectedVersion = changelogVersion ?? entries[0]?.version ?? null;
  const selected: ChangelogEntry | null = entries.find((e) => e.version === selectedVersion) ?? entries[0] ?? null;
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

  const releaseList = (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: dim.sp2,
      paddingTop: onBack ? dim.sp3 : 4,
    }}>
      {entries.map((entry) => {
        const active = entry.version === selectedVersion;
        const chevron = onBack ? (
          <ChevronDown size={dim.iconSm} style={{
            color: active ? accent : 'var(--text-disabled)',
            transition: 'transform 0.15s',
            transform: active ? 'rotate(180deg)' : 'none',
          }} />
        ) : null;
        return (
          <button
            key={entry.version}
            onClick={() => setChangelogVersion(active ? null : entry.version)}
            style={{
              display: 'flex', alignItems: 'center', gap: dim.sp3,
              background: active ? 'var(--surface-2)' : 'transparent',
              border: active ? `1px solid ${hexToRgba(accent, 0.3)}` : '1px solid transparent',
              borderRadius: 10, padding: `${dim.sp3}px ${dim.sp4}px`,
              cursor: 'pointer', textAlign: 'left', width: '100%',
            }}
          >
            <span style={{
              fontSize: onBack ? dim.textMd : 14, fontWeight: 800,
              color: active ? accent : 'var(--text-secondary)',
              letterSpacing: '-0.01em',
            }}>
              v{entry.version}
            </span>
            <span style={{ flex: 1 }} />
            {entry.date && (
              <span style={{ fontSize: dim.textXs, fontWeight: 600, color: 'var(--text-disabled)' }}>
                {entry.date}
              </span>
            )}
            {chevron}
          </button>
        );
      })}
    </div>
  );

  let body: ReactNode;
  if (changelogLoading && entries.length === 0) {
    body = (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100%', fontSize: dim.textMd, fontWeight: 600,
        color: 'var(--text-tertiary)',
      }}>
        {t('loading')}
      </div>
    );
  } else if (changelogFailed || (entries.length === 0 && !changelogLoading)) {
    body = (
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
          onClick={fetchChangelog}
          style={{
            background: 'none', border: `1px solid ${hexToRgba(accent, 0.4)}`,
            borderRadius: 10, padding: `${dim.sp2}px ${dim.sp4}px`,
            color: accent, fontSize: dim.textSm, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {t('retry')}
        </button>
      </div>
    );
  } else if (!selected) {
    body = null;
  } else {
    body = (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: dim.sp5,
        paddingTop: onBack ? dim.sp3 : 4,
      }}>
        <div key={selected.version} style={{
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
              v{selected.version}
            </span>
            {selected.date && (
              <span style={{
                fontSize: dim.textXs, fontWeight: 600,
                color: 'var(--text-disabled)',
              }}>
                {selected.date}
              </span>
            )}
          </div>
          {selected.sections.map((s) => {
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
        {onBack && <div style={{ height: dim.sp4, flexShrink: 0 }} />}
      </div>
    );
  }

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
        {onBack && releaseList}
        {body}
      </div>
    </div>
  );
}