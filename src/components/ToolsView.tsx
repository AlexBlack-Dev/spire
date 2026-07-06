import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Folder, Trash2, Palette, Shield,
  ChevronRight, ChevronLeft, Plus, X, RotateCcw,
  Sun, Moon, Check, Star, CircleCheckBig, Lock, Unlock,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n/translations';
import { dim } from '../isMobile';
import { format } from 'date-fns';
import type { Note } from '../types';

type ToolsSubPage = 'hub' | 'statistics' | 'folders' | 'trash' | 'themes' | 'permissions';

const COLOR_HEX: Record<string, string> = {
  violet: '#7c6af7', blue: '#4f8ef7', teal: '#2dd4bf',
  green: '#4ade80', amber: '#fbbf24', rose: '#f472b6',
};

const COLOR_NAMES = ['violet', 'blue', 'teal', 'green', 'amber', 'rose'] as const;

const th = window.innerHeight;

function useT() {
  const language = useStore((s) => s.language);
  return (key: string) => translations[language][key] || key;
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: dim.sp2,
      padding: `${dim.sp4}px ${dim.sp6}px ${dim.sp3}px`,
      flexShrink: 0,
    }}>
      <motion.button
        whileTap={{ scale: 0.82 }}
        onClick={onBack}
        style={{
          width: dim.barH, height: dim.barH,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', borderRadius: dim.radiusSm,
          color: 'var(--accent)', cursor: 'pointer', flexShrink: 0,
        }}
      >
        <ChevronLeft size={dim.iconLg} strokeWidth={2.5} />
      </motion.button>
      <span style={{
        fontSize: dim.textXl, fontWeight: 800, color: 'var(--text-primary)',
        letterSpacing: '-0.02em',
      }}>
        {title}
      </span>
    </div>
  );
}

