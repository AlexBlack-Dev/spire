import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import { dim } from '../isMobile';

type Mode = 'unlock' | 'set' | 'remove';

const DURATIONS = [
  { label: '5 min', ms: 5 * 60 * 1000 },
  { label: '15 min', ms: 15 * 60 * 1000 },
  { label: '30 min', ms: 30 * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: 'Always', ms: 0 },
];

export default function LockPrompt({ mode, noteId, onSuccess, onClose }: {
  mode: Mode;
  noteId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const { setNotePassword, clearNotePassword, verifyNotePassword, unlockNote, notes } = useStore();
  const note = notes.find((n) => n.id === noteId);
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(5 * 60 * 1000);

  function handleSubmit() {
    setError('');
    if (mode === 'set') {
      if (!pw) { setError('Enter a password'); return; }
      if (pw.length < 3) { setError('At least 3 characters'); return; }
      if (pw !== confirmPw) { setError('Passwords do not match'); return; }
      setNotePassword(noteId, pw);
      onSuccess();
    } else if (mode === 'remove') {
      if (!pw) { setError('Enter current password'); return; }
      if (!verifyNotePassword(noteId, pw)) { setError('Wrong password'); return; }
      clearNotePassword(noteId);
      onSuccess();
    } else {
      if (!pw) { setError('Enter password'); return; }
      if (!verifyNotePassword(noteId, pw)) { setError('Wrong password'); return; }
      if (selectedDuration !== null && selectedDuration > 0) {
        unlockNote(noteId, selectedDuration);
      }
      onSuccess();
    }
  }

  const isUnlock = mode === 'unlock';

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
          {mode === 'set' ? 'Set Password' : mode === 'remove' ? 'Remove Password' : 'Unlock Note'}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: dim.sp6, padding: `0 ${dim.sp6}px` }}>
        <div style={{
          width: 72, height: 72, borderRadius: 36,
          background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {mode === 'remove' ? <Unlock size={32} color="var(--accent)" /> : <Lock size={32} color="var(--accent)" />}
        </div>

        {note && <div style={{ fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>"{note.title}"</div>}

        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: dim.sp3 }}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder={mode === 'set' ? 'New password' : 'Password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              style={{
                width: '100%', padding: `${dim.sp3}px ${dim.sp6}px ${dim.sp3}px ${dim.sp4}px`,
                fontSize: dim.textMd, fontWeight: 500,
                background: 'var(--surface-2)', border: error ? '1.5px solid #f87171' : '1.5px solid var(--border-default)',
                borderRadius: dim.radiusSm, color: 'var(--text-primary)', outline: 'none',
              }}
            />
            <button onClick={() => setShowPw(!showPw)} style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4,
            }}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {mode === 'set' && (
            <input
              type="password"
              placeholder="Confirm password"
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
            <div>
              <div style={{ fontSize: dim.textXs, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: dim.sp2 }}>
                Keep unlocked for:
              </div>
              <div style={{ display: 'flex', gap: dim.sp1, flexWrap: 'wrap' }}>
                {DURATIONS.map((d) => (
                  <motion.button
                    key={d.label}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDuration(d.ms)}
                    style={{
                      padding: `${dim.sp1}px ${dim.sp2}px`,
                      fontSize: dim.textXs, fontWeight: 700, cursor: 'pointer',
                      background: selectedDuration === d.ms ? 'var(--accent)' : 'var(--surface-2)',
                      border: 'none', borderRadius: dim.radiusSm,
                      color: selectedDuration === d.ms ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {d.label}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <div style={{ fontSize: dim.textSm, fontWeight: 600, color: '#f87171' }}>{error}</div>}

        <motion.button whileTap={{ scale: 0.95 }} onClick={handleSubmit} style={{
          width: '100%', maxWidth: 320, padding: `${dim.sp3}px 0`,
          background: 'var(--accent)', border: 'none', borderRadius: dim.radiusSm, cursor: 'pointer',
          color: '#fff', fontSize: dim.textMd, fontWeight: 700,
        }}>
          {mode === 'set' ? 'Set Password' : mode === 'remove' ? 'Remove Lock' : 'Unlock'}
        </motion.button>
      </div>
    </div>
  );
}
