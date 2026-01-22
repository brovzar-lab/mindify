import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/cn';
import type { Category } from '@/types';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'category'> {
    category?: Category;
    neonBorder?: boolean;
    blur?: boolean;
    children: React.ReactNode;
}

const categoryBorderColors: Record<Category, string> = {
    idea: 'border-category-idea-neon',
    task: 'border-category-task-neon',
    reminder: 'border-category-reminder-neon',
    note: 'border-category-note-neon',
};

const categoryGlowColors: Record<Category, string> = {
    idea: '[--glow-color:#B026FF]',
    task: '[--glow-color:#00F0FF]',
    reminder: '[--glow-color:#FF2E97]',
    note: '[--glow-color:#00FF94]',
};

export function GlassCard({
    category,
    neonBorder = false,
    blur = true,
    className,
    children,
    ...props
}: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
            }}
            className={cn(
                'rounded-2xl p-4',
                'bg-glass border border-glass-border',
                blur && 'backdrop-blur-xl',
                neonBorder && category && [
                    'border-2',
                    categoryBorderColors[category],
                    categoryGlowColors[category],
                    'shadow-[0_0_20px_0_var(--glow-color)]',
                ],
                'transition-all duration-300',
                'hover:scale-[1.02] hover:shadow-[0_0_30px_0_var(--glow-color)]',
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
}
