import { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { useHaptic } from '@/hooks/use-haptic';
import { CategoryBadge } from '@/components/items/category-badge';
import { cn } from '@/lib/cn';
import type { MindifyItem } from '@/types';

interface CheckableTaskCardProps {
    item: MindifyItem;
    onComplete: (id: string) => void;
    onDelete: (id: string) => void;
    onUndo?: (id: string) => void;
    isCompleted?: boolean;
    showCategory?: boolean;
}

export function CheckableTaskCard({
    item,
    onComplete,
    onDelete,
    onUndo,
    isCompleted = false,
    showCategory = true,
}: CheckableTaskCardProps) {
    const [isChecked, setIsChecked] = useState(isCompleted);
    const haptic = useHaptic();
    const x = useMotionValue(0);

    // Transform swipe position to colors
    const backgroundColor = useTransform(
        x,
        [-150, -75, 0, 75, 150],
        [
            'rgba(239, 68, 68, 0.2)', // Delete zone (red)
            'rgba(239, 68, 68, 0.1)',
            'rgba(26, 26, 31, 1)', // Center (surface)
            'rgba(34, 197, 94, 0.1)',
            'rgba(34, 197, 94, 0.2)', // Complete zone (green)
        ]
    );

    const handleCheck = useCallback(() => {
        if (isChecked && onUndo) {
            // Undo completion
            setIsChecked(false);
            onUndo(item.id);
            haptic.light();
        } else {
            // Mark complete
            setIsChecked(true);
            onComplete(item.id);
            haptic.success();
        }
    }, [isChecked, item.id, onComplete, onUndo, haptic]);

    const handleDragEnd = useCallback(
        (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            const offset = info.offset.x;
            const velocity = info.velocity.x;

            // Swipe right (>100px or fast velocity) = Complete
            if (offset > 100 || velocity > 500) {
                setIsChecked(true);
                onComplete(item.id);
                haptic.success();
                x.set(0);
            }
            // Swipe left (<-100px or fast velocity) = Delete
            else if (offset < -100 || velocity < -500) {
                onDelete(item.id);
                haptic.medium();
            } else {
                // Return to center
                x.set(0);
            }
        },
        [item.id, onComplete, onDelete, haptic, x]
    );

    // Time ago display
    const getTimeAgo = (timestamp: string): string => {
        const now = new Date();
        const created = new Date(timestamp);
        const diffMs = now.getTime() - created.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'yesterday';
        return `${diffDays}d ago`;
    };

    // Urgency styling
    const getUrgencyStyles = () => {
        if (item.urgency === 'high') {
            return 'ring-2 ring-red-500/50 shadow-lg shadow-red-500/20';
        }
        if (item.urgency === 'medium') {
            return 'ring-1 ring-neon-pink/30';
        }
        return '';
    };

    return (
        <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ x, backgroundColor }}
            className={cn(
                'relative rounded-xl p-4 mb-3 transition-all',
                'bg-surface hover:bg-surface-elevated',
                'min-h-[64px] flex items-center gap-3',
                getUrgencyStyles(),
                isChecked && 'opacity-50'
            )}
        >
            {/* Swipe indicators */}
            <motion.div
                className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-red-500"
                style={{ opacity: useTransform(x, [-150, -50, 0], [1, 0.5, 0]) }}
            >
                <X className="w-5 h-5" />
                <span className="text-sm font-medium">Delete</span>
            </motion.div>

            <motion.div
                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-green-500"
                style={{ opacity: useTransform(x, [0, 50, 150], [0, 0.5, 1]) }}
            >
                <span className="text-sm font-medium">Done</span>
                <Check className="w-5 h-5" />
            </motion.div>

            {/* Checkbox - LEFT aligned for easy thumb access */}
            <button
                onClick={handleCheck}
                className={cn(
                    'flex-shrink-0 w-7 h-7 rounded-lg border-2 transition-all',
                    'flex items-center justify-center',
                    'active:scale-90',
                    isChecked
                        ? 'bg-neon-green border-neon-green'
                        : item.urgency === 'high'
                            ? 'border-red-500 hover:bg-red-500/10'
                            : 'border-gray-600 hover:border-neon-purple hover:bg-neon-purple/10'
                )}
                aria-label={isChecked ? 'Mark incomplete' : 'Mark complete'}
            >
                {isChecked && <Check className="w-4 h-4 text-gray-900" strokeWidth={3} />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    {showCategory && <CategoryBadge category={item.category} showLabel={false} />}
                    {item.urgency === 'high' && (
                        <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                    )}
                    {item.tags.slice(0, 2).map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-neon-purple/20 text-neon-purple text-xs font-medium"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
                <p
                    className={cn(
                        'text-base text-gray-200 leading-tight',
                        isChecked && 'line-through text-gray-500'
                    )}
                >
                    {item.title}
                </p>
                {item.scheduledNotification && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-neon-blue">
                        <Clock className="w-3 h-3" />
                        <span>
                            {new Date(item.scheduledNotification.scheduledTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                            })}
                        </span>
                    </div>
                )}
            </div>

            {/* Time indicator */}
            <div className="flex-shrink-0 text-xs text-gray-500">
                {getTimeAgo(item.createdAt)}
            </div>
        </motion.div>
    );
}
