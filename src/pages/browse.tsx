import { useParams, Link } from 'react-router-dom';
import { ItemCard } from '@/components/items/item-card';
import { CategoryBadge } from '@/components/items/category-badge';
import { Card } from '@/components/ui/card';
import { useItems } from '@/context/items-context';
import { CATEGORY_LABELS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Category } from '@/types';

export function BrowsePage() {
  const { category } = useParams<{ category: string }>();
  const { items } = useItems();

  const categories: Category[] = ['idea', 'task', 'reminder', 'note'];
  const isAllView = category === 'all' || !category;

  const filteredItems = isAllView
    ? items
    : items.filter((item) => item.category === category);

  const pageTitle = isAllView
    ? 'All Captures'
    : CATEGORY_LABELS[category as Category] || 'Browse';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="p-4 pt-safe">
        <h1 className="text-2xl font-bold text-gray-100">{pageTitle}</h1>
        <p className="text-gray-400 mt-1">{filteredItems.length} items</p>
      </header>

      <main className="px-4 space-y-4">
        {/* Category filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <Link
            to="/browse/all"
            className={cn(
              'px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors',
              isAllView
                ? 'bg-category-task text-white'
                : 'bg-surface text-gray-400 hover:bg-surface-elevated'
            )}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              to={`/browse/${cat}`}
              className={cn(
                'px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors',
                category === cat
                  ? 'bg-category-task text-white'
                  : 'bg-surface text-gray-400 hover:bg-surface-elevated'
              )}
            >
              <CategoryBadge category={cat} size="sm" />
            </Link>
          ))}
        </div>

        {/* Items list */}
        <div className="space-y-2">
          {filteredItems.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-gray-500">
                {isAllView
                  ? 'No captures yet'
                  : `No ${CATEGORY_LABELS[category as Category]?.toLowerCase() || ''} items`}
              </p>
              <Link
                to="/capture"
                className="text-category-task text-sm hover:underline mt-2 inline-block"
              >
                Capture something
              </Link>
            </Card>
          ) : (
            filteredItems.map((item) => <ItemCard key={item.id} item={item} />)
          )}
        </div>
      </main>
    </div>
  );
}