export default function ToolsView() {
  const subPage = (useStore((s) => s.toolsSubPage) || 'hub') as ToolsSubPage;
  const setToolsSubPage = useStore((s) => s.setToolsSubPage);
  const t = useT();

  const goTo = (page: ToolsSubPage) => {
    setToolsSubPage(subPage === page ? null : page);
  };

  if (subPage === 'statistics') {
    return <StatisticsView onBack={() => goTo('hub')} />;
  }
  if (subPage === 'folders') {
    return <FoldersView onBack={() => goTo('hub')} />;
  }
  if (subPage === 'trash') {
    return <TrashView onBack={() => goTo('hub')} />;
  }
  if (subPage === 'themes') {
    return <ThemesView onBack={() => goTo('hub')} />;
  }
  if (subPage === 'permissions') {
    return <PermissionsView onBack={() => goTo('hub')} />;
  }
  const tools = [
    { id: 'statistics' as ToolsSubPage, icon: <BarChart3 size={dim.iconLg} />, label: t('statistics'), color: '#4f8ef7' },
    { id: 'folders' as ToolsSubPage, icon: <Folder size={dim.iconLg} />, label: t('folders'), color: '#2dd4bf' },
    { id: 'trash' as ToolsSubPage, icon: <Trash2 size={dim.iconLg} />, label: t('trash'), color: '#f87171' },
    { id: 'themes' as ToolsSubPage, icon: <Palette size={dim.iconLg} />, label: t('themes'), color: '#fbbf24' },
    { id: 'permissions' as ToolsSubPage, icon: <Shield size={dim.iconLg} />, label: t('permissions'), color: '#f472b6' },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--surface-0)', overflow: 'hidden',
    }}>
      <div style={{
        padding: `${dim.sp5}px ${dim.sp6}px ${dim.sp4}px`,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: dim.textXl, fontWeight: 800, color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          {t('tools')}
        </span>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `0 ${dim.sp6}px ${dim.sp7}px`,
        display: 'flex', flexDirection: 'column', gap: dim.sp3,
      }}>
        {tools.map((tool, i) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => goTo(tool.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: dim.sp4,
              padding: dim.sp5,
              borderRadius: dim.radius,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.04)',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: Math.round(dim.barH * 1.2), height: Math.round(dim.barH * 1.2),
              borderRadius: dim.radiusSm,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${tool.color}18`,
              color: tool.color,
              flexShrink: 0,
            }}>
              {tool.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: dim.textMd, fontWeight: 700, color: 'var(--text-primary)',
              }}>
                {tool.label}
              </div>
            </div>
            <ChevronRight size={dim.iconSm} color="#3a3a52" strokeWidth={2.5} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Statistics ---------- */

function StatisticsView({ onBack }: { onBack: () => void }) {
  const { notes, tasks } = useStore();
  const t = useT();

  const stats = useMemo(() => {
    const totalWords = notes.reduce((sum, n) => {
      const text = n.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
      return sum + text.split(/\s+/).filter(Boolean).length;
    }, 0);
    const completedTasks = tasks.filter((t) => t.completed).length;
    const incompleteTasks = tasks.length - completedTasks;
    const colorCounts: Record<string, number> = {};
    for (const n of notes) {
      colorCounts[n.color] = (colorCounts[n.color] || 0) + 1;
    }
    return { totalWords, completedTasks, incompleteTasks, colorCounts };
  }, [notes, tasks]);

  const statCards = [
    { label: t('total_notes'), value: notes.length, color: '#4f8ef7', icon: <Star size={dim.iconMd} /> },
    { label: t('total_tasks'), value: tasks.length, color: '#2dd4bf', icon: <CircleCheckBig size={dim.iconMd} /> },
    { label: t('total_words'), value: stats.totalWords, color: '#fbbf24', icon: <BarChart3 size={dim.iconMd} /> },
    { label: t('completed_tasks'), value: stats.completedTasks, color: '#4ade80', icon: <Check size={dim.iconMd} /> },
    { label: t('incomplete_tasks'), value: stats.incompleteTasks, color: '#f87171', icon: <X size={dim.iconMd} /> },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--surface-0)', overflow: 'hidden',
    }}>
      <SubHeader title={t('statistics')} onBack={onBack} />
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `0 ${dim.sp6}px ${dim.sp7}px`,
        display: 'flex', flexDirection: 'column', gap: dim.sp3,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: dim.sp3,
        }}>
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
              style={{
                padding: dim.sp5,
                borderRadius: dim.radius,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(255,255,255,0.04)',
                gridColumn: i === statCards.length - 1 ? '1 / -1' : undefined,
              }}
            >
              <div style={{
                fontSize: dim.textXxl, fontWeight: 800, color: card.color,
                letterSpacing: '-0.03em', marginBottom: dim.sp1,
              }}>
                {card.value}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: dim.sp2,
                fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-tertiary)',
              }}>
                {card.icon}
                {card.label}
              </div>
            </motion.div>
          ))}
        </div>

        {notes.length > 0 && (
          <div style={{
            padding: dim.sp5,
            borderRadius: dim.radius,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{
              fontSize: dim.textSm, fontWeight: 700, color: 'var(--text-disabled)',
              marginBottom: dim.sp3, textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {t('accent_color')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: dim.sp4 }}>
              {COLOR_NAMES.map((c) => {
                const count = stats.colorCounts[c] || 0;
                const maxCount = Math.max(1, ...Object.values(stats.colorCounts));
                const pct = count / maxCount;
                const barW = Math.round(Math.max(24, Math.min(44, window.innerWidth * 0.08)));
                return (
                  <div key={c} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: dim.sp1, width: barW }}>
                    <div style={{
                      width: dim.dot, height: dim.dot, borderRadius: '50%',
                      background: COLOR_HEX[c],
                      opacity: count > 0 ? 1 : 0.2,
                    }} />
                    <div style={{
                      width: '100%', height: Math.round(th * 0.06),
                      borderRadius: dim.radiusSm,
                      background: COLOR_HEX[c],
                      opacity: 0.3 + pct * 0.7,
                      transform: `scaleY(${0.2 + pct * 0.8})`,
                      transformOrigin: 'bottom',
                      transition: 'all 0.2s',
                    }} />
                    <span style={{
                      fontSize: dim.textXs, fontWeight: 700, color: 'var(--text-tertiary)',
                    }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Folders ---------- */

function FoldersView({ onBack }: { onBack: () => void }) {
  const { noteFolders, notes, createFolder, renameFolder, deleteFolder,
    setFolderPassword, clearFolderPassword, verifyFolderPassword,
    addNoteToFolder, removeNoteFromFolder } = useStore();
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const t = useT();

  const handleCreate = () => {
    const name = input.trim();
    if (!name) return;
    createFolder(name);
    setInput('');
  };

  const handleRename = (id: string) => {
    const name = editName.trim();
    if (!name) return;
    renameFolder(id, name);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteFolder(id);
    if (expandedId === id) setExpandedId(null);
  };

  const handleFolderLock = (folderId: string, hasPassword: boolean) => {
    if (hasPassword) {
      const pw = window.prompt('Enter current password to remove lock:');
      if (pw && verifyFolderPassword(folderId, pw)) {
        clearFolderPassword(folderId);
      }
    } else {
      const pw = window.prompt('Set a password for this folder:');
      if (pw) {
        setFolderPassword(folderId, pw);
      }
    }
  };

  const folderNotes = (folderId: string): Note[] => {
    const f = noteFolders.find((f) => f.id === folderId);
    if (!f) return [];
    return notes.filter((n) => f.noteIds.includes(n.id));
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--surface-0)', overflow: 'hidden',
    }}>
      <SubHeader title={t('folders')} onBack={onBack} />

      <div style={{
        padding: `0 ${dim.sp6}px ${dim.sp3}px`,
        display: 'flex', gap: dim.sp2, flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          placeholder={t('folder_name_placeholder')}
          style={{
            flex: 1, padding: dim.sp3,
            borderRadius: dim.radiusSm, border: '1px solid var(--border-default)',
            background: 'var(--surface-1)', color: 'var(--text-primary)',
            fontSize: dim.textMd, fontWeight: 600, outline: 'none',
          }}
        />
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleCreate}
          style={{
            width: dim.barH, height: dim.barH,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--accent)', border: 'none', borderRadius: dim.radiusSm,
            cursor: 'pointer', color: 'white',
          }}
        >
          <Plus size={dim.iconMd} strokeWidth={2.5} />
        </motion.button>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `0 ${dim.sp6}px ${dim.sp7}px`,
        display: 'flex', flexDirection: 'column', gap: dim.sp2,
      }}>
        {noteFolders.length === 0 && (
          <div style={{
            padding: `${Math.round(th * 0.08)}px 0`,
            textAlign: 'center', color: 'var(--text-disabled)', fontSize: dim.textMd, fontWeight: 700,
          }}>
            {t('no_notes')}
          </div>
        )}
        {noteFolders.map((folder) => (
          <div key={folder.id} style={{
            borderRadius: dim.radius,
            border: '1px solid rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}>
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => setExpandedId(expandedId === folder.id ? null : folder.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: dim.sp3,
                padding: dim.sp4, cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
              }}
            >
              {editingId !== folder.id ? (
                <span style={{
                  flex: 1, fontSize: dim.textMd, fontWeight: 700, color: 'var(--text-primary)',
                }}>
                  {folder.name}
                </span>
              ) : (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(folder.id); if (e.key === 'Escape') setEditingId(null); }}
                  onBlur={() => handleRename(folder.id)}
                  style={{
                    flex: 1, padding: '2px 4px',
                    borderRadius: 4, border: '1px solid var(--accent)',
                    background: '#1a1a28', color: 'var(--text-primary)',
                    fontSize: dim.textMd, fontWeight: 700, outline: 'none',
                  }}
                />
              )}
              <span style={{
                fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-tertiary)',
              }}>
                {folder.noteIds.length}
              </span>
              {editingId !== folder.id ? (
                <>
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    onClick={(e) => { e.stopPropagation(); handleFolderLock(folder.id, !!folder.password); }}
                    style={{ background: 'none', border: 'none', color: folder.password ? 'var(--accent)' : 'var(--text-disabled)', cursor: 'pointer', padding: 2 }}
                  >
                    {folder.password ? <Lock size={dim.iconSm} /> : <Unlock size={dim.iconSm} />}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    onClick={(e) => { e.stopPropagation(); setEditingId(folder.id); setEditName(folder.name); }}
                    style={{ background: 'none', border: 'none', color: '#4f8ef7', cursor: 'pointer', padding: 2 }}
                  >
                    <Folder size={dim.iconSm} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(folder.id); }}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 2 }}
                  >
                    <X size={dim.iconSm} />
                  </motion.button>
                </>
              ) : null}
            </motion.div>

            {expandedId === folder.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                style={{ overflow: 'hidden' }}
              >
                {/* Notes in folder */}
                {folderNotes(folder.id).map((note) => (
                  <div key={note.id} style={{
                    display: 'flex', alignItems: 'center', gap: dim.sp2,
                    padding: `${dim.sp3}px ${dim.sp4}px ${dim.sp3}px ${dim.sp6}px`,
                    borderTop: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: COLOR_HEX[note.color] || 'var(--accent)', flexShrink: 0,
                    }} />
                    <span style={{
                      flex: 1, fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-secondary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {note.title || 'Untitled'}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.82 }}
                      onClick={() => removeNoteFromFolder(note.id, folder.id)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 2 }}
                    >
                      <X size={dim.iconSm} />
                    </motion.button>
                  </div>
                ))}

                {/* Add notes not in folder */}
                {notes.filter((n) => !folder.noteIds.includes(n.id)).length > 0 && (
                  <div style={{
                    padding: `${dim.sp2}px ${dim.sp6}px ${dim.sp3}px`,
                    borderTop: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    <div style={{
                      fontSize: dim.textXs, fontWeight: 700, color: 'var(--text-disabled)',
                      marginBottom: dim.sp2, textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      + {t('add')}
                    </div>
                    {notes.filter((n) => !folder.noteIds.includes(n.id)).map((note) => (
                      <div key={note.id} style={{
                        display: 'flex', alignItems: 'center', gap: dim.sp2,
                        padding: `${dim.sp2}px 0`,
                      }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: COLOR_HEX[note.color] || 'var(--accent)', flexShrink: 0,
                        }} />
                        <span style={{
                          flex: 1, fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-tertiary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {note.title || 'Untitled'}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.82 }}
                          onClick={() => addNoteToFolder(note.id, folder.id)}
                          style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', padding: 2 }}
                        >
                          <Plus size={dim.iconSm} />
                        </motion.button>
                      </div>
                    ))}
                  </div>
                )}

                {folderNotes(folder.id).length === 0 && notes.filter((n) => !folder.noteIds.includes(n.id)).length === 0 && (
                  <div style={{
                    padding: `${dim.sp3}px ${dim.sp6}px`,
                    borderTop: '1px solid rgba(255,255,255,0.03)',
                    fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-disabled)',
                  }}>
                    {t('no_notes')}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Trash ---------- */

function TrashView({ onBack }: { onBack: () => void }) {
  const { trash, restoreFromTrash, permanentDelete, emptyTrash } = useStore();
  const t = useT();

  const handleRestore = (id: string) => {
    restoreFromTrash(id);
  };

  const handleDelete = (id: string) => {
    permanentDelete(id);
  };

  const handleEmpty = () => {
    emptyTrash();
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--surface-0)', overflow: 'hidden',
    }}>
      <SubHeader title={t('trash')} onBack={onBack} />

      {trash.length > 0 && (
        <div style={{
          padding: `0 ${dim.sp6}px ${dim.sp3}px`,
          flexShrink: 0,
        }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleEmpty}
            style={{
              display: 'flex', alignItems: 'center', gap: dim.sp2,
              padding: `${dim.sp2}px ${dim.sp4}px`,
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: dim.radiusSm,
              color: '#f87171', fontSize: dim.textSm, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={dim.iconSm} />
            {t('empty_trash')}
          </motion.button>
        </div>
      )}

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `0 ${dim.sp6}px ${dim.sp7}px`,
        display: 'flex', flexDirection: 'column', gap: dim.sp2,
      }}>
        {trash.length === 0 && (
          <div style={{
            padding: `${Math.round(th * 0.08)}px 0`,
            textAlign: 'center', color: 'var(--text-disabled)', fontSize: dim.textMd, fontWeight: 700,
          }}>
            {t('trash_empty')}
          </div>
        )}
        {trash.map((note) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: dim.sp3,
              padding: dim.sp4,
              borderRadius: dim.radiusSm,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div style={{
              width: dim.dot, height: dim.dot, borderRadius: '50%',
              background: COLOR_HEX[note.color] || 'var(--accent)', flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: dim.textMd, fontWeight: 700, color: 'var(--text-secondary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {note.title || 'Untitled'}
              </div>
              <div style={{
                fontSize: dim.textXs, fontWeight: 600, color: 'var(--text-disabled)',
              }}>
                {format(new Date(note.updatedAt), 'd MMM yyyy, HH:mm')}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.82 }}
              onClick={() => handleRestore(note.id)}
              style={{
                width: dim.barH, height: dim.barH,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(74,222,128,0.12)', border: 'none',
                borderRadius: dim.radiusSm, cursor: 'pointer', color: '#4ade80',
              }}
            >
              <RotateCcw size={dim.iconMd} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.82 }}
              onClick={() => handleDelete(note.id)}
              style={{
                width: dim.barH, height: dim.barH,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(248,113,113,0.12)', border: 'none',
                borderRadius: dim.radiusSm, cursor: 'pointer', color: '#f87171',
              }}
            >
              <X size={dim.iconMd} />
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Themes ---------- */

function ThemesView({ onBack }: { onBack: () => void }) {
  const { theme, setTheme, accentColor, setAccentColor } = useStore();
  const t = useT();

  const handleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: theme === 'dark' ? 'var(--surface-0)' : '#f0f0f0',
      overflow: 'hidden',
    }}>
      <SubHeader title={t('themes')} onBack={onBack} />

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `0 ${dim.sp6}px ${dim.sp7}px`,
        display: 'flex', flexDirection: 'column', gap: dim.sp4,
      }}>
        <div style={{
          padding: dim.sp5,
          borderRadius: dim.radius,
          background: theme === 'dark'
            ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)'
            : 'rgba(0,0,0,0.03)',
          border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
        }}>
          <div style={{
            fontSize: dim.textSm, fontWeight: 700,
            color: theme === 'dark' ? 'var(--text-disabled)' : '#888',
            marginBottom: dim.sp3, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {t('settings')}
          </div>
          <div style={{ display: 'flex', gap: dim.sp3 }}>
            <ThemeCard
              icon={<Moon size={dim.iconLg} />}
              label={t('dark_mode')}
              selected={theme === 'dark'}
              themeMode={theme}
              onClick={() => handleTheme('dark')}
            />
            <ThemeCard
              icon={<Sun size={dim.iconLg} />}
              label={t('light_mode')}
              selected={theme === 'light'}
              themeMode={theme}
              onClick={() => handleTheme('light')}
            />
          </div>
        </div>

        <div style={{
          padding: dim.sp5,
          borderRadius: dim.radius,
          background: theme === 'dark'
            ? 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)'
            : 'rgba(0,0,0,0.03)',
          border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`,
        }}>
          <div style={{
            fontSize: dim.textSm, fontWeight: 700,
            color: theme === 'dark' ? 'var(--text-disabled)' : '#888',
            marginBottom: dim.sp3, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {t('accent_color')}
          </div>
          <div style={{ display: 'flex', gap: dim.sp3, justifyContent: 'center' }}>
            {COLOR_NAMES.map((c) => (
              <motion.div
                key={c}
                whileTap={{ scale: 0.88 }}
                onClick={() => setAccentColor(c)}
                style={{
                  width: Math.round(dim.barH * 0.9), height: Math.round(dim.barH * 0.9),
                  borderRadius: '50%',
                  background: COLOR_HEX[c],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  border: accentColor === c
                    ? '2px solid var(--text-primary)'
                    : (theme === 'dark' ? '2px solid rgba(255,255,255,0.08)' : '2px solid rgba(0,0,0,0.08)'),
                }}
              >
                {accentColor === c && <Check size={dim.iconSm} color="white" strokeWidth={3} />}
              </motion.div>
            ))}
          </div>
          <div style={{
            marginTop: dim.sp3,
            fontSize: dim.textSm, fontWeight: 600,
            color: theme === 'dark' ? 'var(--text-tertiary)' : '#999', textAlign: 'center',
          }}>
            {t('only_notes')}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ icon, label, selected, themeMode, onClick }: {
  icon: React.ReactNode; label: string; selected: boolean;
  themeMode: 'dark' | 'light'; onClick: () => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: dim.sp2,
        padding: dim.sp5,
        borderRadius: dim.radius,
        cursor: 'pointer',
        background: selected
          ? (themeMode === 'dark' ? 'rgba(124,106,247,0.15)' : 'rgba(124,106,247,0.1)')
          : 'transparent',
        border: `1px solid ${selected ? 'var(--accent)' : (themeMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)')}`,
        color: themeMode === 'dark' ? 'var(--text-primary)' : '#222',
      }}
    >
      <div style={{ color: selected ? 'var(--accent)' : (themeMode === 'dark' ? 'var(--text-secondary)' : '#666') }}>
        {icon}
      </div>
      <span style={{ fontSize: dim.textSm, fontWeight: 700 }}>{label}</span>
    </motion.div>
  );
}

