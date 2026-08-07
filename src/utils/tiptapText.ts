import type { Fragment, Node, Slice } from '@tiptap/pm/model';

export function sliceToText(slice: Slice): string {
  return fragmentToText(slice.content);
}

export function fragmentToText(fragment: Fragment): string {
  let out = '';
  fragment.forEach((node) => {
    out += nodeToText(node);
  });
  return out;
}

function nodeToText(node: Node): string {
  switch (node.type.name) {
    case 'orderedList': {
      let s = '';
      let n = typeof node.attrs.start === 'number' ? (node.attrs.start as number) : 1;
      node.forEach((li) => {
        s += `${n}. ${listItemText(li)}\n`;
        n += 1;
      });
      return s;
    }
    case 'bulletList': {
      let s = '';
      node.forEach((li) => {
        s += `- ${listItemText(li)}\n`;
      });
      return s;
    }
    case 'taskList': {
      let s = '';
      node.forEach((li) => {
        const check = li.attrs.checked ? '[x]' : '[ ]';
        s += `${check} ${listItemText(li)}\n`;
      });
      return s;
    }
    case 'listItem':
      return `${listItemText(node)}\n`;
    case 'table':
      return tableText(node);
    case 'tableRow': {
      const cells: string[] = [];
      node.forEach((c) => cells.push(contentText(c)));
      return `${cells.join(' | ')}\n`;
    }
    case 'tableCell':
    case 'tableHeader':
    case 'paragraph':
      return `${blockText(node)}\n`;
    case 'heading':
    case 'codeBlock':
      return `${node.textContent}\n`;
    case 'blockquote':
      return `${fragmentToText(node.content).trimEnd()}\n`;
    case 'horizontalRule':
      return '---\n';
    case 'hardBreak':
      return '\n';
    case 'text':
      return node.text ?? '';
    default:
      if (node.isBlock) {
        const inner = fragmentToText(node.content).trimEnd();
        return inner ? `${inner}\n` : '';
      }
      return fragmentToText(node.content);
  }
}

function listItemText(node: Node): string {
  let out = '';
  node.forEach((child) => {
    if (child.type.name === 'bulletList' || child.type.name === 'taskList') {
      out += `${nodeToText(child).trimEnd()}\n`;
    } else if (child.type.name === 'orderedList') {
      out += nodeToText(child).trimEnd();
    } else if (child.type.name === 'table') {
      out += tableText(child);
    } else {
      out += nodeToText(child);
    }
  });
  return out.trim();
}

function blockText(node: Node): string {
  return node.isTextblock ? node.textContent : fragmentToText(node.content).trim();
}

function contentText(node: Node): string {
  if (node.isText) return node.text ?? '';
  if (node.isTextblock) return node.textContent;
  return fragmentToText(node.content).trim();
}

function tableText(node: Node): string {
  let out = '';
  node.forEach((row) => {
    out += nodeToText(row);
  });
  return out;
}