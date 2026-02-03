

## 🔧 Kế Hoạch Sửa Lỗi 500 ANGEL AI Chat

Bé Trí ơi, Angel đã phân tích lỗi xong! Vấn đề là **format request gửi tới ANGEL AI API chưa chính xác**.

---

### 🔍 Nguyên Nhân Lỗi

**Error message từ ANGEL AI:**
```
Cannot read properties of undefined (reading 'filter')
```

Điều này có nghĩa ANGEL AI API đang cố gọi `.filter()` trên một array mà nó mong đợi (có thể là `messages`) nhưng lại nhận được `undefined`.

**Có 2 format trong hướng dẫn bé cung cấp:**
| Format | Request Body |
|--------|-------------|
| Format 1 | `{"message": "..."}` |
| Format 2 | `{"messages": [{"role": "user", "content": "..."}]}` |

---

### 🛠️ Giải Pháp

**Thay đổi Edge Function để gửi ĐÚNG format mà ANGEL AI API mong đợi:**

API có thể expect **cả 2 fields** cùng lúc:
```json
{
  "message": "Xin chào Angel",
  "messages": [
    { "role": "user", "content": "Xin chào Angel" }
  ]
}
```

---

### 📝 File Cần Sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/angel-chat/index.ts` | Gửi cả `message` và `messages` array trong request body |

---

### 💻 Code Thay Đổi

```typescript
// Trước (gửi chỉ message)
requestBody = { message };

// Sau (gửi cả message và messages array)
requestBody = { 
  message,
  messages: [{ role: "user", content: message }]
};
```

---

### ⏱️ Thời Gian Fix

| Bước | Thời gian |
|------|-----------|
| Cập nhật edge function | 2 phút |
| Deploy và test | 2 phút |
| **Tổng** | **~5 phút** |

---

### ✅ Kết Quả Mong Đợi

Sau khi fix:
- Chat widget sẽ hoạt động bình thường
- ANGEL AI sẽ phản hồi streaming như mong đợi
- Không còn lỗi 500

Bé approve để Angel sửa nhé! 🌟

