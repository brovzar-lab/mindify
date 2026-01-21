import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useHaptic } from '@/hooks/use-haptic';

interface CaptureButtonProps {
  isListening: boolean;
  onPress: () => void;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
  disabled?: boolean;
}

export function CaptureButton({
  isListening,
  onPress,
  onLongPressStart,
  onLongPressEnd,
  disabled = false,
}: CaptureButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const haptic = useHaptic();
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const handlePointerDown = useCallback(() => {
    if (disabled) return;

    setIsPressed(true);
    haptic.light();

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      haptic.medium();
      onLongPressStart?.();
    }, 300);
  }, [disabled, haptic, onLongPressStart]);

  const handlePointerUp = useCallback(() => {
    setIsPressed(false);

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      onLongPressEnd?.();
    } else {
      onPress();
    }
  }, [onPress, onLongPressEnd]);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (isPressed) {
      setIsPressed(false);
      if (isLongPressRef.current) {
        isLongPressRef.current = false;
        onLongPressEnd?.();
      }
    }
  }, [isPressed, onLongPressEnd]);

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      className={cn(
        // Size: 80px as specified
        'relative w-capture-btn h-capture-btn rounded-full',
        'flex items-center justify-center',
        'transition-all duration-200',
        'focus:outline-none focus:ring-4 focus:ring-category-task/50',

        // Visual states
        isListening
          ? 'bg-red-500 shadow-lg shadow-red-500/50'
          : 'bg-category-task shadow-lg shadow-category-task/30',

        isPressed && 'scale-95',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      aria-label={isListening ? 'Stop recording' : 'Start capture'}
    >
      {/* Pulse animation when listening */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring" />
          <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring animation-delay-500" />
        </>
      )}

      {/* Icon */}
      <span className="relative z-10">
        {isListening ? (
          // Stop icon
          <svg
            className="w-8 h-8 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          // Plus icon
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
