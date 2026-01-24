import { motion } from 'framer-motion';
import { FolderOpen, Plus, ChevronRight } from 'lucide-react';
import { useItems } from '@/context/items-context';
import { GlassCard } from '@/components/ui/glass-card';
import { CategoryBadge } from '@/components/items/category-badge';
import { Link } from 'react-router-dom';

export function ProjectsPage() {
    const { projects, getItemsByProject } = useItems();

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-glass-border p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FolderOpen className="w-6 h-6 text-neon-blue" />
                        <h1 className="text-2xl font-bold text-gray-100">Projects</h1>
                    </div>
                    {projects.length > 0 && (
                        <span className="text-sm text-gray-400">{projects.length} active</span>
                    )}
                </div>
            </header>

            {/* Empty State */}
            {projects.length === 0 && (
                <div className="flex flex-col items-center justify-center px-6 pt-20">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-surface flex items-center justify-center mx-auto mb-6">
                            <FolderOpen className="w-12 h-12 text-gray-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-100 mb-2">No Projects Yet</h2>
                        <p className="text-gray-400 mb-6 max-w-sm">
                            AI will automatically detect recurring themes in your thoughts and suggest projects.
                        </p>
                        <Link to="/inbox">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg font-medium"
                            >
                                <Plus className="w-5 h-5 inline-block mr-2" />
                                Capture Some Thoughts
                            </motion.button>
                        </Link>
                    </motion.div>
                </div>
            )}

            {/* Projects Grid */}
            {projects.length > 0 && (
                <div className="p-4 space-y-4">
                    {projects.map((project) => {
                        const projectItems = getItemsByProject(project.id);
                        const categoryBreakdown = projectItems.reduce((acc, item) => {
                            acc[item.category] = (acc[item.category] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>);

                        return (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02 }}
                                transition={{ type: 'spring', damping: 20 }}
                            >
                                <GlassCard
                                    className="p-5 cursor-pointer"
                                    style={{
                                        borderColor: project.color,
                                        boxShadow: `0 0 20px ${project.color}20`,
                                    }}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="p-2.5 rounded-xl"
                                                style={{ backgroundColor: `${project.color}20` }}
                                            >
                                                <FolderOpen
                                                    className="w-5 h-5"
                                                    style={{ color: project.color }}
                                                />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">{project.name}</h3>
                                                <p className="text-xs text-gray-400">
                                                    {projectItems.length} items
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-500" />
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-gray-300 mb-4">{project.description}</p>

                                    {/* Category Breakdown */}
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(categoryBreakdown).map(([category, count]) => (
                                            <div key={category} className="flex items-center gap-1">
                                                <CategoryBadge
                                                    category={category as any}
                                                    showLabel
                                                    size="sm"
                                                />
                                                <span className="text-xs text-gray-500">({count})</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* AI Badge */}
                                    {project.suggestedByAI && (
                                        <div className="mt-3 pt-3 border-t border-gray-800">
                                            <p className="text-xs text-neon-purple flex items-center gap-1">
                                                <span>✨</span>
                                                AI-Suggested Project
                                            </p>
                                        </div>
                                    )}
                                </GlassCard>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
