export interface SpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechServiceConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (result: SpeechResult) => void;
  onError?: (error: SpeechRecognitionError) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export type SpeechRecognitionError =
  | 'not-supported'
  | 'no-speech'
  | 'audio-capture'
  | 'not-allowed'
  | 'network'
  | 'aborted'
  | 'unknown';

// TypeScript declarations for Web Speech API
interface WebSpeechRecognitionEvent extends Event {
  results: WebSpeechRecognitionResultList;
  resultIndex: number;
}

interface WebSpeechRecognitionResultList {
  length: number;
  item(index: number): WebSpeechRecognitionResult;
  [index: number]: WebSpeechRecognitionResult;
}

interface WebSpeechRecognitionResult {
  length: number;
  item(index: number): WebSpeechRecognitionAlternative;
  [index: number]: WebSpeechRecognitionAlternative;
  isFinal: boolean;
}

interface WebSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface WebSpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => WebSpeechRecognition;
    webkitSpeechRecognition?: new () => WebSpeechRecognition;
  }
}

class SpeechService {
  private recognition: WebSpeechRecognition | null = null;
  private isListening = false;

  isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  initialize(config: SpeechServiceConfig): boolean {
    if (!this.isSupported()) {
      config.onError?.('not-supported');
      return false;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      config.onError?.('not-supported');
      return false;
    }

    this.recognition = new SpeechRecognitionClass();

    this.recognition.continuous = config.continuous ?? false;
    this.recognition.interimResults = config.interimResults ?? true;
    this.recognition.lang = config.language ?? 'en-US';

    this.recognition.onresult = (event: WebSpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      config.onResult?.({
        transcript,
        confidence,
        isFinal: result.isFinal,
      });
    };

    this.recognition.onerror = (event: WebSpeechRecognitionErrorEvent) => {
      const errorMap: Record<string, SpeechRecognitionError> = {
        'no-speech': 'no-speech',
        'audio-capture': 'audio-capture',
        'not-allowed': 'not-allowed',
        'network': 'network',
        'aborted': 'aborted',
      };
      config.onError?.(errorMap[event.error] ?? 'unknown');
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      config.onStart?.();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      config.onEnd?.();
    };

    return true;
  }

  start(): void {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch {
        console.warn('Speech recognition already active');
      }
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}

export const speechService = new SpeechService();
