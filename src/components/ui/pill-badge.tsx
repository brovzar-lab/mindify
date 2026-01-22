import { motion, type HTMLMotionProps } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Category } from '@/types';

interface PillBadgeProps extends Omit<HTMLMotionProps<'div'>, 'category'> {
    label: string;
    category?: Category;
    removable?: boolean;
    onRemove?: () => void;
    variant?: 'filled' | 'outline' | 'glass';
    size?: 'sm' | 'md' | 'lg';
}

const categoryColors: Record<Category, { filled: string; outline: string; glass: string }> = {
    idea: {
        filled: 'bg-category-idea text-white',
        outline: 'border-category-idea text-category-idea',
        glass: 'bg-category-idea/10 border-category-idea/30 text-category-idea',
    },
    task: {
        filled: 'bg-category-task text-gray-900',
        outline: 'border-category-task text-category-task',
        glass: 'bg-category-task/10 border-category-task/30 text-category-task',
    },
    reminder: {
        filled: 'bg-category-reminder text-white',
        outline: 'border-category-reminder text-category-reminder',
        glass: 'bg-category-reminder/10 border-category-reminder/30 text-category-reminder',
    },
    note: {
        filled: 'bg-category-note text-gray-900',
        outline: 'border-category-note text-category-note',
        glass: 'bg-category-note/10 border-category-note/30 text-category-note',
    },
};

const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
};

export function PillBadge({
    label,
    category,
    removable = false,
    onRemove,
    variant = 'glass',
    size = 'md',
    className,
    ...props
}: PillBadgeProps) {
    const defaultCategory: Category = 'note';
    const resolvedCategory = category || defaultCategory;

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 20,
            }}
            className={cn(
                'inline-flex items-center gap-1.5',
                'rounded-full font-medium',
                'border backdrop-blur-sm',
                'transition-all duration-200',
                categoryColors[resolvedCategory][variant],
                sizeClasses[size],
                className
            )}
            {...props}
        >
            <span>{label}</span>
            {removable && onRemove && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className={cn(
                        'rounded-full p-0.5',
                        'hover:bg-white/20',
                        'transition-colors duration-150',
                        'focus:outline-none focus:ring-2 focus:ring-white/50'
                    )}
                    aria-label={`Remove ${label}`}
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </motion.div>
    );
}
