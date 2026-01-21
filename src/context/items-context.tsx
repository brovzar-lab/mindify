import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { storageService } from '@/services/storage-service';
import type { MindifyItem, Category, Status } from '@/types';

interface ItemsContextType {
  items: MindifyItem[];
  addItem: (item: MindifyItem) => void;
  updateItem: (id: string, updates: Partial<MindifyItem>) => void;
  deleteItem: (id: string) => void;
  getItemById: (id: string) => MindifyItem | undefined;
  getItemsByCategory: (category: Category) => MindifyItem[];
  getItemsByStatus: (status: Status) => MindifyItem[];
  refreshItems: () => void;
}

const ItemsContext = createContext<ItemsContextType | null>(null);

export function ItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MindifyItem[]>([]);

  const refreshItems = useCallback(() => {
    const storedItems = storageService.getItems();
    setItems(storedItems);
  }, []);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  const addItem = useCallback((item: MindifyItem) => {
    storageService.saveItem(item);
    setItems((prev) => [item, ...prev]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<MindifyItem>) => {
    const updated = storageService.updateItem(id, updates);
    if (updated) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
    }
  }, []);

  const deleteItem = useCallback((id: string) => {
    storageService.deleteItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const getItemById = useCallback(
    (id: string) => items.find((item) => item.id === id),
    [items]
  );

  const getItemsByCategory = useCallback(
    (category: Category) => items.filter((item) => item.category === category),
    [items]
  );

  const getItemsByStatus = useCallback(
    (status: Status) => items.filter((item) => item.status === status),
    [items]
  );

  return (
    <ItemsContext.Provider
      value={{
        items,
        addItem,
        updateItem,
        deleteItem,
        getItemById,
        getItemsByCategory,
        getItemsByStatus,
        refreshItems,
      }}
    >
      {children}
    </ItemsContext.Provider>
  );
}

export function useItems() {
  const context = useContext(ItemsContext);

  if (!context) {
    throw new Error('useItems must be used within an ItemsProvider');
  }

  return context;
}
