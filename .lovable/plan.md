
# Them Hop Thoai Xac Nhan Khi Host Bam "End Live"

## Van De
Hien tai, khi host bam nut "End Live", buoi live ket thuc ngay lap tuc ma khong co xac nhan. Nguoi dung co the vo tinh bam ket thuc buoi live.

## Giai Phap
Them hop thoai xac nhan khi host bam "End Live":
- Title: "Ban co chac ket thuc buoi Live Stream?"
- Description: "Buoi live se ket thuc va video se duoc luu lai."
- OK: Ket thuc live + luu video
- Cancel: O lai tiep tuc live

## Thay Doi

### File: `src/modules/live/pages/LiveHostPage.tsx`

1. **Them state** `showEndConfirm` de quan ly hien/an hop thoai xac nhan End Live

2. **Sua nut "End Live"**: Thay vi goi `handleEndLive()` truc tiep, se set `showEndConfirm = true` de hien hop thoai

3. **Them AlertDialog moi** cho xac nhan End Live:
   - Bam "Ket thuc" -> goi `handleEndLive()` roi dong dialog
   - Bam "O lai" -> dong dialog, tiep tuc live

4. **Giu nguyen** hop thoai navigation guard (useBlocker) da co san -- do la hop thoai khi roi trang, con hop thoai nay la khi bam nut End Live

Tong cong chi sua 1 file, them khoang 20 dong code.
