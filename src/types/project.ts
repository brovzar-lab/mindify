import type { Category } from './index';

/**
 * Project suggestion from AI analysis
 */
export interface ProjectSuggestion {
    projectName: string;
    description: string;
    relatedItemIds: string[];
    confidence: number;
    reasoning: string;
    suggestedColor: string;
}

/**
 * Response from project detection API
 */
export interface ProjectDetectionResponse {
    suggestions: ProjectSuggestion[];
    reasoning: string;
}

/**
 * Preview of merging two items together
 */
export interface MergePreview {
    mergedTitle: string;
    mergedRawInput: string;
    mergedTags: string[];
    suggestedCategory: Category | string;
    confidence: number;
    reasoning: string;
}

/**
 * Project entity for organizing items
 */
export interface Project {
    id: string;
    name: string;
    description?: string;
    color: string;
    itemIds: string[];
    createdAt: string;
    updatedAt: string;
    suggestedByAI?: boolean;
}
