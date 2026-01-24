import { motion } from 'framer-motion';
import { FolderOpen, Sparkles, Check, X } from 'lucide-react';
import type { ProjectSuggestion } from '@/types/project';

interface ProjectSuggestionCardProps {
    suggestion: ProjectSuggestion;
    itemsCount: number;
    onApprove: () => void;
    onDismiss: () => void;
}

export function ProjectSuggestionCard({
    suggestion,
    itemsCount,
    onApprove,
    onDismiss,
}: ProjectSuggestionCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="p-5 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-lg"
            style={{
                borderColor: suggestion.suggestedColor,
                borderWidth: '1px',
                boxShadow: `0 0 20px ${suggestion.suggestedColor}20`,
            }}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className="p-2.5 rounded-xl"
                        style={{
                            backgroundColor: `${suggestion.suggestedColor}20`,
                        }}
                    >
                        <FolderOpen
                            className="w-5 h-5"
                            style={{ color: suggestion.suggestedColor }}
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white">{suggestion.projectName}</h3>
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {itemsCount} items found
                        </p>
                    </div>
                </div>

                {/* Confidence Badge */}
                <div className="px-2.5 py-1 bg-neon-green/20 rounded-full">
                    <span className="text-xs font-mono text-neon-green">
                        {Math.round(suggestion.confidence * 100)}%
                    </span>
                </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-300 mb-3">{suggestion.description}</p>

            {/* AI Reasoning */}
            <div className="p-3 bg-black/30 rounded-lg mb-4">
                <p className="text-xs text-gray-400 italic">{suggestion.reasoning}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onApprove}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-neon-green to-neon-blue text-white font-medium rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-shadow"
                    style={{
                        boxShadow: `0 0 20px ${suggestion.suggestedColor}40`,
                    }}
                >
                    <Check className="w-4 h-4" />
                    Create Project
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onDismiss}
                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <X className="w-4 h-4" />
                    Dismiss
                </motion.button>
            </div>
        </motion.div>
    );
}
