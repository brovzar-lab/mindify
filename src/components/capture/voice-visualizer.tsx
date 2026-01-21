import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

interface VoiceVisualizerProps {
  isActive: boolean;
  className?: string;
}

export function VoiceVisualizer({ isActive, className }: VoiceVisualizerProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!isActive) {
      barsRef.current.forEach((bar) => {
        if (bar) bar.style.transform = 'scaleY(0.3)';
      });
      return;
    }

    const animate = () => {
      barsRef.current.forEach((bar, index) => {
        if (bar) {
          const scale = 0.3 + Math.random() * 0.7;
          bar.style.transform = `scaleY(${scale})`;
          bar.style.transitionDelay = `${index * 50}ms`;
        }
      });
    };

    const intervalId = setInterval(animate, 100);

    return () => {
      clearInterval(intervalId);
    };
  }, [isActive]);

  return (
    <div
      className={cn('flex items-center justify-center gap-1 h-8', className)}
      aria-hidden="true"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          ref={(el) => {
            barsRef.current[index] = el;
          }}
          className={cn(
            'w-1 bg-category-task rounded-full transition-transform duration-100',
            isActive ? 'h-full' : 'h-2'
          )}
          style={{ transform: 'scaleY(0.3)' }}
        />
      ))}
    </div>
  );
}
