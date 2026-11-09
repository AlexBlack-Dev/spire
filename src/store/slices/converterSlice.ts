import { conversionFormats } from '../../types';
import { pathSep } from '../../isMobile';
import { tKey, fileExt } from '../helpers';
import type { SpireSlice } from '../types';

export const converterSlice: SpireSlice = (set, get) => ({
  converterInputFile: null,
  converterOutputFormat: 'txt',
  converterPreview: null,
  converterLoading: false,

  converterSelectFile: async () => {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const path = await open({ multiple: false, filters: [] });
    if (!path || typeof path !== 'string') return;
    const ext = fileExt(path);
    const fmt = conversionFormats[ext] ? ext : 'txt';
    set({ converterInputFile: path, converterOutputFormat: fmt, converterPreview: null });
  },

  setConverterOutputFormat: (fmt) => set({ converterOutputFormat: fmt }),

  converterSetInput: (path: string, fmt: string) =>
    set({ converterInputFile: path, converterOutputFormat: fmt, converterPreview: null }),

  runConversion: async () => {
    const st = get();
    if (st.converterLoading) return;
    const inputPath = st.converterInputFile;
    const outFmt = st.converterOutputFormat;
    if (!inputPath) return;
    set({ converterLoading: true });
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const inputExt = fileExt(inputPath);
      const inputCat = conversionFormats[inputExt]?.category;
      const outputCat = conversionFormats[outFmt]?.category;

      const outDir = inputPath.replace(/[\\/][^\\/]+$/, '');
      const outName = (inputPath.split(/[\\/]/).pop() || 'output').replace(/\.[^.]+$/, '');
      const outPath = outDir + pathSep + outName + '.' + outFmt;

      const { exists } = await import('@tauri-apps/plugin-fs');
      if (await exists(outPath)) {
        get().showToast(tKey(get().language, 'toast_file_exists') + outPath, 'error');
        set({ converterLoading: false });
        return;
      }

      if (inputCat === 'image' && outputCat === 'image') {
        await invoke('convert_image', { inputPath, outputPath: outPath });
        const b64 = await invoke<string>('read_image_base64', { path: outPath });
        set({ converterPreview: b64, converterLoading: false });
        get().showToast(tKey(get().language, 'toast_converted') + outFmt);
        return;
      }

      if (inputCat === 'text' && outputCat === 'text') {
        const { readTextFile, writeTextFile } = await import('@tauri-apps/plugin-fs');
        const content = await readTextFile(inputPath);
        await writeTextFile(outPath, content);
        set({ converterPreview: content, converterLoading: false });
        get().showToast(tKey(get().language, 'toast_converted') + outFmt);
        return;
      }

      get().showToast(tKey(get().language, 'toast_unsupported_conversion'), 'error');
      set({ converterLoading: false });
    } catch (e) {
      const msg = typeof e === 'string' ? e : e instanceof Error ? e.message : String(e);
      get().addLog('runConversion: ' + msg);
      get().showToast(tKey(get().language, 'toast_conversion_failed') + msg, 'error');
      set({ converterLoading: false });
    }
  },

  resetConverter: () => set({ converterInputFile: null, converterOutputFormat: 'txt', converterPreview: null }),

  converterDropNote: (noteId) => {
    const note = get().notes.find((n) => n.id === noteId);
    if (!note?.filePath) return false;
    const ext = fileExt(note.filePath);
    const fmt = conversionFormats[ext] ? ext : 'txt';
    set({ converterInputFile: note.filePath, converterOutputFormat: fmt, converterPreview: null, viewMode: 'converter' });
    return true;
  },
});
