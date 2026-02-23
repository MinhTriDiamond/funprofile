
# Đổi Mặc Định "Ai Có Thể Nhắn Tin" Thành "Mọi Người"

## Thay đổi
Đổi giá trị mặc định của `who_can_message` từ `'friends'` (Chỉ bạn bè) sang `'everyone'` (Mọi người) ở tất cả các vị trí trong code.

## Chi tiết kỹ thuật

Thay `'friends'` thành `'everyone'` tại 6 vị trí trong 4 file:

1. **`src/modules/chat/hooks/useChatSettings.ts`** (2 chỗ)
   - Dòng 9: `DEFAULT_SETTINGS.who_can_message: 'everyone'`
   - Dòng 85: `const whoCanMessage = settings?.who_can_message || 'everyone'`

2. **`src/hooks/useChatSettings.ts`** (2 chỗ)
   - Dòng 15: `DEFAULT_SETTINGS.who_can_message: 'everyone'`
   - Dòng 91: `const whoCanMessage = settings?.who_can_message || 'everyone'`

3. **`src/modules/chat/components/ChatSettingsDialog.tsx`** (1 chỗ)
   - Dòng 55: `value={settings?.who_can_message || 'everyone'}`

4. **`src/components/chat/ChatSettingsDialog.tsx`** (1 chỗ)
   - Dòng 62: `value={settings?.who_can_message || 'everyone'}`

Chỉ thay đổi giá trị mặc định, không ảnh hưởng đến user đã tự chọn cài đặt trước đó.
