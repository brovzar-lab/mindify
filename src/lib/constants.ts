import type { UserContext, Category } from '@/types';

export const USER_CONTEXT: UserContext = {
  name: 'Billy',
  profession: 'Screenwriter/CEO',
  company: 'Lemon Studios',
  projects: ['Oro Verde', 'Storiq', 'Monkey to Master'],
  additionalContext: 'Mexican film production company. Also runs a breathwork business.',
};

// Category colors for warm light theme
export const CATEGORY_COLORS: Record<Category, { text: string; bg: string; border: string }> = {
  idea: { text: 'text-[#A855F7]', bg: 'bg-[#A855F7]/10', border: 'border-[#A855F7]' },
  task: { text: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]/10', border: 'border-[#3B82F6]' },
  reminder: { text: 'text-[#F97316]', bg: 'bg-[#F97316]/10', border: 'border-[#F97316]' },
  note: { text: 'text-[#22C55E]', bg: 'bg-[#22C55E]/10', border: 'border-[#22C55E]' },
};

export const CATEGORY_LABELS: Record<Category, string> = {
  idea: 'idea',
  task: 'task',
  reminder: 'reminder',
  note: 'note',
};

export const STORAGE_KEYS = {
  ITEMS: 'mindify_items',
  PROJECTS: 'mindify_projects',
  PENDING_QUEUE: 'mindify_pending_queue',
  SETTINGS: 'mindify_settings',
} as const;

// Helper function to get category text color class
export function getCategoryColor(category: Category): string {
  return CATEGORY_COLORS[category]?.text || 'text-[#6B6B6B]';
}
