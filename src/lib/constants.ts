import type { UserContext, Category } from '@/types';

export const USER_CONTEXT: UserContext = {
  name: 'Billy',
  profession: 'Screenwriter/CEO',
  company: 'Lemon Studios',
  projects: ['Oro Verde', 'Storiq', 'Monkey to Master'],
  additionalContext: 'Mexican film production company. Also runs a breathwork business.',
};

export const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string }> = {
  idea: {
    bg: 'bg-category-idea/20',
    text: 'text-category-idea',
    border: 'border-category-idea',
  },
  task: {
    bg: 'bg-category-task/20',
    text: 'text-category-task',
    border: 'border-category-task',
  },
  reminder: {
    bg: 'bg-category-reminder/20',
    text: 'text-category-reminder',
    border: 'border-category-reminder',
  },
  note: {
    bg: 'bg-category-note/20',
    text: 'text-category-note',
    border: 'border-category-note',
  },
};

export const CATEGORY_LABELS: Record<Category, string> = {
  idea: 'Idea',
  task: 'Task',
  reminder: 'Reminder',
  note: 'Note',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  idea: '💡',
  task: '✓',
  reminder: '⏰',
  note: '📝',
};

export const STORAGE_KEYS = {
  ITEMS: 'mindify_items',
  PENDING_QUEUE: 'mindify_pending_queue',
  SETTINGS: 'mindify_settings',
} as const;
