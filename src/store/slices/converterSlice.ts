import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
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
    const path = await open({ multiple: false, filters: [] });
    if (!path || typeof path !== 'string') return;
    const ext = fileExt(path);
    const fmt = conversionFormats[ext] ? ext : 'txt';
    set({ converterInputFile: path, converterOutputFormat: fmt, converterPreview: null });
  },

  setConverterOutputFormat: (fmt) => set({ converterOutputFormat: fmt }),

  runConversion: async () => {
    const st = get();
    const inputPath = st.converterInputFile;
    const outFmt = st.converterOutputFormat;
    if (!inputPath) return;
    set({ converterLoading: true });
    try {
      const inputExt = fileExt(inputPath);
      const inputCat = conversionFormats[inputExt]?.category;
      const outputCat = conversionFormats[outFmt]?.category;

      if (inputCat === 'image' && outputCat === 'image') {
        const outDir = inputPath.replace(/[\\/][^\\/]+$/, '');
        const outName = (inputPath.split(/[\\/]/).pop() || 'output').replace(/\.[^.]+$/, '');
        const outPath = outDir + pathSep + outName + '.' + outFmt;
        await invoke('convert_image', { inputPath, outputPath: outPath });
        const b64 = await invoke('read_image_base64', { path: outPath }) as string;
        set({ converterPreview: b64, converterLoading: false });
        get().showToast(tKey(get().language, 'toast_converted') + outFmt);
        return;
      }

      if (inputCat === 'text' && outputCat === 'text') {
        const content = await readTextFile(inputPath);
        const outDir = inputPath.replace(/[\\/][^\\/]+$/, '');
        const outName = (inputPath.split(/[\\/]/).pop() || 'output').replace(/\.[^.]+$/, '');
        const outPath = outDir + pathSep + outName + '.' + outFmt;
        await writeTextFile(outPath, content);
        set({ converterPreview: content, converterLoading: false });
        get().showToast(tKey(get().language, 'toast_converted') + outFmt);
        return;
      }

      get().showToast(tKey(get().language, 'toast_unsupported_conversion'), 'error');
      set({ converterLoading: false });
    } catch (e) {
      get().showToast(tKey(get().language, 'toast_conversion_failed') + e, 'error');
      set({ converterLoading: false });
    }
  },

  resetConverter: () => set({ converterInputFile: null, converterOutputFormat: 'txt', converterPreview: null }),
});