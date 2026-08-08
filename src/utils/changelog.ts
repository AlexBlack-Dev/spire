export interface ChangelogSection {
  heading: string;
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  sections: ChangelogSection[];
}

export function parseChangelog(text: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;
  let section: ChangelogSection | null = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const releaseMatch = line.match(/^##\s+\[([^\]]+)\]\s*-?\s*(.*)$/);
    if (releaseMatch) {
      current = { version: releaseMatch[1], date: releaseMatch[2] || '', sections: [] };
      entries.push(current);
      section = null;
      continue;
    }
    const sectionMatch = line.match(/^###\s+(.+)$/);
    if (sectionMatch && current) {
      section = { heading: sectionMatch[1], items: [] };
      current.sections.push(section);
      continue;
    }
    if (line.startsWith('-') && current && section) {
      const item = line.replace(/^-\s*/, '').trim();
      if (item) section.items.push(item);
    }
  }
  return entries.filter((e) => /^\d+\.\d+\.\d+/.test(e.version));
}