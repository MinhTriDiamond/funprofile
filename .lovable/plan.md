

# Hiển thị tên người ký trong tiến trình ký Multisig

## Vấn đề
Hiện tại cột "Tiến trình ký" chỉ hiện emoji + icon (✓/⏳) cho mỗi nhóm. Không hiển thị **tên người đã ký**, dù dữ liệu `signer_name` đã có sẵn trong `multisig_signatures`.

## Giải pháp
Cập nhật phần hiển thị tiến trình ký trong `AttesterSigningPanel.tsx` để hiện tên người ký bên cạnh mỗi nhóm.

## Chi tiết kỹ thuật

### File: `src/components/wallet/AttesterSigningPanel.tsx`

**Thay đổi 1**: Mở rộng cột tiến trình ký từ `140px` → `220px` để có chỗ hiển thị tên.

**Thay đổi 2**: Trong phần render mỗi nhóm GOV (dòng 265-282), thêm hiển thị `signer_name`:
- Nếu đã ký → hiện: `💪 ✓ Tên người ký`
- Nếu chưa ký → hiện: `💪 ⏳ Chờ ký`

Thêm Tooltip (từ shadcn) bọc mỗi badge nhóm để hover hiện thêm thông tin chi tiết: tên nhóm, tên người ký, thời gian ký.

Kết quả: Attester nhìn vào bảng sẽ thấy rõ **ai đã ký**, **thuộc nhóm nào**, và **nhóm nào còn thiếu**.

