import { createElement } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { escapeHtml } from './format';

function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    const row: string[] = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuote = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === ',') { row.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
    }
    row.push(cur.trim());
    return row;
  });
}

export function renderCSVTable(text: string) {
  const rows = parseCSV(text);
  if (rows.length < 2) return null;
  const headers = rows[0];
  const data = rows.slice(1);
  const zebra = 'color-mix(in srgb, var(--surface-3) 30%, transparent)';
  return (
    <div style={{ overflowX: 'auto', padding: '12px 0' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: 13, fontFamily: 'ui-monospace, monospace',
      }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                textAlign: 'left', padding: '8px 12px',
                background: 'var(--surface-2)', color: 'var(--text-secondary)',
                fontWeight: 700, fontSize: 12, textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderBottom: '2px solid var(--border-default)',
                whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri}
              style={{
                background: ri % 2 === 0 ? 'transparent' : zebra,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ri % 2 === 0 ? 'transparent' : zebra; }}
            >
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '6px 12px',
                  color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap',
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 8, textAlign: 'right' }}>
        {data.length} rows · {headers.length} columns
      </div>
    </div>
  );
}

function syntaxHighlightJSON(json: string) {
  const parts: ReactNode[] = [];
  let last = 0;
  const re = /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = re.exec(json)) !== null) {
    if (match.index > last) {
      parts.push(<span key={idx++} style={{ color: 'var(--text-tertiary)' }}>{escapeHtml(json.slice(last, match.index))}</span>);
    }
    if (match[1]) {
      parts.push(<span key={idx++} style={{ color: 'var(--c-blue)' }}>{escapeHtml(match[1])}</span>);
      parts.push(<span key={idx++} style={{ color: 'var(--text-tertiary)' }}>:</span>);
    } else if (match[2]) {
      parts.push(<span key={idx++} style={{ color: 'var(--c-green)' }}>{escapeHtml(match[2])}</span>);
    } else if (match[3]) {
      parts.push(<span key={idx++} style={{ color: 'var(--c-amber)' }}>{escapeHtml(match[3])}</span>);
    } else if (match[4]) {
      parts.push(<span key={idx++} style={{ color: 'var(--c-rose)' }}>{escapeHtml(match[4])}</span>);
    }
    last = re.lastIndex;
  }
  if (last < json.length) {
    parts.push(<span key={idx++} style={{ color: 'var(--text-tertiary)' }}>{escapeHtml(json.slice(last))}</span>);
  }
  return parts;
}

export function renderFormattedJSON(text: string) {
  try {
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
    return (
      <pre style={{
        fontSize: 13, fontFamily: 'ui-monospace, monospace',
        color: 'var(--text-primary)', lineHeight: 1.6,
        background: 'var(--surface-1)', borderRadius: 10,
        padding: '16px 20px', overflow: 'auto',
        border: '1px solid var(--border-subtle)', whiteSpace: 'pre',
      }}>
        {syntaxHighlightJSON(formatted)}
      </pre>
    );
  } catch {
    return null;
  }
}

async function openExternalLink(url: string) {
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    openUrl(url);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let idx = 0;
  let m: RegExpExecArray | null;
  const codeStyle: CSSProperties = {
    background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4,
    fontFamily: 'ui-monospace, monospace', fontSize: '0.9em',
  };
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<span key={`${keyBase}-${idx++}`}>{text.slice(last, m.index)}</span>);
    }
    const tok = m[0];
    if (tok.startsWith('**')) {
      nodes.push(<strong key={`${keyBase}-${idx++}`}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('*')) {
      nodes.push(<em key={`${keyBase}-${idx++}`}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith('`')) {
      nodes.push(<code key={`${keyBase}-${idx++}`} style={codeStyle}>{tok.slice(1, -1)}</code>);
    } else {
      const linkMatch = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const label = linkMatch?.[1] ?? tok;
      const href = linkMatch?.[2] ?? '';
      if (/^https?:\/\//i.test(href)) {
        nodes.push(
          <a key={`${keyBase}-${idx++}`} href={href}
            onClick={(e) => { e.preventDefault(); openExternalLink(href); }}
            style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
            {label}
          </a>
        );
      } else {
        nodes.push(<span key={`${keyBase}-${idx++}`}>{label}</span>);
      }
    }
    last = re.lastIndex;
  }
  if (last < text.length) {
    nodes.push(<span key={`${keyBase}-${idx++}`}>{text.slice(last)}</span>);
  }
  return nodes;
}

export function renderMarkdown(text: string) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      blocks.push(
        <pre key={key++} style={{
          background: 'var(--surface-1)', border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: '12px 16px', overflow: 'auto',
          fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
        }}>
          <code>{buf.join('\n')}</code>
        </pre>
      );
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      const level = /^#+/.exec(line)![0].length;
      const H = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'][level - 1] as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      blocks.push(createElement(H, {
        key: key++,
        style: { fontSize: [24, 20, 18, 16, 15, 15][level - 1], fontWeight: 800, margin: '14px 0 8px', letterSpacing: '-0.02em' },
      }, renderInline(line.replace(/^#+\s*/, ''), `h${key}`)));
      i++;
      continue;
    }
    if (/^\s*([-*])\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
      const ordered = /^\s*\d+\.\s/.test(line);
      const items: ReactNode[] = [];
      while (i < lines.length && (/^\s*([-*])\s/.test(lines[i]) || /^\s*\d+\.\s/.test(lines[i]))) {
        items.push(
          <li key={i} style={{ marginBottom: 4 }}>
            {renderInline(lines[i].replace(/^\s*([-*]|\d+\.)\s/, ''), `li${i}`)}
          </li>
        );
        i++;
      }
      blocks.push(ordered
        ? <ol key={key++} style={{ paddingLeft: 22, margin: '8px 0' }}>{items}</ol>
        : <ul key={key++} style={{ paddingLeft: 22, margin: '8px 0' }}>{items}</ul>);
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      blocks.push(
        <blockquote key={key++} style={{
          borderLeft: '3px solid var(--accent)', padding: '4px 12px', margin: '8px 0',
          color: 'var(--text-secondary)',
        }}>
          {buf.map((l, j) => <div key={j}>{renderInline(l, `q${j}`)}</div>)}
        </blockquote>
      );
      continue;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />);
      i++;
      continue;
    }
    if (line.trim() === '') { i++; continue; }
    blocks.push(<p key={key++} style={{ margin: '0 0 8px' }}>{renderInline(line, `p${key}`)}</p>);
    i++;
  }
  return (
    <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7 }}>{blocks}</div>
  );
}

export function isMarkdown(text: string) {
  return /^#|^[-*]\s|^\d+\.\s|^```|[*_]{2,}|\[.*\]\(.*\)/.test(text);
}

export function isCSV(text: string) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return false;
  const cols = lines[0].split(',').length;
  if (cols < 2) return false;
  return lines.slice(1).every(l => l.split(',').length === cols) && lines.slice(1).length <= 500;
}

export function isJSON(text: string) {
  const s = text.trim();
  if (s.length < 2) return false;
  try { JSON.parse(s); return true; } catch { return false; }
}

export function buildRenderedContent(text: string, ext: string): ReactNode | null {
  if (ext === 'csv' || isCSV(text)) return renderCSVTable(text);
  if (ext === 'json' || isJSON(text)) return renderFormattedJSON(text);
  if (ext === 'md' || ext === 'markdown' || isMarkdown(text)) return renderMarkdown(text);
  return null;
}
