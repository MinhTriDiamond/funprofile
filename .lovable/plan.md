

# Sửa lỗi Link Preview hiển thị ký tự HTML entities

## Vấn đề

Edge function `fetch-link-preview` trả về text chưa decode HTML entities. Ví dụ:
- `B&#xc0;I 1` thay vì `BÀI 1`
- `&#xdd; T&#x1af;&#x1ede;NG` thay vì `Ý TƯỞNG`

Facebook trả OG meta tags chứa HTML entities, nhưng scraper không decode chúng trước khi trả về client.

## Giải pháp

**File: `supabase/functions/fetch-link-preview/index.ts`**

Thêm hàm `decodeHtmlEntities` để decode:
- Named entities: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`
- Numeric entities: `&#xc0;` (hex) → `À`, `&#192;` (decimal) → `À`

Áp dụng decode cho `title`, `description`, `siteName` trước khi trả về response.

Chỉ sửa **1 file**, deploy lại edge function.

