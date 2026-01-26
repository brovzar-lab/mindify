import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { storageService } from '@/services/storage-service';
import type { MindifyItem, Category, Status } from '@/types';
import type { Project } from '@/types/project';

interface ItemsContextType {
  items: MindifyItem[];
  projects: Project[];
  addItem: (item: MindifyItem) => void;
  updateItem: (id: string, updates: Partial<MindifyItem>) => void;
  deleteItem: (id: string) => void;
  getItemById: (id: string) => MindifyItem | undefined;
  getItemsByCategory: (category: Category) => MindifyItem[];
  getItemsByStatus: (status: Status) => MindifyItem[];
  refreshItems: () => void;
  // Project management
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProjectById: (id: string) => Project | undefined;
  getItemsByProject: (projectId: string) => MindifyItem[];
  refreshProjects: () => void;
}

const ItemsContext = createContext<ItemsContextType | null>(null);

export function ItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MindifyItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const refreshItems = useCallback(() => {
    const storedItems = storageService.getItems();
    setItems(storedItems);
  }, []);

  const refreshProjects = useCallback(() => {
    const storedProjects = storageService.getProjects();
    setProjects(storedProjects);
  }, []);

  useEffect(() => {
    refreshItems();
    refreshProjects();
  }, [refreshItems, refreshProjects]);

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

  // Project management methods
  const addProject = useCallback((project: Project) => {
    storageService.saveProject(project);
    setProjects((prev) => [...prev, project]);
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    const updated = storageService.updateProject(id, updates);
    if (updated) {
      setProjects((prev) =>
        prev.map((project) => (project.id === id ? updated : project))
      );
    }
  }, []);

  const deleteProject = useCallback((id: string) => {
    storageService.deleteProject(id);
    setProjects((prev) => prev.filter((project) => project.id !== id));
  }, []);

  const getProjectById = useCallback(
    (id: string) => projects.find((project) => project.id === id),
    [projects]
  );

  const getItemsByProject = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return [];
      return items.filter((item) => project.itemIds.includes(item.id));
    },
    [projects, items]
  );

  return (
    <ItemsContext.Provider
      value={{
        items,
        projects,
        addItem,
        updateItem,
        deleteItem,
        getItemById,
        getItemsByCategory,
        getItemsByStatus,
        refreshItems,
        addProject,
        updateProject,
        deleteProject,
        getProjectById,
        getItemsByProject,
        refreshProjects,
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
