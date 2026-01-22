import type { MindifyItem } from '@/types';
import type { ThoughtGroup, GroupingResult } from '@/types/grouping';
import { v4 as uuidv4 } from 'uuid';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || '/api/categorize';

/**
 * AI-powered thought grouping and merging service
 * Groups related raw thoughts from inbox and suggests merged versions
 */
class AIGroupingService {
    /**
     * Analyze inbox items and group related thoughts together
     */
    async groupThoughts(inboxItems: MindifyItem[]): Promise<GroupingResult> {
        if (inboxItems.length === 0) {
            return {
                groups: [],
                ungrouped: [],
                summary: 'No thoughts to process',
            };
        }

        try {
            // Try online AI first
            const response = await fetch(`${API_ENDPOINT}/group-thoughts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    thoughts: inboxItems.map(item => ({
                        id: item.id,
                        text: item.rawInput,
                        createdAt: item.createdAt,
                    })),
                }),
            });

            if (!response.ok) {
                throw new Error(`API grouping failed: ${response.status}`);
            }

            const data = await response.json();
            return this.parseGroupingResponse(data, inboxItems);
        } catch (error) {
            // Fall back to offline heuristic grouping
            console.warn('API grouping failed, using offline mode:', error);
            return this.offlineGrouping(inboxItems);
        }
    }

    private parseGroupingResponse(data: any, inboxItems: MindifyItem[]): GroupingResult {
        const groups: ThoughtGroup[] = (data.groups || []).map((group: any) => {
            const thoughtIds = group.thoughtIds || [];
            const thoughts = inboxItems.filter(item => thoughtIds.includes(item.id));

            return {
                id: group.id || uuidv4(),
                thoughts,
                mergedContent: group.mergedContent || '',
                suggestedCategory: group.suggestedCategory || 'note',
                suggestedTitle: group.suggestedTitle || '',
                confidence: group.confidence || 0.7,
                reasoning: group.reasoning || '',
            };
        });

        const groupedIds = new Set(groups.flatMap(g => g.thoughts.map(t => t.id)));
        const ungrouped = inboxItems.filter(item => !groupedIds.has(item.id));

        return {
            groups,
            ungrouped,
            summary: data.summary || `Processed ${inboxItems.length} thoughts`,
        };
    }

    /**
     * Offline heuristic grouping based on keywords and timestamps
     */
    private offlineGrouping(inboxItems: MindifyItem[]): GroupingResult {
        const groups: ThoughtGroup[] = [];
        const processed = new Set<string>();

        // Sort by creation time
        const sorted = [...inboxItems].sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Group thoughts within 5 minutes of each other
        const TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

        for (let i = 0; i < sorted.length; i++) {
            if (processed.has(sorted[i].id)) continue;

            const baseThought = sorted[i];
            const baseTime = new Date(baseThought.createdAt).getTime();
            const relatedThoughts = [baseThought];
            processed.add(baseThought.id);

            // Look for thoughts within time window
            for (let j = i + 1; j < sorted.length; j++) {
                if (processed.has(sorted[j].id)) continue;

                const nextThought = sorted[j];
                const nextTime = new Date(nextThought.createdAt).getTime();

                // If within time window, check for keyword overlap
                if (nextTime - baseTime <= TIME_WINDOW_MS) {
                    const similarity = this.calculateSimilarity(baseThought.rawInput, nextThought.rawInput);

                    if (similarity > 0.3) { // 30% similarity threshold
                        relatedThoughts.push(nextThought);
                        processed.add(nextThought.id);
                    }
                } else {
                    break; // Beyond time window
                }
            }

            // Only create group if multiple thoughts found
            if (relatedThoughts.length > 1) {
                const mergedText = relatedThoughts.map(t => t.rawInput).join('. ');

                groups.push({
                    id: uuidv4(),
                    thoughts: relatedThoughts,
                    mergedContent: mergedText,
                    suggestedCategory: this.inferCategory(mergedText),
                    suggestedTitle: mergedText.slice(0, 60),
                    confidence: 0.6, // Medium confidence for offline grouping
                    reasoning: `${relatedThoughts.length} thoughts recorded within 5 minutes`,
                });
            }
        }

        const groupedIds = new Set(groups.flatMap(g => g.thoughts.map(t => t.id)));
        const ungrouped = inboxItems.filter(item => !groupedIds.has(item.id));

        return {
            groups,
            ungrouped,
            summary: `Found ${groups.length} potential groups from ${inboxItems.length} thoughts (offline mode)`,
        };
    }

    /**
     * Simple keyword-based similarity score
     */
    private calculateSimilarity(text1: string, text2: string): number {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size; // Jaccard similarity
    }

    /**
     * Infer category from merged text (basic heuristic)
     */
    private inferCategory(text: string): 'idea' | 'task' | 'reminder' | 'note' {
        const lower = text.toLowerCase();

        if (lower.includes('idea') || lower.includes('what if') || lower.includes('maybe')) {
            return 'idea';
        }
        if (lower.includes('need to') || lower.includes('should') || lower.includes('must')) {
            return 'task';
        }
        if (lower.includes('remind') || lower.includes('don\'t forget') || lower.includes('remember')) {
            return 'reminder';
        }

        return 'note';
    }
}

export const aiGroupingService = new AIGroupingService();
