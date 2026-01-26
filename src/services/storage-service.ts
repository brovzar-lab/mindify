import { STORAGE_KEYS } from '@/lib/constants';
import type { MindifyItem } from '@/types';
import type { Project } from '@/types/project';

export interface StorageService {
  // Items
  getItems(): MindifyItem[];
  saveItem(item: MindifyItem): void;
  updateItem(id: string, updates: Partial<MindifyItem>): MindifyItem | null;
  deleteItem(id: string): void;
  getItemById(id: string): MindifyItem | undefined;
  // Projects
  getProjects(): Project[];
  saveProject(project: Project): void;
  updateProject(id: string, updates: Partial<Project>): Project | null;
  deleteProject(id: string): void;
  getProjectById(id: string): Project | undefined;
  // Utility
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

  // ============ ITEMS ============

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

  // ============ PROJECTS ============

  getProjects(): Project[] {
    return this.getFromStorage<Project[]>(STORAGE_KEYS.PROJECTS, []);
  }

  getProjectById(id: string): Project | undefined {
    return this.getProjects().find(project => project.id === id);
  }

  saveProject(project: Project): void {
    const projects = this.getProjects();
    projects.push(project);
    this.setToStorage(STORAGE_KEYS.PROJECTS, projects);
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const projects = this.getProjects();
    const index = projects.findIndex(project => project.id === id);

    if (index !== -1) {
      projects[index] = {
        ...projects[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.setToStorage(STORAGE_KEYS.PROJECTS, projects);
      return projects[index];
    }
    return null;
  }

  deleteProject(id: string): void {
    const projects = this.getProjects().filter(project => project.id !== id);
    this.setToStorage(STORAGE_KEYS.PROJECTS, projects);
  }

  // ============ UTILITY ============

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const storageService = new LocalStorageService();
