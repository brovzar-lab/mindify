import { useState, useCallback, useEffect, useRef } from 'react';
import { speechService, type SpeechRecognitionError } from '@/services/speech-service';

interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  onFinalResult?: (transcript: string) => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: SpeechRecognitionError | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  resetTranscript: () => void;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  const [isSupported] = useState(() => speechService.isSupported());

  const onFinalResultRef = useRef(options.onFinalResult);
  onFinalResultRef.current = options.onFinalResult;

  // Track accumulated transcript for native (since it doesn't accumulate automatically)
  const accumulatedTranscriptRef = useRef('');

  useEffect(() => {
    if (!isSupported) return;

    speechService.initialize({
      language: options.language ?? 'en-US',
      continuous: options.continuous ?? false,
      interimResults: true,
      onResult: (result) => {
        if (result.isFinal) {
          const newTranscript = accumulatedTranscriptRef.current + result.transcript;
          accumulatedTranscriptRef.current = newTranscript;
          setTranscript(newTranscript);
          setInterimTranscript('');
          onFinalResultRef.current?.(result.transcript);
        } else {
          setInterimTranscript(result.transcript);
        }
      },
      onError: (err) => {
        setError(err);
        setIsListening(false);
      },
      onStart: () => {
        setIsListening(true);
        setError(null);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  }, [isSupported, options.language, options.continuous]);

  const startListening = useCallback(async () => {
    setError(null);
    accumulatedTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    await speechService.start();
  }, []);

  const stopListening = useCallback(async () => {
    await speechService.stop();
  }, []);

  const resetTranscript = useCallback(() => {
    accumulatedTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
