import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Flag, Pencil, Check, Circle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useT } from '../i18n/useT';
import type { Dict } from '../i18n/translations';
import { dim } from '../isMobile';
import { formatDateFn } from '../utils/format';
import type { TaskPriority } from '../types';

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export default function TasksView() {
  const tasks = useStore((s) => s.tasks);
  const createTask = useStore((s) => s.createTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const language = useStore((s) => s.language);
  const t = useT();
  const formatDate = (iso: string) => formatDateFn(iso, language, true);
  const PRIORITY = {
    low:    { color: 'var(--c-green)', label: t('priority_low') },
    medium: { color: 'var(--c-amber)', label: t('priority_medium') },
    high:   { color: 'var(--c-rose)', label: t('priority_high') },
  } as const;
  type TaskFilter = 'all' | 'active' | 'done';
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [filter, setFilter] = useState<TaskFilter>('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (!input.trim()) return;
    createTask(input.trim(), priority);
    setInput('');
  };

  const startEdit = (task: typeof tasks[0]) => {
    setEditingId(task.id);
    setEditText(task.text);
  };

  const commitEdit = () => {
    if (editingId && editText.trim()) {
      updateTask(editingId, { text: editText.trim() });
    }
    setEditingId(null);
  };

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const ordered = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const ra = PRIORITY_RANK[a.priority];
    const rb = PRIORITY_RANK[b.priority];
    if (ra !== rb) return ra - rb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filtered = ordered.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'done') return task.completed;
    return true;
  });

  const done = tasks.filter((task) => task.completed).length;
  const progress = tasks.length > 0 ? (done / tasks.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        width: '100%', display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden', background: 'var(--surface-0)',
      }}
    >
      {/* Header */}
      <div style={{
        flexShrink: 0,
        borderBottom: '1px solid var(--border-subtle)',
        minWidth: 0,
      }}>
        <div style={{ padding: `${dim.sp3}px ${dim.sp6}px 0` }}>
          <div style={{ marginBottom: dim.sp5 }}>
            <h2 style={{
              fontSize: dim.textXl, fontWeight: 800,
              color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: dim.sp1,
            }}>
              {t('tasks_title')}
            </h2>
            <div style={{ fontSize: dim.textSm, fontWeight: 600, color: 'var(--text-tertiary)' }}>
              {tasks.filter(task => !task.completed).length} {t('tasks_active')} · {done} {t('tasks_done')}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div style={{
          padding: `0 ${dim.sp6}px`,
          marginBottom: dim.sp5,
        }}>
          <div style={{
            height: 3, background: 'var(--surface-3)',
            borderRadius: 99, overflow: 'hidden',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              style={{ height: '100%', background: 'var(--accent)', borderRadius: 99 }}
            />
          </div>
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: dim.sp2, alignItems: 'center', marginBottom: dim.sp5, padding: `0 ${dim.sp6}px`, overflow: 'hidden', minWidth: 0 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: dim.sp2, minWidth: 0,
            background: 'var(--surface-1)', border: '1px solid var(--border-default)',
            borderRadius: dim.radius, padding: `${dim.sp3}px ${dim.sp4}px`,
            transition: 'border-color 0.15s',
          }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
          >
            <Plus size={dim.iconSm} color="var(--text-disabled)" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder={t('add_task')}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: dim.textMd, fontWeight: 600,
                userSelect: 'text', minWidth: 0,
              }}
            />
            <div style={{ display: 'flex', gap: dim.sp1, flexShrink: 0 }}>
              {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                <motion.button
                  key={p}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setPriority(p)}
                  title=""
                  style={{
                    height: 28, width: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: dim.radiusSm,
                    color: priority === p ? PRIORITY[p].color : 'var(--text-disabled)',
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >
                  <Flag size={14} fill={priority === p ? PRIORITY[p].color : 'none'} />
                </motion.button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ background: 'var(--accent-hover)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreate}
            style={{
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--accent)', border: 'none',
              borderRadius: dim.radius, color: 'white',
              cursor: 'pointer', transition: 'background 0.15s',
              flexShrink: 0,
            }}
          >
            <Plus size={dim.iconMd} strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 0, padding: `0 ${dim.sp6}px`, marginBottom: -1 }}>
          {([
            { id: 'active', label: t('filter_active') },
            { id: 'done',   label: t('filter_done') },
            { id: 'all',    label: t('filter_all') },
          ] as { id: TaskFilter; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: `${dim.sp3}px ${dim.sp5}px`,
                background: 'none', border: 'none',
                borderBottom: filter === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: filter === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontSize: dim.textSm, fontWeight: filter === tab.id ? 800 : 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${dim.sp3}px ${dim.sp6}px ${dim.sp7}px`, minWidth: 0 }}>
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: '56px 0', textAlign: 'center',
                color: 'var(--text-disabled)', fontSize: 14, fontWeight: 600,
              }}
            >
              {filter === 'done' ? t('no_tasks_done') : t('no_tasks')}
            </motion.div>
          ) : (
            filtered.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0, overflow: 'hidden' }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: dim.sp2,
                  padding: `${dim.sp4}px ${dim.sp3}px`, borderRadius: dim.radiusSm, marginBottom: 3,
                  opacity: task.completed ? 0.45 : 1,
                  background: 'transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => toggleTask(task.id)}
                  title=""
                  style={{
                    width: dim.iconMd, height: dim.iconMd,
                    flexShrink: 0, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', padding: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {task.completed ? (
                    <Check size={dim.iconMd} strokeWidth={3} color="var(--accent)" />
                  ) : (
                    <Circle size={dim.iconMd} strokeWidth={2} color="var(--border-strong)" />
                  )}
                </motion.button>

                {editingId === task.id ? (
                  <input
                    ref={editRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    style={{
                      flex: 1, fontSize: dim.textMd, fontWeight: 600,
                      color: 'var(--text-primary)',
                      background: 'var(--surface-2)', border: '1px solid var(--accent)',
                      borderRadius: dim.radiusSm, padding: `${dim.sp1}px ${dim.sp2}px`,
                      outline: 'none', userSelect: 'text', minWidth: 0,
                    }}
                  />
                ) : (
                  <span
                    onClick={() => !task.completed && startEdit(task)}
                    style={{
                      flex: 1, fontSize: dim.textMd, fontWeight: 600,
                      color: task.completed ? 'var(--text-disabled)' : 'var(--text-primary)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      cursor: task.completed ? 'default' : 'text',
                      userSelect: 'text',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {task.text}
                  </span>
                )}

                <PRIORITY_BADGE task={task} t={t} />

                <span style={{
                  fontSize: dim.textXs, fontWeight: 600, color: 'var(--text-disabled)', flexShrink: 0,
                }}>
                  {formatDate(task.createdAt)}
                </span>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => startEdit(task)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: editingId === task.id ? 'var(--accent)' : 'var(--text-disabled)',
                    display: 'flex', alignItems: 'center',
                    padding: dim.sp1, flexShrink: 0, borderRadius: dim.radiusSm,
                  }}
                >
                  <Pencil size={dim.iconSm} />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => deleteTask(task.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--c-rose)', display: 'flex', alignItems: 'center',
                    padding: dim.sp1, flexShrink: 0, borderRadius: dim.radiusSm,
                  }}
                >
                  <Trash2 size={dim.iconMd} />
                </motion.button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function PRIORITY_BADGE({ task, t }: { task: { priority: TaskPriority }; t: (key: keyof Dict) => string }) {
  const PRIORITY = {
    low:    { color: 'var(--c-green)', label: t('priority_low') },
    medium: { color: 'var(--c-amber)', label: t('priority_medium') },
    high:   { color: 'var(--c-rose)', label: t('priority_high') },
  } as const;
  const p = PRIORITY[task.priority];
  return (
    <span style={{
      display: 'flex', alignItems: 'center',
      color: p.color, flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      <Flag size={dim.iconSm} fill={p.color} />
    </span>
  );
}