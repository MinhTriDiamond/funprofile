
# Sửa lỗi tính sai số lượng FUN trong Mint Requests

## Vấn đề phát hiện

Số lượng FUN trên Admin Dashboard bị thổi phồng nghiêm trọng do 3 bug:

### Bug 1: Merge function cộng dồn sai (NGHIÊM TRỌNG)
File: `supabase/functions/admin-merge-mint-requests/index.ts` (dòng 178-183)

Hiện tại merge tính tổng bằng `amount_display` từ request cũ thay vì tính lại từ `light_actions`.
Mỗi lần admin bấm "Gộp Mint Requests", số FUN bị nhân đôi.

Ví dụ cụ thể: User `hongthienhanh68` chỉ có 47 actions = 165 FUN thực tế, nhưng mint request hiển thị 74,856 FUN.

### Bug 2: Batch create không phân trang
File: `supabase/functions/admin-batch-mint-requests/index.ts` (dòng 137-142)

Supabase mặc định giới hạn 1000 rows. Nếu có trên 1000 eligible actions, hàm chỉ xử lý 1000 dòng đầu -- bỏ sót phần còn lại.

### Bug 3: Không khử trùng action_ids khi merge
Hàm merge dùng `flatMap` gộp tất cả action_ids mà không loại bỏ ID trùng lặp.

## Giải pháp

### 1. Sửa merge function -- Tính lại từ light_actions

Thay vì cộng `amount_display` từ request cũ:

```text
Trước (SAI):
  totalDisplay = sum(request.amount_display)

Sau (ĐÚNG):
  1. Gom tất cả action_ids (đã khử trùng)
  2. Query SUM(mint_amount) FROM light_actions WHERE id IN (action_ids)
  3. Dùng tổng thực tế làm amount_display
  4. Tính lại amount_wei = totalDisplay * 1e18
```

### 2. Sửa batch create -- Phân trang đầy đủ

Thay query đơn lẻ bằng vòng lặp phân trang (mỗi lần 1000 dòng) để đảm bảo lấy hết tất cả eligible actions.

### 3. Thêm validation safeguard

Sau khi tạo/gộp request, so sánh `amount_display` với tổng thực tế từ `light_actions`. Nếu lệch nhau, dùng giá trị từ `light_actions`.

### 4. Script sửa dữ liệu hiện tại

Tất cả mint requests ở trạng thái `pending_sig` cần được tính lại `amount_display` và `amount_wei` từ `light_actions` thực tế.

## Danh sách file thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/admin-merge-mint-requests/index.ts` | Tính lại amount từ light_actions thay vì cộng dồn; khử trùng action_ids |
| `supabase/functions/admin-batch-mint-requests/index.ts` | Thêm phân trang khi fetch eligible actions (vượt giới hạn 1000 dòng) |

## Chi tiết kỹ thuật

### Sửa merge (admin-merge-mint-requests)

Dòng 170-206: Thay đổi logic tính amount:

```text
// 1. Gom action_ids, khử trùng
const allActionIds = [...new Set(requests.flatMap(r => r.action_ids || []))];

// 2. Query tổng thực tế từ light_actions
SELECT SUM(mint_amount) FROM light_actions WHERE id IN (allActionIds) AND is_eligible = true

// 3. Dùng tổng thực tế
totalDisplay = actualTotal từ query
totalWei = BigInt(Math.floor(totalDisplay * 1e18))
```

### Sửa batch create (admin-batch-mint-requests)

Dòng 137-142: Thêm phân trang:

```text
let allActions = [];
let offset = 0;
const PAGE_SIZE = 1000;

while (true) {
  const { data } = query.range(offset, offset + PAGE_SIZE - 1);
  if (!data || data.length === 0) break;
  allActions.push(...data);
  if (data.length < PAGE_SIZE) break;
  offset += PAGE_SIZE;
}
```

### Sửa dữ liệu hiện có

Sau khi deploy code mới, chạy "Gộp Mint Requests" một lần -- hàm mới sẽ tự tính lại đúng amount từ light_actions. Hoặc có thể tạo script riêng để recalculate tất cả pending_sig requests.

## Rủi ro

- **Thấp**: Chỉ thay đổi logic tính toán, không thay đổi schema
- **Quan trọng**: Sau khi deploy, CẦN chạy lại merge để sửa dữ liệu hiện tại
- **Không ảnh hưởng**: Các request đã confirmed trên blockchain không bị ảnh hưởng
