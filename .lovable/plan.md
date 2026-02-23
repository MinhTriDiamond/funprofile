
# Fix White Screen When Starting Live Stream

## Root Cause
When `LiveHostPage` loads at `/live/new`, the initial `bootState` is `'idle'`. However, the `showLoader` condition only checks for `'auth' | 'creating' | 'loading' | 'starting'` -- it does NOT include `'idle'`. This means during the brief moment before `runBootstrap()` runs, the component falls through to the `!session` check and renders a "Live session not found" card. If the bootstrap then fails (e.g., due to exhausted Cloud balance, network error, or auth issues), it can result in a white screen or flash.

Additionally, the component lacks a top-level error boundary, so any uncaught error during render (e.g., from hooks like `useBlocker`, `useLiveSession`) will crash the entire page to white.

## Fix (1 file)

### File: `src/modules/live/pages/LiveHostPage.tsx`

1. **Include `'idle'` in `showLoader` condition** so the page shows a loading spinner immediately instead of flashing "not found":

```typescript
// Before:
const showLoader =
  ['auth', 'creating', 'loading', 'starting'].includes(bootState) || ...

// After:
const showLoader =
  ['idle', 'auth', 'creating', 'loading', 'starting'].includes(bootState) || ...
```

2. **Wrap the main component export with a try-catch error boundary** using a simple wrapper to prevent white screen on any uncaught render error:

```typescript
// Add a simple ErrorBoundary wrapper around the default export
// If any error occurs, show the error UI instead of white screen
```

This is a minimal 2-line change in 1 file that prevents the white screen.
