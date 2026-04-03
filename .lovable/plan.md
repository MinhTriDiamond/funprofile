
# Sửa lại logo BTC cho tròn và thẳng hàng trong danh sách Tokens

## Kết luận sau khi kiểm tra
Hiện tại vẫn chưa ổn hoàn toàn:
- Trong `src/components/wallet/WalletCard.tsx`, ô logo của BTC/BTCB đang là `w-10 h-10` còn các token khác là `w-8 h-8`, nên cột chữ bị lệch hàng.
- File `src/assets/tokens/btc-logo.png` là ảnh vuông có nền trắng/padding khá lớn, nên dù đã bo tròn bằng CSS, logo BTC vẫn chưa tròn đẹp như các đồng còn lại.

## Cách sửa
### 1) Giữ cùng một “ô căn lề” cho mọi token
Trong `WalletCard.tsx`, đổi phần wrapper ngoài của logo về cùng một kích thước `w-8 h-8` cho tất cả token để tên coin luôn bắt đầu cùng một cột.

### 2) Tạo mask tròn riêng cho BTC
Bên trong wrapper, thêm lớp `rounded-full overflow-hidden` và render ảnh bằng `w-full h-full object-cover`.
- BTC: thêm `scale` nhẹ, và nếu cần thì `-translate-x-px`, để bù phần padding của file ảnh mà không làm lệch hàng.
- BTCB: giữ scale nhỏ hơn hoặc mặc định để vẫn cân xứng.

### 3) Chỉ thay asset nếu CSS vẫn chưa đủ đẹp
Nếu sau bước 1-2 logo BTC vẫn còn viền trắng/padding nhìn rõ, thay `src/assets/tokens/btc-logo.png` bằng bản crop sát, nền trong suốt để logo tròn đẹp tự nhiên hơn.

## Kết quả mong muốn
- Logo BTC tròn hơn, đầy hơn, không còn cảm giác bị lọt trong khung trắng.
- Hàng BTC thẳng cột với BNB, USDT, BTCB, CAMLY, FUN.
- Không làm ảnh hưởng các logo khác.

## Chi tiết kỹ thuật
```tsx
<div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
    <img
      src={token.icon}
      alt={token.symbol}
      className={cn(
        "w-full h-full object-cover rounded-full",
        token.symbol === 'BTC' ? "scale-[1.2] -translate-x-px" :
        token.symbol === 'BTCB' ? "scale-[1.05]" : ""
      )}
    />
  </div>
</div>
```
Trọng tâm là tăng phần hiển thị thật của BTC bằng `scale`, nhưng giữ footprint ngoài luôn là `w-8 h-8` để không lệch hàng nữa.
