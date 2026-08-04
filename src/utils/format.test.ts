import { describe, it, expect } from 'vitest';
import { getContentText, notePreview, getFileInfo, hexToRgba } from './format';

describe('getContentText', () => {
  it('strips HTML tags', () => {
    expect(getContentText('<p>hello <strong>world</strong></p>')).toBe('hello world');
  });

  it('replaces nbsp with space', () => {
    expect(getContentText('a&nbsp;b')).toBe('a b');
  });
});

describe('notePreview', () => {
  it('strips HTML for rich notes', () => {
    expect(notePreview('<p>some <b>text</b></p>', false)).toBe('some text');
  });

  it('keeps raw content for file notes', () => {
    expect(notePreview('<p>raw &amp; untouched</p>', true)).toBe('<p>raw &amp; untouched</p>');
  });

  it('limits to 60 chars', () => {
    expect(notePreview('x'.repeat(100), true)).toHaveLength(60);
  });
});

describe('getFileInfo', () => {
  it('detects spreadsheet extensions', () => {
    expect(getFileInfo('/a/b.xlsx').isSpreadsheet).toBe(true);
    expect(getFileInfo('/a/b.ods').isPlainFile).toBe(false);
  });

  it('detects plain files', () => {
    const info = getFileInfo('/a/note.txt');
    expect(info.isPlainFile).toBe(true);
    expect(info.ext).toBe('txt');
  });

  it('returns empty ext for undefined path', () => {
    expect(getFileInfo(undefined).ext).toBe('');
  });
});

describe('hexToRgba', () => {
  it('converts hex to rgba', () => {
    expect(hexToRgba('#7c6af7', 0.5)).toBe('rgba(124,106,247,0.5)');
  });
});