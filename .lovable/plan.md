

## Lọc AttesterSigningPanel chỉ hiển thị Sign-Request do Admin tạo

### Vấn đề hiện tại

AttesterSigningPanel đang hiển thị **toàn bộ mint-request** (bao gồm cả những request chưa được admin tạo sign-request). Cần lọc chỉ hiển thị những request đã có ít nhất 1 chữ ký từ admin (tức là admin đã tạo sign-request).

### Giải pháp

Chỉ cần thay đổi **1 file**: `src/hooks/useAttesterSigning.ts`

Thêm điều kiện lọc trong query để chỉ lấy các request mà `multisig_completed_groups` không rỗng (nghĩa là admin đã ký và tạo sign-request). Cụ thể:

- Thêm filter `.not('multisig_completed_groups', 'eq', '{}')` vào truy vấn Supabase
- Điều này đảm bảo chỉ hiển thị request mà admin (đồng thời là attester) đã ký ít nhất 1 chữ ký đầu tiên khi tạo sign-request

### Chi tiết kỹ thuật

**File:** `src/hooks/useAttesterSigning.ts` (dòng 75-79)

Thay đổi query từ:
```typescript
.in('status', ['pending_sig', 'signing', 'signed'])
```

Thành:
```typescript
.in('status', ['signing', 'signed'])
```

Lý do: Khi admin tạo sign-request, chữ ký đầu tiên được gắn kèm và status chuyển sang `signing`. Những request còn ở `pending_sig` nghĩa là chưa có ai ký (chưa tạo sign-request), nên không cần hiển thị cho attester.

Ngoài ra, cập nhật thêm text mô tả trong `AttesterSigningPanel.tsx` để rõ ràng hơn: "request cần chữ ký" thay vì hiển thị số lượng gây nhầm lẫn.

