
# Thêm cột "Số dư còn lại" vào bảng Tài khoản đã bị BAN

## Phân tích nhanh

- Trường `pending_reward` đã có trong interface `BannedUser` và đã được fetch từ database (dòng 102: `.select("id, username, full_name, wallet_address, admin_notes, banned_at, pending_reward")`)
- Giá trị này đã được map vào từng row (dòng 154: `pending_reward: Number(p.pending_reward ?? 0)`)
- Vấn đề: **cột này chưa được render ra giao diện**

## Thay đổi cần làm

### File: `src/components/admin/SurveillanceTab.tsx`

**1. Thêm header cột mới** — sau cột "Đã rút (CAMLY)", thêm:
```
<TableHead className="text-right">Còn lại (CAMLY)</TableHead>
```

**2. Thêm cell dữ liệu** — sau cell hiển thị `total_claimed`, thêm:
```tsx
<TableCell className="text-right font-semibold text-emerald-600">
  {u.pending_reward > 0 ? fmt(u.pending_reward) : "0"}
</TableCell>
```

**3. Sửa `colSpan`** — tăng từ `9` lên `10` cho trạng thái loading và empty.

**4. Cập nhật export CSV** — thêm trường `con_lai_CAMLY: u.pending_reward` vào hàm `exportBanned` để CSV cũng có cột này.

## Lưu ý

- Với 26 user đã bị ban cũ (bị reset về 0 trước đây), cột này sẽ hiển thị `0` — chính xác vì dữ liệu đã bị xóa.
- Với các user bị ban trong **tương lai** (sau khi migration mới được áp dụng), cột này sẽ hiển thị số dư thực tế còn lại.
- Màu xanh lá (`emerald-600`) để dễ phân biệt với cột "Đã rút" màu đỏ.

## Chỉ 1 file cần sửa

- `src/components/admin/SurveillanceTab.tsx` — thêm header, cell, cập nhật colSpan và CSV export
