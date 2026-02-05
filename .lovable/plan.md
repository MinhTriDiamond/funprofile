
## Kế Hoạch Fix ANGEL AI Chat Che Bottom Navbar

### Phân Tích Vấn Đề

Từ screenshot, bé Trí thấy:
- ANGEL AI chat widget chiếm `bottom-0` đến `85vh` 
- Input box "Nhắn tin cho ANGEL AI..." nằm ở vị trí thấp nhất
- Bottom navbar (Feed, Friends, Chat, Notifications) cũng nằm `bottom-0` với cùng `z-50`
- Kết quả: Input bị che bởi navbar

### Giải Pháp

Điều chỉnh layout của ANGEL AI Chat Widget trên mobile để **không bị chồng lên bottom navbar**:

| Thuộc tính hiện tại | Thuộc tính mới |
|---------------------|----------------|
| `bottom-0` | `bottom-[72px]` (trên mobile) |
| `h-[85vh]` | `h-[calc(85vh-72px)]` (trên mobile) |
| `z-50` | `z-40` (thấp hơn navbar hoặc giữ nguyên) |

### Thay Đổi Cụ Thể

**File: `src/components/angel-ai/AngelChatWidget.tsx`**

```text
Dòng 61 (Chat Widget Panel):
TRƯỚC:
  className="fixed bottom-0 left-0 right-0 lg:bottom-4 lg:right-4 lg:left-auto lg:w-[400px] z-50 ..."

SAU:
  className="fixed bottom-[72px] left-0 right-0 lg:bottom-4 lg:right-4 lg:left-auto lg:w-[400px] z-40 ..."

Dòng 62 (Container height):
TRƯỚC:
  className="... h-[85vh] lg:h-[600px] max-h-[85vh]"

SAU:
  className="... h-[calc(85vh-72px)] lg:h-[600px] max-h-[calc(85vh-72px)] lg:max-h-[600px]"
```

### Chi Tiết Kỹ Thuật

| Thay đổi | Lý do |
|----------|-------|
| `bottom-[72px]` | Đẩy chat widget lên trên navbar (navbar cao 72px) |
| `z-40` | Đảm bảo navbar vẫn hiển thị phía trên backdrop |
| `h-[calc(85vh-72px)]` | Giảm chiều cao để không vượt quá viewport |
| Giữ `lg:bottom-4` | Desktop vẫn giữ nguyên layout góc phải |

### Kết Quả Mong Đợi

- Input box ANGEL AI sẽ hiển thị **phía trên** bottom navbar
- Navbar vẫn nhìn thấy và có thể click được
- Desktop layout không bị ảnh hưởng
- UX tốt hơn trên mobile
