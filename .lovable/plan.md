

# Tinh nang Goi y Tim kiem tu Lich su (Search History Suggestions)

## Tong quan

Nang cap InlineSearch hien tai de hien thi lich su tim kiem khi user focus vao o search (truoc khi go), va loc lich su theo prefix khi go. Ket hop localStorage (nhanh) voi bang `search_history` tren cloud (dong bo giua thiet bi).

## Thay doi

### 1. TAO BANG: `search_history` (DB migration)

```sql
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',  -- 'text' | 'user' | 'post'
  metadata JSONB DEFAULT '{}',
  use_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, query, type)
);

-- RLS: user chi doc/ghi cua minh
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own history" ON search_history
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index cho query nhanh
CREATE INDEX idx_search_history_user_recent ON search_history(user_id, last_used_at DESC);
```

### 2. TAO MOI: `src/lib/searchHistory.ts`

Service quan ly lich su tim kiem (localStorage + cloud sync):

- **Cau truc item**: `{ id, query, type, metadata, useCount, lastUsedAt, createdAt }`
- **localStorage key**: `fun_search_history_v1`
- **Max items**: 30 (xoa cu nhat khi vuot)
- **Cac ham chinh**:
  - `getHistory()`: doc tu localStorage
  - `addToHistory(query, type, metadata)`: upsert (neu trung thi update lastUsedAt + useCount++)
  - `removeFromHistory(id)`: xoa 1 item
  - `clearHistory()`: xoa tat ca
  - `syncFromCloud(userId)`: fetch 20 item gan nhat tu bang `search_history`, merge voi local (dedupe theo query+type)
  - `syncToCloud(userId, item)`: upsert len bang `search_history`
  - `getFilteredHistory(prefix)`: loc theo prefix, sap xep theo lastUsedAt desc, tra ve toi da 10 item

### 3. TAO MOI: `src/hooks/useSearchHistory.ts`

Custom hook bao boc searchHistory service:

- Load history khi mount (local + cloud merge 1 lan)
- Expose: `history`, `filteredHistory(prefix)`, `addItem()`, `removeItem(id)`, `clearAll()`, `isEnabled` (setting toggle)
- Doc setting `fun_search_history_enabled` tu localStorage (default: true)
- Khi `isEnabled = false`: khong luu moi, van cho phep xoa

### 4. CAP NHAT: `src/components/layout/InlineSearch.tsx`

Thay doi chinh trong component hien tai:

**A) Hien thi lich su khi focus (chua go gi):**
- Khi `isExpanded = true` va `searchQuery === ''`:
  - Hien dropdown "Tim kiem gan day" voi toi da 10 item
  - Moi item co icon Clock (text) hoac Avatar (user), text query, nut X xoa
  - Footer: "Xoa tat ca lich su" link

**B) Hien thi goi y khi go:**
- Khi `searchQuery.length >= 1`:
  - Nhom 1: "Gan day" — loc history theo prefix (toi da 5 item)
  - Nhom 2: "Goi y" — ket qua search tu server (giu nguyen logic hien tai, nhung chi hien khi query >= 2 ky tu)
- Highlight phan text khop trong moi item

**C) Luu lich su khi search:**
- Khi user thuc hien search (debounced query >= 2):
  - Goi `addItem(query, 'text')`
  - Dong thoi sync len cloud
- Khi user click vao profile result:
  - Goi `addItem('@' + username, 'user', { userId, username, avatarUrl })`

**D) Dropdown structure moi:**

```text
+------------------------------------+
| [Clock] "minh anh"            [X]  |  <- History item
| [Avatar] @thuhuyen             [X]  |  <- User history item  
| [Clock] "livestream"          [X]  |
|                                    |
| Xoa tat ca lich su                 |
+------------------------------------+
```

Khi go "mi":
```text
| --- Gan day ---                    |
| [Clock] "minh anh"            [X]  |  <- filtered by "mi"
| --- Goi y ---                      |
| [Avatar] MinhDev                   |  <- server result
| [Avatar] MinhAnh99                 |  <- server result
+------------------------------------+
```

### 5. (OPTIONAL) Setting toggle

Them vao trang Settings hien co:
- Toggle "Luu lich su tim kiem" (on/off)
- Khi tat: ngung luu, hien nut "Xoa lich su hien tai"
- Luu vao localStorage key `fun_search_history_enabled`

## Thu tu trien khai

1. Tao bang `search_history` (migration)
2. Tao `src/lib/searchHistory.ts` (service doc lap)
3. Tao `src/hooks/useSearchHistory.ts` (hook)
4. Cap nhat `InlineSearch.tsx` (tich hop UI)

## Ket qua ky vong

- Focus o search => hien "Tim kiem gan day" ngay lap tuc (tu localStorage, khong doi server)
- Go ky tu => loc lich su + goi y tu server
- Click item lich su => dien vao o search va chay search
- Xoa 1 item / xoa tat ca hoat dong muot
- Lich su toi da 30 item, khong trung, moi nhat len dau
- Dong bo giua thiet bi qua cloud (khi dang nhap)
- Khong lam lag mobile (localStorage la chinh, cloud la background sync)

