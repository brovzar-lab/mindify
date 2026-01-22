import { motion } from 'framer-motion';
import { Calendar, Clock, X } from 'lucide-react';
import { useState } from 'react';
import { NeonButton } from '@/components/ui/neon-button';
import { GlassCard } from '@/components/ui/glass-card';
import type { MindifyItem } from '@/types';

interface ScheduleReminderSheetProps {
    item: MindifyItem;
    onSchedule: (time: Date) => void;
    onCancel: () => void;
    suggestedTime?: Date;
    extractedPhrase?: string;
}

const quickOptions = [
    { label: '⚡ 5 min', minutes: 5 },
    { label: '⏰ 15 min', minutes: 15 },
    { label: '🕐 1 hour', minutes: 60 },
    { label: '🕒 3 hours', minutes: 180 },
];

export function ScheduleReminderSheet({
    item,
    onSchedule,
    onCancel,
    suggestedTime,
    extractedPhrase,
}: ScheduleReminderSheetProps) {
    const [customDate, setCustomDate] = useState('');
    const [customTime, setCustomTime] = useState('');

    const handleQuickSchedule = (minutes: number) => {
        const scheduledTime = new Date(Date.now() + minutes * 60 * 1000);
        onSchedule(scheduledTime);
    };

    const handleTomorrow9am = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        onSchedule(tomorrow);
    };

    const handleCustomSchedule = () => {
        if (!customDate || !customTime) return;

        const [hours, minutes] = customTime.split(':').map(Number);
        const scheduledTime = new Date(customDate);
        scheduledTime.setHours(hours, minutes, 0, 0);

        onSchedule(scheduledTime);
    };

    const handleSuggestedTime = () => {
        if (suggestedTime) {
            onSchedule(suggestedTime);
        }
    };

    const formatTime = (date: Date): string => {
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

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
                className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-background-elevated shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-glass-border">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-100 mb-2">Schedule Reminder</h3>
                        <p className="text-sm text-gray-400 line-clamp-2">{item.title}</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* AI Suggestion */}
                    {suggestedTime && extractedPhrase && (
                        <GlassCard category={item.category} neonBorder className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="text-2xl">💡</div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-300 mb-2">
                                        Detected time reference: <span className="font-semibold text-neon-blue">"{extractedPhrase}"</span>
                                    </p>
                                    <NeonButton
                                        variant="gradient"
                                        category={item.category}
                                        size="sm"
                                        glow
                                        onClick={handleSuggestedTime}
                                    >
                                        <Clock className="w-4 h-4 mr-2" />
                                        {formatTime(suggestedTime)}
                                    </NeonButton>
                                </div>
                            </div>
                        </GlassCard>
                    )}

                    {/* Quick Options */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-3">Quick Schedule</label>
                        <div className="grid grid-cols-2 gap-2">
                            {quickOptions.map((option) => (
                                <NeonButton
                                    key={option.minutes}
                                    variant="outline"
                                    category={item.category}
                                    onClick={() => handleQuickSchedule(option.minutes)}
                                >
                                    {option.label}
                                </NeonButton>
                            ))}
                        </div>
                        <NeonButton
                            variant="outline"
                            category="note"
                            onClick={handleTomorrow9am}
                            className="w-full mt-2"
                        >
                            ☀️ Tomorrow at 9am
                        </NeonButton>
                    </div>

                    {/* Custom Date/Time */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-3">Custom Time</label>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    className="w-full bg-surface px-4 py-2 rounded-lg text-gray-100 border border-glass-border focus:outline-none focus:ring-2 focus:ring-neon-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Time</label>
                                <input
                                    type="time"
                                    value={customTime}
                                    onChange={(e) => setCustomTime(e.target.value)}
                                    className="w-full bg-surface px-4 py-2 rounded-lg text-gray-100 border border-glass-border focus:outline-none focus:ring-2 focus:ring-neon-blue"
                                />
                            </div>
                            <NeonButton
                                variant="gradient"
                                category={item.category}
                                glow
                                onClick={handleCustomSchedule}
                                disabled={!customDate || !customTime}
                                className="w-full"
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Set Custom Reminder
                            </NeonButton>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
