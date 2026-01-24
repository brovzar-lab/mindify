import { motion, AnimatePresence } from 'framer-motion';
import { X, Merge, Loader2 } from 'lucide-react';
import type { MindifyItem } from '@/types';
import type { MergePreview } from '@/types/project';
import { PillBadge } from '@/components/ui/pill-badge';
import { NeonButton } from '@/components/ui/neon-button';

interface MergePreviewModalProps {
    isOpen: boolean;
    item1: MindifyItem;
    item2: MindifyItem;
    preview: MergePreview | null;
    isLoading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function MergePreviewModal({
    isOpen,
    item1,
    item2,
    preview,
    isLoading,
    onConfirm,
    onCancel,
}: MergePreviewModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                        onClick={onCancel}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-gray-900/95 backdrop-blur-xl border border-neon-purple/30 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                            {/* Header */}
                            <div className="p-6 border-b border-gray-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-neon-purple/20 rounded-lg">
                                            <Merge className="w-5 h-5 text-neon-purple" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white">Merge Preview</h2>
                                    </div>
                                    <button
                                        onClick={onCancel}
                                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                {/* Original Items */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-gray-400">Merging these items:</p>
                                    <div className="space-y-2">
                                        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                            <p className="text-sm text-white font-medium">{item1.title}</p>
                                            <p className="text-xs text-gray-400 mt-1">{item1.rawInput}</p>
                                        </div>
                                        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                            <p className="text-sm text-white font-medium">{item2.title}</p>
                                            <p className="text-xs text-gray-400 mt-1">{item2.rawInput}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Loading State */}
                                {isLoading && (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
                                        <p className="ml-3 text-gray-400">AI is analyzing the merge...</p>
                                    </div>
                                )}

                                {/* AI Preview */}
                                {!isLoading && preview && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gradient-to-br from-neon-purple/10 to-neon-blue/10 rounded-xl border border-neon-purple/30">
                                            <p className="text-sm font-medium text-neon-purple mb-2">Suggested Result:</p>
                                            <h3 className="text-lg font-bold text-white mb-2">{preview.mergedTitle}</h3>
                                            <p className="text-sm text-gray-300 mb-3">{preview.mergedRawInput}</p>

                                            {/* Tags */}
                                            {preview.mergedTags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {preview.mergedTags.map((tag, index) => (
                                                        <PillBadge key={index} label={tag} variant="neon" />
                                                    ))}
                                                </div>
                                            )}

                                            {/* AI Reasoning */}
                                            <div className="p-3 bg-black/30 rounded-lg">
                                                <p className="text-xs text-gray-400 italic">{preview.reasoning}</p>
                                            </div>

                                            {/* Confidence */}
                                            <div className="mt-3 flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${preview.confidence * 100}%` }}
                                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                                        className="h-full bg-gradient-to-r from-neon-green to-neon-blue"
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-400 font-mono">
                                                    {Math.round(preview.confidence * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-gray-800 flex gap-3">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <NeonButton
                                    onClick={onConfirm}
                                    disabled={isLoading || !preview}
                                    className="flex-1"
                                    variant="gradient"
                                >
                                    Confirm Merge
                                </NeonButton>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
