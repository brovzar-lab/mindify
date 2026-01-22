import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

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
  private config: SpeechServiceConfig | null = null;
  private isNative: boolean;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  isSupported(): boolean {
    if (this.isNative) {
      // Native platforms (iOS/Android) support speech recognition via plugin
      return true;
    }
    // Web: check for Web Speech API
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNative) {
      // Web browsers handle permissions automatically when starting recognition
      return true;
    }

    try {
      const status = await SpeechRecognition.requestPermissions();
      return status.speechRecognition === 'granted';
    } catch {
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    if (!this.isNative) {
      return true;
    }

    try {
      const status = await SpeechRecognition.checkPermissions();
      return status.speechRecognition === 'granted';
    } catch {
      return false;
    }
  }

  initialize(config: SpeechServiceConfig): boolean {
    this.config = config;

    if (this.isNative) {
      // Native initialization is handled in start()
      return true;
    }

    // Web Speech API initialization
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

  async start(): Promise<void> {
    if (this.isListening) return;

    if (this.isNative) {
      await this.startNative();
    } else {
      this.startWeb();
    }
  }

  private async startNative(): Promise<void> {
    if (!this.config) return;

    try {
      // Request permissions first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        this.config.onError?.('not-allowed');
        return;
      }

      this.isListening = true;
      this.config.onStart?.();

      // Set up listener for partial results
      await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        if (data.matches && data.matches.length > 0) {
          this.config?.onResult?.({
            transcript: data.matches[0],
            confidence: 0.8,
            isFinal: false,
          });
        }
      });

      // Start listening
      const result = await SpeechRecognition.start({
        language: this.config.language ?? 'en-US',
        partialResults: this.config.interimResults ?? true,
        popup: false,
      });

      // Handle final result
      if (result.matches && result.matches.length > 0) {
        this.config.onResult?.({
          transcript: result.matches[0],
          confidence: 0.9,
          isFinal: true,
        });
      } else {
        this.config.onError?.('no-speech');
      }

      this.isListening = false;
      this.config.onEnd?.();
      await SpeechRecognition.removeAllListeners();
    } catch (error) {
      console.error('Native speech recognition error:', error);
      this.isListening = false;
      this.config?.onError?.('unknown');
      this.config?.onEnd?.();
    }
  }

  private startWeb(): void {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch {
        console.warn('Speech recognition already active');
      }
    }
  }

  async stop(): Promise<void> {
    if (!this.isListening) return;

    if (this.isNative) {
      try {
        await SpeechRecognition.stop();
        await SpeechRecognition.removeAllListeners();
      } catch (error) {
        console.error('Error stopping native speech recognition:', error);
      }
    } else if (this.recognition) {
      this.recognition.stop();
    }
  }

  async abort(): Promise<void> {
    if (this.isNative) {
      try {
        await SpeechRecognition.stop();
        await SpeechRecognition.removeAllListeners();
        this.isListening = false;
        this.config?.onEnd?.();
      } catch (error) {
        console.error('Error aborting native speech recognition:', error);
      }
    } else if (this.recognition) {
      this.recognition.abort();
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsNative(): boolean {
    return this.isNative;
  }
}

export const speechService = new SpeechService();
