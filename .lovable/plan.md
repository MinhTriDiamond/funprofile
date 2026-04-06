

# Chỉ tính Light Score cho bài đầu tiên + Kiểm tra tài khoản ảo

## Kết quả kiểm tra tài khoản ảo

User `thuongnguyen_camly` **không có dấu hiệu tài khoản ảo (sybil)**:
- Chỉ có 1 tài khoản duy nhất với email `thuong1121977@gmail.com`
- Không có tài khoản nào khác dùng chung thiết bị (device_hash)
- Không trùng mẫu email với các tài khoản đáng ngờ khác

Tuy nhiên user này có **hành vi farm coin** rõ rệt (53,883 Light trong 30 ngày, gấp 15x trung bình).

## Vấn đề bài trùng lặp

Hệ thống hiện tại đã có duplicate detection trong `create-post`:
- Bài thứ 2+ trùng `content_hash` → đánh dấu `is_reward_eligible = false` → PPLP bỏ qua ✓

**Lỗ hổng**: Chỉ so sánh hash chính xác. Nếu user thay đổi 1-2 từ, hash khác → qua mặt được. Hệ thống repetitive content detection (word overlap 95%) đã bổ sung nhưng ngưỡng quá cao.

## Giải pháp

### 1. Tăng cường `pplp-evaluate` — Double-check content_hash trước khi tính điểm
Thêm bước kiểm tra trong `pplp-evaluate/index.ts`: khi `action_type = 'post'`, truy vấn xem có bài nào **cùng content_hash** đã được thưởng trước đó chưa. Nếu có → skip, chỉ bài **đầu tiên** được tính.

### 2. Giảm ngưỡng repetitive content trong `create-post`
Giảm ngưỡng word overlap từ **95%** xuống **80%** để bắt các bài gần giống nhau (thay vài từ).

### 3. Thu hồi Light Score từ bài trùng đã lọt
Chạy migration/insert để:
- Tìm tất cả bài trùng `content_hash` trong hệ thống (không chỉ user này)
- Giữ bài **đầu tiên** (theo `created_at`), đánh dấu các bài sau là `is_reward_eligible = false`
- Cập nhật `light_actions` tương ứng: set `is_eligible = false`, `light_score = 0`

## Chi tiết kỹ thuật

### File 1: `supabase/functions/pplp-evaluate/index.ts`
Thêm sau block "DUPLICATE POST CHECK" (dòng 207):
```
if (action_type === 'post' && reference_id) {
  // Lấy content_hash của bài này
  // Tìm bài đầu tiên cùng content_hash đã được thưởng
  // Nếu bài này KHÔNG phải bài đầu tiên → skip
}
```

### File 2: `supabase/functions/create-post/index.ts`
Giảm ngưỡng repetitive detection từ 95% → 80%.

### Data fix: Thu hồi Light từ bài trùng toàn hệ thống
Sử dụng SQL để tìm và xử lý tất cả bài trùng `content_hash` trên toàn hệ thống.

## File cần sửa
| File | Thay đổi |
|------|----------|
| `supabase/functions/pplp-evaluate/index.ts` | Thêm content_hash double-check |
| `supabase/functions/create-post/index.ts` | Giảm ngưỡng repetitive 95% → 80% |
| SQL data fix | Thu hồi Light từ bài trùng đã lọt |

