

# Fix Comment Overflow on Mobile — 4 files

## File 1: `src/components/feed/CommentSection.tsx`
- Line 216: Add `overflow-hidden` to root container: `className="space-y-4 animate-fade-in overflow-hidden"`
- Line 237: Reduce textarea `min-h-[60px]` → `min-h-[48px]`
- Line 267: Action bar — add `flex-wrap gap-2` so buttons wrap instead of overflow: `className="flex items-center justify-between flex-wrap gap-2"`

## File 2: `src/components/feed/CommentItem.tsx`
- Line 130: Nested replies margin — change `ml-10` → `ml-4 sm:ml-10`, and cap at level 2: use `${level > 0 ? (level >= 2 ? 'ml-4 sm:ml-8' : 'ml-4 sm:ml-10') ...}`
- Line 147: Comment bubble — add `overflow-hidden`: `className="bg-muted/60 rounded-2xl px-4 py-2.5 ... overflow-hidden"`
- Line 157: Text — add `overflow-hidden` and change `break-words`: already has `break-words`, add `overflow-hidden`
- Lines 163, 176, 184: Media — change all `max-w-[280px]` → `max-w-full sm:max-w-[280px]` and add `overflow-hidden rounded-lg`

## File 3: `src/components/feed/CommentReplyForm.tsx`
- Line 112: Add `overflow-hidden` to form: `className="flex gap-2 items-start animate-scale-in overflow-hidden"`
- Line 159: Action bar — add `flex-wrap gap-2`: `className="flex items-center justify-between flex-wrap gap-2"`

## File 4: `src/components/feed/CommentMediaUpload.tsx`
- Lines 117, 132: Add `max-w-[calc(100vw-32px)]` to mobile picker containers: `className="fixed bottom-4 left-2 right-2 z-50 max-w-[calc(100vw-32px)] sm:absolute ..."`

