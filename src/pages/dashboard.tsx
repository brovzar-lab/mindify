import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Sparkles, Bell, BellRing, Inbox as InboxIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useItems } from '@/context/items-context';
import { useHaptic } from '@/hooks/use-haptic';
import { useNotifications } from '@/hooks/use-notifications';
import { notificationService } from '@/services/notification-service';
import { inboxProcessor } from '@/services/inbox-processor';
import { CategoryBadge } from '@/components/items/category-badge';
import { ScheduleReminderSheet } from '@/components/notifications/schedule-reminder-sheet';
import { cn } from '@/lib/cn';
import type { Category, MindifyItem } from '@/types';

type RecordingState = 'idle' | 'recording' | 'processing';

export function DashboardPage() {
  const { items, addItem, updateItem } = useItems();
  const haptic = useHaptic();
  const [state, setState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [schedulingItem, setSchedulingItem] = useState<MindifyItem | null>(null);
  const [suggestedTime, setSuggestedTime] = useState<Date | undefined>(undefined);
  const [extractedPhrase, setExtractedPhrase] = useState<string | undefined>(undefined);

  // Initialize notifications
  const handleNotificationComplete = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      updateItem(itemId, { status: 'acted' });
      haptic.success();
    }
  }, [items, haptic]);

  const handleNotificationSnooze = useCallback((itemId: string, notificationId: number, minutes: number) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      notifications.snoozeReminder(notificationId, item, minutes);
    }
  }, [items]);

  const notifications = useNotifications(handleNotificationComplete, handleNotificationSnooze);

  // Using any because SpeechRecognition types vary by browser
  const recognitionRef = useRef<any>(null);

  // Check if speech recognition is supported
  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('Voice not supported in this browser. Try Chrome on Android or desktop.');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimText('');
    haptic.light();

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setState('recording');
      haptic.medium();
    };

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      setTranscript(final.trim());
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permission.');
      } else if (event.error !== 'aborted') {
        setError(`Error: ${event.error}`);
      }
      setState('idle');
    };

    recognition.onend = () => {
      // Only process if we're still in recording state (user stopped it)
      // If state is already 'idle', it was an error
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, haptic]);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const finalTranscript = transcript + (interimText ? ' ' + interimText : '');
    setInterimText('');

    if (!finalTranscript.trim()) {
      setState('idle');
      setError('No speech detected. Try again.');
      return;
    }

    // INSTANT FEEDBACK: No processing state, save happens in background
    try {
      // NEW WORKFLOW: Save directly to inbox without blocking UI
      const newItem: MindifyItem = {
        id: uuidv4(),
        rawInput: finalTranscript.trim(),
        category: 'note', // Default, will be set during AI grouping
        title: finalTranscript.trim().slice(0, 60), // First 60 chars as title
        tags: [],
        entities: {},
        urgency: 'none',
        status: 'inbox', // NEW: Mark as unprocessed
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false,
        pendingAIProcessing: true, // Will be processed in batch
      };

      // Save in background (synchronous, but instant)
      addItem(newItem);

      // INSTANT feedback - "Got it!" with success haptic
      haptic.success();
      setState('idle'); // Back to idle immediately
      setTranscript('');
      setError('Got it! 💚'); // Quick green confirmation

      // Clear confirmation after 1.5 seconds (faster than before)
      setTimeout(() => setError(null), 1500);

      // BACKGROUND: Trigger AI processing after short delay (non-blocking)
      setTimeout(async () => {
        console.log('[Dashboard] Triggering background AI processing...');
        try {
          await inboxProcessor.processPendingItems();
          console.log('[Dashboard] Background processing complete');
        } catch (err) {
          console.error('[Dashboard] Background processing error:', err);
        }
      }, 500); // 500ms delay to let UI update first
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save. Please try again.');
      setState('idle');
      setTranscript('');
    }
  }, [transcript, interimText, addItem, haptic]);

  const handleMicPress = useCallback(() => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  }, [state, startRecording, stopRecording]);

  // Handle opening schedule reminder sheet
  const handleOpenScheduler = useCallback((item: MindifyItem) => {
    // Try to extract time from the item's raw input
    const time = notificationService.extractTimeFromText(item.rawInput);
    if (time) {
      setSuggestedTime(time);
      // Extract the time phrase for display
      const timePatterns = /\b(at \d{1,2}(:\d{2})?\s?(am|pm)?|tomorrow|next \w+|in \d+ (hours?|minutes?|days?))\b/i;
      const match = item.rawInput.match(timePatterns);
      if (match) {
        setExtractedPhrase(match[0]);
      }
    } else {
      setSuggestedTime(undefined);
      setExtractedPhrase(undefined);
    }
    setSchedulingItem(item);
  }, []);

  // Handle scheduling a reminder
  const handleScheduleReminder = useCallback(async (time: Date) => {
    if (!schedulingItem) return;

    const notificationId = await notifications.scheduleReminder(schedulingItem, { scheduledTime: time });

    if (notificationId) {
      // Update item with notification info
      updateItem(schedulingItem.id, {
        scheduledNotification: {
          id: notificationId,
          scheduledTime: time.toISOString(),
          snoozeCount: 0,
          isRecurring: false,
        },
      });
      haptic.success();
    }

    setSchedulingItem(null);
    setSuggestedTime(undefined);
    setExtractedPhrase(undefined);
  }, [schedulingItem, notifications, updateItem, haptic]);

  const handleCancelScheduler = useCallback(() => {
    setSchedulingItem(null);
    setSuggestedTime(undefined);
    setExtractedPhrase(undefined);
  }, []);

  // Recent items (last 5)
  const recentItems = items.slice(0, 5);

  // Category counts for quick access
  const categories: Category[] = ['idea', 'task', 'reminder', 'note'];

  // Count inbox items
  const inboxCount = items.filter(item => item.status === 'inbox').length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Neon Gradient */}
      <header className="p-4 pt-safe">
        <div className="flex items-center justify-between mb-2">
          <Link
            to="/inbox"
            className="relative"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface hover:bg-surface-elevated transition-colors"
            >
              <InboxIcon className="w-5 h-5 text-neon-purple" />
              <span className="text-sm font-medium text-gray-300">Inbox</span>
              {inboxCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-neon-purple text-xs font-bold text-gray-900">
                  {inboxCount}
                </span>
              )}
            </motion.div>
          </Link>
        </div>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold bg-gradient-to-r from-neon-purple via-neon-blue to-neon-pink bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_8s_ease_infinite] text-center"
        >
          MINDIFY
        </motion.h1>
      </header>

      {/* Main capture area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        {/* Status display - NO LIVE TRANSCRIPT */}
        <div className="w-full max-w-md min-h-[120px] mb-8 flex items-center justify-center">
          {state === 'recording' && (
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3"
              >
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-8 h-8 rounded-full bg-green-500"
                />
              </motion.div>
              <p className="text-gray-400 animate-pulse">Listening...</p>
            </div>
          )}
          {state === 'processing' && (
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-category-task border-t-transparent rounded-full mx-auto mb-3"
              />
              <p className="text-gray-400">Analyzing your thought...</p>
            </div>
          )}
          {state === 'idle' && error && (
            <p className="text-red-400 text-center">{error}</p>
          )}
          {state === 'idle' && !error && (
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-neon-purple mx-auto mb-2 opacity-50" />
              <p className="text-gray-500 text-lg">
                Tap the mic to capture a thought
              </p>
            </div>
          )}
        </div>

        {/* Giant mic button */}
        <motion.button
          onClick={handleMicPress}
          disabled={state === 'processing'}
          whileHover={{ scale: state === 'idle' ? 1.05 : 1 }}
          whileTap={{ scale: state === 'idle' || state === 'recording' ? 0.95 : 1 }}
          className={cn(
            'relative w-28 h-28 rounded-full flex items-center justify-center',
            'transition-all duration-300 ease-out',
            'focus:outline-none focus:ring-4 focus-visible:ring-category-task/30',
            state === 'idle' && 'bg-gradient-to-br from-category-task to-category-task-dark shadow-lg shadow-category-task/25',
            state === 'recording' && 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/40 animate-pulse',
            state === 'processing' && 'bg-gray-700 cursor-not-allowed opacity-60'
          )}
        >
          {/* Pulsing ring when recording */}
          {state === 'recording' && (
            <>
              <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" />
              <span className="absolute inset-[-8px] rounded-full border-2 border-green-400 animate-pulse opacity-50" />
            </>
          )}

          {/* Icon changes based on state */}
          {state === 'recording' ? (
            <Send className="w-12 h-12 text-white" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
        </motion.button>

        {/* Recording hint */}
        <p className={cn(
          'mt-6 text-sm font-medium transition-opacity',
          state === 'recording' ? 'text-green-400' : 'text-gray-600'
        )}>
          {state === 'recording' ? 'Tap to SEND' : state === 'processing' ? 'Processing...' : 'Tap to record'}
        </p>
      </main>

      {/* Recent captures - compact */}
      <section className="px-4 pb-6">
        {recentItems.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recent</h2>
              <Link to="/browse/all" className="text-xs text-category-task hover:underline">
                View all
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {recentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex-shrink-0 w-44 bg-surface rounded-xl p-3 hover:bg-surface-elevated transition-colors relative group"
                >
                  <Link to={`/item/${item.id}`}>
                    <div className="flex items-center justify-between mb-2">
                      <CategoryBadge category={item.category} showLabel={false} />
                      {item.scheduledNotification && (
                        <BellRing className="w-3.5 h-3.5 text-neon-green animate-pulse" />
                      )}
                    </div>
                    <p className="text-sm text-gray-200 line-clamp-2 mb-2">{item.title}</p>
                  </Link>
                  {/* Schedule Reminder Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenScheduler(item);
                    }}
                    className={cn(
                      'absolute bottom-2 right-2 p-1.5 rounded-lg transition-all',
                      'opacity-0 group-hover:opacity-100',
                      'bg-surface-elevated hover:bg-neon-blue/20',
                      item.scheduledNotification
                        ? 'text-neon-green'
                        : 'text-gray-400 hover:text-neon-blue'
                    )}
                    aria-label="Schedule reminder"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Category filters */}
        <div className="flex justify-center gap-2 mt-4">
          {categories.map((category) => (
            <Link
              key={category}
              to={`/browse/${category}`}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-medium transition-colors',
                'bg-surface hover:bg-surface-elevated',
                category === 'idea' && 'text-category-idea',
                category === 'task' && 'text-category-task',
                category === 'reminder' && 'text-category-reminder',
                category === 'note' && 'text-category-note'
              )}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}s
            </Link>
          ))}
        </div>
      </section>



      {/* Schedule Reminder Modal */}
      <AnimatePresence>
        {schedulingItem && (
          <ScheduleReminderSheet
            item={schedulingItem}
            onSchedule={handleScheduleReminder}
            onCancel={handleCancelScheduler}
            suggestedTime={suggestedTime}
            extractedPhrase={extractedPhrase}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
