import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ListChecks,
    ChevronLeft,
    ShoppingCart,
    Phone,
    Lightbulb,
    Zap,
    Flame,
    MoreHorizontal,
    CheckCheck,
} from 'lucide-react';
import { useItems } from '@/context/items-context';
import { useHaptic } from '@/hooks/use-haptic';
import { CheckableTaskCard } from '@/components/action-list/checkable-task-card';
import { cn } from '@/lib/cn';
import type { MindifyItem } from '@/types';

interface GroupedItems {
    shopping: MindifyItem[];
    calls: MindifyItem[];
    ideas: MindifyItem[];
    quickWins: MindifyItem[];
    urgent: MindifyItem[];
    other: MindifyItem[];
}

export function ActionListPage() {
    const { items, updateItem, deleteItem } = useItems();
    const haptic = useHaptic();
    const [recentCompletions, setRecentCompletions] = useState<string[]>([]);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(['shopping', 'calls', 'urgent', 'quickWins'])
    );

    // Filter to actionable items (tasks and reminders not archived)
    const actionableItems = useMemo(
        () =>
            items.filter(
                (item) =>
                    (item.category === 'task' || item.category === 'reminder') &&
                    item.status !== 'acted' &&
                    item.status !== 'archived'
            ),
        [items]
    );

    // Smart grouping logic
    const groupedItems = useMemo<GroupedItems>(() => {
        const groups: GroupedItems = {
            shopping: [],
            calls: [],
            ideas: [],
            quickWins: [],
            urgent: [],
            other: [],
        };

        actionableItems.forEach((item) => {
            // HIGH PRIORITY: Urgent items
            if (item.urgency === 'high') {
                groups.urgent.push(item);
                return;
            }

            // Ideas (for reference, not actionable in this view)
            if (item.category === 'idea') {
                groups.ideas.push(item);
                return;
            }

            // Shopping detection
            const lowerTitle = item.title.toLowerCase();
            const lowerRaw = item.rawInput.toLowerCase();
            const shoppingKeywords = [
                'buy',
                'get',
                'pick up',
                'purchase',
                'groceries',
                'grocery',
                'shopping',
                'store',
                'market',
            ];
            if (
                shoppingKeywords.some(
                    (keyword) => lowerTitle.includes(keyword) || lowerRaw.includes(keyword)
                )
            ) {
                groups.shopping.push(item);
                return;
            }

            // Calls & Messages detection
            const callKeywords = ['call', 'text', 'email', 'message', 'reach out', 'contact'];
            if (
                callKeywords.some((keyword) => lowerTitle.includes(keyword) || lowerRaw.includes(keyword))
            ) {
                groups.calls.push(item);
                return;
            }

            // Quick wins (short titles, likely < 5 min tasks)
            if (item.title.length < 30 && !item.scheduledNotification) {
                groups.quickWins.push(item);
                return;
            }

            // Everything else
            groups.other.push(item);
        });

        return groups;
    }, [actionableItems]);

    // Count total items
    const totalCount = useMemo(
        () =>
            Object.values(groupedItems).reduce((sum, group) => sum + group.length, 0) -
            groupedItems.ideas.length, // Don't count ideas in total
        [groupedItems]
    );

    const handleComplete = useCallback(
        (itemId: string) => {
            updateItem(itemId, { status: 'acted' });
            setRecentCompletions((prev) => [itemId, ...prev.slice(0, 9)]); // Keep last 10
            haptic.success();
        },
        [updateItem, haptic]
    );

    const handleDelete = useCallback(
        (itemId: string) => {
            deleteItem(itemId);
            haptic.medium();
        },
        [deleteItem, haptic]
    );

    const handleUndo = useCallback(
        (itemId: string) => {
            updateItem(itemId, { status: 'inbox' });
            setRecentCompletions((prev) => prev.filter((id) => id !== itemId));
            haptic.light();
        },
        [updateItem, haptic]
    );

    const toggleSection = useCallback((sectionId: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    }, []);

    const completeAllInSection = useCallback(
        (sectionItems: MindifyItem[]) => {
            sectionItems.forEach((item) => {
                updateItem(item.id, { status: 'acted' });
            });
            haptic.success();
        },
        [updateItem, haptic]
    );

    // Section component
    const Section = ({
        id,
        title,
        icon: Icon,
        items,
        color,
        canBatchComplete = false,
    }: {
        id: string;
        title: string;
        icon: React.ElementType;
        items: MindifyItem[];
        color: string;
        canBatchComplete?: boolean;
    }) => {
        const isExpanded = expandedSections.has(id);
        const isEmpty = items.length === 0;

        if (isEmpty) return null;

        return (
            <div className="mb-6">
                <button
                    onClick={() => toggleSection(id)}
                    className="w-full flex items-center justify-between mb-3 px-2 py-1 rounded-lg hover:bg-surface-elevated transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Icon className={cn('w-5 h-5', color)} />
                        <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-surface-elevated text-xs font-medium text-gray-400">
                            {items.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {canBatchComplete && isExpanded && items.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    completeAllInSection(items);
                                }}
                                className="px-3 py-1 rounded-lg bg-neon-green/20 text-neon-green text-xs font-medium hover:bg-neon-green/30 transition-colors flex items-center gap-1"
                            >
                                <CheckCheck className="w-3 h-3" />
                                All Done
                            </button>
                        )}
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-500 -rotate-90" />
                        </motion.div>
                    </div>
                </button>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            {items.map((item) => (
                                <CheckableTaskCard
                                    key={item.id}
                                    item={item}
                                    onComplete={handleComplete}
                                    onDelete={handleDelete}
                                    onUndo={recentCompletions.includes(item.id) ? handleUndo : undefined}
                                    showCategory={false}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3 pt-safe">
                <div className="flex items-center justify-between mb-2">
                    <Link to="/">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-full hover:bg-surface transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 text-gray-400" />
                        </motion.button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <ListChecks className="w-6 h-6 text-neon-purple" />
                        <h1 className="text-xl font-bold text-gray-100">Action List</h1>
                    </div>
                    <div className="w-10" /> {/* Spacer for alignment */}
                </div>

                {/* Stats bar */}
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-gray-500">
                        {totalCount} {totalCount === 1 ? 'item' : 'items'} to do
                    </p>
                    {recentCompletions.length > 0 && (
                        <button
                            onClick={() => {
                                recentCompletions.forEach((id) => handleUndo(id));
                                setRecentCompletions([]);
                            }}
                            className="text-xs text-neon-blue hover:underline"
                        >
                            Undo last {recentCompletions.length}
                        </button>
                    )}
                </div>
            </header>

            {/* Main content */}
            <main className="px-4 pt-4">
                {totalCount === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <CheckCheck className="w-16 h-16 text-neon-green mx-auto mb-4 opacity-50" />
                        <h2 className="text-xl font-semibold text-gray-300 mb-2">All Clear!</h2>
                        <p className="text-gray-500">No action items right now. Nice work! 🎉</p>
                    </motion.div>
                ) : (
                    <>
                        {/* URGENT section - always first */}
                        <Section
                            id="urgent"
                            title="🔥 Urgent & Important"
                            icon={Flame}
                            items={groupedItems.urgent}
                            color="text-red-500"
                            canBatchComplete
                        />

                        {/* SHOPPING section */}
                        <Section
                            id="shopping"
                            title="Shopping List"
                            icon={ShoppingCart}
                            items={groupedItems.shopping}
                            color="text-neon-blue"
                            canBatchComplete
                        />

                        {/* CALLS section */}
                        <Section
                            id="calls"
                            title="Calls & Messages"
                            icon={Phone}
                            items={groupedItems.calls}
                            color="text-neon-pink"
                            canBatchComplete
                        />

                        {/* QUICK WINS section */}
                        <Section
                            id="quickWins"
                            title="Quick Wins"
                            icon={Zap}
                            items={groupedItems.quickWins}
                            color="text-neon-green"
                        />

                        {/* IDEAS section (for reference) */}
                        {groupedItems.ideas.length > 0 && (
                            <Section
                                id="ideas"
                                title="Ideas to Explore"
                                icon={Lightbulb}
                                items={groupedItems.ideas}
                                color="text-yellow-500"
                            />
                        )}

                        {/* OTHER section */}
                        <Section
                            id="other"
                            title="Everything Else"
                            icon={MoreHorizontal}
                            items={groupedItems.other}
                            color="text-gray-500"
                        />
                    </>
                )}
            </main>
        </div>
    );
}
