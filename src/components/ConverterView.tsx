import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, ArrowRight, Download, RefreshCw, FileCode, Image, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations, type Dict } from '../i18n/translations';
import { conversionFormats } from '../types';

export default function ConverterView() {
  const converterInputFile = useStore((s) => s.converterInputFile);
  const converterOutputFormat = useStore((s) => s.converterOutputFormat);
  const converterPreview = useStore((s) => s.converterPreview);
  const converterLoading = useStore((s) => s.converterLoading);
  const converterSelectFile = useStore((s) => s.converterSelectFile);
  const setConverterOutputFormat = useStore((s) => s.setConverterOutputFormat);
  const runConversion = useStore((s) => s.runConversion);
  const resetConverter = useStore((s) => s.resetConverter);
  const converterDropNote = useStore((s) => s.converterDropNote);
  const converterSetInput = useStore((s) => s.converterSetInput);
  const language = useStore((s) => s.language);
  const t = (key: keyof Dict, vars?: Record<string, string>) => {
    const s = translations[language][key];
    return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`) : s;
  };
  const [dragOver, setDragOver] = useState(false);
  const [dropFailed, setDropFailed] = useState(false);
  const dropTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (dropTimerRef.current) clearTimeout(dropTimerRef.current); }, []);

  const isImage = (ext: string) => conversionFormats[ext]?.category === 'image';

  const inputExt = converterInputFile ? converterInputFile.split('.').pop()?.toLowerCase() : '';
  const isSupported = !!conversionFormats[inputExt || ''];

  const getCompatibleFormats = () => {
    if (!converterInputFile || !isSupported) return [];
    const inputCat = conversionFormats[inputExt || '']?.category;
    if (!inputCat) return [];
    return Object.values(conversionFormats).filter((f) => f.category === inputCat);
  };

  const isInputImage = isImage(inputExt || '');
  const formats = getCompatibleFormats();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setDropFailed(false);
    const noteId = e.dataTransfer.getData('application/x-spire-note');
    if (noteId) {
      if (!converterDropNote(noteId)) {
        setDropFailed(true);
        if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
        dropTimerRef.current = setTimeout(() => setDropFailed(false), 2500);
      }
      return;
    }
    const path = (e.dataTransfer.files?.[0] as unknown as { path?: string } | undefined)?.path;
    if (path) {
      const ext = path.split('.').pop()?.toLowerCase() || '';
      const fmt = conversionFormats[ext] ? ext : 'txt';
      converterSetInput(path, fmt);
    }
  };

  const dropStyle = dragOver ? {
    border: '2px dashed var(--accent)',
    background: 'var(--surface-1)',
  } : {};

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--surface-0)' }}>
      {/* Header */}
      <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          {t('conv_title')}
        </h2>
        <div style={{ height: 1, background: 'var(--border-subtle)', marginTop: 10 }} />
      </div>

      {/* Body — fills remaining space */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '14px 24px' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {!converterInputFile ? (
          /* ===== NO FILE ===== */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={converterSelectFile}
              whileHover={{ borderColor: 'var(--accent)', background: 'var(--surface-1)' }}
              style={{
                width: '100%', alignSelf: 'stretch',
                border: '2px dashed var(--border-default)', borderRadius: 14,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                minHeight: 200, ...dropStyle,
              }}
            >
              <Upload size={32} color="var(--text-disabled)" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                {dragOver ? t('conv_drop_target') : t('conv_select_file')}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                {t('conv_supports')}
              </div>
              {dropFailed && (
                <div style={{
                  marginTop: 12, fontSize: 12, fontWeight: 600, color: 'var(--c-rose)',
                  background: 'color-mix(in srgb, var(--c-rose) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--c-rose) 30%, transparent)',
                  borderRadius: 8, padding: '6px 12px',
                }}>
                  {t('conv_drop_file_only')}
                </div>
              )}
            </motion.div>
          </div>
        ) : !isSupported ? (
          /* ===== UNSUPPORTED ===== */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <AlertCircle size={36} color="var(--c-rose)" style={{ marginBottom: 14 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              {t('conv_unsupported')}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              {t('conv_unsupported_desc', { ext: inputExt || '?' })}
            </div>
            <button
              onClick={resetConverter}
              style={{
                padding: '9px 22px', background: 'var(--surface-3)', border: '1px solid var(--border-default)',
                borderRadius: 9, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-3)'; }}
            >
              {t('conv_select_another')}
            </button>
          </div>
        ) : (
          /* ===== FILE SELECTED ===== */
          <>
            {/* Scrollable content above button */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* File row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--surface-1)', border: '1px solid var(--border-default)',
                borderRadius: 10, padding: '10px 14px', flexShrink: 0,
              }}>
                {isInputImage ? <Image size={16} color="var(--accent)" /> : <FileCode size={16} color="var(--accent)" />}
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {converterInputFile.split(/[\\/]/).pop()}
                </span>
                <button
                  onClick={resetConverter}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--text-disabled)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--c-rose)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-disabled)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  {t('conv_change')}
                </button>
              </div>

              {/* Format row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{t('conv_input')}</div>
                  <div style={{
                    background: 'var(--surface-1)', border: '1px solid var(--border-default)',
                    borderRadius: 8, padding: '8px 12px',
                    fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
                  }}>
                    {inputExt?.toUpperCase() || '?'}
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-disabled)" style={{ marginTop: 15 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{t('conv_output')}</div>
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 4,
                    background: 'var(--surface-1)', border: '1px solid var(--border-default)',
                    borderRadius: 8, padding: '6px',
                  }}>
                    {formats.map((fmt) => (
                      <button
                        key={fmt.ext}
                        onClick={() => setConverterOutputFormat(fmt.ext)}
                        style={{
                          padding: '4px 8px',
                          background: converterOutputFormat === fmt.ext ? 'var(--surface-3)' : 'transparent',
                          border: converterOutputFormat === fmt.ext ? '1px solid var(--accent)' : '1px solid transparent',
                          borderRadius: 5,
                          color: converterOutputFormat === fmt.ext ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.1s',
                        }}
                      >
                        {fmt.ext.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              {converterPreview && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'var(--surface-1)', border: '1px solid var(--border-default)',
                    borderRadius: 10, padding: 12, flexShrink: 0,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{t('conv_preview')}</div>
                  {isImage(converterOutputFormat) ? (
                    <div style={{ textAlign: 'center' }}>
                      <img src={converterPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, display: 'inline-block' }} />
                    </div>
                  ) : (
                    <pre style={{
                      fontSize: 12, fontWeight: 400, color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      maxHeight: 200, overflowY: 'auto',
                      lineHeight: 1.5, fontFamily: 'monospace',
                    }}>
                      {converterPreview}
                    </pre>
                  )}
                </motion.div>
              )}
              {dragOver && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 10, border: '2px dashed var(--accent)',
                  background: 'var(--surface-1)', color: 'var(--accent)',
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>
                  <Upload size={16} />
                  {t('conv_drop_target')}
                </div>
              )}
              {dropFailed && (
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--c-rose)',
                  background: 'color-mix(in srgb, var(--c-rose) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--c-rose) 30%, transparent)',
                  borderRadius: 8, padding: '6px 12px', flexShrink: 0,
                }}>
                  {t('conv_drop_file_only')}
                </div>
              )}
            </div>

            {/* Button — always at the bottom */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={runConversion}
              disabled={converterLoading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px 0', marginTop: 12,
                background: converterLoading ? 'var(--text-disabled)' : 'var(--accent)',
                border: 'none', borderRadius: 10,
                color: 'white', fontSize: 14, fontWeight: 700,
                cursor: converterLoading ? 'default' : 'pointer',
                transition: 'background 0.15s', flexShrink: 0,
              }}
            >
              {converterLoading ? <RefreshCw size={15} className="spin" /> : <Download size={15} />}
              {converterLoading ? t('conv_converting') : t('conv_convert')}
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}
