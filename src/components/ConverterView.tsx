import { motion } from 'framer-motion';
import { Upload, ArrowRight, Download, RefreshCw, FileCode, Image, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { conversionFormats } from '../types';

export default function ConverterView() {
  const {
    converterInputFile, converterOutputFormat,
    converterPreview, converterLoading,
    converterSelectFile, setConverterOutputFormat,
    runConversion, resetConverter,
  } = useStore();

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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#0e0e14' }}>
      {/* Header */}
      <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0f8', letterSpacing: '-0.03em' }}>
          Converter
        </h2>
        <div style={{ height: 1, background: '#1e1e2a', marginTop: 10 }} />
      </div>

      {/* Body — fills remaining space */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '14px 24px' }}>
        {!converterInputFile ? (
          /* ===== NO FILE ===== */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={converterSelectFile}
              whileHover={{ borderColor: '#7c6af7', background: '#16161f' }}
              style={{
                width: '100%', alignSelf: 'stretch',
                border: '2px dashed #252535', borderRadius: 14,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                minHeight: 200,
              }}
            >
              <Upload size={32} color="#3a3a52" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f8', marginBottom: 6 }}>
                Select a file to convert
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#5a5a78' }}>
                Supports text and image formats
              </div>
            </motion.div>
          </div>
        ) : !isSupported ? (
          /* ===== UNSUPPORTED ===== */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <AlertCircle size={36} color="#f87171" style={{ marginBottom: 14 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f8', marginBottom: 6 }}>
              Unsupported format
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#5a5a78', marginBottom: 16 }}>
              .{inputExt} files cannot be converted. Select a text or image file.
            </div>
            <button
              onClick={resetConverter}
              style={{
                padding: '9px 22px', background: '#21212e', border: '1px solid #252535',
                borderRadius: 9, color: '#d0d0e8', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2a2a3a'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#21212e'; }}
            >
              Select another file
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
                background: '#13131a', border: '1px solid #252535',
                borderRadius: 10, padding: '10px 14px', flexShrink: 0,
              }}>
                {isInputImage ? <Image size={16} color="#7c6af7" /> : <FileCode size={16} color="#7c6af7" />}
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#d0d0e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {converterInputFile.split(/[\\/]/).pop()}
                </span>
                <button
                  onClick={resetConverter}
                  style={{
                    background: 'transparent', border: 'none', color: '#3a3a52',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = '#1a1a24'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#3a3a52'; e.currentTarget.style.background = 'transparent'; }}
                >
                  Change
                </button>
              </div>

              {/* Format row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#3a3a52', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Input</div>
                  <div style={{
                    background: '#13131a', border: '1px solid #252535',
                    borderRadius: 8, padding: '8px 12px',
                    fontSize: 13, fontWeight: 600, color: '#9090b0',
                  }}>
                    {inputExt?.toUpperCase() || '?'}
                  </div>
                </div>
                <ArrowRight size={16} color="#3a3a52" style={{ marginTop: 15 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#3a3a52', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Output</div>
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 4,
                    background: '#13131a', border: '1px solid #252535',
                    borderRadius: 8, padding: '6px',
                  }}>
                    {formats.map((fmt) => (
                      <button
                        key={fmt.ext}
                        onClick={() => setConverterOutputFormat(fmt.ext)}
                        style={{
                          padding: '4px 8px',
                          background: converterOutputFormat === fmt.ext ? '#21212e' : 'transparent',
                          border: converterOutputFormat === fmt.ext ? '1px solid #7c6af7' : '1px solid transparent',
                          borderRadius: 5,
                          color: converterOutputFormat === fmt.ext ? '#f0f0f8' : '#5a5a78',
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
                    background: '#13131a', border: '1px solid #252535',
                    borderRadius: 10, padding: 12, flexShrink: 0,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#3a3a52', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Preview</div>
                  {isImage(converterOutputFormat) ? (
                    <div style={{ textAlign: 'center' }}>
                      <img src={converterPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, display: 'inline-block' }} />
                    </div>
                  ) : (
                    <pre style={{
                      fontSize: 12, fontWeight: 400, color: '#d0d0e8',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      maxHeight: 200, overflowY: 'auto',
                      lineHeight: 1.5, fontFamily: 'monospace',
                    }}>
                      {converterPreview}
                    </pre>
                  )}
                </motion.div>
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
                background: converterLoading ? '#3a3a52' : '#7c6af7',
                border: 'none', borderRadius: 10,
                color: 'white', fontSize: 14, fontWeight: 700,
                cursor: converterLoading ? 'default' : 'pointer',
                transition: 'background 0.15s', flexShrink: 0,
              }}
            >
              {converterLoading ? <RefreshCw size={15} className="spin" /> : <Download size={15} />}
              {converterLoading ? 'Converting...' : 'Convert & Download'}
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}
