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
  tags: string[]; // NEW: Support for multiple tags
  entities: EntityExtraction;
  urgency: Urgency;
  status: Status;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  pendingAIProcessing: boolean;
  scheduledNotification?: {
    id: number;
    scheduledTime: string; // ISO timestamp
    snoozeCount: number;
    isRecurring: boolean;
  };
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

// NEW: Types for multi-item extraction from single voice note
export interface ExtractedItem {
  category: Category;
  title: string;
  tags: string[];
  urgency: Urgency;
  confidence: number;
  rawText: string; // The portion of voice note related to this item
  entities?: EntityExtraction;
}

export interface MultiItemExtractionResponse {
  items: ExtractedItem[];
  reasoning: string; // Explanation of what was extracted
}

export interface UserContext {
  name: string;
  profession: string;
  company: string;
  projects: string[];
  additionalContext?: string;
}

