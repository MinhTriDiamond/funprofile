

## Lọc lịch sử mint chỉ hiển thị contract hiện tại (0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6)

### Phân tích

Dữ liệu xác nhận: 2 records cũ có `action_hash = NULL` (contract cũ, trước 09/02). Tất cả records của contract hiện tại đều có `action_hash` (là `keccak256` của action name, liên kết trực tiếp với contract v1.2.1).

Vì bảng `pplp_mint_requests` không lưu trực tiếp `contract_address`, cách chính xác nhất để phân biệt contract hiện tại là lọc theo `action_hash IS NOT NULL` -- chỉ contract v1.2.1 tại địa chỉ `0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6` mới tạo ra `action_hash`.

### Thay đổi

**File:** `src/hooks/useMintHistory.ts`

Thêm 1 dòng filter vào query (dòng 42-43):

```typescript
.eq('user_id', user.id)
.not('action_hash', 'is', null)  // Chỉ contract hiện tại 0x39A1...CD6
.order('created_at', { ascending: false });
```

Chỉ thay đổi 1 file, thêm 1 dòng. Records cũ vẫn giữ trong database nhưng không hiển thị cho user.

