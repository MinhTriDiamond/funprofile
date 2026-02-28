

# Bo nen trong suot va nut tron tren trang Leaderboard

## Thay doi
Sua 2 nut (Back va Refresh) tren trang `src/pages/Leaderboard.tsx`:
- Bo `variant="ghost"` (gay nen trong suot khi hover)
- Bo `size="icon"` va `className="rounded-full"` (gay nut tron)
- Chi giu lai icon voi style don gian, khong co nen, khong co vien

## Chi tiet ky thuat
Thay the `<Button variant="ghost" size="icon" ... className="rounded-full">` bang cac `<button>` hoac `<div>` don gian chi chua icon, voi cursor pointer va hover opacity nhe.

```tsx
// Truoc:
<Button variant="ghost" size="icon" onClick={...} className="rounded-full">
  <ArrowLeft className="w-5 h-5" />
</Button>

// Sau:
<button onClick={...} className="p-1 hover:opacity-70 transition-opacity">
  <ArrowLeft className="w-5 h-5" />
</button>
```

