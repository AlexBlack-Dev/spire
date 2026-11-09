import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({ readFile: vi.fn() }));

import { pwHash, pwVerify, needsRehash, htmlToMarkdown, base64ToBytes, fileExt, PBKDF2_ITERATIONS } from './helpers';

describe('pwHash/pwVerify', () => {
  it('hashes a password with PBKDF2 and a fresh salt', async () => {
    const a = await pwHash('secret');
    const b = await pwHash('secret');
    expect(a).toMatch(new RegExp(`^v3\\$${PBKDF2_ITERATIONS}\\$`));
    expect(a).not.toBe(b);
  });

  it('verifies a correct password and rejects a wrong one', async () => {
    const hash = await pwHash('correct horse');
    expect(await pwVerify(hash, 'correct horse')).toBe(true);
    expect(await pwVerify(hash, 'wrong')).toBe(false);
  });

  it('still verifies legacy v2 hashes', async () => {
    const salt = '00112233445566778899aabbccddeeff';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + 'pw'));
    const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    expect(await pwVerify(`v2$${salt}$${hex}`, 'pw')).toBe(true);
    expect(await pwVerify(`v2$${salt}$${hex}`, 'nope')).toBe(false);
    expect(needsRehash(`v2$${salt}$${hex}`)).toBe(true);
    expect(needsRehash(await pwHash('pw'))).toBe(false);
  });

  it('fails closed when the stored hash is missing', async () => {
    expect(await pwVerify(undefined, 'anything')).toBe(false);
    expect(await pwVerify('', 'anything')).toBe(false);
    expect(await pwVerify('garbage', 'anything')).toBe(false);
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
    expect(fileExt('noext')).toBe('');
  });
});
