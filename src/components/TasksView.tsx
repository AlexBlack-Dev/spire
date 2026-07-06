import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, Circle, Flag, Pencil, ChevronUp, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { format, isToday, isYesterday } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { translations } from '../i18n/translations';
import { dim } from '../isMobile';

function formatDateFn(iso: string, language: 'en' | 'ru') {
  const d = new Date(iso);
  const t = (key: string) => translations[language][key] || key;
  const locale = language === 'ru' ? ru : enUS;
  if (isToday(d)) return t('today');
  if (isYesterday(d)) return t('yesterday');
  return format(d, 'd MMM', { locale });
}

export default function TasksView() {
  const { tasks, createTask, toggleTask, updateTask, deleteTask, moveTaskUp, moveTaskDown, language } = useStore();
  const t = (key: string) => translations[language][key] || key;
  const formatDate = (iso: string) => formatDateFn(iso, language);
  const PRIORITY = {
    low:    { color: '#4ade80', label: t('priority_low') },
    medium: { color: '#fbbf24', label: t('priority_medium') },
    high:   { color: '#f87171', label: t('priority_high') },
  } as const;
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('active');
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

  const filtered = tasks.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  const done = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (done / tasks.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex', flexDirection: 'column',
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
              {tasks.filter(t => !t.completed).length} {t('tasks_active')} · {done} {t('tasks_done')}
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
            <Plus size={dim.iconSm} color="#3a3a52" />
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
              {(['low', 'medium', 'high'] as const).map((p) => (
                <motion.button
                  key={p}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setPriority(p)}
                  title={PRIORITY[p].label}
                  style={{
                    width: 28, height: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    background: priority === p ? 'var(--surface-3)' : 'transparent',
                    border: priority === p ? `1px solid ${PRIORITY[p].color}` : '1px solid transparent',
                    borderRadius: dim.radiusSm,
                    color: priority === p ? PRIORITY[p].color : 'var(--text-disabled)',
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >
                  <Flag size={12} />
                </motion.button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ background: '#8f7fff' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreate}
            style={{
              padding: `${dim.sp3}px ${dim.sp5}px`,
              background: 'var(--accent)', border: 'none',
              borderRadius: dim.radius, color: 'white',
              fontSize: dim.textMd, fontWeight: 800,
              cursor: 'pointer', transition: 'background 0.15s',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {t('add')}
          </motion.button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 0, padding: `0 ${dim.sp6}px`, marginBottom: -1 }}>
          {[
            { id: 'active', label: t('filter_active') },
            { id: 'done',   label: t('filter_done') },
            { id: 'all',    label: t('filter_all') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
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
                }}
              >
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: dim.sp1, flexShrink: 0,
                  paddingRight: dim.sp1,
                }}>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => moveTaskUp(task.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-disabled)', display: 'flex', alignItems: 'center',
                      padding: 2, borderRadius: dim.radiusSm,
                    }}
                  >
                    <ChevronUp size={dim.iconSm} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => moveTaskDown(task.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-disabled)', display: 'flex', alignItems: 'center',
                      padding: 2, borderRadius: dim.radiusSm,
                    }}
                  >
                    <ChevronDown size={dim.iconSm} />
                  </motion.button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => toggleTask(task.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: task.completed ? '#4ade80' : 'var(--text-disabled)',
                    display: 'flex', alignItems: 'center',
                    padding: 0, flexShrink: 0,
                  }}
                >
                  {task.completed ? <CheckCircle2 size={dim.iconMd} /> : <Circle size={dim.iconMd} />}
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

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => startEdit(task)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: editingId === task.id ? 'var(--accent)' : 'var(--text-disabled)',
                    display: 'flex', alignItems: 'center',
                    padding: dim.sp1, flexShrink: 0,
                  }}
                >
                  <Pencil size={dim.iconSm} />
                </motion.button>

                <div style={{
                  width: dim.sp1, height: dim.sp1, borderRadius: '50%',
                  background: PRIORITY[task.priority as keyof typeof PRIORITY]?.color || 'var(--accent)',
                  flexShrink: 0,
                }} />

                <span style={{
                  fontSize: dim.textXs, fontWeight: 600, color: 'var(--text-disabled)', flexShrink: 0,
                }}>
                  {formatDate(task.createdAt)}
                </span>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => deleteTask(task.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#f87171', display: 'flex', alignItems: 'center',
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
