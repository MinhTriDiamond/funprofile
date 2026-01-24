
# Plan: Fix Like, Comment, Post, and Avatar Display Issues

## Problem Summary

The user is experiencing multiple related issues:
1. **Like button not working** - Cannot react to posts
2. **Comments not working** - Cannot post comments
3. **Posting not working** - Posts timing out
4. **Image upload not working** - Part of post timeout
5. **Avatar showing "U"** - User avatar not displaying in comment section

## Root Cause Analysis

After reviewing the console logs and code, I identified **two main problems**:

### Problem 1: Authentication Session Timeouts
The console logs show:
```
[CreatePost] getSession error: getSession timeout (5s)
[CreatePost] Watchdog timeout triggered (90s)
```

The `supabase.auth.getSession()` call is timing out, causing all authenticated features to fail. This affects posting, liking, commenting, and uploading.

**Why it happens:**
- Multiple components call `getSession()` or `getUser()` independently
- Network latency or session storage issues cause timeouts
- The 5-second timeout in `FacebookCreatePost.tsx` is too aggressive

### Problem 2: Avatar Components Not Using AvatarImage
Three components use manual `<img>` tags with conditional rendering:
```tsx
{currentUser?.avatar_url ? (
  <img src={...} />
) : (
  <AvatarFallback>U</AvatarFallback>
)}
```

When `currentUser` is `null` (because auth failed/timed out), the fallback "U" is always shown. The proper pattern should use `AvatarImage` with `AvatarFallback`:
```tsx
<AvatarImage src={currentUser?.avatar_url} />
<AvatarFallback>...</AvatarFallback>
```

## Solution Plan

### Part 1: Fix Authentication Reliability

**File: `src/components/feed/FacebookCreatePost.tsx`**
- Increase `getSession` timeout from 5s to 15s
- Add retry logic with exponential backoff
- Cache session reference to avoid repeated auth calls

**File: `src/components/feed/CommentSection.tsx`**
- Add error handling for `getUser()` failures
- Add loading state to prevent premature rendering

**File: `src/components/feed/ReactionButton.tsx`**
- Already has proper error handling, no changes needed

### Part 2: Fix Avatar Display in Comment Components

**File: `src/components/feed/CommentSection.tsx`**
1. Import `AvatarImage` component
2. Replace manual `<img>` tag with `AvatarImage`
3. Use proper fallback pattern with Radix UI

**File: `src/components/feed/CommentItem.tsx`**
1. Import `AvatarImage` component
2. Replace manual `<img>` tag with `AvatarImage`
3. Apply `sizeHint="sm"` for optimization

**File: `src/components/feed/CommentReplyForm.tsx`**
1. Import `AvatarImage` component
2. Replace manual `<img>` tag with `AvatarImage`
3. Apply proper size optimization

### Part 3: Improve Error Feedback

- Add better error messages when session times out
- Show loading indicators during auth verification
- Provide clear "try again" options

## Technical Details

### CommentSection.tsx Changes
```tsx
// Before (line 10)
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// After
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Before (lines 197-205)
<Avatar className="w-10 h-10 ...">
  {currentUser?.avatar_url ? (
    <img src={currentUser.avatar_url} ... />
  ) : (
    <AvatarFallback>...</AvatarFallback>
  )}
</Avatar>

// After
<Avatar className="w-10 h-10 ...">
  <AvatarImage 
    src={currentUser?.avatar_url} 
    alt={currentUser?.username || 'User'} 
    sizeHint="sm" 
  />
  <AvatarFallback>...</AvatarFallback>
</Avatar>
```

### CommentItem.tsx Changes
```tsx
// Before (line 2)
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// After
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Before (lines 122-130)
<Avatar className="w-9 h-9 ...">
  {comment.profiles?.avatar_url ? (
    <img src={comment.profiles.avatar_url} ... />
  ) : (
    <AvatarFallback>...</AvatarFallback>
  )}
</Avatar>

// After
<Avatar className="w-9 h-9 ...">
  <AvatarImage 
    src={comment.profiles?.avatar_url} 
    alt={comment.profiles?.username || 'User'} 
    sizeHint="sm" 
  />
  <AvatarFallback>...</AvatarFallback>
</Avatar>
```

### CommentReplyForm.tsx Changes
```tsx
// Before (line 8)
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// After
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Before (lines 113-121)
<Avatar className="w-8 h-8 ...">
  {currentUser?.avatar_url ? (
    <img src={currentUser.avatar_url} ... />
  ) : (
    <AvatarFallback>...</AvatarFallback>
  )}
</Avatar>

// After
<Avatar className="w-8 h-8 ...">
  <AvatarImage 
    src={currentUser?.avatar_url} 
    alt={currentUser?.username || 'User'} 
    sizeHint="sm" 
  />
  <AvatarFallback>...</AvatarFallback>
</Avatar>
```

### FacebookCreatePost.tsx Auth Timeout Fix
```tsx
// Before (lines 299-303)
const sessionResult = await Promise.race([
  supabase.auth.getSession(),
  new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('getSession timeout (5s)')), 5000)
  )
]);

// After - Increase timeout and add retry
const sessionResult = await Promise.race([
  supabase.auth.getSession(),
  new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('getSession timeout (15s)')), 15000)
  )
]);
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/feed/CommentSection.tsx` | Import AvatarImage, fix avatar rendering |
| `src/components/feed/CommentItem.tsx` | Import AvatarImage, fix avatar rendering |
| `src/components/feed/CommentReplyForm.tsx` | Import AvatarImage, fix avatar rendering |
| `src/components/feed/FacebookCreatePost.tsx` | Increase auth timeout from 5s to 15s |

## Expected Outcome

After these changes:
1. User avatars will display properly using the optimized `AvatarImage` component
2. The "U" fallback will only show when there truly is no avatar
3. Post creation will have more time for authentication
4. Like/comment features will work more reliably
5. Image uploads will complete without timeout
