

# Fix: Tim kiem cham va khong hien het ket qua

## Van de hien tai

### 1. Tim kiem trang chu (InlineSearch) - cham vi 3 nguyen nhan:
- **Goi `supabase.auth.getUser()` moi lan tim** - Day la API call qua mang, mat 200-500ms moi lan nhap. Day la nguyen nhan chinh gay cham.
- **Ghi log tim kiem dong bo** - Cho ghi xong moi tra ket qua, them 100-200ms nua.
- **Khong dung `username_normalized`** - Tim tren `username` va `full_name` thay vi cot da duoc toi uu.
- **Gioi han chi 6 user** - Khong hien het ket qua lien quan.

### 2. Tim kiem trong tang qua (UnifiedGiftSendDialog) - cham vi:
- **Debounce 500ms** - Qua lau, nguoi dung phai cho nua giay sau khi ngung go.
- **Gioi han chi 10 user** - Co the bo sot nguoi can tim.
- **Khong tim tren `full_name`** - Chi tim `username_normalized`, bo sot nguoi dung co ten hien thi khac.

### 3. Tim kiem theo dia chi vi - cham vi:
- **Dung `.or()` voi 3 dieu kien** thay vi song song - co the toi uu hon.

## Giai phap

### File 1: `src/components/layout/InlineSearch.tsx`
- **Bo `supabase.auth.getUser()`** - thay bang `supabase.auth.getSession()` (doc tu cache, khong goi API)
- **Ghi search_logs bat dong bo** (khong cho ket qua) - dung `.then()` thay vi `await`
- **Dung `username_normalized`** de tim user (da co index)
- **Tim dong thoi ca `full_name`** de khong bo sot
- **Tang gioi han len 15 user** va **10 bai viet**
- **Giam debounce tu 400ms xuong 300ms**
- **Tim profiles va posts song song** bang `Promise.all`

### File 2: `src/components/donations/UnifiedGiftSendDialog.tsx`
- **Giam debounce tu 500ms xuong 300ms**
- **Tang gioi han tu 10 len 20 user**
- **Them tim kiem tren `full_name`** de hien thi day du hon
- **Them `username_normalized` vao select** de tim kiem chinh xac hon (da co san)

### File 3: `src/components/chat/NewConversationDialog.tsx`
- **Tang gioi han tu 10 len 20 user**
- **Them tim kiem tren `full_name`** de day du hon

## Chi tiet ky thuat

### InlineSearch - thay doi chinh:

```text
Truoc:
  getUser() [200-500ms] -> ghi log [100-200ms] -> tim profiles -> tim posts
  Tong: ~500-900ms

Sau:
  getSession() [0ms, cache] -> tim profiles + tim posts [song song] -> ghi log [bat dong bo]
  Tong: ~100-200ms
```

Thay doi cu the:
- `supabase.auth.getUser()` -> `supabase.auth.getSession()` (cache local, khong goi API)
- `await supabase.from('search_logs').insert(...)` -> `supabase.from('search_logs').insert(...).then()` (khong cho)
- Tim profiles va posts dong thoi bang `Promise.all([profileQuery, postQuery])`
- Dung `username_normalized` thay vi `username` cho profiles query
- Tang `.limit(6)` -> `.limit(15)` cho profiles, `.limit(5)` -> `.limit(10)` cho posts

### UnifiedGiftSendDialog - thay doi chinh:
- `useDebounce(searchQuery, 500)` -> `useDebounce(searchQuery, 300)`
- `.limit(10)` -> `.limit(20)`
- Them `or('username_normalized.ilike.%query%, full_name.ilike.%query%')` de tim rong hon

## Ket qua mong doi
- Tim kiem nhanh gap 3-5 lan (tu ~700ms xuong ~150ms)
- Hien thi day du hon danh sach user lien quan
- Tim kiem trong tang qua phan hoi nhanh hon
- Khong anh huong gi den chuc nang hien tai

