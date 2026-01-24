import type { MindifyItem } from '@/types';
import type { ProjectSuggestion, ProjectDetectionResponse, MergePreview } from '@/types/project';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || '/api/categorize';

/**
 * Project Detection Service
 * Analyzes items to find recurring patterns and suggest project groupings
 */
export class ProjectService {
    /**
     * Detect potential projects from a collection of items
     */
    async detectProjects(items: MindifyItem[]): Promise<ProjectDetectionResponse> {
        try {
            const response = await fetch(`${API_ENDPOINT}/detect-projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(item => ({
                        id: item.id,
                        title: item.title,
                        rawInput: item.rawInput,
                        category: item.category,
                        tags: item.tags,
                        entities: item.entities,
                        createdAt: item.createdAt,
                    })),
                }),
            });

            if (!response.ok) {
                console.warn(`Project detection API failed (${response.status}), using offline mode`);
                return this.detectProjectsOffline(items);
            }

            const data = await response.json();
            return this.parseDetectionResponse(data);
        } catch (error) {
            console.warn('Project detection error, falling back to offline mode:', error);
            return this.detectProjectsOffline(items);
        }
    }

    /**
     * Generate a merge preview for two items
     */
    async generateMergePreview(item1: MindifyItem, item2: MindifyItem): Promise<MergePreview> {
        try {
            const response = await fetch(`${API_ENDPOINT}/merge-preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [
                        {
                            title: item1.title,
                            rawInput: item1.rawInput,
                            category: item1.category,
                            tags: item1.tags,
                        },
                        {
                            title: item2.title,
                            rawInput: item2.rawInput,
                            category: item2.category,
                            tags: item2.tags,
                        },
                    ],
                }),
            });

            if (!response.ok) {
                console.warn(`Merge preview API failed (${response.status}), using offline mode`);
                return this.generateMergePreviewOffline(item1, item2);
            }

            const data = await response.json();
            return this.parseMergePreview(data);
        } catch (error) {
            console.warn('Merge preview error, falling back to offline mode:', error);
            return this.generateMergePreviewOffline(item1, item2);
        }
    }

    /**
     * Suggest tags for an item based on its content
     */
    async suggestTags(item: MindifyItem): Promise<string[]> {
        try {
            const response = await fetch(`${API_ENDPOINT}/suggest-tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: item.title,
                    rawInput: item.rawInput,
                    category: item.category,
                    entities: item.entities,
                }),
            });

            if (!response.ok) {
                return this.suggestTagsOffline(item);
            }

            const data = await response.json();
            return Array.isArray(data.tags) ? data.tags.slice(0, 5) : [];
        } catch {
            return this.suggestTagsOffline(item);
        }
    }

    // ============ OFFLINE FALLBACK METHODS ============

    private detectProjectsOffline(items: MindifyItem[]): ProjectDetectionResponse {
        const projectMap = new Map<string, Set<string>>();

        // Analyze entity.projects and recurring keywords
        items.forEach(item => {
            // Check entity.projects
            item.entities.projects?.forEach(projectName => {
                const normalizedProject = projectName.toLowerCase().trim();
                if (!projectMap.has(normalizedProject)) {
                    projectMap.set(normalizedProject, new Set());
                }
                projectMap.get(normalizedProject)!.add(item.id);
            });

            // Check tags for project-like patterns
            item.tags.forEach(tag => {
                const normalizedTag = tag.toLowerCase().trim();
                if (!projectMap.has(normalizedTag)) {
                    projectMap.set(normalizedTag, new Set());
                }
                projectMap.get(normalizedTag)!.add(item.id);
            });
        });

        // Filter to only projects with 3+ related items
        const suggestions: ProjectSuggestion[] = [];
        const neonColors = ['#B026FF', '#00F0FF', '#FF2E97', '#00FF94', '#F59E0B'];

        let colorIndex = 0;
        projectMap.forEach((itemIds, projectName) => {
            if (itemIds.size >= 3) {
                suggestions.push({
                    projectName: projectName.charAt(0).toUpperCase() + projectName.slice(1),
                    description: `Found ${itemIds.size} items related to "${projectName}"`,
                    relatedItemIds: Array.from(itemIds),
                    confidence: Math.min(0.7 + (itemIds.size * 0.05), 0.95),
                    reasoning: `Detected recurring keyword/tag "${projectName}" across ${itemIds.size} items`,
                    suggestedColor: neonColors[colorIndex++ % neonColors.length],
                });
            }
        });

        return {
            suggestions,
            reasoning: suggestions.length > 0
                ? `Offline mode: Found ${suggestions.length} potential project(s)`
                : 'No recurring patterns detected',
        };
    }

    private generateMergePreviewOffline(item1: MindifyItem, item2: MindifyItem): MergePreview {
        // Simple merge: concatenate titles and raw inputs
        const mergedTags = Array.from(new Set([...item1.tags, ...item2.tags]));

        return {
            mergedTitle: `${item1.title} & ${item2.title}`,
            mergedRawInput: `${item1.rawInput} ${item2.rawInput}`,
            mergedTags,
            suggestedCategory: item1.category, // Prefer first item's category
            confidence: 0.6,
            reasoning: 'Offline mode: Basic merge combining both items',
        };
    }

    private suggestTagsOffline(item: MindifyItem): string[] {
        const tags: string[] = [];
        const lowerInput = item.rawInput.toLowerCase();
        const lowerTitle = item.title.toLowerCase();

        // Common tag patterns
        const tagPatterns = {
            urgent: ['urgent', 'asap', 'immediately'],
            work: ['work', 'job', 'office', 'meeting'],
            personal: ['home', 'family', 'personal'],
            health: ['health', 'exercise', 'gym', 'doctor'],
            finance: ['money', 'budget', 'pay', 'bill'],
            creative: ['idea', 'creative', 'design', 'art'],
        };

        Object.entries(tagPatterns).forEach(([tag, keywords]) => {
            if (keywords.some(keyword => lowerInput.includes(keyword) || lowerTitle.includes(keyword))) {
                tags.push(tag);
            }
        });

        // Extract project names from entities
        item.entities.projects?.forEach(project => {
            tags.push(project.toLowerCase());
        });

        return tags.slice(0, 3); // Max 3 suggested tags
    }

    // ============ PARSING METHODS ============

    private parseDetectionResponse(data: unknown): ProjectDetectionResponse {
        if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid project detection response');
        }

        const response = data as Record<string, unknown>;

        if (!Array.isArray(response.suggestions)) {
            throw new Error('Invalid suggestions array');
        }

        const suggestions = response.suggestions.map((item: unknown) => {
            if (typeof item !== 'object' || item === null) {
                throw new Error('Invalid suggestion item');
            }

            const suggestion = item as Record<string, unknown>;

            return {
                projectName: String(suggestion.projectName || 'Untitled Project'),
                description: String(suggestion.description || ''),
                relatedItemIds: Array.isArray(suggestion.relatedItemIds)
                    ? suggestion.relatedItemIds.map(String)
                    : [],
                confidence: typeof suggestion.confidence === 'number' ? suggestion.confidence : 0.5,
                reasoning: String(suggestion.reasoning || ''),
                suggestedColor: String(suggestion.suggestedColor || '#B026FF'),
            };
        });

        return {
            suggestions,
            reasoning: String(response.reasoning || ''),
        };
    }

    private parseMergePreview(data: unknown): MergePreview {
        if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid merge preview response');
        }

        const response = data as Record<string, unknown>;

        return {
            mergedTitle: String(response.mergedTitle || 'Merged Item'),
            mergedRawInput: String(response.mergedRawInput || ''),
            mergedTags: Array.isArray(response.mergedTags)
                ? response.mergedTags.map(String)
                : [],
            suggestedCategory: String(response.suggestedCategory || 'note'),
            confidence: typeof response.confidence === 'number' ? response.confidence : 0.5,
            reasoning: String(response.reasoning || ''),
        };
    }
}

export const projectService = new ProjectService();
