import { useState, useRef, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../store/useStore';
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

export default function SpreadsheetEditor({ base64, ext, filePath, noteId }: Props) {
  const { updateNote } = useStore();
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
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

  useEffect(() => {
    try {
      const binary = atob(base64);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      const wb = XLSX.read(arr, { type: 'array' });
      workbookRef.current = wb;
      setSheetNames(wb.SheetNames);
      loadSheet(wb, 0);
    } catch {}
  }, [base64]);

  function loadSheet(wb: XLSX.WorkBook, idx: number) {
    const ws = wb.Sheets[wb.SheetNames[idx]];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (data.length === 0) {
      setHeaders([]);
      setRows([]);
      setColWidths([]);
      return;
    }
    const h = data[0].map((c: any) => String(c ?? ''));
    setHeaders(h);
    setRows(data.slice(1));
    setColWidths(h.map(() => DEFAULT_COL_WIDTH));
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
    setDirty(true);
  };

  const deleteRow = (ri: number) => {
    if (rows.length <= 1) {
      setRows([]);
    } else {
      setRows(prev => prev.filter((_, i) => i !== ri));
    }
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
    setDirty(true);
  };

  const deleteColumn = (ci: number) => {
    if (headers.length <= 1) return;
    setHeaders(prev => prev.filter((_, i) => i !== ci));
    setRows(prev => prev.map(r => r.filter((_, i) => i !== ci)));
    setColWidths(prev => prev.filter((_, i) => i !== ci));
    setDirty(true);
    setSelectedCell(null);
  };

  const clearCell = () => {
    if (!selectedCell) return;
    const [ri, ci] = selectedCell;
    updateCellValue(ri, ci, '');
  };

  const handleSave = useCallback(async () => {
    if (!workbookRef.current) return;
    const wsName = workbookRef.current.SheetNames[activeSheet];
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    workbookRef.current.Sheets[wsName] = ws;
    const outBinary = XLSX.write(workbookRef.current, { type: 'binary', bookType: ext as any });
    const b64 = btoa(outBinary);
    updateNote(noteId, { content: b64 });
    if (filePath) {
      try {
        await invoke('save_binary', { path: filePath, content: b64 });
      } catch {}
    }
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
            placeholder="Value"
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
            onMouseEnter={e => { e.currentTarget.style.background = '#6a58e5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
          >
            <Save size={12} /> Save
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
                  background: ri % 2 === 0 ? 'transparent' : '#0a0a10',
                }}
              >
                <td style={{
                  padding: 0, background: ri % 2 === 0 ? 'var(--surface-0)' : '#0a0a10',
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
                        background: sel ? '#1e1e3a' : 'transparent',
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
                    onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
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
          background: '#16161f', border: '1px solid var(--border-default)',
          borderRadius: 10, padding: 4, zIndex: 100,
          minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }} onClick={e => e.stopPropagation()}>
          {contextMenu.type === 'header' ? (
            <>
              <CtxItem label="Insert column left"  onClick={() => { addColumn(false); closeContextMenu(); }} />
              <CtxItem label="Insert column right" onClick={() => { addColumn(true); closeContextMenu(); }} />
              {headers.length > 1 && (
                <CtxItem label={`Delete column "${contextMenu.col !== undefined ? (headers[contextMenu.col] || `Col ${contextMenu.col + 1}`) : ''}"`}
                  onClick={() => { if (contextMenu.col !== undefined) deleteColumn(contextMenu.col); closeContextMenu(); }} danger />
              )}
            </>
          ) : (
            <>
              <CtxItem label="Insert row above" onClick={() => { addRow(false); closeContextMenu(); }} />
              <CtxItem label="Insert row below" onClick={() => { addRow(true); closeContextMenu(); }} />
              {contextMenu.row !== undefined && (
                <CtxItem label={`Delete row ${contextMenu.row + 1}`}
                  onClick={() => { if (contextMenu.row !== undefined) deleteRow(contextMenu.row); closeContextMenu(); }} danger />
              )}
              <CtxItem label="Clear cell" onClick={() => { clearCell(); closeContextMenu(); }} />
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
        <span>{activeSheet + 1} of {sheetNames.length} sheets</span>
        <span>{rows.length} rows × {headers.length} columns</span>
        {selectedCell && (
          <span>
            Cell: {String.fromCharCode(65 + (selectedCell[1] % 26))}{selectedCell[0] + 1}
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
        color: danger ? '#f87171' : 'var(--text-secondary)',
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
