
# Kế Hoạch Hoàn Thiện Donation Celebration

## Tổng Quan 3 Yêu Cầu

| # | Yêu Cầu | Giải Pháp |
|---|---------|-----------|
| 1 | Card thông báo thành công tươi sáng + âm thanh | Redesign style + thêm celebration sounds |
| 2 | Link BSCScan đang vào Testnet | Sửa config để dùng Mainnet URL |
| 3 | Thông báo nhận tiền cho người nhận | Tạo component + realtime listener |

---

## 1. Redesign DonationSuccessCard - Style Tươi Sáng + Âm Thanh

### Thay Đổi UI (DonationSuccessCard.tsx)

**Trước**: Background tối (dark gradient #0a0a0a)

**Sau**: Background sáng rạng rỡ với hiệu ứng hào quang
- Gradient: Từ trắng ngà đến vàng nhạt
- Border: Vàng gold với glow effect  
- Icon: Lớn hơn, có animation glow
- Số tiền: Font lớn với text-shadow

### Thêm Celebration Sounds (DonationCelebration.tsx)

Sử dụng Web Audio API với các file âm thanh public:
- `coins-falling.mp3` - Âm thanh tiền rơi (chơi khi mở)
- `celebration.mp3` - Âm thanh pháo hoa chúc mừng

Thêm animations mới vào tailwind.config.ts:
- `animate-glow-radiate` - Hiệu ứng tỏa sáng
- `animate-sparkle-float` - Đốm sáng bay lơ lửng

---

## 2. Sửa Link BSCScan → Mainnet

**File**: `src/config/pplp.ts`

```typescript
// Trước
export const BSCSCAN_TESTNET_URL = 'https://testnet.bscscan.com';
export const getTxUrl = (txHash: string) => `${BSCSCAN_TESTNET_URL}/tx/${txHash}`;

// Sau
export const BSCSCAN_MAINNET_URL = 'https://bscscan.com';
export const getTxUrl = (txHash: string) => `${BSCSCAN_MAINNET_URL}/tx/${txHash}`;
```

---

## 3. Thông Báo Nhận Tiền Cho Người Nhận

### Component Mới: DonationReceivedNotification.tsx

Khi người nhận đang online, hiển thị popup chúc mừng:
- Realtime listener trên bảng `donations` với filter `recipient_id = user.id`
- Khi có donation mới → Trigger celebration popup
- Âm thanh + hiệu ứng pháo hoa như bên gửi

### Tích Hợp

Thêm component vào App.tsx để lắng nghe realtime cho user đang login.

---

## Files Cần Thay Đổi

| # | File | Thay Đổi |
|---|------|----------|
| 1 | `src/config/pplp.ts` | Đổi Testnet → Mainnet URL |
| 2 | `src/components/donations/DonationSuccessCard.tsx` | Redesign bright style + glow effects |
| 3 | `src/components/donations/DonationCelebration.tsx` | Thêm celebration sounds |
| 4 | `tailwind.config.ts` | Thêm keyframes cho glow/sparkle animations |
| 5 | `src/components/donations/DonationReceivedCard.tsx` | **Tạo mới** - Card cho người nhận |
| 6 | `src/hooks/useDonationReceived.ts` | **Tạo mới** - Realtime listener |
| 7 | `src/App.tsx` | Tích hợp realtime notification |
| 8 | `public/sounds/coins.mp3` | **Tạo mới** - Âm thanh coins |
| 9 | `public/sounds/celebration.mp3` | **Tạo mới** - Âm thanh chúc mừng |

---

## UI Preview

### Sender Success Card (Người Gửi)

```
╔══════════════════════════════════════════════╗
║              ✨ 🎊 🎉 🎊 ✨                   ║
║                                              ║
║    🎁 CHÚC MỪNG TẶNG THƯỞNG THÀNH CÔNG!     ║
║                                              ║
║   ╔══════════════════════════════════════╗   ║
║   ║  ⭐ 1.000 CAMLY ⭐                   ║   ║
║   ║  ≈ Priceless với tình yêu thương 💛  ║   ║
║   ╚══════════════════════════════════════╝   ║
║                                              ║
║   👤 Người tặng: @MinhTri                    ║
║   🎯 Người nhận: @User123                    ║
║   💬 Lời nhắn: "Cảm ơn bạn rất nhiều!"       ║
║   🕐 Thời gian: 07/02/2026 19:17:00          ║
║   🔗 TX Hash: 0x1baaf783...44a3c84d          ║
║                                              ║
║   ✨ +10 Light Score được cộng! ✨            ║
║                                              ║
║   [Xem BSCScan] [Lưu Hình] [Đóng]            ║
╚══════════════════════════════════════════════╝

Background: Gradient trắng → vàng nhạt
Border: Gold glow effect
```

### Recipient Received Card (Người Nhận)

```
╔══════════════════════════════════════════════╗
║              🎉 💰 🎊 💰 🎉                   ║
║                                              ║
║    🎁 BẠN NHẬN ĐƯỢC QUÀ TẶNG!                ║
║                                              ║
║   ╔══════════════════════════════════════╗   ║
║   ║  💰 1.000 CAMLY 💰                   ║   ║
║   ║  Từ @MinhTri với tình yêu thương 💚   ║   ║
║   ╚══════════════════════════════════════╝   ║
║                                              ║
║   💬 "Cảm ơn bạn rất nhiều!"                 ║
║                                              ║
║   [Xem BSCScan] [Gửi Lời Cảm Ơn] [Đóng]      ║
╚══════════════════════════════════════════════╝
```

---

## Kỹ Thuật: Celebration Sounds

```typescript
// Sử dụng Web Audio API
const playCelebrationSound = () => {
  const coins = new Audio('/sounds/coins.mp3');
  const celebration = new Audio('/sounds/celebration.mp3');
  
  coins.volume = 0.5;
  celebration.volume = 0.3;
  
  coins.play();
  setTimeout(() => celebration.play(), 500);
};
```

Lưu ý: Sẽ sử dụng các file audio miễn phí từ web hoặc generate đơn giản với Web Audio API để tránh phụ thuộc external resources.

---

## Timeline Ước Tính

| Task | Thời gian |
|------|-----------|
| Sửa BSCScan URL (Mainnet) | 2 phút |
| Redesign Success Card style | 15 phút |
| Thêm celebration sounds | 10 phút |
| Tạo DonationReceivedCard | 15 phút |
| Realtime listener hook | 10 phút |
| Tích hợp vào App.tsx | 5 phút |
| Thêm animations mới | 5 phút |
| **Tổng** | **~60 phút** |

---

## Kết Quả Mong Đợi

1. **Sender**: Khi gửi thành công → Card tươi sáng, rạng rỡ + âm thanh tiền rơi + pháo hoa
2. **Recipient**: Khi có ai đó tặng → Popup chúc mừng real-time + âm thanh celebration
3. **BSCScan**: Link đã chuyển sang Mainnet (bscscan.com)
4. **UX**: Trải nghiệm vui vẻ, lễ hội cho cả người gửi và người nhận
