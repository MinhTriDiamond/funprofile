
# Thay doi hien thi trang thai ban tren trang ca nhan

## Noi dung thay doi

### `src/pages/Profile.tsx` (dong 530-532)

Thay the Badge nho "Da bi cam" bang mot khoi canh bao co khung vien do, hien thi 2 dong:
- Dong 1 (in dam): **Tai khoan bi cam vinh vien**
- Dong 2 (nho hon): *Tai khoan nay da vi pham dieu khoan su dung va bi cam vinh vien.*

Code moi:
```tsx
{profile?.is_banned && (
  <div className="mt-2 border-2 border-red-500 rounded-lg px-4 py-3 bg-red-50">
    <p className="text-red-600 font-bold text-sm">Tài khoản bị cấm vĩnh viễn</p>
    <p className="text-red-500 text-xs mt-0.5">Tài khoản này đã vi phạm điều khoản sử dụng và bị cấm vĩnh viễn.</p>
  </div>
)}
```

Khong can thay doi file nao khac. Chi thay the phan Badge hien tai bang khoi div co khung vien do.
