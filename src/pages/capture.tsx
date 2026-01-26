import { useState, useCallback, useEffect, useRef } from 'react';
import { Mic, AlertCircle, CheckCircle2 } from 'lucide-react';
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

type CaptureState = 'idle' | 'recording' | 'success';

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
  const { addItem } = useItems();
  const haptic = useHaptic();
  const [state, setState] = useState<CaptureState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [aiNotification, setAiNotification] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
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

  // Native (Android/iOS) speech recognition
  const startNativeRecording = useCallback(async () => {
    setError(null);

    // Request permission first
    try {
      const permStatus = await SpeechRecognition.requestPermissions();
      if (permStatus.speechRecognition !== 'granted') {
        setError('Microphone permission denied. Please enable in Settings.');
        haptic.warning?.();
        return;
      }
    } catch (err) {
      setError('Could not request microphone permission.');
      haptic.warning?.();
      return;
    }

    setTranscript('');
    setInterimText('');
    haptic.light();

    try {
      // Start listening
      setState('recording');
      haptic.medium();

      await SpeechRecognition.start({
        language: 'en-US',
        maxResults: 5,
        partialResults: true,
        popup: false,
      });

      // Listen for results
      SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        if (data.matches && data.matches.length > 0) {
          setInterimText(data.matches[0]);
        }
      });

    } catch (err: any) {
      console.error('[Capture] Native speech error:', err);
      setError('Could not start speech recognition. Try again.');
      setState('idle');
      haptic.error?.();
    }
  }, [haptic]);

  const stopNativeRecording = useCallback(async () => {
    try {
      await SpeechRecognition.stop();
      SpeechRecognition.removeAllListeners();

      // Get the final transcript from accumulated interim results
      const finalTranscript = interimText || '';
      setInterimText('');

      if (!finalTranscript.trim()) {
        setError('No speech detected. Try again.');
        setState('idle');
        setTimeout(() => setError(null), 3000);
        return;
      }

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
          // Show notification that AI finished organizing
          setAiNotification('Thought organized');
          setTimeout(() => setAiNotification(null), 3000);
        } catch (err) {
          console.error('[Capture] Background processing error:', err);
        }
      }, 500);

    } catch (err) {
      console.error('[Capture] Stop error:', err);
      setError('Error stopping recording. Try again.');
      setState('idle');
    }
  }, [interimText, addItem, haptic]);

  // Web Speech API recording
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

  const stopWebRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const finalTranscript = transcript + (interimText ? ' ' + interimText : '');
    setInterimText('');

    if (!finalTranscript.trim()) {
      setError('No speech detected. Try again.');
      setState('idle');
      setTimeout(() => setError(null), 3000);
      return;
    }

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

    setTimeout(async () => {
      try {
        await inboxProcessor.processPendingItems();
        // Show notification that AI finished organizing
        setAiNotification('Thought organized');
        setTimeout(() => setAiNotification(null), 3000);
      } catch (err) {
        console.error('[Capture] Background processing error:', err);
      }
    }, 500);
  }, [transcript, interimText, addItem, haptic]);

  // Unified handlers
  const startRecording = useCallback(() => {
    if (isNative) {
      startNativeRecording();
    } else {
      startWebRecording();
    }
  }, [isNative, startNativeRecording, startWebRecording]);

  const stopRecording = useCallback(() => {
    if (isNative) {
      stopNativeRecording();
    } else {
      stopWebRecording();
    }
  }, [isNative, stopNativeRecording, stopWebRecording]);

  const handleMicPress = useCallback(() => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  }, [state, startRecording, stopRecording]);

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
            onClick={handleMicPress}
            disabled={state === 'success'}
            className={cn(
              'w-32 h-32 rounded-full flex items-center justify-center',
              'transition-all duration-200',
              'focus:outline-none',
              'shadow-lg',
              state === 'idle' && 'bg-[#1A1A1A] hover:scale-105 active:scale-95',
              state === 'recording' && 'bg-[#BFFF00] scale-105',
              state === 'success' && 'bg-[#22C55E]'
            )}
            aria-label={state === 'recording' ? 'Stop recording' : 'Start recording'}
          >
            {state === 'success' ? (
              <svg className="w-14 h-14 text-white animate-fade-in" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <Mic
                className={cn(
                  'w-12 h-12',
                  state === 'idle' && 'text-white',
                  state === 'recording' && 'text-[#1A1A1A]'
                )}
                strokeWidth={1.5}
              />
            )}
          </button>

          {/* Helper text */}
          <p className={cn(
            'mt-6 text-center font-medium',
            state === 'recording' ? 'text-[#1A1A1A]' : 'text-[#9B9B9B]'
          )}>
            {state === 'idle' && 'Tap to start'}
            {state === 'recording' && 'Listening... tap to send'}
            {state === 'success' && 'Got it! ✓'}
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
