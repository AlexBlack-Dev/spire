import { v4 as uuidv4 } from 'uuid';
import type { Task } from '../../types';
import type { SpireSlice } from '../types';

export const tasksSlice: SpireSlice = (set) => ({
  tasks: [],

  createTask: (text, priority = 'medium') => {
    const newTask: Task = {
      id: uuidv4(),
      text,
      completed: false,
      priority,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ tasks: [newTask, ...s.tasks] }));
  },

  updateTask: (id, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  toggleTask: (id) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    }));
  },

  moveTaskUp: (id) => set((s) => {
    const idx = s.tasks.findIndex((t) => t.id === id);
    if (idx <= 0) return s;
    const arr = [...s.tasks];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    return { tasks: arr };
  }),

  moveTaskDown: (id) => set((s) => {
    const idx = s.tasks.findIndex((t) => t.id === id);
    if (idx < 0 || idx >= s.tasks.length - 1) return s;
    const arr = [...s.tasks];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    return { tasks: arr };
  }),
});