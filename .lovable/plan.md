

## Xoá bỏ nút dịch (Translate Button)

### Các file cần sửa/xoá

1. **Xoá file `src/components/feed/TranslateButton.tsx`**

2. **Xoá file `supabase/functions/translate-post/index.ts`** (edge function dịch bài)

3. **Sửa `src/components/feed/ExpandableContent.tsx`**
   - Xoá import `TranslateButton`
   - Xoá 2 dòng `<TranslateButton content={content} />` (dòng 33 và 89)

4. **Sửa `src/i18n/translations.ts`**
   - Xoá các key: `seeTranslation`, `hideTranslation`, `translating`, `translationError`

