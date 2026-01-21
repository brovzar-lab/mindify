import { cn } from '@/lib/cn';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/constants';
import type { Category } from '@/types';

export interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function CategoryBadge({
  category,
  size = 'md',
  showLabel = true,
  className,
}: CategoryBadgeProps) {
  const colors = CATEGORY_COLORS[category];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        colors.bg,
        colors.text,
        {
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-3 py-1 text-sm': size === 'md',
        },
        className
      )}
    >
      {showLabel && CATEGORY_LABELS[category]}
    </span>
  );
}