/* ---------- Permissions ---------- */

function PermissionsView({ onBack }: { onBack: () => void }) {
  const t = useT();
  const [storageGranted, setStorageGranted] = useState(false);

  const checkPermission = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const ok = await invoke<boolean>('check_storage_permission');
      setStorageGranted(ok);
    } catch {}
  };

  useEffect(() => {
    checkPermission();
    const onVis = () => { if (document.visibilityState === 'visible') checkPermission(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--surface-0)', overflow: 'hidden',
    }}>
      <SubHeader title={t('permissions')} onBack={onBack} />

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: `0 ${dim.sp6}px ${dim.sp7}px`,
        display: 'flex', flexDirection: 'column', gap: dim.sp3,
      }}>
        {/* Storage */}
        <div style={{
          padding: dim.sp5,
          borderRadius: dim.radius,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: dim.sp3, marginBottom: dim.sp3,
          }}>
            <div style={{
              width: Math.round(dim.barH * 1.1), height: Math.round(dim.barH * 1.1),
              borderRadius: dim.radiusSm, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: storageGranted ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
              color: storageGranted ? '#4ade80' : '#f87171',
              flexShrink: 0,
            }}>
              <Folder size={dim.iconLg} />
            </div>
            <div>
              <div style={{ fontSize: dim.textMd, fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('storage_permission')}
              </div>
              <div style={{ fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-tertiary)', marginTop: dim.sp1 }}>
                {t('storage_permission_desc')}
              </div>
            </div>
          </div>

          {storageGranted ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: dim.sp2,
              padding: `${dim.sp3}px ${dim.sp5}px`,
              width: '100%',
              borderRadius: dim.radiusSm,
              background: 'rgba(74,222,128,0.15)',
              color: '#4ade80',
              fontSize: dim.textMd, fontWeight: 700,
            }}>
              <Check size={dim.iconMd} />
              {t('notif_granted')}
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                try {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('open_app_settings');
                } catch (e) {
                  console.warn('open_app_settings failed', e);
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: dim.sp2,
                padding: `${dim.sp3}px ${dim.sp5}px`,
                width: '100%',
                borderRadius: dim.radiusSm,
                border: 'none', cursor: 'pointer',
                background: 'rgba(248,113,113,0.12)',
                color: '#f87171',
                fontSize: dim.textMd, fontWeight: 700,
                transition: 'all 0.15s',
              }}
            >
              <ExternalLink size={dim.iconMd} />
              {t('storage_open_settings')}
            </motion.button>
          )}

          <div style={{
            marginTop: dim.sp3,
            fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-disabled)',
          }}>
            {t('storage_note')}
          </div>
        </div>
      </div>
    </div>
  );
}
