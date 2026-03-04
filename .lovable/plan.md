

# Sắp xếp lại thứ tự form GiftFormStep

Thứ tự hiện tại: Người gửi → Token → Mạng → Số lượng → Wrong network warning → Connect wallet → Người nhận → Quick picks → Lời nhắn

Thứ tự mới theo yêu cầu:
1. **Người gửi** (giữ nguyên vị trí)
2. **Người nhận** (đưa lên trước Chọn mạng, bao gồm cả warnings no-wallet)
3. **Chọn mạng** (NetworkSelector)
4. **Chọn token** (TokenSelector)
5. **Số lượng** (Amount input + balance + USD estimate)
6. **Số lượng nhanh** (QuickGiftPicker — tách ra khỏi block "Lời nhắn mẫu")
7. **Lời nhắn mẫu** (phần template trong QuickGiftPicker)
8. **Lời nhắn** (Textarea + emoji)

## Thay đổi cần thực hiện

### File: `src/components/donations/gift-dialog/GiftFormStep.tsx`

Di chuyển các block JSX trong hàm `return` theo thứ tự mới:

1. Sender info block (dòng 130-163) — **giữ nguyên**
2. Recipient section (dòng 235-252) + no-wallet warnings (dòng 254-281) — **đưa lên**
3. Connect wallet CTA (dòng 222-233) — đặt sau recipients
4. NetworkSelector (dòng 171-176) — **đưa xuống sau recipients**
5. TokenSelector (dòng 165-169) — **đưa xuống sau network**
6. Amount input (dòng 178-211) + wrong network warning (dòng 213-220) — **đưa xuống**
7. QuickGiftPicker (dòng 286-288) — giữ sau amount
8. Message textarea (dòng 290-305) — giữ cuối

Không thay đổi logic, props, hay sub-components — chỉ sắp xếp lại thứ tự render.

