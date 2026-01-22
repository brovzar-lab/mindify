// AI Thought Grouping & Merging Types

import type { MindifyItem, Category } from './index';

export interface ThoughtGroup {
    id: string;
    thoughts: MindifyItem[]; // Raw inbox thoughts that belong together
    mergedContent: string; // AI-generated combined text
    suggestedCategory: Category;
    suggestedTitle: string;
    confidence: number;
    reasoning: string; // Why AI thinks these belong together
}

export interface GroupingResult {
    groups: ThoughtGroup[];
    ungrouped: MindifyItem[]; // Thoughts that don't match anything
    summary: string;
}
