import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { translations, type Dict } from '../i18n/translations';
import * as XLSX from 'xlsx';
import { Save, Plus, Trash2 } from 'lucide-react';

interface Props {
  base64: string;
  ext: string;
  filePath?: string;
  noteId: string;
}

const DEFAULT_COL_WIDTH = 90;
const MIN_COL_WIDTH = 40;
const ZEBRA_BG = 'color-mix(in srgb, var(--surface-3) 30%, transparent)';

type CellValue = string | number | boolean | null;

export default function SpreadsheetEditor({ base64, ext, filePath, noteId }: Props) {
  const updateNote = useStore((s) => s.updateNote);
  const language = useStore((s) => s.language);
  const t = (key: keyof Dict, vars?: Record<string, string | number>) => {
    const s = translations[language][key];
    return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : s;
  };
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CellValue[][]>([]);
  const [dirty, setDirty] = useState(false);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [editingCell, setEditingCell] = useState<[number, number] | null>(null);
  const [editValue, setEditValue] = useState('');
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'header' | 'cell'; col?: number; row?: number } | null>(null);
  const [formulaValue, setFormulaValue] = useState('');
  const workbookRef = useRef<XLSX.WorkBook | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null);
  const formulasRef = useRef<Map<string, string>>(new Map());
  const originalValuesRef = useRef<CellValue[][]>([]);

  useEffect(() => {
    try {
      const binary = atob(base64);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      const wb = XLSX.read(arr, { type: 'array' });
      workbookRef.current = wb;
      setSheetNames(wb.SheetNames);
      loadSheet(wb, 0);
    } catch (e) {
      console.warn('spreadsheet parse failed', e);
    }
  }, [base64]);

  function loadSheet(wb: XLSX.WorkBook, idx: number) {
    const ws = wb.Sheets[wb.SheetNames[idx]];
    const data = XLSX.utils.sheet_to_json<CellValue[]>(ws, { header: 1 });
    if (data.length === 0) {
      setHeaders([]);
      setRows([]);
      setColWidths([]);
      return;
    }
    const h = data[0].map((c) => String(c ?? ''));
    const body = data.slice(1);
    setHeaders(h);
    setRows(body);
    setColWidths(h.map(() => DEFAULT_COL_WIDTH));
    originalValuesRef.current = body.map((r) => [...r]);
    const fmap = new Map<string, string>();
    const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
    if (range) {
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (cell && typeof cell.f === 'string' && cell.f.startsWith('=')) {
            fmap.set(`${r - 1},${c}`, cell.f);
          }
        }
      }
    }
    formulasRef.current = fmap;
  }

  const changeSheet = (idx: number) => {
    if (!workbookRef.current) return;
    setActiveSheet(idx);
    setDirty(false);
    setEditingCell(null);
    setSelectedCell(null);
    setContextMenu(null);
    loadSheet(workbookRef.current, idx);
  };

  const updateCellValue = (ri: number, ci: number, value: string) => {
    setRows(prev => {
      const next = prev.map(r => [...r]);
      while (next.length <= ri) next.push([]);
      if (!next[ri]) next[ri] = [];
      next[ri][ci] = value;
      return next;
    });
    setDirty(true);
  };

  const addRow = (after = true) => {
    const idx = selectedCell ? (after ? selectedCell[0] + 1 : selectedCell[0]) : rows.length;
    setRows(prev => {
      const next = [...prev];
      next.splice(idx, 0, new Array(headers.length).fill(''));
      return next;
    });
    invalidateFormulas();
    setDirty(true);
  };

  const deleteRow = (ri: number) => {
    if (rows.length <= 1) {
      setRows([]);
    } else {
      setRows(prev => prev.filter((_, i) => i !== ri));
    }
    invalidateFormulas();
    setDirty(true);
    setSelectedCell(null);
  };

  const addColumn = (after = true) => {
    const idx = selectedCell ? (after ? selectedCell[1] + 1 : selectedCell[1]) : headers.length;
    setHeaders(prev => {
      const next = [...prev];
      next.splice(idx, 0, '');
      return next;
    });
    setRows(prev => prev.map(r => {
      const next = [...r];
      next.splice(idx, 0, '');
      return next;
    }));
    setColWidths(prev => {
      const next = [...prev];
      next.splice(idx, 0, DEFAULT_COL_WIDTH);
      return next;
    });
    invalidateFormulas();
    setDirty(true);
  };

  const deleteColumn = (ci: number) => {
    if (headers.length <= 1) return;
    setHeaders(prev => prev.filter((_, i) => i !== ci));
    setRows(prev => prev.map(r => r.filter((_, i) => i !== ci)));
    setColWidths(prev => prev.filter((_, i) => i !== ci));
    invalidateFormulas();
    setDirty(true);
    setSelectedCell(null);
  };

  const clearCell = () => {
    if (!selectedCell) return;
    const [ri, ci] = selectedCell;
    updateCellValue(ri, ci, '');
  };

  const invalidateFormulas = () => {
    formulasRef.current.clear();
    originalValuesRef.current = rows.map((r) => [...r]);
  };

  const handleSave = useCallback(async () => {
    if (!workbookRef.current) return;
    const wsName = workbookRef.current.SheetNames[activeSheet];
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const orig = originalValuesRef.current;
    for (let ri = 0; ri < rows.length; ri++) {
      for (let ci = 0; ci < headers.length; ci++) {
        const cur = rows[ri]?.[ci];
        const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        const f = formulasRef.current.get(`${ri},${ci}`);
        const unchanged = cur === orig?.[ri]?.[ci] || cur === undefined || cur === null || cur === '';
        if (f && unchanged) {
          ws[addr] = { t: 'n', f, v: undefined };
        } else if (typeof cur === 'string' && cur.startsWith('=')) {
          ws[addr] = { t: 's', f: cur, v: undefined };
        }
      }
    }
    workbookRef.current.Sheets[wsName] = ws;
    const outBinary = XLSX.write(workbookRef.current, { type: 'binary', bookType: ext as XLSX.BookType });
    const b64 = btoa(outBinary);
    updateNote(noteId, { content: b64 });
    if (filePath) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_binary', { path: filePath, content: b64 });
      } catch (e) {
        console.warn(`save_binary failed for ${filePath}`, e);
      }
    }
    formulasRef.current.clear();
    originalValuesRef.current = rows.map((r) => [...r]);
    setDirty(false);
  }, [headers, rows, activeSheet, filePath, noteId, ext]);

  const selectCell = (ri: number, ci: number) => {
    setSelectedCell([ri, ci]);
    const val = rows[ri]?.[ci] !== undefined ? String(rows[ri][ci]) : '';
    setFormulaValue(val);
  };

  const startEdit = (ri?: number, ci?: number) => {
    const r = ri ?? selectedCell?.[0] ?? 0;
    const c = ci ?? selectedCell?.[1] ?? 0;
    const val = rows[r]?.[c] !== undefined ? String(rows[r][c]) : '';
    setSelectedCell([r, c]);
    setEditingCell([r, c]);
    setEditValue(val);
    setFormulaValue(val);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const [ri, ci] = editingCell;
    updateCellValue(ri, ci, editValue);
    setEditingCell(null);
  };

  // Column resize — mousedown on header div, check proximity to right edge
  const onHeaderMouseDown = (ci: number, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nearEdge = rect.right - e.clientX < 10;
    if (!nearEdge) return;
    e.preventDefault();
    e.stopPropagation();
    const startWidth = colWidths[ci] || DEFAULT_COL_WIDTH;
    const startX = e.clientX;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const w = Math.max(MIN_COL_WIDTH, startWidth + dx);
      setColWidths(prev => {
        const next = [...prev];
        if (next[ci] !== w) {
          next[ci] = w;
          return next;
        }
        return prev;
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Context menu
  const handleContextMenu = (e: React.MouseEvent, type: 'header' | 'cell', col?: number, row?: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, col, row });
  };

  const closeContextMenu = () => setContextMenu(null);

  // Keyboard navigation
  const onCellKeyDown = (e: React.KeyboardEvent, ri: number, ci: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingCell) {
        commitEdit();
        if (e.shiftKey) {
          if (ri > 0) selectCell(ri - 1, ci);
        } else {
          if (ri < rows.length - 1) selectCell(ri + 1, ci);
        }
      } else {
        startEdit(ri, ci);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const nextCol = e.shiftKey ? (ci > 0 ? ci - 1 : headers.length - 1) : (ci < headers.length - 1 ? ci + 1 : 0);
      const nextRow = e.shiftKey ? (nextCol === headers.length - 1 && ci === 0 ? (ri > 0 ? ri - 1 : ri) : ri) : (nextCol === 0 && ci === headers.length - 1 ? (ri < rows.length - 1 ? ri + 1 : ri) : ri);
      selectCell(nextRow, nextCol);
    } else if (e.key === 'ArrowUp') {
      if (!editingCell && ri > 0) { e.preventDefault(); selectCell(ri - 1, ci); }
    } else if (e.key === 'ArrowDown') {
      if (!editingCell && ri < rows.length - 1) { e.preventDefault(); selectCell(ri + 1, ci); }
    } else if (e.key === 'ArrowLeft') {
      if (!editingCell && ci > 0) { e.preventDefault(); selectCell(ri, ci - 1); }
    } else if (e.key === 'ArrowRight') {
      if (!editingCell && ci < headers.length - 1) { e.preventDefault(); selectCell(ri, ci + 1); }
    } else if (e.key === 'Escape') {
      if (editingCell) { setEditingCell(null); }
    } else if (e.key === 'F2') {
      e.preventDefault();
      startEdit(ri, ci);
    } else if (e.key === 'Delete' && !editingCell) {
      e.preventDefault();
      updateCellValue(ri, ci, '');
    }
  };

  // Click outside closes context menu
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const isSelected = (ri: number, ci: number) => selectedCell?.[0] === ri && selectedCell?.[1] === ci;
  const isEditing = (ri: number, ci: number) => editingCell?.[0] === ri && editingCell?.[1] === ci;

  const getCellVal = (ri: number, ci: number) => rows[ri]?.[ci] !== undefined ? String(rows[ri][ci]) : '';

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--surface-0)', height: '100%', overflow: 'hidden',
    }} onClick={closeContextMenu}>
      {/* Formula bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0, minWidth: 0,
      }}>
        {/* Sheet selector */}
        <select
          value={activeSheet}
          onChange={e => changeSheet(Number(e.target.value))}
          style={{
            background: 'var(--surface-2)', border: '1px solid var(--border-default)',
            borderRadius: 5, padding: '3px 8px',
            fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
            outline: 'none', cursor: 'pointer', maxWidth: 130,
          }}
        >
          {sheetNames.map((name, i) => (
            <option key={i} value={i}>{name}</option>
          ))}
        </select>

        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', flexShrink: 0 }}>
          {selectedCell ? `${String.fromCharCode(65 + (selectedCell[1] % 26))}${selectedCell[0] + 1}` : ''}
        </span>

        <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
          <input
            value={editingCell ? editValue : formulaValue}
            onChange={e => {
              setFormulaValue(e.target.value);
              if (editingCell) setEditValue(e.target.value);
            }}
            onFocus={() => { if (selectedCell && !editingCell) startEdit(); }}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
            }}
            placeholder={t('ss_value')}
            style={{
              flex: 1, minWidth: 0,
              background: 'var(--surface-2)', border: '1px solid var(--border-default)',
              borderRadius: 5, padding: '4px 10px',
              fontSize: 12, fontFamily: 'ui-monospace, monospace',
              color: 'var(--text-secondary)', outline: 'none',
            }}
          />
        </div>

        <button onClick={() => startEdit()} style={{
          background: 'var(--surface-2)', border: '1px solid var(--border-default)',
          borderRadius: 5, padding: '4px 8px',
          fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
          cursor: 'pointer', flexShrink: 0,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          fx
        </button>

        {dirty && (
          <button onClick={handleSave} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--accent)', border: 'none',
            borderRadius: 5, padding: '4px 10px',
            fontSize: 11, fontWeight: 700, color: '#fff',
            cursor: 'pointer', flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
          >
            <Save size={12} /> {t('ss_save')}
          </button>
        )}
      </div>

      {/* Table */}
      <div ref={tableRef} style={{
        flex: 1, overflow: 'auto', position: 'relative',
      }} onContextMenu={e => handleContextMenu(e, 'cell')}>
        <table style={{
          borderCollapse: 'collapse',
          fontSize: 12, fontFamily: 'ui-monospace, monospace',
          width: 'max-content', minWidth: '100%',
          tableLayout: 'fixed',
        }}>
          <thead>
            <tr>
              <th style={{
                padding: 0, background: 'var(--surface-2)',
                borderBottom: '2px solid var(--border-default)',
                position: 'sticky', top: 0, zIndex: 3,
                width: 36, minWidth: 36, maxWidth: 36,
              }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)' }}>#</span>
              </th>
              {headers.map((h, ci) => (
                <th key={ci} style={{
                  padding: 0, background: 'var(--surface-2)',
                  borderBottom: '2px solid var(--border-default)',
                  borderRight: '1px solid var(--border-subtle)',
                  position: 'sticky', top: 0, zIndex: 2,
                  width: colWidths[ci] || DEFAULT_COL_WIDTH,
                  minWidth: MIN_COL_WIDTH,
                  cursor: 'col-resize',
                }}
                  onContextMenu={e => handleContextMenu(e, 'header', ci)}
                  onMouseDown={e => onHeaderMouseDown(ci, e)}
                  onClick={() => { if (!resizeRef.current) selectCell(0, ci); }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', height: '100%',
                    pointerEvents: 'none', userSelect: 'none',
                  }}>
                    <span style={{
                      padding: '3px 6px',
                      fontSize: 10, fontWeight: 600, color: selectedCell?.[1] === ci ? 'var(--text-secondary)' : 'var(--text-secondary)',
                      textTransform: 'uppercase', letterSpacing: '0.03em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      background: selectedCell?.[1] === ci ? 'var(--border-default)' : 'transparent',
                      flex: 1,
                    }}>
                      {h || `Col ${ci + 1}`}
                    </span>
                  </div>
                </th>
              ))}
              {/* Add column button header */}
              <th style={{
                padding: 0, background: 'var(--surface-2)',
                borderBottom: '2px solid var(--border-default)',
                position: 'sticky', top: 0, zIndex: 2,
                width: 28, minWidth: 28,
              }}>
                <button onClick={() => addColumn(true)}
                  style={{
                    width: 28, height: '100%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 'none',
                    color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                >
                  <Plus size={12} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((_, ri) => (
              <tr key={ri}
                style={{
                  background: ri % 2 === 0 ? 'transparent' : ZEBRA_BG,
                }}
              >
                <td style={{
                  padding: 0, background: ri % 2 === 0 ? 'var(--surface-0)' : ZEBRA_BG,
                  borderBottom: '1px solid var(--surface-2)',
                  position: 'sticky', left: 0, zIndex: 1,
                  width: 36, minWidth: 36, maxWidth: 36,
                  textAlign: 'center', cursor: 'default',
                }}
                  onContextMenu={e => handleContextMenu(e, 'header', undefined, ri)}
                >
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)' }}>{ri + 1}</span>
                </td>
                {headers.map((_, ci) => {
                  const sel = isSelected(ri, ci);
                  const ed = isEditing(ri, ci);
                  const val = getCellVal(ri, ci);
                  return (
                    <td key={ci}
                      onClick={() => { if (!ed) selectCell(ri, ci); }}
                      onDoubleClick={() => startEdit(ri, ci)}
                      onKeyDown={e => onCellKeyDown(e, ri, ci)}
                      tabIndex={0}
                      style={{
                        padding: 0,
                        borderBottom: '1px solid var(--surface-2)',
                        borderRight: '1px solid var(--surface-2)',
                        minWidth: MIN_COL_WIDTH,
                        width: colWidths[ci] || DEFAULT_COL_WIDTH,
                        cursor: 'cell', userSelect: 'none',
                        background: sel ? 'var(--accent-dim)' : 'transparent',
                        outline: sel ? '1px solid var(--accent)' : 'none',
                        outlineOffset: -1,
                      }}
                    >
                      {ed ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => { setEditValue(e.target.value); setFormulaValue(e.target.value); }}
                          onBlur={commitEdit}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); commitEdit(); if (e.shiftKey && ri > 0) selectCell(ri - 1, ci); else if (ri < rows.length - 1) selectCell(ri + 1, ci); }
                            else if (e.key === 'Escape') { setEditingCell(null); }
                            else if (e.key === 'Tab') { e.preventDefault(); commitEdit(); const nc = e.shiftKey ? (ci > 0 ? ci - 1 : headers.length - 1) : (ci < headers.length - 1 ? ci + 1 : 0); selectCell(nc === 0 && !e.shiftKey && ri < rows.length - 1 ? ri + 1 : nc === headers.length - 1 && e.shiftKey && ri > 0 ? ri - 1 : ri, nc); }
                          }}
                          style={{
                            width: '100%', minWidth: 40,
                            padding: '2px 5px',
                            background: 'var(--border-default)', border: 'none',
                            outline: 'none',
                            color: 'var(--text-primary)', fontSize: 12,
                            fontFamily: 'ui-monospace, monospace',
                          }}
                        />
                      ) : (
                        <div style={{
                          padding: '2px 5px',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          color: val ? 'var(--text-secondary)' : 'var(--text-disabled)', minHeight: 18,
                        }}>
                          {val || '\u00A0'}
                        </div>
                      )}
                    </td>
                  );
                })}
                {/* Row delete button */}
                <td style={{
                  padding: 0, borderBottom: '1px solid var(--surface-2)',
                  width: 24, minWidth: 24,
                }}>
                  <button onClick={() => deleteRow(ri)}
                    style={{
                      width: 24, height: '100%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none',
                      color: 'var(--text-disabled)', cursor: 'pointer', fontSize: 10,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--c-rose)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-disabled)'; }}
                  >
                    <Trash2 size={10} />
                  </button>
                </td>
              </tr>
            ))}
            {/* Add row row */}
            <tr>
              <td style={{
                padding: 0, background: 'var(--surface-0)',
                borderBottom: 'none',
                position: 'sticky', left: 0, zIndex: 1,
                width: 36, minWidth: 36,
              }}>
                <button onClick={() => addRow(true)}
                  style={{
                    width: 36, height: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 'none',
                    color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                >
                  <Plus size={12} />
                </button>
              </td>
              {headers.map((_, ci) => (
                <td key={ci} style={{ padding: 0, borderBottom: 'none', minWidth: MIN_COL_WIDTH }} />
              ))}
              <td style={{ padding: 0, borderBottom: 'none', width: 24 }} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div style={{
          position: 'fixed', top: contextMenu.y, left: contextMenu.x,
          background: 'var(--surface-1)', border: '1px solid var(--border-default)',
          borderRadius: 10, padding: 4, zIndex: 100,
          minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }} onClick={e => e.stopPropagation()}>
          {contextMenu.type === 'header' ? (
            <>
              <CtxItem label={t('ss_insert_col_left')}  onClick={() => { addColumn(false); closeContextMenu(); }} />
              <CtxItem label={t('ss_insert_col_right')} onClick={() => { addColumn(true); closeContextMenu(); }} />
              {headers.length > 1 && (
                <CtxItem label={`${t('ss_delete_col')} "${contextMenu.col !== undefined ? (headers[contextMenu.col] || `Col ${contextMenu.col + 1}`) : ''}"`}
                  onClick={() => { if (contextMenu.col !== undefined) deleteColumn(contextMenu.col); closeContextMenu(); }} danger />
              )}
            </>
          ) : (
            <>
              <CtxItem label={t('ss_insert_row_above')} onClick={() => { addRow(false); closeContextMenu(); }} />
              <CtxItem label={t('ss_insert_row_below')} onClick={() => { addRow(true); closeContextMenu(); }} />
              {contextMenu.row !== undefined && (
                <CtxItem label={`${t('ss_delete_row')} ${contextMenu.row + 1}`}
                  onClick={() => { if (contextMenu.row !== undefined) deleteRow(contextMenu.row); closeContextMenu(); }} danger />
              )}
              <CtxItem label={t('ss_clear_cell')} onClick={() => { clearCell(); closeContextMenu(); }} />
            </>
          )}
        </div>
      )}

      {/* Bottom status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '2px 12px',
        borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0, fontSize: 10, fontWeight: 500, color: 'var(--text-disabled)',
      }}>
        <span>{t('ss_of_sheets', { cur: activeSheet + 1, total: sheetNames.length })}</span>
        <span>{t('ss_dimensions', { rows: rows.length, cols: headers.length })}</span>
        {selectedCell && (
          <span>
            {t('ss_cell')} {String.fromCharCode(65 + (selectedCell[1] % 26))}{selectedCell[0] + 1}
          </span>
        )}
      </div>
    </div>
  );
}

function CtxItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', padding: '6px 10px',
        background: 'transparent', border: 'none', borderRadius: 6,
        color: danger ? 'var(--c-rose)' : 'var(--text-secondary)',
        fontSize: 12, fontWeight: 400, textAlign: 'left',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-default)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}
