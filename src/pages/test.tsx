import { useState } from 'react';
import { ExtractionReview } from '@/components/capture/extraction-review';
import { NeonButton } from '@/components/ui/neon-button';
import type { ExtractedItem, MultiItemExtractionResponse } from '@/types';

// Mock data for testing ExtractionReview
const mockExtraction1: MultiItemExtractionResponse = {
    items: [
        {
            category: 'reminder' as const,
            title: 'Call mom',
            tags: ['family', 'phone', 'urgent'],
            urgency: 'medium' as const,
            confidence: 0.95,
            rawText: 'Remind me to call mom at 3pm',
            entities: {
                people: ['mom'],
                dates: ['3pm today'],
                projects: [],
                locations: [],
            },
        },
        {
            category: 'idea' as const,
            title: 'New app feature concept',
            tags: ['app', 'development', 'innovation'],
            urgency: 'low' as const,
            confidence: 0.9,
            rawText: 'I have an idea for a new app feature that uses AI',
            entities: {
                people: [],
                dates: [],
                projects: ['MINDIFY'],
                locations: [],
            },
        },
        {
            category: 'task' as const,
            title: 'Buy groceries',
            tags: ['shopping', 'errands', 'home'],
            urgency: 'medium' as const,
            confidence: 0.95,
            rawText: 'I need to buy groceries after work',
            entities: {
                people: [],
                dates: ['after work'],
                projects: [],
                locations: ['grocery store'],
            },
        },
    ],
    reasoning: 'Detected 3 distinct items: 1 time-bound reminder, 1 creative idea, 1 actionable task',
};

const mockExtraction2: MultiItemExtractionResponse = {
    items: [
        {
            category: 'task' as const,
            title: 'Finish project presentation',
            tags: ['work', 'deadline', 'urgent'],
            urgency: 'high' as const,
            confidence: 0.98,
            rawText: 'Need to finish the project presentation by Friday',
            entities: {
                people: [],
                dates: ['Friday'],
                projects: ['Q1 Presentation'],
                locations: [],
            },
        },
    ],
    reasoning: 'Detected 1 high-priority work task with clear deadline',
};

export function TestPage() {
    const [showModal, setShowModal] = useState(false);
    const [currentMock, setCurrentMock] = useState(mockExtraction1);
    const [savedItems, setSavedItems] = useState<ExtractedItem[]>([]);

    const handleSave = (items: ExtractedItem[]) => {
        console.log('Saved items:', items);
        setSavedItems(items);
        setShowModal(false);
    };

    const handleCancel = () => {
        setShowModal(false);
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-purple via-neon-blue to-neon-pink bg-clip-text text-transparent mb-8">
                    MINDIFY V2.0 Test Page
                </h1>

                <div className="space-y-6">
                    {/* Test Controls */}
                    <div className="bg-surface-elevated rounded-2xl p-6 border border-glass-border">
                        <h2 className="text-xl font-semibold text-gray-200 mb-4">Test ExtractionReview Modal</h2>
                        <div className="flex gap-4">
                            <NeonButton
                                category="task"
                                glow
                                onClick={() => {
                                    setCurrentMock(mockExtraction1);
                                    setShowModal(true);
                                }}
                            >
                                Test Multi-Item (3 items)
                            </NeonButton>
                            <NeonButton
                                category="idea"
                                glow
                                onClick={() => {
                                    setCurrentMock(mockExtraction2);
                                    setShowModal(true);
                                }}
                            >
                                Test Single Item
                            </NeonButton>
                        </div>
                    </div>

                    {/* Saved Items Display */}
                    {savedItems.length > 0 && (
                        <div className="bg-surface-elevated rounded-2xl p-6 border border-glass-border">
                            <h2 className="text-xl font-semibold text-gray-200 mb-4">
                                Last Saved Items ({savedItems.length})
                            </h2>
                            <div className="space-y-3">
                                {savedItems.map((item, index) => (
                                    <div
                                        key={index}
                                        className="bg-surface rounded-lg p-4 border-l-4"
                                        style={{
                                            borderLeftColor:
                                                item.category === 'idea' ? '#B026FF' :
                                                    item.category === 'task' ? '#00F0FF' :
                                                        item.category === 'reminder' ? '#FF2E97' :
                                                            '#00FF94'
                                        }}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-medium text-gray-500 uppercase">
                                                        {item.category}
                                                    </span>
                                                    <span className="text-xs text-gray-600">
                                                        {Math.round(item.confidence * 100)}% confident
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-100">{item.title}</h3>
                                                <p className="text-sm text-gray-400 italic mt-1">"{item.rawText}"</p>
                                                {item.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {item.tags.map((tag, tagIndex) => (
                                                            <span
                                                                key={tagIndex}
                                                                className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400"
                                                            >
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded ${item.urgency === 'high' ? 'bg-red-500/20 text-red-400' :
                                                item.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {item.urgency}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Design System Showcase */}
                    <div className="bg-surface-elevated rounded-2xl p-6 border border-glass-border">
                        <h2 className="text-xl font-semibold text-gray-200 mb-4">Design System Showcase</h2>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-2">Category Colors</h3>
                                <div className="flex gap-2">
                                    <div className="flex-1 h-12 rounded-lg bg-gradient-to-r from-category-idea to-category-idea-dark flex items-center justify-center text-white font-medium">
                                        Idea
                                    </div>
                                    <div className="flex-1 h-12 rounded-lg bg-gradient-to-r from-category-task to-category-task-dark flex items-center justify-center text-white font-medium">
                                        Task
                                    </div>
                                    <div className="flex-1 h-12 rounded-lg bg-gradient-to-r from-category-reminder to-category-reminder-dark flex items-center justify-center text-white font-medium">
                                        Reminder
                                    </div>
                                    <div className="flex-1 h-12 rounded-lg bg-gradient-to-r from-category-note to-category-note-dark flex items-center justify-center text-gray-900 font-medium">
                                        Note
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-2">Neon Accents</h3>
                                <div className="flex gap-2">
                                    <div className="w-16 h-16 rounded-full bg-neon-blue shadow-[0_0_20px_#00F0FF]" />
                                    <div className="w-16 h-16 rounded-full bg-neon-purple shadow-[0_0_20px_#B026FF]" />
                                    <div className="w-16 h-16 rounded-full bg-neon-pink shadow-[0_0_20px_#FF2E97]" />
                                    <div className="w-16 h-16 rounded-full bg-neon-green shadow-[0_0_20px_#00FF94]" />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-2">Button Variants</h3>
                                <div className="flex gap-2">
                                    <NeonButton category="task" variant="gradient" glow size="md">
                                        Gradient
                                    </NeonButton>
                                    <NeonButton category="idea" variant="outline" size="md">
                                        Outline
                                    </NeonButton>
                                    <NeonButton category="reminder" variant="ghost" size="md">
                                        Ghost
                                    </NeonButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ExtractionReview Modal */}
            {showModal && (
                <ExtractionReview
                    items={currentMock.items}
                    reasoning={currentMock.reasoning}
                    onSaveAll={handleSave}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
}
