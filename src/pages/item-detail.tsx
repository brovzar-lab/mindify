import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryBadge } from '@/components/items/category-badge';
import { useItems } from '@/context/items-context';
import { useHaptic } from '@/hooks/use-haptic';
import { cn } from '@/lib/cn';

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getItemById, updateItem, deleteItem } = useItems();
  const haptic = useHaptic();

  const item = id ? getItemById(id) : undefined;

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="text-center p-8">
          <p className="text-gray-400 mb-4">Item not found</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  const handleMarkActed = () => {
    updateItem(item.id, { status: 'acted' });
    haptic.success();
  };

  const handleMarkCaptured = () => {
    updateItem(item.id, { status: 'captured' });
    haptic.light();
  };

  const handleDelete = () => {
    if (window.confirm('Delete this item?')) {
      deleteItem(item.id);
      haptic.warning();
      navigate(-1);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between p-4 pt-safe">
        <button
          onClick={() => navigate(-1)}
          className="min-h-touch min-w-touch flex items-center justify-center"
          aria-label="Go back"
        >
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-100">Details</h1>
        <button
          onClick={handleDelete}
          className="min-h-touch min-w-touch flex items-center justify-center text-red-400"
          aria-label="Delete"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </header>

      <main className="px-4 space-y-4">
        {/* Category and status */}
        <div className="flex items-center gap-2">
          <CategoryBadge category={item.category} />
          {item.subcategory && (
            <span className="text-sm text-gray-500">{item.subcategory}</span>
          )}
          {item.urgency !== 'none' && (
            <span
              className={cn('text-xs px-2 py-0.5 rounded', {
                'bg-red-500/20 text-red-400': item.urgency === 'high',
                'bg-yellow-500/20 text-yellow-400': item.urgency === 'medium',
                'bg-gray-500/20 text-gray-400': item.urgency === 'low',
              })}
            >
              {item.urgency} priority
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-100">{item.title}</h2>

        {/* Original input */}
        <Card>
          <p className="text-gray-300 leading-relaxed">{item.rawInput}</p>
        </Card>

        {/* Entities */}
        {(item.entities.projects?.length ||
          item.entities.people?.length ||
          item.entities.dates?.length) && (
          <Card>
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              Extracted info
            </h3>
            <div className="space-y-2">
              {item.entities.projects && item.entities.projects.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500">Projects:</span>
                  {item.entities.projects.map((project) => (
                    <span
                      key={project}
                      className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded"
                    >
                      {project}
                    </span>
                  ))}
                </div>
              )}
              {item.entities.people && item.entities.people.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500">People:</span>
                  {item.entities.people.map((person) => (
                    <span
                      key={person}
                      className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded"
                    >
                      @{person}
                    </span>
                  ))}
                </div>
              )}
              {item.entities.dates && item.entities.dates.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500">Dates:</span>
                  {item.entities.dates.map((date) => (
                    <span
                      key={date}
                      className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded"
                    >
                      {date}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <div className="space-y-1 text-sm text-gray-500">
            <p>Created: {formatDate(item.createdAt)}</p>
            <p>Updated: {formatDate(item.updatedAt)}</p>
            <p>
              Status:{' '}
              <span
                className={cn({
                  'text-yellow-400': item.status === 'captured',
                  'text-green-400': item.status === 'acted',
                  'text-gray-400': item.status === 'archived',
                })}
              >
                {item.status}
              </span>
            </p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {item.status === 'captured' ? (
            <Button onClick={handleMarkActed} className="flex-1">
              Mark as Done
            </Button>
          ) : (
            <Button onClick={handleMarkCaptured} variant="secondary" className="flex-1">
              Mark as Open
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
