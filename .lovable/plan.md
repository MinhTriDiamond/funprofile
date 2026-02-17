
# Thêm giao diện Tết cho DonationSuccessCard (thẻ người gửi)

## Vấn đề
- Thẻ `DonationSuccessCard.tsx` (hiển thị cho người gửi, có nút "Lưu Hình") chưa được cập nhật giao diện Tết
- Chỉ có `DonationReceivedCard.tsx` (thẻ người nhận) đã có logic chuyển đổi giao diện theo ngày

## Thay đổi cần thực hiện

### File: `src/components/donations/DonationSuccessCard.tsx`

1. **Import video nền** `tet6-3.mp4` (giống DonationReceivedCard)
2. **Thêm hằng số `TET_CUTOFF`**: `2026-02-16T17:00:00.000Z` (tức 17/2/2026 00:00 UTC+7)
3. **Thêm biến `isTetTheme`**: kiểm tra `data.createdAt >= TET_CUTOFF`
4. **Điều kiện hiển thị**:
   - Từ 17/2/2026 trở đi: video nền pháo hoa, chữ "HAPPY NEW YEAR" vàng kim, khung 3:2, sparkles vàng, chữ nhỏ hơn để vừa khung
   - Trước 17/2/2026: giữ nguyên giao diện xanh lá hiện tại

### Chi tiết kỹ thuật

Áp dụng cùng pattern đã dùng trong `DonationReceivedCard.tsx`:

- Thay `style={{ background: 'linear-gradient(...)' }}` bằng điều kiện `isTetTheme ? { aspectRatio: '3 / 2' } : { background: '...' }`
- Thêm khối `{isTetTheme && (<video>...</video>)}` cho nền video
- Thêm `{isTetTheme && (<h1>HAPPY NEW YEAR</h1>)}` trước lời chúc mừng
- Điều chỉnh padding, font-size, spacing theo `isTetTheme` để nội dung vừa khung 3:2
- Sparkles đổi màu vàng khi Tết

## Tóm tắt
- Chỉ sửa **1 file**: `src/components/donations/DonationSuccessCard.tsx`
- Kết quả: Cả thẻ người gửi lẫn thẻ người nhận đều hiển thị giao diện Tết từ ngày 17/2/2026
