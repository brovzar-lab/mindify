import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'touch';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-lg font-medium',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-95',

          // Variants
          {
            'bg-category-task text-white hover:bg-category-task-dark focus:ring-category-task':
              variant === 'primary',
            'bg-surface text-gray-200 hover:bg-surface-elevated focus:ring-gray-500':
              variant === 'secondary',
            'bg-transparent text-gray-300 hover:bg-surface focus:ring-gray-500':
              variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500':
              variant === 'danger',
          },

          // Sizes - ensuring 48px minimum for touch targets
          {
            'min-h-[36px] px-3 text-sm': size === 'sm',
            'min-h-touch px-4 text-base': size === 'md',
            'min-h-[56px] px-6 text-lg': size === 'lg',
            'min-h-touch min-w-touch px-4 text-base': size === 'touch',
          },

          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
