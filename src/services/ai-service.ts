import type { AICategorizationResponse, Category, Urgency, MultiItemExtractionResponse } from '@/types';
import { USER_CONTEXT } from '@/lib/constants';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || '/api/categorize';

export interface AIService {
  categorize(rawInput: string): Promise<AICategorizationResponse>;
  extractMultipleItems(rawInput: string): Promise<MultiItemExtractionResponse>;
  isAvailable(): Promise<boolean>;
}

class ClaudeAIService implements AIService {
  async categorize(rawInput: string): Promise<AICategorizationResponse> {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawInput,
        userContext: USER_CONTEXT,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI categorization failed: ${response.status}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  async extractMultipleItems(rawInput: string): Promise<MultiItemExtractionResponse> {
    try {
      const response = await fetch(`${API_ENDPOINT}/extract-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawInput,
          userContext: USER_CONTEXT,
        }),
      });

      if (!response.ok) {
        // If endpoint doesn't exist or fails, fall back to offline mode
        console.warn(`API extraction failed (${response.status}), falling back to offline mode`);
        return offlineAIService.extractMultipleItems(rawInput);
      }

      const data = await response.json();
      return this.parseMultiItemResponse(data);
    } catch (error) {
      // Network error or endpoint doesn't exist - use offline mode
      console.warn('API extraction error, falling back to offline mode:', error);
      return offlineAIService.extractMultipleItems(rawInput);
    }
  }

  private parseResponse(data: unknown): AICategorizationResponse {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid AI response format');
    }

    const response = data as Record<string, unknown>;

    const validCategories = ['idea', 'task', 'reminder', 'note'];
    const validUrgencies = ['high', 'medium', 'low', 'none'];

    if (!validCategories.includes(response.category as string)) {
      throw new Error('Invalid category in AI response');
    }

    if (!validUrgencies.includes(response.urgency as string)) {
      throw new Error('Invalid urgency in AI response');
    }

    const entities = response.entities as Record<string, unknown> | undefined;

    return {
      category: response.category as Category,
      subcategory: response.subcategory as string | undefined,
      title: String(response.title || '').slice(0, 60),
      entities: {
        people: Array.isArray(entities?.people) ? entities.people : [],
        dates: Array.isArray(entities?.dates) ? entities.dates : [],
        projects: Array.isArray(entities?.projects) ? entities.projects : [],
        locations: Array.isArray(entities?.locations) ? entities.locations : [],
      },
      urgency: response.urgency as Urgency,
      confidence: typeof response.confidence === 'number' ? response.confidence : 0.5,
      reasoning: response.reasoning as string | undefined,
    };
  }

  private parseMultiItemResponse(data: unknown): MultiItemExtractionResponse {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid multi-item extraction response format');
    }

    const response = data as Record<string, unknown>;
    const validCategories = ['idea', 'task', 'reminder', 'note'];
    const validUrgencies = ['high', 'medium', 'low', 'none'];

    if (!Array.isArray(response.items)) {
      throw new Error('Invalid items array in response');
    }

    const items = response.items.map((item: unknown) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error('Invalid item in extraction response');
      }

      const itemData = item as Record<string, unknown>;

      if (!validCategories.includes(itemData.category as string)) {
        throw new Error('Invalid category in extracted item');
      }

      if (!validUrgencies.includes(itemData.urgency as string)) {
        throw new Error('Invalid urgency in extracted item');
      }

      const entities = itemData.entities as Record<string, unknown> | undefined;

      return {
        category: itemData.category as Category,
        title: String(itemData.title || '').slice(0, 60),
        tags: Array.isArray(itemData.tags) ? itemData.tags.map(String) : [],
        urgency: itemData.urgency as Urgency,
        confidence: typeof itemData.confidence === 'number' ? itemData.confidence : 0.5,
        rawText: String(itemData.rawText || ''),
        entities: entities ? {
          people: Array.isArray(entities.people) ? entities.people : [],
          dates: Array.isArray(entities.dates) ? entities.dates : [],
          projects: Array.isArray(entities.projects) ? entities.projects : [],
          locations: Array.isArray(entities.locations) ? entities.locations : [],
        } : undefined,
      };
    });

    return {
      items,
      reasoning: String(response.reasoning || ''),
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${API_ENDPOINT}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

class OfflineCategorizationService implements AIService {
  async categorize(rawInput: string): Promise<AICategorizationResponse> {
    const lowerInput = rawInput.toLowerCase();

    let category: Category = 'note';
    let urgency: Urgency = 'none';
    let subcategory: string | undefined;

    // Reminder detection
    if (
      lowerInput.includes('remind') ||
      lowerInput.includes("don't forget") ||
      lowerInput.includes('remember to') ||
      lowerInput.includes('remember that')
    ) {
      category = 'reminder';
      urgency = 'medium';
    }
    // Task detection
    else if (
      lowerInput.includes('need to') ||
      lowerInput.includes('should') ||
      lowerInput.includes('todo') ||
      lowerInput.includes('to do') ||
      lowerInput.includes('must') ||
      lowerInput.includes('have to') ||
      lowerInput.includes('gotta')
    ) {
      category = 'task';
      urgency = 'medium';
    }
    // Idea detection
    else if (
      lowerInput.includes('idea') ||
      lowerInput.includes('what if') ||
      lowerInput.includes('maybe') ||
      lowerInput.includes('could') ||
      lowerInput.includes('might be cool') ||
      lowerInput.includes('thinking about')
    ) {
      category = 'idea';
    }

    // Urgency detection
    if (
      lowerInput.includes('urgent') ||
      lowerInput.includes('asap') ||
      lowerInput.includes('immediately') ||
      lowerInput.includes('right now') ||
      lowerInput.includes('today')
    ) {
      urgency = 'high';
    }

    // Subcategory detection for ideas
    if (category === 'idea') {
      if (
        lowerInput.includes('film') ||
        lowerInput.includes('movie') ||
        lowerInput.includes('script') ||
        lowerInput.includes('scene')
      ) {
        subcategory = 'Film';
      } else if (
        lowerInput.includes('business') ||
        lowerInput.includes('company') ||
        lowerInput.includes('startup')
      ) {
        subcategory = 'Business';
      }
    }

    // Extract entities (basic)
    const people: string[] = [];
    const projects: string[] = [];

    // Check for known projects
    const knownProjects = ['oro verde', 'storiq', 'monkey to master'];
    for (const project of knownProjects) {
      if (lowerInput.includes(project)) {
        projects.push(project.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      }
    }

    // Generate title
    const title = rawInput.slice(0, 60).trim() + (rawInput.length > 60 ? '...' : '');

    return {
      category,
      subcategory,
      title,
      entities: {
        people,
        projects,
        dates: [],
        locations: [],
      },
      urgency,
      confidence: 0.3,
    };
  }

  async extractMultipleItems(rawInput: string): Promise<MultiItemExtractionResponse> {
    // Offline mode: Try to split on common separators
    const separators = [
      /\.\s+(?:and|also|plus|additionally|then)\s+/i,
      /,\s+(?:and|also|plus|additionally|then)\s+/i,
      /\s+(?:and|also|plus|then)\s+/i,
    ];

    let segments = [rawInput];

    // Try splitting with separators
    for (const separator of separators) {
      const parts = rawInput.split(separator);
      if (parts.length > 1 && parts.length <= 5) { // Max 5 items to avoid false positives
        segments = parts;
        break;
      }
    }

    // If we couldn't split, return as single item
    if (segments.length === 1) {
      const singleItem = await this.categorize(rawInput);
      return {
        items: [{
          category: singleItem.category,
          title: singleItem.title,
          tags: [],
          urgency: singleItem.urgency,
          confidence: singleItem.confidence,
          rawText: rawInput,
          entities: singleItem.entities,
        }],
        reasoning: 'Offline mode: Processed as single item. Connect to internet for better multi-item extraction.',
      };
    }

    // Categorize each segment
    const items = await Promise.all(
      segments.map(async (segment) => {
        const cleaned = segment.trim();
        if (!cleaned) return null;

        const result = await this.categorize(cleaned);
        return {
          category: result.category,
          title: result.title,
          tags: [],
          urgency: result.urgency,
          confidence: result.confidence * 0.7, // Lower confidence for offline splitting
          rawText: cleaned,
          entities: result.entities,
        };
      })
    );

    const validItems = items.filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      items: validItems,
      reasoning: `Offline mode: Detected ${validItems.length} items. Connect to internet for AI-powered extraction.`,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

export function createAIService(online: boolean): AIService {
  return online ? new ClaudeAIService() : new OfflineCategorizationService();
}

export const aiService = new ClaudeAIService();
export const offlineAIService = new OfflineCategorizationService();
