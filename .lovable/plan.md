

# Fix "Cannot Delete Post" Error

## Root Cause

The `posts` table has a database trigger called `cleanup_post_files` that fires BEFORE DELETE. This trigger calls `delete_storage_object()`, which runs `DELETE FROM storage.objects` -- a direct table operation that Supabase now blocks with error:

```
"Direct deletion from storage tables is not allowed. Use the Storage API instead."
```

This means ANY post deletion fails with 403, regardless of whether the post has media or not.

The frontend code (`handleDelete` in `FacebookPostCard.tsx`) already properly handles video/image cleanup via the Storage API before attempting the post delete. So the trigger is redundant AND broken.

## Fix

### Step 1: Drop the broken trigger and function

Create a database migration to:
1. Drop the trigger `cleanup_post_files` from the `posts` table
2. Drop the trigger function `cleanup_post_files()`
3. Drop the now-unused helper function `delete_storage_object()`

Similarly, there's a `cleanup_comment_files` trigger on the `comments` table using the same pattern -- this should also be dropped to prevent the same error when deleting comments.

### Step 2: No frontend changes needed

The existing `handleDelete` code already handles:
- Cloudflare Stream video deletion via `extractPostStreamVideos` + `deleteStreamVideos`
- Supabase Storage video deletion via `isSupabaseStorageUrl` + `deleteStorageFile`

These use the proper Storage API, so they work correctly.

## Technical Details

| Action | Detail |
|--------|--------|
| Drop trigger | `cleanup_post_files` on `posts` table |
| Drop trigger | `cleanup_comment_files` on `comments` table |
| Drop function | `cleanup_post_files()` |
| Drop function | `cleanup_comment_files()` |
| Drop function | `delete_storage_object()` |
| Frontend changes | None needed |

