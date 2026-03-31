

## Làm nền xanh lá nhẹ nhàng hơn

### Thay đổi

**File `src/components/feed/GiftCelebrationCard.tsx`** (dòng 266)

Hiện tại nền card dùng gradient xanh đậm:
```
background: 'linear-gradient(135deg, #064e3b 0%, #047857 30%, #065f46 60%, #064e3b 100%)'
```

Đổi sang tông xanh lá **nhẹ nhàng hơn**, sáng hơn:
```
background: 'linear-gradient(135deg, #0d9668 0%, #10b981 30%, #0d9668 60%, #0a7c5a 100%)'
```

- `#064e3b` (xanh rất đậm) → `#0d9668` / `#0a7c5a` (xanh emerald sáng hơn)
- `#047857` → `#10b981` (emerald-500, tươi sáng hơn)

### Kết quả
- Nền card gift sẽ **xanh lá nhẹ nhàng, tươi sáng hơn** thay vì xanh đậm tối
- Chỉ sửa 1 dòng trong 1 file

