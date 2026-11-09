import { useEffect, useMemo, useRef, useState } from 'react';
import { buildRenderedContent } from '../utils/renderedContent';
import type { Note } from '../types';

export function useFileNoteContent(
  note: Note | undefined,
  ext: string,
  isPlainFile: boolean
) {
  const [rawDraft, setRawDraft] = useState('');
  const [rawPreview, setRawPreview] = useState(false);
  const rawLoadedId = useRef<string | null>(null);

  useEffect(() => {
    if (!isPlainFile || !note) return;
    if (rawLoadedId.current !== note.id || rawDraft !== note.content) {
      rawLoadedId.current = note.id;
      setRawDraft(note.content);
      setRawPreview(false);
    }
  }, [note?.id, isPlainFile, note?.content, rawDraft]);

  const renderedContent = useMemo(() => {
    if (!note || !note.filePath) return null;
    return buildRenderedContent(note.content, ext);
  }, [note?.content, note?.filePath, ext]);

  const rawWordCount = isPlainFile
    ? (rawDraft.trim() ? rawDraft.trim().split(/\s+/).length : 0)
    : 0;

  return {
    rawDraft,
    setRawDraft,
    rawPreview,
    setRawPreview,
    renderedContent,
    rawWordCount,
  };
}
