import Anthropic from '@anthropic-ai/sdk';

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

export async function handleCategorize(body: CategorizationRequest): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { rawInput, userContext } = body;

  if (!rawInput || !userContext) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: rawInput and userContext' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const client = new Anthropic({ apiKey });

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

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    const parsed = JSON.parse(textContent.text);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Claude API error:', error);
    return new Response(
      JSON.stringify({ error: 'AI processing failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// NEW: Multi-item extraction for ADHD-friendly voice notes
function buildExtractionPrompt(rawInput: string, userContext: UserContext): string {
  return `You are an ADHD-friendly AI assistant helping ${userContext.name}, a ${userContext.profession} at ${userContext.company}.
${userContext.additionalContext || ''}

Current projects: ${userContext.projects.join(', ')}

TASK: Extract MULTIPLE discrete items from the following voice note. People with ADHD often capture many thoughts at once, so identify each distinct item separately.

Voice note: "${rawInput}"

For EACH distinct item you identify, extract:
- category: \"idea\" | \"task\" | \"reminder\" | \"note\"
- title: concise, actionable title (max 60 chars)
- tags: array of 2-5 relevant contextual tags (e.g., ["family", "phone"], ["app", "development"])
- urgency: \"high\" | \"medium\" | \"low\" | \"none\"
- confidence: 0-1 score of how confident you are in this extraction
- rawText: the specific portion of the voice note related to this item
- entities: { people?: string[], dates?: string[], projects?: string[], locations?: string[] }

Guidelines:
- **Separate by intent**: "Remind me to call mom at 3pm" + "I have an idea for an app" = 2 items
- **Separate by category**: "Buy groceries" (task) + "Don't forget the meeting" (reminder) = 2 items
- **Keep together**: "Build an app that tracks fitness goals" = 1 item (even if long)
- **Contextual tags**: Generate tags from context (e.g., time → "urgent", "family", person mentioned → their name)
- **Extract people**: Names, relationships (mom, boss, etc.)
- **Extract dates**: Convert to ISO format if possible (today + 3pm → timestamp), otherwise keep as-is
- **Extract projects**: Match against: ${userContext.projects.join(', ')}

CRITICAL: Even if there's only 1 item, return it in the items array.

Respond with valid JSON:
{
  "items": [
    {
      "category": "reminder",
      "title": "Call mom",
      "tags": ["family", "phone", "urgent"],
      "urgency": "medium",
      "confidence": 0.95,
      "rawText": "Remind me to call mom at 3pm",
      "entities": {
        "people": ["mom"],
        "dates": ["3pm today"],
        "projects": [],
        "locations": []
      }
    }
  ],
  "reasoning": "Detected 1 time-bound reminder with family member"
}

Respond ONLY with valid JSON, no markdown or explanation.`;
}

export async function handleExtractMultiple(body: CategorizationRequest): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { rawInput, userContext } = body;

  if (!rawInput || !userContext) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: rawInput and userContext' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 2048, // Increased for multiple items
      messages: [
        {
          role: 'user',
          content: buildExtractionPrompt(rawInput, userContext),
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    const parsed = JSON.parse(textContent.text);

    // Validate response structure
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid response format: missing items array');
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Multi-item extraction error:', error);
    return new Response(
      JSON.stringify({ error: 'AI extraction failed', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
