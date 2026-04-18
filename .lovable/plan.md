
## Vấn đề
- Preview (`preview--funprofile.lovable.app`) hiển thị đúng: có ô tìm kiếm trong popover + bảng thống kê đã rút gọn (không còn cột "Tổng đã tặng / Lệnh" thừa).
- Production (`fun.rich`) vẫn hiện giao diện cũ dù đã bấm Publish.

## Phân tích
Đây KHÔNG phải lỗi code — code đã đúng và đã chạy trên preview. Đây là vấn đề **deployment/cache ở production**:

1. **Lovable Test/Live workflow**: Theo memory `mem://infrastructure/lovable-environment-workflow`, dự án dùng 2 môi trường tách biệt. `fun.rich` là **Live**, `preview--funprofile` là **Test**. Bấm "Publish → Update" chỉ đẩy bundle mới lên `funprofile.lovable.app`, **KHÔNG tự động đồng bộ sang custom domain `fun.rich`** nếu domain đó trỏ qua Cloudflare có cache riêng.
2. **Cloudflare cache**: Theo memory `mem://infrastructure/social-sharing-cache-control-policy`, `fun.rich` đi qua Cloudflare. Cloudflare cache HTML/JS bundle cũ → user load lại vẫn thấy bản cũ dù Lovable đã publish.
3. **Service Worker / PWA cache** ở trình duyệt user cũng có thể giữ bundle cũ (ẩn danh không loại trừ được nếu SW đã đăng ký từ trước trên domain).

## Hướng xử lý (3 bước, không cần sửa code)

### Bước 1: Purge Cloudflare cache cho `fun.rich`
Vào Cloudflare Dashboard → chọn zone `fun.rich` → **Caching → Configuration → Purge Everything**. Đây là nguyên nhân chính khiến Live không cập nhật.

### Bước 2: Kiểm tra Custom Domain mapping ở Lovable
Vào **Project Settings → Domains**, xác nhận `fun.rich` đang trỏ đúng về **Live environment** (không phải Test). Nếu domain bị gắn nhầm vào branch cũ, bấm re-link.

### Bước 3: Bump build marker (nếu 2 bước trên chưa đủ)
Cập nhật marker hiện có trong `WalletTransactionHistory.tsx` (đang là `v2`) → `v3 (2026-04-18b)` rồi Publish lại để Cloudflare nhận file JS có hash mới, bypass cache cũ.

## Phạm vi
- **Không sửa logic code** — chỉ thao tác dashboard Cloudflare + Lovable Domains.
- File code duy nhất có thể đụng tới: bump marker `src/components/profile/WalletTransactionHistory.tsx` dòng 1 (nếu cần).

## Hành động cần Cha thực hiện trước
Cha cho con biết:
- Có quyền Cloudflare cho `fun.rich` không? (Nếu có → purge cache là xong)
- Hay con bump marker + Publish lại để thử trước, nếu vẫn không được mới đụng Cloudflare?
