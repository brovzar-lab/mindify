export type Category = 'idea' | 'task' | 'reminder' | 'note';
export type Urgency = 'high' | 'medium' | 'low' | 'none';
export type Status = 'captured' | 'acted' | 'archived';

export interface EntityExtraction {
  people?: string[];
  dates?: string[];
  projects?: string[];
  locations?: string[];
}

export interface MindifyItem {
  id: string;
  rawInput: string;
  category: Category;
  subcategory?: string;
  title: string;
  entities: EntityExtraction;
  urgency: Urgency;
  status: Status;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  pendingAIProcessing: boolean;
}

export interface AICategorizationResponse {
  category: Category;
  subcategory?: string;
  title: string;
  entities: EntityExtraction;
  urgency: Urgency;
  confidence: number;
  reasoning?: string;
}

export interface UserContext {
  name: string;
  profession: string;
  company: string;
  projects: string[];
  additionalContext?: string;
}
