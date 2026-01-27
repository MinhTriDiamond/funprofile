
# Plan: Quantum-Speed Media Upload System for FUN Profile

## Overview

This plan upgrades the FUN Profile posting experience to match Facebook-level scale and performance. The goal is to enable users to post up to **100 photos** and **10GB videos** with instant previews, parallel uploads, resumable capabilities, and sub-second feed loading.

---

## Current State Analysis

### What's Already Implemented

| Component | Status | Notes |
|-----------|--------|-------|
| Cloudflare R2 for images | Working | Direct presigned URL uploads |
| Cloudflare Stream for videos | Working | TUS resumable upload protocol |
| Client-side image compression | Working | WebP output, 150KB target |
| Media preview grid | Working | Supports up to 80 items |
| Lazy loading | Working | Intersection Observer + placeholders |
| Infinite scroll feed | Working | Cursor-based pagination, 10 posts/page |

### Current Limitations

1. **No per-file progress bars** - Only overall upload state shown
2. **Sequential image uploads** - Images upload one-by-one, slow for many files
3. **No drag-and-drop reordering** - Media order fixed after selection
4. **Video limit unclear in UI** - 2GB limit exists but not clearly communicated
5. **No URL import support** - Can't paste YouTube/Suno links
6. **Gallery viewer lacks thumbnails** for quick navigation (only shows for 5+ items)

---

## Implementation Plan

### Phase 1: Enhanced Multi-File Upload Engine

**Goal:** Enable 100+ photos with parallel uploads and individual progress tracking

#### 1.1 Create Upload Queue Manager

Create a new utility `src/utils/uploadQueue.ts` that:
- Manages parallel uploads (4-6 concurrent)
- Tracks individual file progress
- Supports pause/resume/cancel per file
- Emits events for UI updates

```text
┌─────────────────────────────────────────────────┐
│                Upload Queue Manager              │
├─────────────────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐            │
│  │File1│  │File2│  │File3│  │File4│  ← Active  │
│  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘            │
│     │        │        │        │                │
│     ▼        ▼        ▼        ▼                │
│  [=====] [===  ] [==   ] [     ] ← Progress     │
│    100%    60%    40%     0%                    │
├─────────────────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐                     │
│  │File5│  │File6│  │File7│  ← Queued           │
│  └─────┘  └─────┘  └─────┘                     │
└─────────────────────────────────────────────────┘
```

#### 1.2 Update FacebookCreatePost Component

Modify `src/components/feed/FacebookCreatePost.tsx` to:
- Accept up to 100 files per post
- Display individual progress bars per file
- Show upload speed and ETA
- Allow removing items during upload
- Enable drag-and-drop reordering

#### 1.3 Create MediaUploadPreview Component

New component `src/components/feed/MediaUploadPreview.tsx`:
- Grid layout with thumbnail previews
- Individual progress overlay per item
- Drag handles for reordering (using react-beautiful-dnd or similar lightweight lib)
- Remove button per item
- Video thumbnail generation (already exists, reuse)

---

### Phase 2: Video Upload Enhancement (10GB Support)

**Goal:** Support 10GB video uploads with robust resumability

#### 2.1 Update File Size Limits

Modify `src/utils/imageCompression.ts`:
```javascript
// Update limits
VIDEO_MAX_SIZE: 10 * 1024 * 1024 * 1024, // 10GB
```

Modify `supabase/functions/get-upload-url/index.ts`:
```javascript
const MAX_VIDEO_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
```

#### 2.2 Enhance VideoUploaderUppy Component

Update `src/components/feed/VideoUploaderUppy.tsx`:
- Increase chunk size for large files (100MB chunks for 1GB+ files)
- Add network speed detection and adaptive chunk sizing
- Show detailed progress: bytes uploaded, speed, ETA
- Handle network interruptions gracefully with auto-retry

#### 2.3 Add Video Compression Option (Client-Side)

For users on slow connections, offer optional client-side compression:
- Use FFmpeg.wasm for browser-based transcoding
- Target 720p/1080p output
- Show compression progress before upload starts

---

### Phase 3: URL Import Feature

**Goal:** Allow pasting YouTube, Suno, and other media URLs

#### 3.1 Create URL Import Dialog

New component `src/components/feed/UrlImportDialog.tsx`:
- Text input for pasting URLs
- Auto-detect platform (YouTube, Vimeo, Suno, etc.)
- Fetch and display thumbnail preview
- Store as embed reference (not file upload)

#### 3.2 Create URL Metadata Fetcher Edge Function

New edge function `supabase/functions/fetch-url-metadata/index.ts`:
- Accept URL, validate against allowlist
- Use oEmbed API for YouTube/Vimeo
- Extract thumbnail and title
- Return metadata for frontend display

#### 3.3 Update Post Schema

Add support for embedded URLs in posts:
```sql
-- Add embedded_urls column to posts table
ALTER TABLE posts ADD COLUMN embedded_urls JSONB DEFAULT '[]';
-- Format: [{ platform: 'youtube', url: '...', thumbnail: '...', title: '...' }]
```

---

### Phase 4: Feed Performance Optimization

**Goal:** Sub-second feed loading with instant media display

#### 4.1 Implement Thumbnail Pre-generation

On upload completion, generate multiple thumbnail sizes:
- Small: 150x150 (for grids, lists)
- Medium: 400x400 (for feed preview)
- Large: 1200x1200 (for lightbox)

