# MINDIFY Phase 5: Advanced Features Plan

**Status**: Ready for Implementation  
**Priority Features**: Edit Inline, Swipe Gestures, Smart Notifications

---

## Overview

Phase 5 adds advanced interaction features to make MINDIFY the ultimate ADHD-friendly thought capture app:

1. **✏️ Edit Inline** - Edit extracted items before saving
2. **👆 Swipe Gestures** - Quick actions on saved items  
3. **🔔 Smart Notifications** - ADHD-optimized reminders

---

## Feature 1: Edit Inline ✏️

### What It Does
Allows users to edit extracted items directly in the ExtractionReview modal before saving:
- Change title
- Switch category
- Add/remove tags
- Adjust urgency
- Edit raw text

### Implementation Strategy

**State Management:**
```typescript
const [editingIndex, setEditingIndex] = useState<number | null>(null);
const [editForm, setEditForm] = useState<ExtractedItem | null>(null);
```

**Edit Flow:**
1. User clicks Edit button → Opens inline edit mode
2. Shows editable fields for that item
3. User makes changes
4. Click "Save Edit" → Updates item in state
5. Click "Cancel" → Discards changes

**UI Changes:**
- When editing: Show input fields instead of static text
- Category dropdown with color-coded options
- Tag input with autocomplete
- Urgency radio buttons
- Save/Cancel buttons

**Example UI:**
```tsx
{editingIndex === index ? (
  // Edit Mode
  <div className="space-y-3">
    <input
      value={editForm.title}
      onChange={(e) => updateEditForm('title', e.target.value)}
      className="w-full bg-surface px-3 py-2 rounded-lg"
    />
    <select
      value={editForm.category}
      onChange={(e) => updateEditForm('category', e.target.value)}
    >
      <option value="idea">💡 Idea</option>
      <option value="task">✅ Task</option>
      <option value="reminder">⏰ Reminder</option>
      <option value="note">📝 Note</option>
    </select>
    <div className="flex gap-2">
      <NeonButton onClick={saveEdit} size="sm">Save</NeonButton>
      <NeonButton onClick={cancelEditing} variant="outline" size="sm">Cancel</NeonButton>
    </div>
  </div>
) : (
  // Display Mode (current)
  <div>...</div>
)}
```

---

## Feature 2: Swipe Gestures 👆

### What It Does
Enables swipe-to-action on saved items in the Dashboard and Browse pages:
- **Swipe Right** → Mark as complete (with checkmark animation)
- **Swipe Left** → Delete (with undo toast)
- **Long Press** → Open quick actions menu

### Implementation Strategy

**Dependencies:**
```bash
npm install react-swipeable
```

**Swipe Handler:**
```typescript
import { useSwipeable } from 'react-swipeable';

const swipeHandlers = useSwipeable({
  onSwipedRight: () => handleComplete(item.id),
  onSwipedLeft: () => handleDelete(item.id),
  preventScrollOnSwipe: true,
  trackMouse: false, // Mobile only
});
```

**Visual Feedback:**
- Show colored background while swiping
- Animate icon reveal (checkmark or trash)
- Spring animation on completion
- Undo toast for 3 seconds after delete

**Example UI:**
```tsx
<motion.div
  {...swipeHandlers}
  animate={{
    x: swipeProgress,
    backgroundColor: swipeProgress > 50 ? '#00FF94' : swipeProgress < -50 ? '#FF2E97' : 'transparent'
  }}
>
  {/* Item content */}
</motion.div>
```

**ADHD Optimization:**
- Swipe threshold: 40% (easier to trigger)
- Haptic feedback on threshold
- Visual cue during swipe (expanding icon)
- Undo window: 5 seconds (longer than usual)

---

## Feature 3: Smart Notifications 🔔

### What It Does
Schedules intelligent reminders for items with ADHD-optimized patterns:
- Time-based reminders from voice notes
- Escalating urgency (gentle → firm)
- Snooze with smart suggestions
- Location-based triggers (optional)

### Implementation Strategy

**Dependencies:**
Already installed: `@capacitor/local-notifications`

**Notification Scheduling:**
```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

async function scheduleReminder(item: MindifyItem, date: Date) {
  await LocalNotifications.schedule({
    notifications: [{
      id: parseInt(item.id.replace(/-/g, '').slice(0, 8), 16),
      title: item.title,
      body: item.rawInput,
      schedule: { at: date },
      sound: 'default',
      actionTypeId: 'REMINDER_ACTION',
      extra: { itemId: item.id },
    }],
  });
}
```

**ADHD-Optimized Patterns:**

1. **Gentle Escalation:**
   - 1st notification: Soft chime + banner
   - If snoozed: Slightly louder + vibration
   - If snoozed again: Full alert + can't dismiss without action

2. **Smart Snooze Options:**
   ```
   ⏰ 5 minutes (quick task)
   ⏰ 15 minutes (after current focus)
   ⏰ 1 hour (revisit later)  
   ⏰ Tomorrow at 9am (next day)
   ✅ Mark as done
   ```

3. **Time Intelligence:**
   - "Call mom at 3pm" → Schedule for 3pm
   - "Buy groceries after work" → Detect work end time (default 5pm)
   - "Remind me tomorrow" → 9am next day
   - "Don't forget the meeting" → Extract from calendar

**Notification Actions:**
```typescript
LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
  if (action.actionId === 'SNOOZE_5MIN') {
    const newTime = new Date(Date.now() + 5 * 60 * 1000);
    await rescheduleNotification(action.notification.id, newTime);
  } else if (action.actionId === 'MARK_DONE') {
    await completeItem(action.notification.extra.itemId);
  }
});
```

