import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import type { Plugin } from 'vite'
import Anthropic from '@anthropic-ai/sdk'

// Local API plugin for development
function localApiPlugin(): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/categorize' && req.method === 'POST') {
          const apiKey = process.env.ANTHROPIC_API_KEY;

          if (!apiKey) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set. Add it to .env.local' }));
            return;
          }

          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { rawInput, userContext } = JSON.parse(body);

              if (!rawInput || !userContext) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing rawInput or userContext' }));
                return;
              }

              const client = new Anthropic({ apiKey });

              const prompt = `You are an AI assistant helping ${userContext.name}, a ${userContext.profession} at ${userContext.company}.
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

              const message = await client.messages.create({
                model: 'claude-sonnet-4-5-20250514',
                max_tokens: 1024,
                messages: [{ role: 'user', content: prompt }],
              });

              const textContent = message.content.find((block) => block.type === 'text');
              if (!textContent || textContent.type !== 'text') {
                throw new Error('No text content in response');
              }

              const parsed = JSON.parse(textContent.text);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(parsed));
            } catch (error) {
              console.error('API Error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'AI processing failed' }));
            }
          });
          return;
        }

        // NEW: Multi-item extraction endpoint
        if (req.url === '/api/categorize/extract-multiple' && req.method === 'POST') {
          const apiKey = process.env.ANTHROPIC_API_KEY;

          if (!apiKey) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set. Add it to .env.local' }));
            return;
          }

          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { rawInput, userContext } = JSON.parse(body);

              if (!rawInput || !userContext) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing rawInput or userContext' }));
                return;
              }

              const client = new Anthropic({ apiKey });

              const prompt = `You are an ADHD-friendly AI assistant helping ${userContext.name}, a ${userContext.profession} at ${userContext.company}.
${userContext.additionalContext || ''}

Current projects: ${userContext.projects.join(', ')}

TASK: Extract MULTIPLE discrete items from the following voice note. People with ADHD often capture many thoughts at once, so identify each distinct item separately.

Voice note: "${rawInput}"

For EACH distinct item you identify, extract:
- category: "idea" | "task" | "reminder" | "note"
- title: concise, actionable title (max 60 chars)
- tags: array of 2-5 relevant contextual tags (e.g., ["family", "phone"], ["app", "development"])
- urgency: "high" | "medium" | "low" | "none"
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

              const message = await client.messages.create({
                model: 'claude-sonnet-4-5-20250514',
                max_tokens: 2048, // Increased for multiple items
                messages: [{ role: 'user', content: prompt }],
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

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(parsed));
            } catch (error) {
              console.error('Multi-item extraction error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: 'AI extraction failed',
                details: error instanceof Error ? error.message : 'Unknown error'
              }));
            }
          });
          return;
        }

        if (req.url === '/api/health' && req.method === 'GET') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    localApiPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'MINDIFY - ADHD Thought Capture',
        short_name: 'MINDIFY',
        description: 'Zero-friction thought capture for ADHD minds',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23111827" width="100" height="100"/><circle fill="%233B82F6" cx="50" cy="50" r="35"/><text fill="white" x="50" y="62" font-size="40" text-anchor="middle">M</text></svg>',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23111827" width="100" height="100"/><circle fill="%233B82F6" cx="50" cy="50" r="35"/><text fill="white" x="50" y="62" font-size="40" text-anchor="middle">M</text></svg>',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.cloudfunctions\.net\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable PWA in dev to avoid icon errors
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
