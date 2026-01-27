import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Inbox as InboxIcon, Loader2 } from 'lucide-react';
import { useItems } from '@/context/items-context';
import { useHaptic } from '@/hooks/use-haptic';
import { BottomNav } from '@/components/layout/bottom-nav';
import { VersionFooter } from '@/components/layout/version-footer';
import { CaptureFab } from '@/components/layout/capture-fab';
import { cn } from '@/lib/cn';
import { getCategoryColor } from '@/lib/constants';
import type { MindifyItem } from '@/types';

export function InboxPage() {
  const navigate = useNavigate();
  const { items, updateItem, refreshItems } = useItems();
  const haptic = useHaptic();

  // Poll for updates while there are processing items
  const processingItems = items.filter(
    item => item.status === 'inbox' && item.pendingAIProcessing
  );

  useEffect(() => {
    if (processingItems.length > 0) {
      const interval = setInterval(() => {
        refreshItems();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [processingItems.length, refreshItems]);

  // Get inbox items that are ready for review (AI processing complete)
  const inboxItems = items.filter(
    item => item.status === 'inbox' && !item.pendingAIProcessing
  );

  // Approve single item - move to captured status
  const handleApprove = useCallback((item: MindifyItem) => {
    updateItem(item.id, { status: 'captured' });
    haptic.success();
  }, [updateItem, haptic]);

  // Approve all remaining items
  const handleApproveAll = useCallback(() => {
    inboxItems.forEach(item => {
      updateItem(item.id, { status: 'captured' });
    });
    haptic.success();
  }, [inboxItems, updateItem, haptic]);

  // If inbox is empty and nothing processing, show empty state
  if (inboxItems.length === 0 && processingItems.length === 0) {
    return (
      <div className="min-h-screen pb-24" style={{ backgroundColor: '#F5F0E8' }}>
        <header className="sticky top-0 z-10 px-4 py-4 pt-safe" style={{ backgroundColor: '#F5F0E8' }}>
          <h1 className="text-xl font-semibold text-[#1A1A1A]">Inbox</h1>
        </header>

        <main className="flex flex-col items-center justify-center px-6 pt-20">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm">
            <InboxIcon className="w-10 h-10 text-[#9B9B9B]" />
          </div>
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2">All caught up</h2>
          <p className="text-[#9B9B9B] text-center mb-8">
            Nothing to review right now
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-[#1A1A1A] text-white font-medium shadow-sm"
          >
            Capture a thought
          </button>
        </main>

        <VersionFooter />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-4 pt-safe" style={{ backgroundColor: '#F5F0E8' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#1A1A1A]">Inbox</h1>
          {inboxItems.length > 1 && (
            <button
              onClick={handleApproveAll}
              className="text-sm text-[#1A1A1A] font-semibold px-3 py-1.5 rounded-lg bg-[#BFFF00]"
            >
              Accept All
            </button>
          )}
        </div>
      </header>

      {/* Items */}
      <main className="px-4 pt-2 space-y-3">
        {/* Processing indicator */}
        {processingItems.length > 0 && (
          <div className="p-4 rounded-2xl bg-white/70 shadow-sm border border-dashed border-[#BFFF00]">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#BFFF00] animate-spin" />
              <div>
                <p className="text-[#1A1A1A] font-medium">
                  Organizing {processingItems.length} thought{processingItems.length > 1 ? 's' : ''}...
                </p>
                <p className="text-sm text-[#9B9B9B]">
                  AI is categorizing your captures
                </p>
              </div>
            </div>
          </div>
        )}

        {inboxItems.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-white shadow-sm"
          >
            {/* Title and category */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[#1A1A1A] leading-snug font-medium">{item.title}</p>
                <p className={cn('text-sm font-medium mt-1.5', getCategoryColor(item.category))}>
                  {item.category}
                </p>
              </div>

              {/* Approve button */}
              <button
                onClick={() => handleApprove(item)}
                className="flex-shrink-0 w-11 h-11 rounded-full bg-[#BFFF00] flex items-center justify-center shadow-sm"
                aria-label="Approve"
              >
                <Check className="w-5 h-5 text-[#1A1A1A]" strokeWidth={2.5} />
              </button>
            </div>

            {/* Show raw input if different from title (multi-item extraction) */}
            {item.rawInput !== item.title && item.rawInput.length > item.title.length + 10 && (
              <div className="mt-3 pt-3 border-t border-[#EDE8DF]">
                <p className="text-sm text-[#9B9B9B] italic">
                  "{item.rawInput.slice(0, 100)}{item.rawInput.length > 100 ? '...' : ''}"
                </p>
              </div>
            )}
          </div>
        ))}
      </main>

      <CaptureFab />
      <VersionFooter />
      <BottomNav />
    </div>
  );
}
