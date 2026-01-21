import { STORAGE_KEYS } from '@/lib/constants';
import type { MindifyItem } from '@/types';

export interface StorageService {
  getItems(): MindifyItem[];
  saveItem(item: MindifyItem): void;
  updateItem(id: string, updates: Partial<MindifyItem>): MindifyItem | null;
  deleteItem(id: string): void;
  getItemById(id: string): MindifyItem | undefined;
  clearAll(): void;
}

class LocalStorageService implements StorageService {
  private getFromStorage<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      console.error(`Error reading from localStorage key: ${key}`);
      return defaultValue;
    }
  }

  private setToStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key: ${key}`, error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.handleQuotaExceeded();
      }
    }
  }

  private handleQuotaExceeded(): void {
    const items = this.getItems();
    const archivedItems = items.filter(item => item.status === 'archived');

    if (archivedItems.length > 0) {
      const sortedArchived = archivedItems.sort(
        (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
      const toRemove = sortedArchived.slice(0, Math.ceil(sortedArchived.length / 2));
      toRemove.forEach(item => this.deleteItem(item.id));
    }
  }

  getItems(): MindifyItem[] {
    return this.getFromStorage<MindifyItem[]>(STORAGE_KEYS.ITEMS, []);
  }

  getItemById(id: string): MindifyItem | undefined {
    return this.getItems().find(item => item.id === id);
  }

  saveItem(item: MindifyItem): void {
    const items = this.getItems();
    items.unshift(item);
    this.setToStorage(STORAGE_KEYS.ITEMS, items);
  }

  updateItem(id: string, updates: Partial<MindifyItem>): MindifyItem | null {
    const items = this.getItems();
    const index = items.findIndex(item => item.id === id);

    if (index !== -1) {
      items[index] = {
        ...items[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.setToStorage(STORAGE_KEYS.ITEMS, items);
      return items[index];
    }
    return null;
  }

  deleteItem(id: string): void {
    const items = this.getItems().filter(item => item.id !== id);
    this.setToStorage(STORAGE_KEYS.ITEMS, items);
  }

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const storageService = new LocalStorageService();
