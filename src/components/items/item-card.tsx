import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { CategoryBadge } from './category-badge';
import { cn } from '@/lib/cn';
import { CATEGORY_COLORS } from '@/lib/constants';
import type { MindifyItem } from '@/types';

interface ItemCardProps {
  item: MindifyItem;
  compact?: boolean;
}

export function ItemCard({ item, compact = false }: ItemCardProps) {
  const colors = CATEGORY_COLORS[item.category];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Link to={`/item/${item.id}`}>
      <Card
        variant="default"
        className={cn(
          'transition-all duration-200',
          'hover:bg-surface-elevated active:scale-[0.98]',
          'border-l-4',
          colors.border,
          'min-h-touch'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CategoryBadge category={item.category} size="sm" />
              {item.urgency !== 'none' && (
                <span
                  className={cn('text-xs px-1.5 py-0.5 rounded', {
                    'bg-red-500/20 text-red-400': item.urgency === 'high',
                    'bg-yellow-500/20 text-yellow-400': item.urgency === 'medium',
                    'bg-gray-500/20 text-gray-400': item.urgency === 'low',
                  })}
                >
                  {item.urgency}
                </span>
              )}
              {item.status === 'acted' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                  done
                </span>
              )}
            </div>

            <h3 className="text-gray-100 font-medium truncate">{item.title}</h3>

            {!compact && (
              <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                {item.rawInput}
              </p>
            )}

            {/* Entity tags */}
            {!compact && item.entities && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.entities.projects?.map((project) => (
                  <span
                    key={project}
                    className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded"
                  >
                    {project}
                  </span>
                ))}
                {item.entities.people?.map((person) => (
                  <span
                    key={person}
                    className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded"
                  >
                    @{person}
                  </span>
                ))}
              </div>
            )}
          </div>

          <span className="text-gray-500 text-xs whitespace-nowrap">
            {formatDate(item.createdAt)}
          </span>
        </div>
      </Card>
    </Link>
  );
}
