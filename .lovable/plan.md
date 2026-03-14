
# Fix Missing Avatar Images for 3 Social Links

## Problem Analysis
From network logs, the 3 links without profile pictures are:
1. **Zalo** (`zalo.me/0973143118`) - edge function returns `{"avatarUrl":null}` because Zalo phone-number links don't expose profile pictures
2. **YouTube** (`unavatar.io/youtube/VanNguyen-Camly`) - unavatar.io may not find a valid avatar for this username format
3. **Telegram** (`unavatar.io/telegram/Van103`) - unavatar.io may not have data for this user

The root cause: for YouTube/Telegram, the edge function blindly returns an `unavatar.io` URL without verifying it actually resolves to a real image. If unavatar returns a default/fallback or 404, the orbit shows nothing useful.

## Plan

### 1. Update Edge Function: Validate unavatar URLs before returning
**File**: `supabase/functions/fetch-link-preview/index.ts`

For platforms using `UNAVATAR_MAP`, instead of blindly returning the unavatar URL:
- Actually fetch the unavatar URL with a HEAD request to verify it returns a real image (not a redirect to a default)
- If unavatar fails, fall back to **OG image scraping** from the actual profile page (e.g., scrape `og:image` from the YouTube channel page)
- This ensures we always try to get a real profile picture

### 2. Improve Zalo handling
- Zalo `zalo.me/{phone}` pages do serve OG meta tags for some profiles
- Update the Zalo handler to try scraping with a mobile User-Agent, which may return OG image data

### 3. Redeploy edge function
Deploy the updated `fetch-link-preview` function so the changes take effect immediately.

### Technical Detail
```text
Current flow for YouTube/Telegram:
  platform in UNAVATAR_MAP → return unavatar URL (no validation)

New flow:
  platform in UNAVATAR_MAP → fetch unavatar URL (HEAD)
    → if valid image → return it
    → if invalid → scrape og:image from actual profile URL
    → if og:image found → return it
    → else → return null
```

This ensures all 3 problematic links get a real attempt at fetching their profile pictures rather than returning unverified URLs.
