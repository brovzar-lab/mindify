import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Edit2, Trash2, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { NeonButton } from '@/components/ui/neon-button';
import { PillBadge } from '@/components/ui/pill-badge';
import { cn } from '@/lib/cn';
import type { ExtractedItem, Category } from '@/types';

interface ExtractionReviewProps {
    items: ExtractedItem[];
    reasoning: string;
    onSaveAll: (items: ExtractedItem[]) => void;
    onCancel: () => void;
}

const categoryLabels: Record<Category, { icon: string; label: string }> = {
    idea: { icon: '💡', label: 'Idea' },
    task: { icon: '✅', label: 'Task' },
    reminder: { icon: '⏰', label: 'Reminder' },
    note: { icon: '📝', label: 'Note' },
};

const urgencyLabels: Record<string, string> = {
    high: '🔴 High',
    medium: '🟡 Medium',
    low: '🟢 Low',
    none: '⚪ None',
};

const confidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
};

export function ExtractionReview({
    items: initialItems,
    reasoning,
    onSaveAll,
    onCancel,
}: ExtractionReviewProps) {
    const [items, setItems] = useState<ExtractedItem[]>(initialItems);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(
        new Set(initialItems.map((_, i) => i))
    );

    const toggleItemSelection = (index: number) => {
        setSelectedItems((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const removeItem = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
        setSelectedItems((prev) => {
            const next = new Set(prev);
            next.delete(index);
            return next;
        });
    };

    const handleSave = () => {
        const selectedItemsArray = items.filter((_, i) => selectedItems.has(i));
        onSaveAll(selectedItemsArray);
    };

    const selectedCount = selectedItems.size;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
        >
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                }}
                className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-background-elevated shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-background-elevated/95 backdrop-blur-xl border-b border-glass-border p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="w-5 h-5 text-neon-purple" />
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-neon-purple via-neon-blue to-neon-pink bg-clip-text text-transparent">
                                    Found {items.length} {items.length === 1 ? 'item' : 'items'} in your note!
                                </h2>
                            </div>
                            <p className="text-sm text-gray-400">{reasoning}</p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Items List */}
                <div className="overflow-y-auto p-6 space-y-4 max-h-[calc(85vh-200px)]">
                    <AnimatePresence mode="popLayout">
                        {items.map((item, index) => (
                            <motion.div
                                key={`${item.title}-${index}`}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, x: -100 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 25,
                                }}
                            >
                                <GlassCard
                                    category={item.category}
                                    neonBorder={selectedItems.has(index)}
                                    className={cn(
                                        'cursor-pointer transition-all',
                                        !selectedItems.has(index) && 'opacity-50 grayscale'
                                    )}
                                    onClick={() => toggleItemSelection(index)}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Selection Checkbox */}
                                        <motion.div
                                            whileTap={{ scale: 0.9 }}
                                            className={cn(
                                                'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                                                selectedItems.has(index)
                                                    ? `border-category-${item.category} bg-category-${item.category}`
                                                    : 'border-gray-600'
                                            )}
                                        >
                                            {selectedItems.has(index) && (
                                                <CheckCircle2 className="w-4 h-4 text-white" />
                                            )}
                                        </motion.div>

                                        {/* Item Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Category & Confidence */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <PillBadge
                                                    label={`${categoryLabels[item.category].icon} ${categoryLabels[item.category].label}`}
                                                    category={item.category}
                                                    variant="filled"
                                                    size="sm"
                                                />
                                                <span className={cn('text-xs font-medium', confidenceColor(item.confidence))}>
                                                    {Math.round(item.confidence * 100)}% confident
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-lg font-semibold text-gray-100 mb-2">
                                                {item.title}
                                            </h3>

                                            {/* Tags */}
                                            {item.tags && item.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    {item.tags.map((tag, tagIndex) => (
                                                        <PillBadge
                                                            key={`${tag}-${tagIndex}`}
                                                            label={`#${tag}`}
                                                            category={item.category}
                                                            variant="glass"
                                                            size="sm"
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Urgency */}
                                            <div className="text-sm text-gray-400 mb-2">
                                                {urgencyLabels[item.urgency]}
                                            </div>

                                            {/* Raw Text */}
                                            <p className="text-sm text-gray-500 italic line-clamp-2">
                                                "{item.rawText}"
                                            </p>

                                            {/* Entities */}
                                            {item.entities && (
                                                <div className="mt-2 text-xs text-gray-500 space-y-1">
                                                    {item.entities.people && item.entities.people.length > 0 && (
                                                        <div>👤 {item.entities.people.join(', ')}</div>
                                                    )}
                                                    {item.entities.dates && item.entities.dates.length > 0 && (
                                                        <div>📅 {item.entities.dates.join(', ')}</div>
                                                    )}
                                                    {item.entities.projects && item.entities.projects.length > 0 && (
                                                        <div>📁 {item.entities.projects.join(', ')}</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newTitle = prompt('Edit title:', item.title);
                                                    if (newTitle && newTitle.trim()) {
                                                        setItems(prev => {
                                                            const next = [...prev];
                                                            next[index] = { ...next[index], title: newTitle.trim() };
                                                            return next;
                                                        });
                                                    }
                                                }}
                                                className="p-2 rounded-lg text-gray-400 hover:text-neon-blue hover:bg-neon-blue/10 transition-colors"
                                                aria-label="Edit item"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeItem(index);
                                                }}
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                                aria-label="Remove item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-background-elevated/95 backdrop-blur-xl border-t border-glass-border p-6">
                    <div className="flex gap-3">
                        <NeonButton
                            variant="outline"
                            category="note"
                            onClick={onCancel}
                            className="flex-1"
                        >
                            Cancel
                        </NeonButton>
                        <NeonButton
                            variant="gradient"
                            category="task"
                            glow
                            onClick={handleSave}
                            disabled={selectedCount === 0}
                            className="flex-1"
                        >
                            Save {selectedCount > 0 && `${selectedCount} ${selectedCount === 1 ? 'Item' : 'Items'}`}
                        </NeonButton>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
