import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X, Loader2, Inbox as InboxIcon } from 'lucide-react';
import { useItems } from '@/context/items-context';
import { useHaptic } from '@/hooks/use-haptic';
import { aiGroupingService } from '@/services/grouping-service';
import { NeonButton } from '@/components/ui/neon-button';
import { GlassCard } from '@/components/ui/glass-card';
import { CategoryBadge } from '@/components/items/category-badge';
import type { MindifyItem } from '@/types';
import type { ThoughtGroup, GroupingResult } from '@/types/grouping';
import { v4 as uuidv4 } from 'uuid';

type ProcessingState = 'idle' | 'analyzing' | 'reviewing';

export function InboxPage() {
    const { items, addItem, updateItem } = useItems();
    const haptic = useHaptic();

    const [state, setState] = useState<ProcessingState>('idle');
    const [groupingResult, setGroupingResult] = useState<GroupingResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Get all inbox items
    const inboxItems = items.filter(item => item.status === 'inbox');
    const hasInboxItems = inboxItems.length > 0;

    // Auto-run AI grouping when entering page if there are inbox items
    useEffect(() => {
        if (hasInboxItems && state === 'idle' && !groupingResult) {
            handleAnalyze();
        }
    }, [hasInboxItems]);

    const handleAnalyze = useCallback(async () => {
        setState('analyzing');
        setError(null);
        haptic.light();

        try {
            const result = await aiGroupingService.groupThoughts(inboxItems);
            setGroupingResult(result);
            setState('reviewing');
            haptic.success();
        } catch (err) {
            console.error('Grouping error:', err);
            setError('Failed to analyze thoughts. Please try again.');
            setState('idle');
        }
    }, [inboxItems, haptic]);

    const handleAcceptGroup = useCallback((group: ThoughtGroup) => {
        // Create new merged item
        const mergedItem: MindifyItem = {
            id: uuidv4(),
            rawInput: group.mergedContent,
            category: group.suggestedCategory,
            title: group.suggestedTitle,
            tags: [],
            entities: {},
            urgency: 'none',
            status: 'captured',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            synced: false,
            pendingAIProcessing: false,
        };

        // Add merged item
        addItem(mergedItem);

        // Archive original thoughts
        group.thoughts.forEach(thought => {
            updateItem(thought.id, { status: 'archived' });
        });

        haptic.success();
    }, [addItem, updateItem, haptic]);

    const handleRejectGroup = useCallback((group: ThoughtGroup) => {
        // Keep thoughts as separate items, just move them to 'captured'
        group.thoughts.forEach(thought => {
            updateItem(thought.id, { status: 'captured' });
        });

        haptic.light();
    }, [updateItem, haptic]);

    const handleKeepSeparate = useCallback((thought: MindifyItem) => {
        // Just mark as captured without merging
        updateItem(thought.id, { status: 'captured' });
        haptic.light();
    }, [updateItem, haptic]);

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-glass-border p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <InboxIcon className="w-6 h-6 text-neon-purple" />
                        <h1 className="text-2xl font-bold text-gray-100">Inbox</h1>
                    </div>
                    {hasInboxItems && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">{inboxItems.length} thoughts</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Empty State */}
            {!hasInboxItems && (
                <div className="flex flex-col items-center justify-center px-6 pt-20">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-surface flex items-center justify-center mx-auto mb-6">
                            <InboxIcon className="w-12 h-12 text-gray-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-100 mb-2">All caught up!</h2>
                        <p className="text-gray-400 mb-6">
                            Your inbox is empty. Record some thoughts to see them organized here.
                        </p>
                    </motion.div>
                </div>
            )}

            {/* Analyzing State */}
            {state === 'analyzing' && (
                <div className="flex flex-col items-center justify-center px-6 pt-20">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                    >
                        <Loader2 className="w-12 h-12 text-neon-purple mx-auto mb-4 animate-spin" />
                        <p className="text-gray-400">Analyzing your thoughts...</p>
                    </motion.div>
                </div>
            )}

            {/* Results */}
            {state === 'reviewing' && groupingResult && (
                <div className="px-4 py-6 space-y-6">
                    {/* Summary */}
                    <GlassCard className="p-4">
                        <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-neon-purple mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-gray-100 mb-1">AI Analysis Complete</h3>
                                <p className="text-sm text-gray-400">{groupingResult.summary}</p>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Grouped Thoughts */}
                    {groupingResult.groups.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider px-2">
                                Grouped Thoughts ({groupingResult.groups.length})
                            </h2>

                            <AnimatePresence>
                                {groupingResult.groups.map((group) => (
                                    <motion.div
                                        key={group.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -100 }}
                                    >
                                        <GlassCard className="p-4 space-y-4">
                                            {/* Original Thoughts */}
                                            <div className="space-y-2">
                                                <p className="text-xs text-gray-500 uppercase tracking-wider">Original Thoughts:</p>
                                                {group.thoughts.map(thought => (
                                                    <div key={thought.id} className="text-sm text-gray-400 pl-3 border-l-2 border-gray-700">
                                                        "{thought.rawInput}"
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Merged Version */}
                                            <div className="space-y-2 pt-2 border-t border-glass-border">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-gray-500 uppercase tracking-wider">AI Merged:</p>
                                                    <CategoryBadge category={group.suggestedCategory} showLabel size="sm" />
                                                </div>
                                                <p className="text-gray-100 font-medium">"{group.mergedContent}"</p>
                                                <p className="text-xs text-gray-500">{group.reasoning}</p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 pt-2">
                                                <NeonButton
                                                    onClick={() => handleAcceptGroup(group)}
                                                    category={group.suggestedCategory}
                                                    variant="gradient"
                                                    glow
                                                    size="sm"
                                                    className="flex-1"
                                                >
                                                    <Check className="w-4 h-4 mr-1" />
                                                    Accept Merge
                                                </NeonButton>
                                                <NeonButton
                                                    onClick={() => handleRejectGroup(group)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                >
                                                    <X className="w-4 h-4 mr-1" />
                                                    Keep Separate
                                                </NeonButton>
                                            </div>
                                        </GlassCard>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Ungrouped Thoughts */}
                    {groupingResult.ungrouped.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider px-2">
                                Individual Thoughts ({groupingResult.ungrouped.length})
                            </h2>

                            {groupingResult.ungrouped.map((thought) => (
                                <GlassCard key={thought.id} className="p-4">
                                    <p className="text-gray-100 mb-3">"{thought.rawInput}"</p>
                                    <NeonButton
                                        onClick={() => handleKeepSeparate(thought)}
                                        variant="outline"
                                        size="sm"
                                        category="task"
                                    >
                                        <Check className="w-4 h-4 mr-1" />
                                        Keep as-is
                                    </NeonButton>
                                </GlassCard>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="px-4 py-6">
                    <GlassCard className="p-4 bg-red-500/10 border-red-500/30">
                        <p className="text-red-400 text-sm">{error}</p>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
