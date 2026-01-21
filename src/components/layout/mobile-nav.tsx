import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/browse/all', label: 'Browse', icon: 'folder' },
  { path: '/capture', label: 'Capture', icon: 'plus', isCapture: true },
  { path: '/browse/task', label: 'Tasks', icon: 'check' },
];

export function MobileNav() {
  const location = useLocation();

  const renderIcon = (icon: string, isActive: boolean) => {
    const iconClass = cn(
      'w-6 h-6 transition-colors',
      isActive ? 'text-category-task' : 'text-gray-400'
    );

    switch (icon) {
      case 'home':
        return (
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        );
      case 'folder':
        return (
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        );
      case 'plus':
        return (
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M12 4v16m8-8H4"
            />
          </svg>
        );
      case 'check':
        return (
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-800 safe-area-bottom z-50">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path.startsWith('/browse') &&
              location.pathname.startsWith('/browse'));

          if (item.isCapture) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'relative -mt-6 w-14 h-14 rounded-full',
                  'bg-category-task shadow-lg shadow-category-task/30',
                  'flex items-center justify-center',
                  'active:scale-95 transition-transform'
                )}
                aria-label={item.label}
              >
                {renderIcon(item.icon, false)}
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center',
                'min-w-touch min-h-touch',
                'transition-colors'
              )}
              aria-label={item.label}
            >
              {renderIcon(item.icon, isActive)}
              <span
                className={cn(
                  'text-xs mt-1',
                  isActive ? 'text-category-task' : 'text-gray-400'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
