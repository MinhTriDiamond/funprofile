

# Sửa lỗi Attester không thấy request signing

## Nguyên nhân gốc

Có 2 phiên bản hàm `is_gov_attester` trong database:

1. **Phiên bản `text` (wallet_addr)** - Đã được cập nhật đầy đủ 11 địa chỉ ở migration trước
2. **Phiên bản `uuid` (check_user_id)** - Vẫn dùng danh sách cũ 9 địa chỉ, trong đó có một số địa chỉ sai (không khớp với config hiện tại)

RLS policy `"Attesters can view signing requests"` gọi `is_gov_attester(auth.uid())` => sử dụng phiên bản UUID => Minh Trí Test 1 và Test 2 không được nhận diện => không đọc được bất kỳ request nào.

Với Lê Minh Trí, ví của anh ấy nằm trong danh sách cũ nên RLS cho phép, nhưng RLS cũ vẫn cho phép status `pending_sig` nên các request chưa ai ký cũng hiển thị nếu code frontend chưa được cập nhật trên trình duyệt.

## Thay đổi

### 1. Database Migration - Cập nhật hàm `is_gov_attester(uuid)`

Cập nhật danh sách địa chỉ trong phiên bản UUID cho khớp với phiên bản text (11 địa chỉ):

- **Will (3):** Minh Trí, Ánh Nguyệt, Thu Trang
- **Wisdom (4):** Bé Giàu, Bé Ngọc, Ái Vân, Minh Trí Test 1
- **Love (4):** Thanh Tiên, Bé Kim, Bé Hà, Minh Trí Test 2

Đồng thời cập nhật RLS policy SELECT để chỉ cho phép đọc request có status `signing` hoặc `signed` (loại bỏ `pending_sig`), đồng bộ với logic frontend.

### 2. Frontend đã đúng

Code trong `useAttesterSigning.ts` dòng 78 đã lọc `.in('status', ['signing', 'signed'])` - không cần sửa thêm.

## Tóm tắt

| Thay đổi | Mục đích |
|----------|----------|
| Cập nhật `is_gov_attester(uuid)` với 11 địa chỉ chính xác | Cho phép Test 1 và Test 2 vượt qua RLS |
| Sửa RLS SELECT policy: bỏ `pending_sig` | Chặn request chưa ai ký ở tầng database |

