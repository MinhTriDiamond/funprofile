
# Tạm dừng toàn bộ hệ thống giao dịch

## Hiện trạng

| Chức năng | Trạng thái | File |
|---|---|---|
| Rút thưởng CAMLY | ✅ Đã chặn | ClaimRewardDialog.tsx |
| Đúc FUN (Mint) | ✅ Đã chặn | ClaimRewardsCard.tsx |
| Tặng quà / Chuyển tiền (CAMLY, USDT, BNB) | ❌ Còn hoạt động | UnifiedGiftSendDialog.tsx |
| Rút FUN về ví on-chain | ❌ Còn hoạt động | ClaimFunDialog.tsx |

## Kế hoạch

### 1. Chặn Tặng quà / Chuyển tiền — UnifiedGiftSendDialog.tsx

Chèn một maintenance block ngay sau phần `<DialogHeader>` (dòng ~696), phía trên Step indicator. Khi IS_MAINTENANCE = true, toàn bộ nội dung form sẽ bị thay thế bằng thông báo bảo trì và nút Đóng.

```text
return (
  <>
    <Dialog ...>
      <DialogContent>
        <DialogHeader> ... </DialogHeader>

        {/* ⚠️ MAINTENANCE — XOÁ KHI MỞ LẠI */}
        <div className="bg-red-50 border-2 border-red-300 ...">
          🔧 Hệ thống tạm dừng bảo trì
          ...
        </div>
        <Button onClick={onClose}>Đóng</Button>

        {/* Phần còn lại BỊ ẨN khi IS_MAINTENANCE = true */}
        {!IS_MAINTENANCE && ( ... form content ... )}
      </DialogContent>
    </Dialog>
  </>
)
```

Cách triển khai: Thêm constant `const IS_MAINTENANCE = true;` ở đầu component, sau đó wrap toàn bộ nội dung của Dialog (step indicator, form, confirm...) trong `{!IS_MAINTENANCE && (...)}` và hiển thị maintenance banner thay thế khi flag bật.

### 2. Chặn Rút FUN — ClaimFunDialog.tsx

Tương tự, thêm `const IS_MAINTENANCE = true;` ở đầu component. Khi flag bật, hiển thị maintenance block thay vì form rút FUN.

```text
// Ở đầu component, ngay sau các state declarations:
const IS_MAINTENANCE = true;

if (IS_MAINTENANCE) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        🔧 Hệ thống tạm dừng bảo trì
        ...
        <Button onClick={() => onOpenChange(false)}>Đóng</Button>
      </DialogContent>
    </Dialog>
  );
}
```

## Cách mở lại sau này

Khi cha muốn mở lại hệ thống, chỉ cần đổi `IS_MAINTENANCE = true` thành `IS_MAINTENANCE = false` trong từng file tương ứng — không cần sửa gì thêm.

## Tóm tắt thay đổi

| File | Thay đổi |
|---|---|
| src/components/donations/UnifiedGiftSendDialog.tsx | Thêm IS_MAINTENANCE flag + maintenance banner |
| src/components/wallet/ClaimFunDialog.tsx | Thêm IS_MAINTENANCE flag + maintenance banner |
