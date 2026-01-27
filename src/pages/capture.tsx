import { useState, useCallback, useEffect, useRef } from 'react';
import { Mic, Square, AlertCircle, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { useItems } from '@/context/items-context';
import { useHaptic } from '@/hooks/use-haptic';
import { inboxProcessor } from '@/services/inbox-processor';
import { BottomNav } from '@/components/layout/bottom-nav';
import { VersionFooter } from '@/components/layout/version-footer';
import { cn } from '@/lib/cn';
import { USER_CONTEXT } from '@/lib/constants';
import type { MindifyItem } from '@/types';

type CaptureState = 'idle' | 'recording' | 'processing' | 'success';

// Get greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Format current time
function getCurrentTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function CapturePage() {
  const { addItem, refreshItems } = useItems();
  const haptic = useHaptic();
  const [state, setState] = useState<CaptureState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [aiNotification, setAiNotification] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const interimTextRef = useRef(''); // Ref to track latest interim text for native recording
  const isNative = Capacitor.isNativePlatform();

  const isSupported = isNative || (typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window));

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(getCurrentTime()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isNative) {
        SpeechRecognition.stop().catch(() => {});
      } else if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isNative]);

  // Process and save the transcript
  const processTranscript = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim()) {
      setError('No speech detected. Try again.');
      setState('idle');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setState('processing');

    // Create and save item
    const newItem: MindifyItem = {
      id: uuidv4(),
      rawInput: finalTranscript.trim(),
      category: 'note',
      title: finalTranscript.trim().slice(0, 60),
      tags: [],
      entities: {},
      urgency: 'none',
      status: 'inbox',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
      pendingAIProcessing: true,
    };

    addItem(newItem);
    haptic.success();
    setState('success');
    setTranscript('');

    setTimeout(() => setState('idle'), 1200);

    // Background AI processing
    setTimeout(async () => {
      try {
        await inboxProcessor.processPendingItems();
        // Refresh items to pick up the processed changes
        refreshItems();
        setAiNotification('Thought organized');
        setTimeout(() => setAiNotification(null), 3000);
      } catch (err) {
        console.error('[Capture] Background processing error:', err);
        // Still refresh in case some items were processed
        refreshItems();
      }
    }, 500);
  }, [addItem, haptic, refreshItems]);

  // Native (Android/iOS) speech recognition - START
  const startNativeRecording = useCallback(async () => {
    console.error('[DEBUG] startNativeRecording called');
    setError(null);

    // Request permission first
    try {
      const permStatus = await SpeechRecognition.requestPermissions();
      console.error('[DEBUG] Permission status:', permStatus);
      if (permStatus.speechRecognition !== 'granted') {
        setError('Microphone permission denied. Please enable in Settings.');
        haptic.warning?.();
        return;
      }
    } catch (err) {
      console.error('[DEBUG] Permission request error:', err);
      setError('Could not request microphone permission.');
      haptic.warning?.();
      return;
    }

    setTranscript('');
    setInterimText('');
    interimTextRef.current = '';

    try {
      // Register listeners BEFORE starting
      console.error('[DEBUG] Registering listeners');

      // Listen for partial results (live transcription)
      SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        console.error('[DEBUG] partialResults received:', data);
        if (data.matches && data.matches.length > 0) {
          const text = data.matches[0];
          setInterimText(text);
          interimTextRef.current = text;
        }
      });

      // Start listening
      setState('recording');
      haptic.medium();

      console.error('[DEBUG] About to call SpeechRecognition.start');
      await SpeechRecognition.start({
        language: 'en-US',
        maxResults: 5,
        partialResults: true,
        popup: false,
      });
      console.error('[DEBUG] SpeechRecognition.start() resolved');

    } catch (err: any) {
      console.error('[Capture] Native speech error:', err);
      setError('Could not start speech recognition. Try again.');
      setState('idle');
      haptic.error?.();
    }
  }, [haptic]);

  // Native (Android/iOS) speech recognition - STOP
  const stopNativeRecording = useCallback(async () => {
    const capturedText = interimTextRef.current;
    console.error('[DEBUG] stopNativeRecording called, interimTextRef:', capturedText);

    // Immediately update UI to show we're processing
    setState('processing');

    try {
      // Stop recognition with timeout (don't wait forever)
      const stopPromise = SpeechRecognition.stop();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Stop timeout')), 2000)
      );

      try {
        await Promise.race([stopPromise, timeoutPromise]);
      } catch (e) {
        console.error('[DEBUG] Stop timed out or failed, continuing anyway');
      }

      // Clean up listeners
      try {
        SpeechRecognition.removeAllListeners();
      } catch (e) {
        console.error('[DEBUG] removeAllListeners error:', e);
      }

      // Get the final text
      const finalText = interimTextRef.current || capturedText;
      console.error('[DEBUG] Final text after stop:', finalText);

      setInterimText('');
      interimTextRef.current = '';

      await processTranscript(finalText);
    } catch (err) {
      console.error('[Capture] Stop error:', err);
      setError('Error stopping recording. Try again.');
      setState('idle');
    }
  }, [processTranscript]);

  // Web Speech API recording - START
  const startWebRecording = useCallback(async () => {
    setError(null);

    // Check microphone permission first (web)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      setError('Microphone permission needed. Check your browser settings.');
      haptic.warning?.();
      return;
    }

    setTranscript('');
    setInterimText('');
    interimTextRef.current = '';

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
      interimTextRef.current = final.trim() + ' ' + interim;
    };

    recognition.onerror = (event: any) => {
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Mic access denied. Check settings.',
        'no-speech': 'No speech detected. Try again.',
        'audio-capture': 'Mic not available. Check device.',
        'network': 'Network error. Check connection.',
        'aborted': 'Recording stopped.',
        'service-not-allowed': 'Speech service not available.',
      };

      const message = errorMessages[event.error] || 'Something went wrong. Try again.';
      setError(message);
      setState('idle');
      haptic.error?.();

      setTimeout(() => setError(null), 4000);
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [haptic]);

  // Web Speech API recording - STOP
  const stopWebRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const finalTranscript = transcript + (interimText ? ' ' + interimText : '');
    setInterimText('');
    interimTextRef.current = '';

    await processTranscript(finalTranscript);
  }, [transcript, interimText, processTranscript]);

  // Toggle recording on tap
  const handleMicTap = useCallback(() => {
    if (state === 'idle') {
      // Start recording
      haptic.medium();
      if (isNative) {
        startNativeRecording();
      } else {
        startWebRecording();
      }
    } else if (state === 'recording') {
      // Stop recording
      haptic.success();
      if (isNative) {
        stopNativeRecording();
      } else {
        stopWebRecording();
      }
    }
    // Ignore taps during 'processing' or 'success' states
  }, [state, isNative, startNativeRecording, stopNativeRecording, startWebRecording, stopWebRecording, haptic]);

  // Get first name from user context
  const firstName = USER_CONTEXT.name.split(' ')[0];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header with personalized greeting */}
      <header className="px-6 pt-safe pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1A1A1A]">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-[#6B6B6B] mt-1">
              Got something on your mind?
            </p>
          </div>
          <span className="text-[#9B9B9B] text-sm">{currentTime}</span>
        </div>
      </header>

      {/* Main capture area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {/* Mic button card */}
        <div className="card p-8 flex flex-col items-center">
          <button
            onClick={handleMicTap}
            disabled={state === 'processing' || state === 'success'}
            className={cn(
              'w-32 h-32 rounded-full flex items-center justify-center',
              'transition-all duration-200',
              'focus:outline-none',
              'shadow-lg select-none',
              // Gray when idle
              state === 'idle' && 'bg-[#6B6B6B] hover:bg-[#5A5A5A] hover:scale-105 active:scale-95',
              // Red when recording
              state === 'recording' && 'bg-[#EF4444] scale-105 animate-pulse',
              // Gray during processing
              state === 'processing' && 'bg-[#9B9B9B]',
              // Green on success
              state === 'success' && 'bg-[#22C55E]'
            )}
            aria-label={state === 'recording' ? 'Tap to stop recording' : 'Tap to start recording'}
          >
            {state === 'success' ? (
              <svg className="w-14 h-14 text-white animate-fade-in" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : state === 'recording' ? (
              // Stop icon (square) when recording
              <Square className="w-12 h-12 text-white" fill="white" strokeWidth={0} />
            ) : state === 'processing' ? (
              // Spinner when processing
              <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              // Mic icon when idle
              <Mic className="w-12 h-12 text-white" strokeWidth={1.5} />
            )}
          </button>

          {/* Helper text */}
          <p className={cn(
            'mt-6 text-center font-medium',
            state === 'recording' ? 'text-[#EF4444]' : 'text-[#9B9B9B]'
          )}>
            {state === 'idle' && 'Tap to record'}
            {state === 'recording' && 'Recording... tap to stop'}
            {state === 'processing' && 'Processing...'}
            {state === 'success' && 'Got it!'}
          </p>
        </div>

        {/* AI organized notification */}
        {aiNotification && (
          <div className="mt-6 p-3 rounded-xl bg-[#BFFF00]/20 flex items-center gap-2 max-w-sm w-full animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
            <p className="text-sm text-[#1A1A1A] font-medium">{aiNotification}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-[#FEE2E2] flex items-center gap-3 max-w-sm w-full animate-fade-in">
            <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />
            <p className="text-sm text-[#991B1B]">{error}</p>
          </div>
        )}

        {/* Browser support message */}
        {!isSupported && (
          <div className="card mt-6 p-4">
            <p className="text-sm text-[#EF4444] text-center">
              Voice capture not supported in this browser. Try Chrome or Safari.
            </p>
          </div>
        )}
      </main>

      <VersionFooter />
      <BottomNav />
    </div>
  );
}
