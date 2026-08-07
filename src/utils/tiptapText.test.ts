import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Slice } from '@tiptap/pm/model';
import { sliceToText } from './tiptapText';

function editorFor(content: string) {
  return new Editor({
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), Table, TableRow, TableHeader, TableCell],
    content,
  });
}

function copyText(content: string): string {
  const editor = editorFor(content);
  const slice = new Slice(editor.state.doc.content, 0, 0);
  return sliceToText(slice);
}

describe('tiptapText serializer', () => {
  it('keeps ordered list numbers on copy', () => {
    const html = '<ol><li><p>First item</p></li><li><p>Second item</p></li></ol>';
    const text = copyText(html);
    expect(text).toContain('1. First item');
    expect(text).toContain('2. Second item');
  });

  it('keeps bullet list markers', () => {
    const html = '<ul><li><p>Alpha</p></li><li><p>Beta</p></li></ul>';
    const text = copyText(html);
    expect(text).toContain('- Alpha');
    expect(text).toContain('- Beta');
  });

  it('keeps task items with check state', () => {
    const html = '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Done</p></li><li data-type="taskItem" data-checked="false"><p>TODO</p></li></ul>';
    const text = copyText(html);
    expect(text).toContain('[x] Done');
    expect(text).toContain('[ ] TODO');
  });

  it('keeps table cells and rows', () => {
    const html = '<table><tbody><tr><td><p>A</p></td><td><p>B</p></td></tr><tr><td><p>C</p></td><td><p>D</p></td></tr></tbody></table>';
    const text = copyText(html);
    expect(text).toContain('A | B');
    expect(text).toContain('C | D');
  });

  it('separates paragraphs with newlines', () => {
    const text = copyText('<p>line one</p><p>line two</p>');
    expect(text).toBe('line one\nline two\n');
  });

  it('handles headings and quotes', () => {
    const text = copyText('<h1>Title</h1><blockquote><p>Quote</p></blockquote>');
    expect(text).toContain('Title');
    expect(text).toContain('Quote');
  });
});