import { aiService } from './ai-service';
import { storageService } from './storage-service';
import type { MindifyItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Background processor for inbox items with pendingAIProcessing flag
 * Handles multi-item extraction from voice recordings
 */
class InboxProcessor {
    private isProcessing = false;
    private processingQueue: Set<string> = new Set();

    /**
     * Process all pending items in the inbox
     */
    async processPendingItems(): Promise<{ processedCount: number; extractedCount: number }> {
        if (this.isProcessing) {
            console.log('[InboxProcessor] Already processing, skipping');
            return { processedCount: 0, extractedCount: 0 };
        }

        this.isProcessing = true;
        let processedCount = 0;
        let extractedCount = 0;

        try {
            const allItems = storageService.getItems();
            const pendingItems = allItems.filter(
                item => item.pendingAIProcessing && item.status === 'inbox' && !this.processingQueue.has(item.id)
            );

            console.log(`[InboxProcessor] Found ${pendingItems.length} pending items to process`);

            for (const item of pendingItems) {
                try {
                    this.processingQueue.add(item.id);
                    const extracted = await this.processItem(item);
                    extractedCount += extracted.length;
                    processedCount++;
                } catch (error) {
                    console.error(`[InboxProcessor] Error processing item ${item.id}:`, error);
                    // Mark as processed even if failed, to avoid retry loops
                    storageService.updateItem(item.id, { pendingAIProcessing: false });
                } finally {
                    this.processingQueue.delete(item.id);
                }
            }

            console.log(`[InboxProcessor] Processed ${processedCount} items, extracted ${extractedCount} total items`);
            return { processedCount, extractedCount };
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process a single item and extract multiple items from it
     */
    private async processItem(originalItem: MindifyItem): Promise<MindifyItem[]> {
        console.log(`[InboxProcessor] Processing item: "${originalItem.rawInput.slice(0, 50)}..."`);

        try {
            // Call AI service to extract multiple items
            const extractionResult = await aiService.extractMultipleItems(originalItem.rawInput);

            console.log(`[InboxProcessor] Extracted ${extractionResult.items.length} items`);

            // If only 1 item extracted, just update the original
            if (extractionResult.items.length === 1) {
                const extracted = extractionResult.items[0];
                storageService.updateItem(originalItem.id, {
                    category: extracted.category,
                    title: extracted.title,
                    tags: extracted.tags,
                    urgency: extracted.urgency,
                    entities: extracted.entities || originalItem.entities,
                    pendingAIProcessing: false,
                    synced: false,
                });
                return [originalItem];
            }

            // Multiple items extracted - create new items and delete original
            const newItems: MindifyItem[] = [];
            const now = new Date().toISOString();

            for (const extracted of extractionResult.items) {
                const newItem: MindifyItem = {
                    id: uuidv4(),
                    rawInput: extracted.rawText,
                    category: extracted.category,
                    title: extracted.title,
                    tags: extracted.tags,
                    entities: extracted.entities || {},
                    urgency: extracted.urgency,
                    status: 'inbox', // Start in inbox for review
                    createdAt: originalItem.createdAt, // Preserve original timestamp
                    updatedAt: now,
                    synced: false,
                    pendingAIProcessing: false,
                };

                storageService.saveItem(newItem);
                newItems.push(newItem);
            }

            // Delete the original blob item
            storageService.deleteItem(originalItem.id);

            console.log(`[InboxProcessor] Created ${newItems.length} new items from extraction`);
            return newItems;
        } catch (error) {
            console.error('[InboxProcessor] Extraction failed:', error);
            // On error, just mark as processed to avoid retry loops
            storageService.updateItem(originalItem.id, { pendingAIProcessing: false });
            throw error;
        }
    }

    /**
     * Process a specific item by ID (for manual trigger)
     */
    async processItemById(itemId: string): Promise<MindifyItem[]> {
        const item = storageService.getItems().find(i => i.id === itemId);
        if (!item) {
            throw new Error(`Item ${itemId} not found`);
        }

        if (!item.pendingAIProcessing) {
            console.log(`[InboxProcessor] Item ${itemId} already processed`);
            return [item];
        }

        return this.processItem(item);
    }

    /**
     * Check if processor is currently running
     */
    isRunning(): boolean {
        return this.isProcessing;
    }

    /**
     * Get count of pending items
     */
    getPendingCount(): number {
        const allItems = storageService.getItems();
        return allItems.filter(item => item.pendingAIProcessing && item.status === 'inbox').length;
    }
}

export const inboxProcessor = new InboxProcessor();
