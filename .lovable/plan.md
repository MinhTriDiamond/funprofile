

# Share with Caption — Implementation Plan

## 1. Database Migration
Add `caption` column to `shared_posts`:
```sql
ALTER TABLE shared_posts ADD COLUMN caption text DEFAULT NULL;
```

## 2. ShareDialog.tsx (2 changes)

**Line 102-105**: Add `caption` to insert:
```typescript
const { error } = await supabase.from('shared_posts').insert({
  user_id: currentUserId,
  original_post_id: post.id,
  caption: caption.trim() || null,
});
```

**Line 144**: Add `onOpenAutoFocus` to prevent focus trap:
```tsx
<DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
```

## 3. Profile.tsx (line 902-911)
Display caption above the shared post:
```tsx
<div key={`shared-${item.id}`} className="space-y-2">
  <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
    <span className="font-semibold text-primary">{t('sharedLabel')}</span>
  </div>
  {item.caption && (
    <p className="text-sm text-muted-foreground px-3 pb-1">{item.caption}</p>
  )}
  <FacebookPostCard .../>
</div>
```

## Files changed
- 1 SQL migration (new)
- `src/components/feed/ShareDialog.tsx` (2 edits)
- `src/pages/Profile.tsx` (1 edit)

