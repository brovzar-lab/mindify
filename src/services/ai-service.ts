import type { AICategorizationResponse, Category, Urgency } from '@/types';
import { USER_CONTEXT } from '@/lib/constants';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || '/api/categorize';

export interface AIService {
  categorize(rawInput: string): Promise<AICategorizationResponse>;
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

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

export function createAIService(online: boolean): AIService {
  return online ? new ClaudeAIService() : new OfflineCategorizationService();
}

export const aiService = new ClaudeAIService();
export const offlineAIService = new OfflineCategorizationService();
