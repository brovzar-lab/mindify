import { Link, useLocation } from 'react-router-dom';
import { List, Mic, Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useItems } from '@/context/items-context';

export function BottomNav() {
  const location = useLocation();
  const { items } = useItems();

  // Count inbox items that need review
  const inboxCount = items.filter(
    item => item.status === 'inbox' && !item.pendingAIProcessing
  ).length;

  const navItems = [
    { path: '/actions', label: 'Actions', icon: List },
    { path: '/', label: 'Capture', icon: Mic, isCenter: true },
    { path: '/inbox', label: 'Inbox', icon: Inbox, showDot: inboxCount > 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDE8DF] safe-area-bottom z-50 shadow-sm">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center',
                'min-w-[64px] min-h-[48px]',
                'relative'
              )}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    item.isCenter ? 'w-7 h-7' : 'w-6 h-6',
                    isActive ? 'text-[#1A1A1A]' : 'text-[#9B9B9B]'
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {/* Dot indicator for inbox */}
                {item.showDot && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#F97316] rounded-full" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 font-medium',
                  isActive ? 'text-[#1A1A1A]' : 'text-[#9B9B9B]'
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
