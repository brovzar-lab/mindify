import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useItems } from '@/context/items-context';
import { useHaptic } from '@/hooks/use-haptic';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { aiService, offlineAIService } from '@/services/ai-service';
import { CategoryBadge } from '@/components/items/category-badge';
import { cn } from '@/lib/cn';
import type { Category } from '@/types';

type RecordingState = 'idle' | 'recording' | 'processing';

export function DashboardPage() {
  const { items, addItem } = useItems();
  const haptic = useHaptic();
  const { isOnline } = useOnlineStatus();

  const [state, setState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

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

    setState('processing');
    haptic.light();

    try {
      const service = isOnline ? aiService : offlineAIService;
      const result = await service.categorize(finalTranscript.trim());

      const newItem = {
        id: uuidv4(),
        rawInput: finalTranscript.trim(),
        category: result.category,
        subcategory: result.subcategory,
        title: result.title,
        entities: result.entities,
        urgency: result.urgency,
        status: 'captured' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false,
        pendingAIProcessing: false,
      };

      addItem(newItem);
      haptic.success();
      setState('idle');
      setTranscript('');
    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to process. Saved as note.');

      // Save as uncategorized note
      const newItem = {
        id: uuidv4(),
        rawInput: finalTranscript.trim(),
        category: 'note' as const,
        title: finalTranscript.trim().slice(0, 50),
        entities: {},
        urgency: 'none' as const,
        status: 'captured' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false,
        pendingAIProcessing: false,
      };
      addItem(newItem);
      setState('idle');
      setTranscript('');
    }
  }, [transcript, interimText, isOnline, addItem, haptic]);

  const handleMicPress = useCallback(() => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  }, [state, startRecording, stopRecording]);

  // Recent items (last 5)
  const recentItems = items.slice(0, 5);

  // Category counts for quick access
  const categories: Category[] = ['idea', 'task', 'reminder', 'note'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - minimal */}
      <header className="p-4 pt-safe text-center">
        <h1 className="text-xl font-semibold text-gray-300 tracking-wide">MINDIFY</h1>
      </header>

      {/* Main capture area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        {/* Transcript display */}
        <div className="w-full max-w-md min-h-[120px] mb-8 flex items-center justify-center">
          {state === 'recording' && (
            <div className="text-center">
              <p className="text-xl text-gray-100 leading-relaxed">
                {transcript}
                <span className="text-gray-400">{interimText}</span>
              </p>
              {!transcript && !interimText && (
                <p className="text-gray-500 animate-pulse">Listening...</p>
              )}
            </div>
          )}
          {state === 'processing' && (
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-category-task border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Processing...</p>
            </div>
          )}
          {state === 'idle' && error && (
            <p className="text-red-400 text-center">{error}</p>
          )}
          {state === 'idle' && !error && (
            <p className="text-gray-500 text-center text-lg">
              Tap the mic to capture a thought
            </p>
          )}
        </div>

        {/* Giant mic button */}
        <button
          onClick={handleMicPress}
          disabled={state === 'processing'}
          className={cn(
            'relative w-28 h-28 rounded-full flex items-center justify-center',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus:ring-4 focus:ring-category-task/30',
            state === 'idle' && 'bg-gradient-to-br from-category-task to-category-task-dark shadow-lg shadow-category-task/25 hover:scale-105 active:scale-95',
            state === 'recording' && 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/40 animate-pulse',
            state === 'processing' && 'bg-gray-700 cursor-not-allowed opacity-60'
          )}
        >
          {/* Pulsing ring when recording */}
          {state === 'recording' && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
              <span className="absolute inset-[-8px] rounded-full border-2 border-red-400 animate-pulse opacity-50" />
            </>
          )}

          {/* Mic icon */}
          <svg
            className={cn(
              'w-12 h-12 transition-colors',
              state === 'recording' ? 'text-white' : 'text-white'
            )}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            {state === 'recording' ? (
              // Stop icon
              <rect x="6" y="6" width="12" height="12" rx="2" />
            ) : (
              // Mic icon
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 2.76 2.24 5 5 5s5-2.24 5-5h2c0 4.08-3.06 7.44-7 7.93V19h4v2H8v-2h4v-3.07z" />
            )}
          </svg>
        </button>

        {/* Recording hint */}
        <p className={cn(
          'mt-6 text-sm transition-opacity',
          state === 'recording' ? 'text-red-400' : 'text-gray-600'
        )}>
          {state === 'recording' ? 'Tap to stop' : state === 'processing' ? '' : 'Press & release to record'}
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
                <Link
                  key={item.id}
                  to={`/item/${item.id}`}
                  className="flex-shrink-0 w-40 bg-surface rounded-xl p-3 hover:bg-surface-elevated transition-colors"
                >
                  <CategoryBadge category={item.category} showLabel={false} className="mb-2" />
                  <p className="text-sm text-gray-200 line-clamp-2">{item.title}</p>
                </Link>
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
    </div>
  );
}
