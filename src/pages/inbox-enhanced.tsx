import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X, Loader2, Inbox as InboxIcon, Tag, FolderPlus } from 'lucide-react';
import { useItems } from '@/context/items-context';
import { useHaptic } from '@/hooks/use-haptic';
import { aiGroupingService } from '@/services/grouping-service';
import { projectService } from '@/services/project-service';
import { NeonButton } from '@/components/ui/neon-button';
import { GlassCard } from '@/components/ui/glass-card';
import { CategoryBadge } from '@/components/items/category-badge';
import { PillBadge } from '@/components/ui/pill-badge';
import { MergePreviewModal } from '@/components/modals/merge-preview-modal';
import { ProjectSuggestionCard } from '@/components/projects/project-suggestion-card';
import type { MindifyItem } from '@/types';
import type { ThoughtGroup, GroupingResult } from '@/types/grouping';
import type { MergePreview, ProjectSuggestion } from '@/types/project';
import { v4 as uuidv4 } from 'uuid';

type ProcessingState = 'idle' | 'analyzing' | 'reviewing' | 'detecting-projects';

export function InboxPageEnhanced() {
    const { items, addItem, updateItem, addProject } = useItems();
    const haptic = useHaptic();

    const [state, setState] = useState<ProcessingState>('idle');
    const [groupingResult, setGroupingResult] = useState<GroupingResult | null>(null);
    const [projectSuggestions, setProjectSuggestions] = useState<ProjectSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Manual merge state
    const [draggedItem, setDraggedItem] = useState<MindifyItem | null>(null);
    const [dropTarget, setDropTarget] = useState<MindifyItem | null>(null);
    const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

    // AI-suggested tags state
    const [itemTags, setItemTags] = useState<Map<string, string[]>>(new Map());

    // Get all inbox items
    const inboxItems = items.filter(item => item.status === 'inbox');
    const hasInboxItems = inboxItems.length > 0;

    // Auto-run AI analysis when entering page
    useEffect(() => {
        if (hasInboxItems && state === 'idle' && !groupingResult) {
            handleAnalyze();
        }
    }, [hasInboxItems]);

    // Auto-detect projects after grouping
    useEffect(() => {
        if (state === 'reviewing' && items.length >= 5) {
            handleDetectProjects();
        }
    }, [state]);

    const handleAnalyze = useCallback(async () => {
        setState('analyzing');
        setError(null);
        haptic.light();

        try {
            const result = await aiGroupingService.groupThoughts(inboxItems);
            setGroupingResult(result);

            // Generate AI tags for ungrouped items
            const tagsMap = new Map<string, string[]>();
            await Promise.all(
                result.ungrouped.map(async (item) => {
                    const suggestedTags = await projectService.suggestTags(item);
                    if (suggestedTags.length > 0) {
                        tagsMap.set(item.id, suggestedTags);
                    }
                })
            );
            setItemTags(tagsMap);

            setState('reviewing');
            haptic.success();
        } catch (err) {
            console.error('Grouping error:', err);
            setError('Failed to analyze thoughts. Please try again.');
            setState('idle');
        }
    }, [inboxItems, haptic]);

    const handleDetectProjects = useCallback(async () => {
        setState('detecting-projects');
        try {
            const detectionResult = await projectService.detectProjects(items);
            setProjectSuggestions(detectionResult.suggestions);
        } catch (err) {
            console.error('Project detection error:', err);
        } finally {
            setState('reviewing');
        }
    }, [items]);

    const handleAcceptGroup = useCallback((group: ThoughtGroup) => {
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

        addItem(mergedItem);
        group.thoughts.forEach(thought => {
            updateItem(thought.id, { status: 'archived' });
        });
        haptic.success();
    }, [addItem, updateItem, haptic]);

    const handleRejectGroup = useCallback((group: ThoughtGroup) => {
        group.thoughts.forEach(thought => {
            updateItem(thought.id, { status: 'captured' });
        });
        haptic.light();
    }, [updateItem, haptic]);

    const handleKeepSeparate = useCallback((thought: MindifyItem, suggestedTags?: string[]) => {
        updateItem(thought.id, {
            status: 'captured',
            tags: suggestedTags || thought.tags
        });
        haptic.light();
    }, [updateItem, haptic]);

    // ========== DRAG-AND-DROP MANUAL MERGE ==========

    const handleDragStart = useCallback((item: MindifyItem) => {
        setDraggedItem(item);
        haptic.light();
    }, [haptic]);

    const handleDragOver = useCallback((e: React.DragEvent, item: MindifyItem) => {
        e.preventDefault();
        if (draggedItem && draggedItem.id !== item.id) {
            setDropTarget(item);
        }
    }, [draggedItem]);

    const handleDragLeave = useCallback(() => {
        setDropTarget(null);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent, targetItem: MindifyItem) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.id === targetItem.id) return;

        setIsGeneratingPreview(true);
        setIsMergeModalOpen(true);

        try {
            const preview = await projectService.generateMergePreview(draggedItem, targetItem);
            setMergePreview(preview);
        } catch (err) {
            console.error('Merge preview error:', err);
            setError('Failed to generate merge preview');
            setIsMergeModalOpen(false);
        } finally {
            setIsGeneratingPreview(false);
        }

        setDropTarget(null);
    }, [draggedItem]);

    const handleConfirmMerge = useCallback(() => {
        if (!draggedItem || !dropTarget || !mergePreview) return;

        const mergedItem: MindifyItem = {
            id: uuidv4(),
            rawInput: mergePreview.mergedRawInput,
            category: mergePreview.suggestedCategory as any,
            title: mergePreview.mergedTitle,
            tags: mergePreview.mergedTags,
            entities: {},
            urgency: 'none',
            status: 'captured',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            synced: false,
            pendingAIProcessing: false,
        };

        addItem(mergedItem);
        updateItem(draggedItem.id, { status: 'archived' });
        updateItem(dropTarget.id, { status: 'archived' });

        setIsMergeModalOpen(false);
        setDraggedItem(null);
        setMergePreview(null);
        haptic.success();
    }, [draggedItem, dropTarget, mergePreview, addItem, updateItem, haptic]);

    const handleCancelMerge = useCallback(() => {
        setIsMergeModalOpen(false);
        setDraggedItem(null);
        setDropTarget(null);
        setMergePreview(null);
    }, []);

    // ========== PROJECT SUGGESTIONS ==========

    const handleApproveProject = useCallback((suggestion: ProjectSuggestion) => {
        const newProject = {
            id: uuidv4(),
            name: suggestion.projectName,
            description: suggestion.description,
            color: suggestion.suggestedColor,
            itemIds: suggestion.relatedItemIds,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            suggestedByAI: true,
            userApproved: true,
        };

        addProject(newProject);
        setProjectSuggestions(prev => prev.filter(s => s.projectName !== suggestion.projectName));
        haptic.success();
    }, [addProject, haptic]);

    const handleDismissProject = useCallback((suggestion: ProjectSuggestion) => {
        setProjectSuggestions(prev => prev.filter(s => s.projectName !== suggestion.projectName));
        haptic.light();
    }, [haptic]);

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
            {(state === 'analyzing' || state === 'detecting-projects') && (
                <div className="flex flex-col items-center justify-center px-6 pt-20">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                    >
                        <Loader2 className="w-12 h-12 text-neon-purple mx-auto mb-4 animate-spin" />
                        <p className="text-gray-400">
                            {state === 'analyzing' ? 'Analyzing your thoughts...' : 'Detecting projects...'}
                        </p>
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

                    {/* Project Suggestions */}
                    {projectSuggestions.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <FolderPlus className="w-5 h-5 text-neon-blue" />
                                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                                    AI Project Suggestions ({projectSuggestions.length})
                                </h2>
                            </div>

                            <AnimatePresence>
                                {projectSuggestions.map((suggestion) => (
                                    <ProjectSuggestionCard
                                        key={suggestion.projectName}
                                        suggestion={suggestion}
                                        itemsCount={suggestion.relatedItemIds.length}
                                        onApprove={() => handleApproveProject(suggestion)}
                                        onDismiss={() => handleDismissProject(suggestion)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Grouped Thoughts (with Accept Merge) */}
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
                                            <div className="space-y-2">
                                                <p className="text-xs text-gray-500 uppercase tracking-wider">Original Thoughts:</p>
                                                {group.thoughts.map(thought => (
                                                    <div key={thought.id} className="text-sm text-gray-400 pl-3 border-l-2 border-gray-700">
                                                        "{thought.rawInput}"
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-2 pt-2 border-t border-glass-border">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-gray-500 uppercase tracking-wider">AI Merged:</p>
                                                    <CategoryBadge category={group.suggestedCategory} showLabel size="sm" />
                                                </div>
                                                <p className="text-gray-100 font-medium">"{group.mergedContent}"</p>
                                                <p className="text-xs text-gray-500">{group.reasoning}</p>
                                            </div>

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

                    {/* Individual Thoughts (Drag-and-Drop + AI Tags) */}
                    {groupingResult.ungrouped.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Tag className="w-5 h-5 text-neon-green" />
                                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                                    Individual Thoughts ({groupingResult.ungrouped.length})
                                </h2>
                            </div>
                            <p className="text-xs text-gray-400">💡 Drag one thought onto another to merge them</p>

                            {groupingResult.ungrouped.map((thought) => {
                                const suggestedTags = itemTags.get(thought.id) || [];
                                const isDragTarget = dropTarget?.id === thought.id;

                                return (
                                    <GlassCard
                                        key={thought.id}
                                        className={`p-4 cursor-grab active:cursor-grabbing transition-all ${isDragTarget ? 'ring-2 ring-neon-blue shadow-lg shadow-neon-blue/50 scale-105' : ''
                                            }`}
                                        draggable
                                        onDragStart={() => handleDragStart(thought)}
                                        onDragOver={(e) => handleDragOver(e, thought)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, thought)}
                                    >
                                        <p className="text-gray-100 mb-3">"{thought.rawInput}"</p>

                                        {/* AI-Suggested Tags */}
                                        {suggestedTags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {suggestedTags.map((tag, idx) => (
                                                    <PillBadge key={idx} label={tag} variant="neon" size="sm" />
                                                ))}
                                            </div>
                                        )}

                                        <NeonButton
                                            onClick={() => handleKeepSeparate(thought, suggestedTags)}
                                            variant="outline"
                                            size="sm"
                                            category="task"
                                        >
                                            <Check className="w-4 h-4 mr-1" />
                                            {suggestedTags.length > 0 ? 'Keep with Tags' : 'Keep as-is'}
                                        </NeonButton>
                                    </GlassCard>
                                );
                            })}
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

            {/* Manual Merge Preview Modal */}
            {draggedItem && dropTarget && (
                <MergePreviewModal
                    isOpen={isMergeModalOpen}
                    item1={draggedItem}
                    item2={dropTarget}
                    preview={mergePreview}
                    isLoading={isGeneratingPreview}
                    onConfirm={handleConfirmMerge}
                    onCancel={handleCancelMerge}
                />
            )}
        </div>
    );
}
