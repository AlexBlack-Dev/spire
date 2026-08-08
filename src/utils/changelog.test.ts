import { describe, it, expect } from 'vitest';
import { parseChangelog } from './changelog';

describe('parseChangelog', () => {
  it('parses releases, sections and items', () => {
    const text = [
      '# Changelog',
      '',
      '## [Unreleased]',
      '',
      '## [1.0.7] - 2026-08-08',
      '',
      '### Added',
      '',
      '- New "What\'s new" tab',
      '- Another feature',
      '',
      '### Fixed',
      '',
      '- A bug',
    ].join('\n');

    const entries = parseChangelog(text);
    expect(entries).toHaveLength(1);
    expect(entries[0].version).toBe('1.0.7');
    expect(entries[0].date).toBe('2026-08-08');
    expect(entries[0].sections.map((s) => s.heading)).toEqual(['Added', 'Fixed']);
    expect(entries[0].sections[0].items).toEqual(['New "What\'s new" tab', 'Another feature']);
  });

  it('ignores items without a section and non-semver releases', () => {
    const entries = parseChangelog('## [Unreleased]\n\n### Added\n\n- Orphan after Unreleased');
    expect(entries).toHaveLength(0);
  });

  it('stops collecting items after a new release heading', () => {
    const entries = parseChangelog([
      '## [1.0.6] - 2026-08-08',
      '### Changed',
      '- First',
      '## [1.0.5] - 2026-08-08',
      '- Second without section',
    ].join('\n'));
    expect(entries).toHaveLength(2);
    expect(entries[0].version).toBe('1.0.6');
    expect(entries[0].sections[0].items).toEqual(['First']);
    expect(entries[1].sections).toHaveLength(0);
  });
});