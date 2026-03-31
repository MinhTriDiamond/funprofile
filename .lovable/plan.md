

## Làm đồng tiền chạy bay sinh động hơn

Hiện tại animation `float-coin` chỉ nhúc nhích nhẹ (±8px), `sparkle-coin` chỉ scale. Cần làm coin **di chuyển nhiều hơn, xoay mạnh hơn, bay lả tả thật sự**.

### Thay đổi

**File `tailwind.config.ts`** — Cập nhật 2 keyframes:

```ts
"float-coin": {
  "0%": { transform: "translateY(0) translateX(0) rotate(0deg)", opacity: "0.6" },
  "20%": { transform: "translateY(-12px) translateX(8px) rotate(15deg)", opacity: "0.9" },
  "40%": { transform: "translateY(-5px) translateX(-6px) rotate(-10deg)", opacity: "0.7" },
  "60%": { transform: "translateY(-18px) translateX(10px) rotate(20deg)", opacity: "1" },
  "80%": { transform: "translateY(-8px) translateX(-8px) rotate(-15deg)", opacity: "0.8" },
  "100%": { transform: "translateY(0) translateX(0) rotate(0deg)", opacity: "0.6" },
},
"sparkle-coin": {
  "0%": { opacity: "0.4", transform: "scale(0.9) translateY(0) rotate(0deg)" },
  "25%": { opacity: "1", transform: "scale(1.2) translateY(-10px) rotate(12deg)" },
  "50%": { opacity: "0.7", transform: "scale(1) translateY(-6px) rotate(-8deg)" },
  "75%": { opacity: "1", transform: "scale(1.15) translateY(-14px) rotate(15deg)" },
  "100%": { opacity: "0.4", transform: "scale(0.9) translateY(0) rotate(0deg)" },
},
```

- Coin bay lên xuống **nhiều hơn** (±18px thay vì ±8px)
- Thêm **translateX** để coin bay ngang qua lại
- **Xoay mạnh hơn** (±20deg)
- Opacity thay đổi tạo hiệu ứng lấp lánh

### Kết quả
- Tất cả 16 đồng tiền sẽ **bay lả tả, xoay xoay, chạy qua chạy lại** sinh động hơn nhiều
- Chỉ sửa 1 file `tailwind.config.ts`

