

## Kế hoạch: Ẩn nút "Đặt mật khẩu" khi chưa liên kết email

### Thay đổi

**File: `src/components/settings/SecuritySettingsContent.tsx`** (dòng 116-123)

Sửa mục Mật khẩu trong mảng `methods`:
- Khi chưa có email (`!hasEmailLoginMethod`): không hiện nút action, thay `statusLabel` thành "Cần liên kết email trước"
- Khi đã có email nhưng chưa đặt mật khẩu: hiện nút "Đặt mật khẩu" như cũ

```typescript
{
  icon: Key, label: 'Mật khẩu',
  description: hasEmailLoginMethod 
    ? 'Đăng nhập nhanh bằng email + mật khẩu' 
    : 'Bạn cần liên kết email để đặt mật khẩu',
  status: hasPassword ? 'connected' : 'disconnected',
  statusLabel: hasPassword ? 'Đã đặt' : 'Chưa đặt',
  action: !hasPassword && hasEmailLoginMethod ? () => setShowSetPassword(true) : undefined,
  actionLabel: 'Đặt mật khẩu',
}
```

Thay đổi nhỏ, chỉ 2 dòng logic trong 1 file.