Use Cloudflare Image Resizing (already integrated) with URL parameters.

#### 4.2 Optimize LazyImage Component

Update `src/components/ui/LazyImage.tsx`:
- Add LQIP (Low Quality Image Placeholder) support
- Implement progressive loading (tiny blur → full resolution)
- Pre-fetch next batch of images in feed

#### 4.3 Enhance Feed Prefetching

Update `src/hooks/useFeedPosts.ts`:
- Increase prefetch distance (load next 2 pages in advance)
- Add image URL prefetching for visible + next batch
- Implement stale-while-revalidate caching strategy

#### 4.4 Add Service Worker Caching

Create `public/sw.js` for media caching:
- Cache all media.fun.rich images
- Cache-first strategy for static assets
- Network-first for API calls

---

### Phase 5: UI/UX Polish

**Goal:** Facebook-level polish and user delight

#### 5.1 Drag-and-Drop Media Upload Zone

Enhance the upload area in create post dialog:
- Visual feedback on drag enter (border highlight, icon change)
- Drop zone covers entire modal for easier targeting
- Animation on file drop

#### 5.2 Enhanced Error Messages

Update error handling with specific, friendly messages:
- "Ảnh quá lớn (tối đa 100MB)" with file name
- "Đã đạt giới hạn 100 ảnh"
- "Kết nối chậm, đang thử lại..." with retry countdown
- "Video đang xử lý trên server (2-5 phút cho video dài)"

#### 5.3 Post Success Celebration

Add celebration animation on successful post:
- Confetti effect (lightweight, CSS-based)
- Toast with reward info: "Bài viết đã đăng! +10.000 CAMLY"
- Smooth modal close animation

#### 5.4 Mobile-First Optimizations

- Larger touch targets for media grid
- Swipe gestures in gallery viewer
- Native share sheet integration
- Haptic feedback on interactions (where supported)

---

### Phase 6: Reward Integration

**Goal:** Display pending rewards and connect to existing reward system

#### 6.1 Update Post Creation Response

Modify `supabase/functions/create-post/index.ts` to:
- Calculate estimated reward based on media count
- Return reward amount in response
- Trigger pending_reward update

#### 6.2 Add Reward Display to Success Toast

Show reward earned in success message:
```
"Bài viết đã đăng! +10.000 CAMLY 🎉"
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/utils/uploadQueue.ts` | Parallel upload queue manager |
| `src/components/feed/MediaUploadPreview.tsx` | Upload preview grid with progress |
| `src/components/feed/UrlImportDialog.tsx` | URL paste/import dialog |
| `supabase/functions/fetch-url-metadata/index.ts` | URL metadata extraction |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/feed/FacebookCreatePost.tsx` | Multi-file support, parallel uploads, UI enhancements |
| `src/components/feed/VideoUploaderUppy.tsx` | 10GB support, enhanced progress display |
| `src/utils/imageCompression.ts` | Updated limits (10GB video) |
| `supabase/functions/get-upload-url/index.ts` | Updated size limits |
| `supabase/functions/create-post/index.ts` | Reward calculation, embedded URLs |
| `src/hooks/useFeedPosts.ts` | Enhanced prefetching |
| `src/components/ui/LazyImage.tsx` | LQIP support, progressive loading |
| `src/components/feed/MediaGrid.tsx` | Enhanced gallery viewer |

---

## Database Changes

```sql
-- Add embedded_urls column for URL imports
ALTER TABLE posts ADD COLUMN IF NOT EXISTS embedded_urls JSONB DEFAULT '[]';

-- Index for performance if needed
CREATE INDEX IF NOT EXISTS idx_posts_has_embedded ON posts ((jsonb_array_length(embedded_urls) > 0)) 
WHERE jsonb_array_length(embedded_urls) > 0;
```

---

## Implementation Order

1. **Phase 1** (Upload Queue) - Core foundation for all improvements
2. **Phase 4** (Feed Performance) - Quick wins for user experience
3. **Phase 2** (Video Enhancement) - Expand capabilities
4. **Phase 5** (UI Polish) - Refinement and delight
5. **Phase 3** (URL Import) - Additional feature
6. **Phase 6** (Rewards) - Integration with existing system

---

## Technical Considerations

### Dependencies to Add

- No new dependencies required - using existing tus-js-client for video
- Optional: Add a lightweight drag-and-drop library if needed (or use HTML5 Drag API)

### Performance Targets

| Metric | Target |
|--------|--------|
| Feed initial load | < 1 second |
| Image upload (5MB) | < 3 seconds |
| 100 photos upload | < 2 minutes (parallel) |
| 1GB video upload | < 5 minutes |
| Gallery open | < 100ms |

### Storage Considerations

- All media goes to Cloudflare R2 (images) and Cloudflare Stream (videos)
- No database storage for binary data (follows existing pattern)
- CDN caching via media.fun.rich domain

---

## Testing Checklist

After implementation:
- [ ] Upload 50 photos in single post
- [ ] Upload 100 photos in single post
- [ ] Upload 1GB video
- [ ] Upload 5GB video (if 10GB support added)
- [ ] Test upload interruption and resume
- [ ] Test slow network (throttled to 3G)
- [ ] Test mobile upload experience
- [ ] Verify feed loads in < 1 second
- [ ] Verify rewards display correctly
