import { motion } from 'framer-motion';
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  CheckSquare, Highlighter, Heading1, Heading2, Quote, Minus,
  Table as TableIcon, Rows3, Columns3, Trash2,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { dim } from '../isMobile';

type Btn = {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  run: () => void;
};

function FB({ btn, noAnim }: { btn: Btn; noAnim?: boolean | null }) {
  return (
    <motion.button
      whileTap={noAnim ? {} : { scale: 0.8 }}
      whileHover={noAnim ? {} : { scale: 1.08 }}
      transition={noAnim ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 14 }}
      onMouseDown={(e) => { e.preventDefault(); if (!btn.disabled) btn.run(); }}
      title={btn.label}
      aria-label={btn.label}
      aria-pressed={btn.active ?? false}
      onMouseEnter={e => { if (!btn.disabled && !btn.active) e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => { if (!btn.active) e.currentTarget.style.background = 'transparent'; }}
      style={{
        width: dim.barH, height: dim.barH,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: btn.active ? 'var(--accent-dim)' : 'transparent',
        border: 'none', borderRadius: dim.radiusSm,
        color: btn.active ? 'var(--accent)' : btn.disabled ? 'var(--text-disabled)' : 'var(--text-secondary)',
        cursor: btn.disabled ? 'default' : 'pointer', flexShrink: 0,
        opacity: btn.disabled ? 0.35 : 1,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {btn.icon}
    </motion.button>
  );
}

function FSep() {
  return <div style={{ width: 1, height: 18, background: 'var(--border-subtle)', margin: '0 8px', flexShrink: 0 }} />;
}

export default function FormatToolbar({ editor, noAnim }: { editor: Editor; noAnim?: boolean | null }) {
  const chain = () => editor.chain().focus();
  const inTable = editor.isActive('table');

  const btn = (b: Omit<Btn, 'run'> & { run?: () => void }): Btn => ({
    ...b,
    run: b.run ?? (() => {}),
  });

  const groups: Array<Array<Btn>> = [
    [
      btn({ label: 'Bold (Ctrl+B)', icon: <Bold size={dim.iconMd} />, active: editor.isActive('bold'), run: () => chain().toggleBold().run() }),
      btn({ label: 'Italic (Ctrl+I)', icon: <Italic size={dim.iconMd} />, active: editor.isActive('italic'), run: () => chain().toggleItalic().run() }),
      btn({ label: 'Strike (Ctrl+Shift+S)', icon: <Strikethrough size={dim.iconMd} />, active: editor.isActive('strike'), run: () => chain().toggleStrike().run() }),
      btn({ label: 'Code (Ctrl+E)', icon: <Code size={dim.iconMd} />, active: editor.isActive('code'), run: () => chain().toggleCode().run() }),
      btn({ label: 'Highlight', icon: <Highlighter size={dim.iconMd} />, active: editor.isActive('highlight'), run: () => chain().toggleHighlight().run() }),
    ],
    [
      btn({ label: 'Heading 1 (Ctrl+Alt+1)', icon: <Heading1 size={dim.iconMd} />, active: editor.isActive('heading', { level: 1 }), run: () => chain().toggleHeading({ level: 1 }).run() }),
      btn({ label: 'Heading 2 (Ctrl+Alt+2)', icon: <Heading2 size={dim.iconMd} />, active: editor.isActive('heading', { level: 2 }), run: () => chain().toggleHeading({ level: 2 }).run() }),
      btn({ label: 'Quote (Ctrl+Shift+B)', icon: <Quote size={dim.iconMd} />, active: editor.isActive('blockquote'), run: () => chain().toggleBlockquote().run() }),
    ],
    [
      btn({ label: 'Bullet list (Ctrl+Shift+8)', icon: <List size={dim.iconMd} />, active: editor.isActive('bulletList'), run: () => chain().toggleBulletList().run() }),
      btn({ label: 'Numbered list (Ctrl+Shift+7)', icon: <ListOrdered size={dim.iconMd} />, active: editor.isActive('orderedList'), run: () => chain().toggleOrderedList().run() }),
      btn({ label: 'Task list (Ctrl+Shift+9)', icon: <CheckSquare size={dim.iconMd} />, active: editor.isActive('taskList'), run: () => chain().toggleTaskList().run() }),
      btn({ label: 'Divider', icon: <Minus size={dim.iconMd} />, run: () => chain().setHorizontalRule().run() }),
    ],
    [
      btn({ label: 'Table', icon: <TableIcon size={dim.iconMd} />, active: inTable, run: () => {
        if (inTable) {
          chain().addRowAfter().run();
        } else {
          chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        }
      } }),
      btn({ label: 'Add row', icon: <Rows3 size={dim.iconMd} />, disabled: !inTable, run: () => chain().addRowAfter().run() }),
      btn({ label: 'Add column', icon: <Columns3 size={dim.iconMd} />, disabled: !inTable, run: () => chain().addColumnAfter().run() }),
      btn({ label: 'Delete table', icon: <Trash2 size={dim.iconMd} />, disabled: !inTable, run: () => chain().deleteTable().run() }),
    ],
  ];

  return (
    <div style={{
      display: 'flex', gap: 2, alignItems: 'center',
      padding: `4px ${dim.sp3}px`,
      overflowX: 'auto', overflowY: 'hidden',
      borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0, minWidth: 0,
      scrollbarWidth: 'none',
    }}>
      {groups.map((group, gi) => (
        <div key={gi} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {gi > 0 && <FSep />}
          {group.map((item, i) => <FB key={i} btn={item} noAnim={noAnim} />)}
        </div>
      ))}
    </div>
  );
}