**UI Integration:**
- Show "🔔" badge on items with scheduled notifications
- "Schedule Reminder" button in item detail
- Visual timeline showing when reminders will fire
- Notification history

---

## Implementation Priority

### High Priority (Implement First)
1. ✏️ **Edit Inline** - Most requested, high-impact
   - Complexity: Medium
   - Time: 2-3 hours
   - Dependencies: None

### Medium Priority
2. 🔔 **Smart Notifications** - Core ADHD feature
   - Complexity: High
   - Time: 4-5 hours
   - Dependencies: Capacitor setup, date parsing

### Lower Priority (Nice to Have)
3. 👆 **Swipe Gestures** - Enhances UX, not critical
   - Complexity: Medium
   - Time: 2-3 hours
   - Dependencies: react-swipeable

---

## Simplified Edit Implementation (Quick Win)

Since you asked for all features, here's the quickest path to get editing working:

### Step 1: Update ExtractionReview Component

Add edit state after line 46:
```typescript
const [editingIndex, setEditingIndex] = useState<number | null>(null);
```

### Step 2: Replace Edit Button Handler

Change line 223-227 from:
```typescript
onClick={(e) => {
  e.stopPropagation();
  console.log('Edit item:', item);
}}
```

To:
```typescript
onClick={(e) => {
  e.stopPropagation();
  const newTitle = prompt('Edit title:', item.title);
  if (newTitle && newTitle.trim()) {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], title: newTitle.trim() };
      return next;
    });
  }
}}
```

This gives immediate edit functionality using browser prompt (simple but functional).

---

## Full Implementation (Complete Solution)

For a production-ready edit experience, I recommend creating a separate `EditItemModal` component:

**File**: `src/components/capture/edit-item-modal.tsx`

```typescript
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { NeonButton } from '@/components/ui/neon-button';
import { PillBadge } from '@/components/ui/pill-badge';
import type { ExtractedItem, Category, Urgency } from '@/types';

interface EditItemModalProps {
  item: ExtractedItem;
  onSave: (updated: ExtractedItem) => void;
  onCancel: () => void;
}

export function EditItemModal({ item, onSave, onCancel }: EditItemModalProps) {
  const [form, setForm] = useState<ExtractedItem>(item);
  const [newTag, setNewTag] = useState('');

  const categories: Category[] = ['idea', 'task', 'reminder', 'note'];
  const urgencies: Urgency[] = ['high', 'medium', 'low', 'none'];

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm({ ...form, tags: [...form.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setForm({ ...form, tags: form.tags.filter((_, i) => i !== index) });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-background-elevated rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-100">Edit Item</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-surface px-4 py-2 rounded-lg text-gray-100 border border-glass-border focus:outline-none focus:ring-2 focus:ring-neon-blue"
              maxLength={60}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setForm({ ...form, category: cat })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.category === cat
                      ? `bg-category-${cat} text-white`
                      : 'bg-surface text-gray-400 hover:bg-surface-elevated'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Urgency</label>
            <div className="grid grid-cols-4 gap-2">
              {urgencies.map((urg) => (
                <button
                  key={urg}
                  onClick={() => setForm({ ...form, urgency: urg })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.urgency === urg
                      ? 'bg-neon-blue text-gray-900'
                      : 'bg-surface text-gray-400 hover:bg-surface-elevated'
                  }`}
                >
                  {urg}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map((tag, index) => (
                <PillBadge
                  key={index}
                  label={tag}
                  category={form.category}
                  variant="glass"
                  removable
                  onRemove={() => removeTag(index)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add tag..."
                className="flex-1 bg-surface px-3 py-2 rounded-lg text-gray-100 border border-glass-border focus:outline-none focus:ring-2 focus:ring-neon-blue text-sm"
              />
              <NeonButton onClick={addTag} size="sm" category="task" variant="outline">
                Add
              </NeonButton>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <NeonButton onClick={onCancel} variant="outline" category="note" className="flex-1">
            Cancel
          </NeonButton>
          <NeonButton onClick={() => onSave(form)} variant="gradient" category="task" glow className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </NeonButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

Then integrate it into ExtractionReview by importing and conditionally rendering.

---

## Testing Checklist

### Edit Inline
- [ ] Click edit → modal/inline form appears
- [ ] Change title → updates in real-time
- [ ] Switch category → updates badge color
- [ ] Add tags → appears in tag list
- [ ] Remove tags → disappears from list
- [ ] Save → changes persist
- [ ] Cancel → discards changes

### Swipe Gestures
- [ ] Swipe right → complete animation plays
- [ ] Swipe left → delete with undo appears
- [ ] Undo within 5s → item restored
- [ ] Haptic feedback on threshold
- [ ] Works on touch devices only

### Smart Notifications
- [ ] Schedule notification → appears in system tray
- [ ] Tap notification → opens app to item
- [ ] Snooze → reschedules correctly
- [ ] Mark done → completes item
- [ ] Time extraction from voice note works

---

## Conclusion

Phase 5 features are **ready for implementation** with detailed specifications above. 

**Recommended approach:**
1. Start with simplified edit (browser prompt) → **5 minutes**
2. Build full EditItemModal → **2 hours**
3. Add smart notifications → **4 hours**
4. Add swipe gestures last → **2 hours**

Total implementation time: ~8-9 hours for all features.

The simplified edit approach can bevlive in **5 minutes** using the browser prompt method described above!
