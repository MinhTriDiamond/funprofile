

## Thêm nút "Xem bản dịch" cho bài viết (giống Facebook)

### Ý tưởng
Khi nội dung bài viết được viết bằng ngôn ngữ khác với ngôn ngữ user đang chọn, hiển thị nút **"Xem bản dịch"** bên dưới nội dung. Bấm vào → dịch nội dung sang ngôn ngữ user, hiển thị bản dịch phía dưới bản gốc.

### Cách hoạt động

```text
User xem bài viết
       ↓
Phát hiện ngôn ngữ bài viết ≠ ngôn ngữ user
       ↓
Hiện nút "Xem bản dịch" / "See translation"
       ↓
User bấm → gọi Edge Function → Lovable AI dịch
       ↓
Hiển thị bản dịch bên dưới bản gốc
       ↓
Nút đổi thành "Ẩn bản dịch" để thu gọn
```

### Các file cần tạo/sửa

#### 1. Tạo Edge Function `supabase/functions/translate-post/index.ts`
- Nhận `{ text, targetLanguage }`
- Dùng Lovable AI (`google/gemini-3-flash-preview`) để dịch
- System prompt: "You are a translator. Translate the following text to {language}. Return ONLY the translated text, no explanations."
- Trả về `{ translatedText }`

#### 2. Tạo component `src/components/feed/TranslateButton.tsx`
- Nhận props: `content` (nội dung bài), `className`
- Dùng `useLanguage()` để biết ngôn ngữ user
- Phát hiện ngôn ngữ bài viết bằng heuristic đơn giản (regex kiểm tra ký tự Unicode range: CJK, Hangul, Latin, Vietnamese dấu, Cyrillic...)
- Nếu ngôn ngữ bài ≠ ngôn ngữ user → hiện nút "Xem bản dịch"
- Bấm → gọi edge function → hiện loading → hiện bản dịch
- Cache kết quả dịch trong state (không dịch lại nếu đã dịch)
- Nút toggle: "Xem bản dịch" ↔ "Ẩn bản dịch"

#### 3. Sửa `src/components/feed/ExpandableContent.tsx`
- Render `<TranslateButton content={content} />` bên dưới nội dung text

#### 4. Thêm translation keys vào `src/i18n/translations.ts`
- `seeTranslation`: "Xem bản dịch" / "See translation"
- `hideTranslation`: "Ẩn bản dịch" / "Hide translation"
- `translating`: "Đang dịch..." / "Translating..."
- `translationError`: "Không thể dịch" / "Translation failed"

### Logic phát hiện ngôn ngữ
Dùng heuristic nhẹ (không cần thư viện ngoài):
- Kiểm tra tỷ lệ ký tự Vietnamese (có dấu) → `vi`
- Kiểm tra CJK → `zh/ja`
- Kiểm tra Hangul → `ko`
- Kiểm tra Cyrillic → `ru`
- Mặc định Latin không dấu → `en`
- Nếu ngôn ngữ phát hiện trùng ngôn ngữ user → ẩn nút dịch

### Giao diện nút dịch
- Nút text nhỏ, màu xám nhạt, giống Facebook: `🌐 Xem bản dịch`
- Bản dịch hiện trong khung nền nhạt, có border trái xanh lá
- Loading spinner khi đang dịch

### Chi tiết kỹ thuật
- Edge function dùng `LOVABLE_API_KEY` (đã có sẵn)
- Không cần database — dịch on-demand, cache trong React state
- Mỗi lần bấm dịch = 1 API call, kết quả cache trong component
- Giới hạn dịch tối đa 5000 ký tự để tránh tốn token

