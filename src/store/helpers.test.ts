import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({ readFile: vi.fn() }));

import { pwHash, pwVerify, htmlToMarkdown, base64ToBytes, fileExt } from './helpers';

describe('pwHash/pwVerify', () => {
  it('hashes a password with a fresh salt', async () => {
    const a = await pwHash('secret');
    const b = await pwHash('secret');
    expect(a).toMatch(/^v2\$/);
    expect(a).not.toBe(b);
  });

  it('verifies a correct password and rejects a wrong one', async () => {
    const hash = await pwHash('correct horse');
    expect(await pwVerify(hash, 'correct horse')).toBe(true);
    expect(await pwVerify(hash, 'wrong')).toBe(false);
  });

  it('treats missing stored hash as open', async () => {
    expect(await pwVerify(undefined, 'anything')).toBe(true);
  });
});

describe('htmlToMarkdown', () => {
  it('converts headings, bold and entities', () => {
    expect(htmlToMarkdown('<h1>Title</h1><p>a <strong>b</strong></p>')).toBe('# Title\na **b**');
  });
});

describe('base64ToBytes', () => {
  it('decodes base64 back to bytes', () => {
    const bytes = base64ToBytes(btoa('abc'));
    expect(Array.from(bytes)).toEqual([97, 98, 99]);
  });
});

describe('fileExt', () => {
  it('extracts lowercase extension', () => {
    expect(fileExt('/a/b.XLSX')).toBe('xlsx');
    expect(fileExt('noext')).toBe('noext');
  });
});