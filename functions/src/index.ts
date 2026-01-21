import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Anthropic from '@anthropic-ai/sdk';

// Define secret for API key (set via Firebase CLI)
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

interface UserContext {
  name: string;
  profession: string;
  company: string;
  projects: string[];
  additionalContext?: string;
}

interface CategorizationRequest {
  rawInput: string;
  userContext: UserContext;
}

function buildPrompt(rawInput: string, userContext: UserContext): string {
  return `You are an AI assistant helping ${userContext.name}, a ${userContext.profession} at ${userContext.company}.
${userContext.additionalContext || ''}

Current projects: ${userContext.projects.join(', ')}

Analyze the following captured thought and categorize it:

"${rawInput}"

Respond with a JSON object containing:
- category: one of "idea", "task", "reminder", "note"
- subcategory: optional more specific category (e.g., "Film", "Business", "Personal", "Health")
- title: a concise, actionable title (max 60 chars)
- entities: { people?: string[], dates?: string[], projects?: string[], locations?: string[] }
- urgency: one of "high", "medium", "low", "none"
- confidence: 0-1 score of how confident you are in this categorization

Guidelines:
- "idea" = creative concepts, brainstorms, possibilities, "what if" scenarios
- "task" = actionable items requiring completion, has verbs like "need to", "should", "must"
- "reminder" = time-sensitive notifications, things to remember, "don't forget"
- "note" = information capture, observations, references, general thoughts

Extract any mentioned people, dates (convert to ISO format if possible), projects (especially ${userContext.projects.join(', ')}), and locations.

Respond ONLY with valid JSON, no markdown formatting or explanation.`;
}

export const categorize = onRequest(
  {
    cors: true,
    secrets: [anthropicApiKey],
    region: 'us-central1',
  },
  async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { rawInput, userContext } = req.body as CategorizationRequest;

      if (!rawInput || !userContext) {
        res.status(400).json({ error: 'Missing required fields: rawInput and userContext' });
        return;
      }

      const client = new Anthropic({
        apiKey: anthropicApiKey.value(),
      });

      const message = await client.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: buildPrompt(rawInput, userContext),
          },
        ],
      });

      // Extract text content from response
      const textContent = message.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in response');
      }

      // Parse JSON from Claude's response
      const parsed = JSON.parse(textContent.text);

      res.status(200).json(parsed);
    } catch (error) {
      console.error('Claude API error:', error);
      res.status(500).json({ error: 'AI processing failed' });
    }
  }
);

// Health check endpoint
export const health = onRequest(
  {
    cors: true,
    region: 'us-central1',
  },
  async (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  }
);
