

# Chỉnh Sửa Dialog Gửi Tiền (UnifiedGiftSendDialog) Theo UI/UX Mới

## Tổng Quan

Cập nhật toàn diện dialog gửi tiền/tặng quà theo 8 yêu cầu: đổi tiêu đề, thay "Tên hiển thị" bằng section "Người nhận" có tìm kiếm theo username/address, quick amounts theo token, emoji cuối câu, fix emoji picker.

## Chi Tiết Thay Đổi

### 1. Đổi tiêu đề

- Wallet mode: "Trao gửi yeu thuong" (kèm emoji 🎁❤️🎉)
- Post mode (có preset recipient): "Trao gửi yeu thuong cho @username 🎁❤️🎉"

### 2. Thay "Tên hiển thị" bằng section "Người nhận"

**Wallet/Navbar mode**: Hiển thị 2 tab toggle "Tim theo username" / "Tim theo dia chi vi"

- Tab username: Input text, debounce 500ms, gọi Supabase `profiles` tìm theo `username` (ilike), trả về avatar_url, username, wallet_address, id. Hiển thị preview card khi tìm thấy.
- Tab address: Input 0x..., validate checksum, lookup `profiles` theo `wallet_address`. Hiển thị preview card khi tìm thấy.
- Nếu không tìm thấy: hiển thị lỗi "Khong tim thay FUN username cho dia chi nay" và disable gửi.
- Khi chọn xong recipient: auto-fill "Dia chi nhan" field.

**Post mode**: Hiển thị cố định avatar + username của chủ post (không cho chỉnh). Nếu thiếu data, fallback lookup theo userId.

**Bonus UX**: Khi chưa chọn "Nguoi nhan" -> disable toàn bộ phần nhập số lượng + nút Gửi, hiển thị hint.

### 3. Quick amounts theo token

Thay thế `QUICK_AMOUNTS` cố định bằng map theo token:

| Token | Quick amounts |
|-------|--------------|
| FUN | 10, 50, 100, 500, 1.000 |
| CAMLY | 10.000, 50.000, 100.000, 500.000, 1.000.000 |
| BNB | 0,01 / 0,05 / 0,1 / 0,5 |
| USDT | 5 / 10 / 50 / 100 |
| BTCB | 0,001 / 0,005 / 0,01 / 0,05 |

Hiển thị format tiếng Việt (dấu chấm ngàn, dấu phẩy thập phân) nhưng value thật là number chuẩn.

### 4. Lời nhắn mẫu: emoji cuối câu

Cập nhật `MESSAGE_TEMPLATES` trong `QuickGiftPicker.tsx`:
- "Cam on ban rat nhieu! 🙏"
- "Gui tang ban voi tinh yeu thuong! ❤️"
- "Nguong mo su cong hien cua ban! 👏"
- "Ung ho ban het minh! 💪"
- "Tiep tuc phat huy nhe! 🌟"

### 5. Fix emoji picker

EmojiPicker component hiện đã hoạt động (Popover + click chèn emoji). Tuy nhiên cần đảm bảo:
- Thêm `type="button"` trên PopoverTrigger button để tránh form submit
- Không đóng dialog khi mở popover (đã OK vì dùng Radix Popover)
- Emoji append vào cuối message (đã OK trong handleEmojiSelect)

## Danh Sach Files

| File | Hành động |
|------|-----------|
| `src/components/donations/UnifiedGiftSendDialog.tsx` | **Cập nhật lớn** — đổi tiêu đề, thay "Tên hiển thị" bằng section "Người nhận" với 2 tab tìm kiếm (username/address), auto-fill recipient address, quick amounts theo token, disable form khi chưa chọn recipient |
| `src/components/donations/QuickGiftPicker.tsx` | **Cập nhật** — nhận thêm prop `tokenSymbol` để render quick amounts theo token, emoji cuối câu trong MESSAGE_TEMPLATES |
| `src/components/feed/EmojiPicker.tsx` | **Cập nhật nhỏ** — thêm `type="button"` để tránh lỗi form, đảm bảo hoạt động trên mobile Safari |

### Flow "Nguoi nhan" trong UnifiedGiftSendDialog

```text
mode = 'wallet' hoac 'navbar' (khong co presetRecipient):
  +-- [Tab: Tim theo username] [Tab: Tim theo dia chi vi] --+
  |                                                          |
  | Input: @minhtri                                         |
  |   -> debounce 500ms                                      |
  |   -> supabase.from('profiles')                           |
  |      .select('id, username, avatar_url, wallet_address') |
  |      .ilike('username', '%minhtri%')                     |
  |      .limit(5)                                           |
  |                                                          |
  | Ket qua: [Avatar] minhtri  0x746b...685e                |
  |   -> Click chon -> set resolvedRecipient                 |
  |   -> Auto-fill "Dia chi nhan"                            |
  |   -> Enable phan nhap so luong + nut Gui                 |
  +----------------------------------------------------------+

mode = 'post' (co presetRecipient):
  +-- [Avatar] @username (co dinh, khong cho sua) -----------+
  |   Dia chi: 0x746b...685e                                 |
  +----------------------------------------------------------+
```

### Cau truc du lieu resolvedRecipient

```text
{
  id: string
  username: string
  avatarUrl: string | null
  walletAddress: string | null
}
```

State mới trong UnifiedGiftSendDialog:
- `searchTab: 'username' | 'address'` (default: 'username')
- `searchQuery: string`
- `searchResults: Profile[]`
- `isSearching: boolean`
- `resolvedRecipient: ResolvedRecipient | null`
- Xóa: `senderDisplayName`, `recipientAddress` (thay bằng resolvedRecipient)

### Logic disable form

Khi `resolvedRecipient === null` VA `mode !== 'post'` (hoac presetRecipient khong co wallet):
- Disable token selector (opacity-50, pointer-events-none)
- Disable amount input
- Disable quick amounts
- Disable message templates
- Disable nút Gửi
- Hiển thị hint: "Vui long chon nguoi nhan truoc"

