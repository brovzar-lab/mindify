---
name: Fix AI Multi-Item Extraction & ADHD To-Do System
status: in_progress
priority: critical
created: 2026-01-23
---

# Fix AI Multi-Item Extraction & ADHD To-Do System

## Problem Summary

The AI multi-item extraction feature exists in the codebase but **is never actually called**. Voice recordings with mixed content (groceries + movie ideas + calls) are saved as single blob items instead of being intelligently split and categorized.

### Current Flow (Broken)
```
Voice capture → Create single item with pendingAIProcessing=true → STOPS HERE ❌
```

### Desired Flow
```
Voice capture → Extract multiple items → Categorize each → Organize by type → Mark complete ✅
```

## Root Cause Analysis

1. **`ai-service.ts`** has `extractMultipleItems()` method ✅
2. **`dashboard.tsx`** saves items with `pendingAIProcessing: true` ✅  
3. **MISSING:** No code actually calls `extractMultipleItems()` ❌
4. **MISSING:** No batch processor to handle inbox items ❌
5. **MISSING:** No ADHD-optimized to-do/checklist interface ❌

## Implementation Plan

### Phase 1: Wire Up Multi-Item Extraction (CRITICAL)

#### 1.1 Create Background Processor Service
**File:** `src/services/inbox-processor.ts`
```typescript
/**
 * Background processor for inbox items
 * - Detects items with pendingAIProcessing=true
 * - Calls aiService.extractMultipleItems()
 * - Creates separate items for each extracted entity
 * - Updates/replaces original blob item
 */
```

**Features:**
- Auto

-process on page load
- Debounced processing (500ms after last capture)
- Offline fallback using regex patterns
- Progress tracking for user feedback

#### 1.2 Update Dashboard Capture Flow
**File:** `src/pages/dashboard.tsx`

**Changes:**
1. After saving blob item, trigger background processing
2. Show processing indicator in UI
3. Update recent items when processing completes

#### 1.3 Create Extraction Review Modal
**File:** `src/components/modals/extraction-review-modal.tsx`

**Purpose:** Show extracted items BEFORE finalizing
- Display: "I found 3 items in your recording"
- Preview each extracted item with category badge
- Allow editing titles inline
- Confirm/reject individual items
- "Accept All" button for speed

### Phase 2: Smart Categorization Enhancement

#### 2.1 Improve Offline Categorization
**File:** `src/services/ai-service.ts` (OfflineCategorizationService)

**Enhancements:**
- Better regex patterns for groceries ("get", "buy", "pick up")
- Detect creative ideas ("movie", "story", "idea for")
- Recognize calls/communications ("call", "text", "email")
- Extract action items ("need to", "should", "must")

#### 2.2 Add Subcategories
**Examples:**
- Task → Shopping, Work, Personal, Calls
- Idea → Film, Business, Creative, Tech
- Reminder → Time-based, Location-based

### Phase 3: ADHD-Optimized To-Do System

#### 3.1 Create ActionListPage
**File:** `src/pages/action-list.tsx`

**Design Principles:**
- **One-tap completion**: Big checkboxes, no confirmation needed
- **Visual hierarchy**: High urgency items at top with neon red glow
- **Grouped by context**: Shopping together, Calls together, etc.
- **Immediate feedback**: Haptic + animation on check
- **Un-do capability**: Swipe to undo recent completions
- **Time awareness**: Show "Do Today" vs "Do Later" sections

#### 3.2 UI Components

##### CheckableTaskCard
```tsx
Features:
- Large touch target (min 64px height)
- Checkbox on LEFT (easy thumb access)
- Swipe-right to complete
- Swipe-left to delete
- Tag indicators
- Time context ("2 hours ago", "due at 3pm")
```

##### CategoryGrouping
```tsx
Sections:
🛒 Shopping List (groceries + purchases)
📞 Calls & Messages
💡 Ideas to Explore
⚡ Quick Wins (< 5 min tasks)
🔥 Urgent & Important
📋 Everything Else
```

#### 3.3 Smart Features
- **Auto-sort by urgency + time**
- **Suggest "Do Now" based on current time/location**
- **Batch completion**: "Mark all shopping items done"
- **Quick add**: Tap category icon → Voice capture for that type

### Phase 4: Deploy & Verify

#### 4.1 Testing Checklist
- [ ] Voice: "I need to get groceries and I have an idea for a movie about a scuba diver"
  - Expected: 2 items (Task: Groceries, Idea: Scuba diver movie)
- [ ] Voice: "Call Alex about hotel and buy flowers and make reservations"
  - Expected: 3 items (3 separate tasks)
- [ ] Offline mode extraction works with basic patterns
- [ ] Extraction review modal shows correct items
- [ ] Can edit item titles before confirming
- [ ] Action list shows items grouped by category
- [ ] Can check off items with one tap
- [ ] Haptic feedback on all interactions

#### 4.2 Deploy Steps
1. Test locally with real voice recordings
2. Build production bundle
3. Deploy to Firebase
4. Sync Git commits
5. Test on mobile device

## Technical Details

### API Integration (Future)
When `/api/categorize/extract-multiple` endpoint is ready:
- Send full voice transcript
- Receive structured array of items
- Each with category, title, urgency, entities
- Higher confidence than offline mode

### Data Structure
```typescript
// Before extraction
{
  id: "uuid",
  rawInput: "get groceries and call Alex and...",
  pendingAIProcessing: true,
  status: "inbox"
}

// After extraction → Creates 3 new items
[
  { id: "uuid-1", title: "Get groceries", category: "task", subcategory: "shopping" },
  { id: "uuid-2", title: "Call Alex about hotel", category: "task", subcategory: "calls" },
  { id: "uuid-3", title: "Scuba diver movie idea", category: "idea", subcategory: "film" }
]

// Original item either deleted or marked as "processed"
```

### Performance Considerations
- Process max 5 items at once to avoid blocking
- Show shimmer loading states
- Cache extraction results
- Background sync when online

## Success Criteria

✅ **User can brain dump multiple unrelated thoughts in one recording**  
✅ **AI automatically splits and categorizes each item**  
✅ **User sees clear separation: Groceries, Calls, Ideas**  
✅ **Action items have one-tap checkoff interface**  
✅ **Interface feels fast, not overwhelming**  
✅ **Works offline with degraded but functional extraction**

## Implementation Order

1. **Phase 1.1** - InboxProcessor service (core fix)
2. **Phase 1.3** - ExtractionReviewModal (user visibility)
3. **Phase 2.1** - Better offline categorization
4. **Phase 3.1** - ActionListPage (to-do interface)
5. **Phase 3.2** - UI components
6. **Phase 4** - Deploy & verify

## Next Steps

Start with **Phase 1.1** - create the InboxProcessor service that actually calls the extraction logic.
