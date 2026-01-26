import { useState, useCallback, useMemo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useItems } from '@/context/items-context';
import { useHaptic } from '@/hooks/use-haptic';
import { BottomNav } from '@/components/layout/bottom-nav';
import { VersionFooter } from '@/components/layout/version-footer';
import { CaptureFab } from '@/components/layout/capture-fab';
import { cn } from '@/lib/cn';
import { getCategoryColor } from '@/lib/constants';
import type { MindifyItem, Category } from '@/types';

type FilterType = 'all' | Category;

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ActionsPage() {
  const { items, updateItem } = useItems();
  const haptic = useHaptic();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  // Filter to actionable items (captured status, tasks and reminders)
  const actionableItems = useMemo(() => {
    return items.filter((item) => {
      const isActionable = item.category === 'task' || item.category === 'reminder';
      const notArchived = item.status !== 'archived';
      const matchesFilter = filter === 'all' || item.category === filter;
      return isActionable && notArchived && matchesFilter;
    });
  }, [items, filter]);

  // Split into pending and completed
  const pendingItems = useMemo(
    () => actionableItems.filter((item) => item.status !== 'acted'),
    [actionableItems]
  );

  const completedItems = useMemo(
    () => actionableItems.filter((item) => item.status === 'acted'),
    [actionableItems]
  );

  const handleComplete = useCallback(
    (item: MindifyItem) => {
      if (item.status === 'acted') {
        // Undo - mark as captured
        updateItem(item.id, { status: 'captured' });
        haptic.light();
      } else {
        // Complete
        updateItem(item.id, { status: 'acted' });
        haptic.success();
      }
    },
    [updateItem, haptic]
  );

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'task', label: 'Tasks' },
    { value: 'reminder', label: 'Reminders' },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-4 pt-safe" style={{ backgroundColor: '#F5F0E8' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#1A1A1A]">Actions</h1>

          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-[#6B6B6B] text-sm font-medium shadow-sm"
            >
              {filterOptions.find(f => f.value === filter)?.label}
              <ChevronDown className="w-4 h-4" />
            </button>

            {showFilter && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilter(false)}
                />
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg z-20 overflow-hidden">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilter(option.value);
                        setShowFilter(false);
                      }}
                      className={cn(
                        'w-full px-4 py-3 text-left text-sm font-medium',
                        filter === option.value
                          ? 'text-[#1A1A1A] bg-[#F5F0E8]'
                          : 'text-[#6B6B6B] hover:bg-[#F5F0E8]'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 pt-2">
        {pendingItems.length === 0 && completedItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-[#BFFF00]/30 flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-[#65A30D]" />
            </div>
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2">All clear</h2>
            <p className="text-[#9B9B9B]">No actions right now</p>
          </div>
        ) : (
          <>
            {/* Pending items */}
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-2xl bg-white shadow-sm',
                    item.urgency === 'high' && 'border-l-4 border-l-[#EF4444]'
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleComplete(item)}
                    className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-[#D1D5DB] flex items-center justify-center mt-0.5 hover:border-[#9CA3AF] transition-colors"
                    aria-label="Complete item"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1A1A1A] leading-snug font-medium">{item.title}</p>
                    <p className="text-sm text-[#9B9B9B] mt-1.5">
                      <span className={cn('font-medium', getCategoryColor(item.category))}>{item.category}</span>
                      <span className="mx-2">·</span>
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Completed section */}
            {completedItems.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-3 w-full text-[#9B9B9B] text-sm mb-3"
                >
                  <div className="flex-1 h-px bg-[#EDE8DF]" />
                  <span className="font-medium">Finished ({completedItems.length})</span>
                  <ChevronDown className={cn('w-4 h-4 transition-transform', showCompleted && 'rotate-180')} />
                  <div className="flex-1 h-px bg-[#EDE8DF]" />
                </button>

                {showCompleted && (
                  <div className="space-y-3">
                    {completedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-4 rounded-2xl bg-white/60 shadow-sm"
                      >
                        {/* Checked circle */}
                        <button
                          onClick={() => handleComplete(item)}
                          className="flex-shrink-0 w-7 h-7 rounded-full bg-[#BFFF00] flex items-center justify-center mt-0.5"
                          aria-label="Undo completion"
                        >
                          <Check className="w-4 h-4 text-[#1A1A1A]" strokeWidth={2.5} />
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[#9B9B9B] line-through">{item.title}</p>
                          <p className="text-sm text-[#9B9B9B] mt-1.5">
                            <span className={getCategoryColor(item.category)}>{item.category}</span>
                            <span className="mx-2">·</span>
                            {formatRelativeTime(item.updatedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <CaptureFab />
      <VersionFooter />
      <BottomNav />
    </div>
  );
}
