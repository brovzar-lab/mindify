import type { AICategorizationResponse, Category, Urgency, MultiItemExtractionResponse } from '@/types';
import { USER_CONTEXT } from '@/lib/constants';

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export interface AIService {
  categorize(rawInput: string): Promise<AICategorizationResponse>;
  extractMultipleItems(rawInput: string): Promise<MultiItemExtractionResponse>;
  isAvailable(): Promise<boolean>;
}

/**
 * Claude-powered AI service for intelligent thought organization
 */
class ClaudeDirectService implements AIService {
  private apiKey: string;

  constructor() {
    this.apiKey = ANTHROPIC_API_KEY || '';
  }

  async extractMultipleItems(rawInput: string): Promise<MultiItemExtractionResponse> {
    if (!this.apiKey) {
      console.warn('[AIService] No API key configured, using offline mode');
      return offlineAIService.extractMultipleItems(rawInput);
    }

    try {
      console.log('[AIService] Calling Claude API for extraction');

      const systemPrompt = `You are an intelligent personal assistant that helps organize thoughts, ideas, tasks, and reminders.

User Context:
- Name: ${USER_CONTEXT.name}
- Known Projects: ${USER_CONTEXT.projects.join(', ')}
- Categories: idea, task, reminder, note
- Urgency levels: high, medium, low, none

Your job is to analyze a voice transcription and extract distinct actionable items from it. A single recording might contain multiple separate thoughts, tasks, or ideas that should be split into individual items.

IMPORTANT GUIDELINES:
1. Look for natural separations - "and", "also", "another thing", topic changes, etc.
2. Don't create items from filler words like "um", "uh", "and", "so"
3. Each item should be a complete, meaningful thought
4. Assign appropriate categories based on content:
   - "task" = something to do (action item, to-do)
   - "reminder" = something to remember at a specific time/event
   - "idea" = a creative thought, concept, or possibility
   - "note" = general information, observation, or reference
5. Extract entities like people names, dates, projects mentioned
6. Determine urgency based on time-sensitivity and importance

Respond with valid JSON only, no markdown or explanation.`;

      const userPrompt = `Extract and organize the distinct items from this voice transcription:

"${rawInput}"

Respond with this exact JSON structure:
{
  "items": [
    {
      "category": "task|reminder|idea|note",
      "title": "concise title (max 60 chars)",
      "rawText": "the original text for this item",
      "tags": ["relevant", "tags"],
      "urgency": "high|medium|low|none",
      "confidence": 0.0-1.0,
      "entities": {
        "people": ["names mentioned"],
        "dates": ["dates or times mentioned"],
        "projects": ["project names"],
        "locations": ["places mentioned"]
      }
    }
  ],
  "reasoning": "brief explanation of how you split and categorized"
}`;

      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AIService] Claude API error:', response.status, errorText);
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new Error('No content in Claude response');
      }

      // Parse the JSON response
      const parsed = JSON.parse(content);
      return this.validateExtractionResponse(parsed);

    } catch (error) {
      console.error('[AIService] Claude extraction failed:', error);
      console.warn('[AIService] Falling back to offline mode');
      return offlineAIService.extractMultipleItems(rawInput);
    }
  }

  async categorize(rawInput: string): Promise<AICategorizationResponse> {
    // Use extractMultipleItems and return the first item
    const result = await this.extractMultipleItems(rawInput);
    if (result.items.length === 0) {
      throw new Error('No items extracted');
    }
    const item = result.items[0];
    return {
      category: item.category,
      title: item.title,
      entities: item.entities || { people: [], dates: [], projects: [], locations: [] },
      urgency: item.urgency,
      confidence: item.confidence,
      reasoning: result.reasoning,
    };
  }

  private validateExtractionResponse(data: unknown): MultiItemExtractionResponse {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid extraction response format');
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

      // Default to 'note' if category is invalid
      let category: Category = 'note';
      if (validCategories.includes(itemData.category as string)) {
        category = itemData.category as Category;
      }

      // Default to 'none' if urgency is invalid
      let urgency: Urgency = 'none';
      if (validUrgencies.includes(itemData.urgency as string)) {
        urgency = itemData.urgency as Urgency;
      }

      const entities = itemData.entities as Record<string, unknown> | undefined;

      return {
        category,
        title: String(itemData.title || '').slice(0, 60),
        tags: Array.isArray(itemData.tags) ? itemData.tags.map(String) : [],
        urgency,
        confidence: typeof itemData.confidence === 'number' ? itemData.confidence : 0.8,
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
    return !!this.apiKey;
  }
}

/**
 * Offline fallback service using keyword matching
 */
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
      if (parts.length > 1 && parts.length <= 5) {
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
        reasoning: 'Offline mode: Processed as single item. Add API key for AI-powered extraction.',
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
          confidence: result.confidence * 0.7,
          rawText: cleaned,
          entities: result.entities,
        };
      })
    );

    const validItems = items.filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      items: validItems,
      reasoning: `Offline mode: Detected ${validItems.length} items. Add API key for AI-powered extraction.`,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

export function createAIService(online: boolean): AIService {
  return online ? new ClaudeDirectService() : new OfflineCategorizationService();
}

export const aiService = new ClaudeDirectService();
export const offlineAIService = new OfflineCategorizationService();
