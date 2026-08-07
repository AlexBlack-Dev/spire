import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, ChevronLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { dim } from '../isMobile';

type Mode = 'unlock' | 'set' | 'remove';

export default function LockPrompt({ id, kind, mode, onSuccess, onClose }: {
  id: string;
  kind: 'note' | 'folder';
  mode: Mode;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const language = useStore((s) => s.language);
  const t = (key: string) => translations[language][key] || key;
  const {
    setNotePassword, clearNotePassword, verifyNotePassword, unlockNote, unlockNoteOpens,
    setFolderPassword, clearFolderPassword, verifyFolderPassword, unlockFolder,
    notes, noteFolders,
  } = useStore();
  const target = kind === 'note'
    ? notes.find((n) => n.id === id)
    : noteFolders.find((f) => f.id === id);
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<{ type: 'time' | 'opens'; value: number }>({ type: 'time', value: 5 * 60 * 1000 });

  const DURATIONS = [
    { label: t('lock_5min'), value: 5 * 60 * 1000 },
    { label: t('lock_15min'), value: 15 * 60 * 1000 },
    { label: t('lock_30min'), value: 30 * 60 * 1000 },
    { label: t('lock_1hour'), value: 60 * 60 * 1000 },
    { label: t('lock_always'), value: 0 },
  ];

  const OPENS = [
    { label: t('lock_1open'), value: 1 },
    { label: t('lock_3opens'), value: 3 },
    { label: t('lock_5opens'), value: 5 },
  ];

  const [customOpens, setCustomOpens] = useState('');
  const customOpensValue = Math.max(1, Math.min(999, parseInt(customOpens, 10) || 0));

  function selectCustomOpens(value: string) {
    setCustomOpens(value.replace(/[^\d]/g, ''));
    if (/^\d+$/.test(value)) {
      setSelected({ type: 'opens', value: Math.max(1, Math.min(999, parseInt(value, 10))) });
    }
  }

  async function handleSubmit() {
    setError('');
    setBusy(true);
    try {
      if (mode === 'set') {
        if (!pw) { setError(t('lock_enter_password')); return; }
        if (pw.length < 3) { setError(t('lock_min_length')); return; }
        if (pw !== confirmPw) { setError(t('lock_passwords_mismatch')); return; }
        if (kind === 'note') await setNotePassword(id, pw);
        else await setFolderPassword(id, pw);
        onSuccess();
      } else if (mode === 'remove') {
        if (!pw) { setError(t('lock_enter_current')); return; }
        const ok = kind === 'note'
          ? await verifyNotePassword(id, pw)
          : await verifyFolderPassword(id, pw);
        if (!ok) { setError(t('lock_wrong_password')); return; }
        if (kind === 'note') clearNotePassword(id);
        else clearFolderPassword(id);
        onSuccess();
      } else {
        if (!pw) { setError(t('lock_password')); return; }
        const ok = kind === 'note'
          ? await verifyNotePassword(id, pw)
          : await verifyFolderPassword(id, pw);
        if (!ok) { setError(t('lock_wrong_password')); return; }
        if (kind === 'note') {
          if (selected.type === 'opens') unlockNoteOpens(id, selected.value);
          else unlockNote(id, selected.value);
        } else {
          unlockFolder(id, selected.value);
        }
        onSuccess();
      }
    } finally {
      setBusy(false);
    }
  }

  const isUnlock = mode === 'unlock';
  const title = mode === 'set' ? t('lock_set_password')
    : mode === 'remove' ? t('lock_remove_password')
    : t('lock_unlock_title');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface-0)',
      paddingTop: 'var(--sat, 0px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: `0 ${dim.sp2}px`, flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.82 }} onClick={onClose} style={{
          width: dim.barH, height: dim.barH, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', borderRadius: dim.radiusSm, color: 'var(--accent)', cursor: 'pointer',
        }}>
          <ChevronLeft size={dim.iconLg} strokeWidth={2.5} />
        </motion.button>
        <span style={{ fontSize: dim.textMd, fontWeight: 700, color: 'var(--text-primary)' }}>
          {title}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: dim.sp6, padding: `0 ${dim.sp6}px` }}>
        <div style={{
          width: 72, height: 72, borderRadius: 36,
          background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {mode === 'remove' ? <Unlock size={32} color="var(--accent)" /> : <Lock size={32} color="var(--accent)" />}
        </div>

        {target && <div style={{ fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>"{'title' in target ? target.title : target.name}"</div>}

        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: dim.sp3 }}>
          <input
            type="password"
            placeholder={mode === 'set' ? t('lock_new_password') : t('lock_password')}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={{
              width: '100%', padding: `${dim.sp3}px ${dim.sp4}px`,
              fontSize: dim.textMd, fontWeight: 500,
              background: 'var(--surface-2)', border: error ? '1.5px solid #f87171' : '1.5px solid var(--border-default)',
              borderRadius: dim.radiusSm, color: 'var(--text-primary)', outline: 'none',
            }}
          />

          {mode === 'set' && (
            <input
              type="password"
              placeholder={t('lock_confirm_password')}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              style={{
                width: '100%', padding: `${dim.sp3}px ${dim.sp4}px`,
                fontSize: dim.textMd, fontWeight: 500,
                background: 'var(--surface-2)', border: '1.5px solid var(--border-default)',
                borderRadius: dim.radiusSm, color: 'var(--text-primary)', outline: 'none',
              }}
            />
          )}

          {isUnlock && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: dim.sp2 }}>
              <div style={{ fontSize: dim.textXs, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('lock_keep_unlocked')}
              </div>
              <div style={{ display: 'flex', gap: dim.sp2, flexWrap: 'wrap' }}>
                <div style={{ fontSize: dim.textXs, fontWeight: 600, color: 'var(--text-disabled)', marginRight: dim.sp1 }}>
                  {t('lock_for_time')}
                </div>
                {DURATIONS.map((d) => (
                  <motion.button
                    key={d.label}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected({ type: 'time', value: d.value })}
                    style={{
                      padding: `${dim.sp1}px ${dim.sp2}px`,
                      fontSize: dim.textXs, fontWeight: 700, cursor: 'pointer',
                      background: selected.type === 'time' && selected.value === d.value ? 'var(--accent)' : 'var(--surface-2)',
                      border: 'none', borderRadius: dim.radiusSm,
                      color: selected.type === 'time' && selected.value === d.value ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {d.label}
                  </motion.button>
                ))}
              </div>
              {kind === 'note' && (
                <div style={{ display: 'flex', gap: dim.sp2, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: dim.textXs, fontWeight: 600, color: 'var(--text-disabled)', marginRight: dim.sp1 }}>
                    {t('lock_for_opens')}
                  </div>
                  {OPENS.map((o) => (
                    <motion.button
                      key={o.label}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelected({ type: 'opens', value: o.value })}
                      style={{
                        padding: `${dim.sp1}px ${dim.sp2}px`,
                        fontSize: dim.textXs, fontWeight: 700, cursor: 'pointer',
                        background: selected.type === 'opens' && selected.value === o.value ? 'var(--accent)' : 'var(--surface-2)',
                        border: 'none', borderRadius: dim.radiusSm,
                        color: selected.type === 'opens' && selected.value === o.value ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {o.label}
                    </motion.button>
                  ))}
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={t('lock_custom_opens')}
                    value={customOpens}
                    onChange={(e) => selectCustomOpens(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && customOpensValue > 0 && handleSubmit()}
                    style={{
                      width: 64, padding: `${dim.sp1}px ${dim.sp2}px`,
                      fontSize: dim.textXs, fontWeight: 700,
                      background: selected.type === 'opens' && !OPENS.some((o) => o.value === selected.value)
                        ? 'var(--accent)' : 'var(--surface-2)',
                      color: selected.type === 'opens' && selected.value === customOpensValue ? '#fff' : 'var(--text-secondary)',
                      border: 'none', borderRadius: dim.radiusSm, outline: 'none', textAlign: 'center',
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {error && <div style={{ fontSize: dim.textSm, fontWeight: 600, color: '#f87171' }}>{error}</div>}

        <motion.button whileTap={{ scale: 0.95 }} onClick={handleSubmit} disabled={busy} style={{
          width: '100%', maxWidth: 320, padding: `${dim.sp3}px 0`,
          background: 'var(--accent)', border: 'none', borderRadius: dim.radiusSm, cursor: busy ? 'default' : 'pointer',
          color: '#fff', fontSize: dim.textMd, fontWeight: 700, opacity: busy ? 0.6 : 1,
        }}>
          {mode === 'set' ? t('lock_set_password') : mode === 'remove' ? t('lock_remove') : t('lock_unlock')}
        </motion.button>
      </div>
    </div>
  );
}
