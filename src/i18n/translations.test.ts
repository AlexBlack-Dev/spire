import { describe, it, expect } from 'vitest';
import { translations, type Dict } from './translations';

function placeholders(value: string): string[] {
  return Array.from(value.matchAll(/\{(\w+)\}/g), (m) => m[1]).sort();
}

describe('translations', () => {
  it('has identical key sets in English and Russian', () => {
    expect(Object.keys(translations.ru).sort()).toEqual(Object.keys(translations.en).sort());
  });

  it('has no empty values', () => {
    for (const key of Object.keys(translations.en) as Array<keyof Dict>) {
      expect(translations.en[key].trim(), `en.${key}`).not.toBe('');
      expect(translations.ru[key].trim(), `ru.${key}`).not.toBe('');
    }
  });

  it('keeps interpolation placeholders in sync', () => {
    for (const key of Object.keys(translations.en) as Array<keyof Dict>) {
      expect(placeholders(translations.ru[key]), `ru.${key}`).toEqual(
        placeholders(translations.en[key])
      );
    }
  });
});
