import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/cn';
import type { Category } from '@/types';

interface NeonButtonProps extends Omit<HTMLMotionProps<'button'>, 'category' | 'type'> {
    category?: Category;
    variant?: 'gradient' | 'outline' | 'ghost';
    glow?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    type?: 'button' | 'submit' | 'reset';
    children: React.ReactNode;
}

const categoryGradients: Record<Category, string> = {
    idea: 'bg-gradient-to-r from-category-idea via-category-idea-light to-category-idea-dark',
    task: 'bg-gradient-to-r from-category-task via-category-task-light to-category-task-dark',
    reminder: 'bg-gradient-to-r from-category-reminder via-category-reminder-light to-category-reminder-dark',
    note: 'bg-gradient-to-r from-category-note via-category-note-light to-category-note-dark',
};

const categoryGlowColors: Record<Category, string> = {
    idea: '[--glow-color:#B026FF]',
    task: '[--glow-color:#00F0FF]',
    reminder: '[--glow-color:#FF2E97]',
    note: '[--glow-color:#00FF94]',
};

const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
};

export function NeonButton({
    category = 'task',
    variant = 'gradient',
    glow = false,
    size = 'md',
    type = 'button',
    className,
    children,
    ...props
}: NeonButtonProps) {
    const baseClasses = cn(
        'rounded-full font-semibold',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-95',
        sizeClasses[size]
    );

    const variantClasses = {
        gradient: cn(
            categoryGradients[category],
            'text-white shadow-lg',
            glow && [
                categoryGlowColors[category],
                'shadow-[0_0_20px_var(--glow-color)]',
                'hover:shadow-[0_0_30px_var(--glow-color)]',
            ]
        ),
        outline: cn(
            'border-2 bg-transparent',
            category === 'idea' && 'border-category-idea text-category-idea hover:bg-category-idea/10',
            category === 'task' && 'border-category-task text-category-task hover:bg-category-task/10',
            category === 'reminder' && 'border-category-reminder text-category-reminder hover:bg-category-reminder/10',
            category === 'note' && 'border-category-note text-category-note hover:bg-category-note/10'
        ),
        ghost: cn(
            'bg-transparent',
            category === 'idea' && 'text-category-idea hover:bg-category-idea/10',
            category === 'task' && 'text-category-task hover:bg-category-task/10',
            category === 'reminder' && 'text-category-reminder hover:bg-category-reminder/10',
            category === 'note' && 'text-category-note hover:bg-category-note/10'
        ),
    };

    return (
        <motion.button
            type={type}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 17,
            }}
            className={cn(baseClasses, variantClasses[variant], className)}
            {...props}
        >
            {children}
        </motion.button>
    );
}
