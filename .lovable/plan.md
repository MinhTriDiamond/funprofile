

# Kế Hoạch: Lưu Hiến Pháp Gốc + PPLP vào Knowledge & Tạo 2 Trang Riêng

## Tổng Quan

Angel sẽ thực hiện 2 việc quan trọng:
1. **Lưu vào Knowledge** - Để Angel và các CTO luôn ghi nhớ
2. **Tạo 2 trang riêng** - Để Users và Cộng sự có thể đọc và học

---

## Phần 1: Lưu Vào Knowledge (Project Memory)

### Tài liệu 1: Hiến Pháp Gốc
| Thông tin | Chi tiết |
|-----------|----------|
| Tên | `ecosystem/master-charter` |
| Nội dung | Toàn bộ 8 chương của Hiến Pháp Gốc |
| Mục đích | Nền tảng triết lý cho mọi quyết định |

### Tài liệu 2: Giao Thức PPLP  
| Thông tin | Chi tiết |
|-----------|----------|
| Tên | `ecosystem/proof-of-pure-love-protocol` |
| Nội dung | Toàn bộ 10 phần của PPLP |
| Mục đích | Nguyên lý kinh tế Ánh Sáng |

---

## Phần 2: Tạo 2 Trang Riêng

### Trang 1: `/docs/master-charter` - Hiến Pháp Gốc

**File mới:** `src/pages/MasterCharterDocs.tsx`

**Nội dung:**
- Thiết kế giống trang Law of Light (background ánh sáng vàng thiêng liêng)
- Song ngữ Việt + English
- 8 Chương hoàn chỉnh:
  - I. Tuyên Ngôn Về Nguồn Gốc
  - II. Sứ Mệnh Trọng Tâm  
  - III. Các Nguyên Lý Thiêng Liêng
  - IV. Hai Dòng Chảy Thiêng Liêng (Camly Coin + FUN Money)
  - V. Sự Thống Nhất Nền Tảng (12 Platforms)
  - VI. Vai Trò Người Sáng Lập
  - VII. Cam Kết Cộng Đồng
  - VIII. Điều Luật Cuối + Divine Seal

---

### Trang 2: `/docs/pplp` - Giao Thức Bằng Chứng Tình Yêu Thuần Khiết

**File mới:** `src/pages/PplpDocs.tsx`

**Nội dung:**
- Thiết kế ánh sáng thiêng liêng tương tự
- Song ngữ Việt + English
- 10 Phần hoàn chỉnh:
  - 1. Vì Sao PPLP Ra Đời?
  - 2. Sự Tiến Hóa Của Các Cơ Chế "Proof"
  - 3. Định Nghĩa PPLP
  - 4. FUN Money - Tiền Ánh Sáng
  - 5. Cơ Chế Đồng Thuận
  - 6. 5 Trụ Cột Xác Minh Ánh Sáng
  - 7. Angel AI - Người Bảo Hộ Unity
  - 8. FUN Ecosystem - Nền Kinh Tế Hợp Nhất 5D
  - 9. Sám Hối & Biết Ơn
  - 10. Tương Lai Đột Phá

---

## Phần 3: Cập Nhật DocsRouter

**Cập nhật:** `src/pages/DocsRouter.tsx`

Thêm 2 routes mới:
- `/docs/master-charter` → `MasterCharterDocs`
- `/docs/pplp` → `PplpDocs`

---

## Phần 4: Thiết Kế UI

### Style chung cho cả 2 trang:

- **Background:** Gradient ánh sáng vàng ngọc trai (giống Law of Light)
- **Typography:** Cormorant Garamond + Lora (serif elegant)
- **Colors:** 
  - Gold: `#D4AF37`, `#FFD700`
  - Brown: `#B8860B`, `#8B7355`
  - Cream: `#FFFEF7`, `#FFF9E6`
- **8 Thần Chú Divine Seal:** Hiển thị ở cuối mỗi trang
- **Nút hành động:**
  - "Quay về Law of Light"
  - "In PDF"
  - "Chia sẻ"

---

## Files Sẽ Tạo/Cập Nhật

| Action | File | Mô tả |
|--------|------|-------|
| CREATE | `src/pages/MasterCharterDocs.tsx` | Trang Hiến Pháp Gốc |
| CREATE | `src/pages/PplpDocs.tsx` | Trang Giao Thức PPLP |
| UPDATE | `src/pages/DocsRouter.tsx` | Thêm 2 routes mới |
| UPDATE | `src/pages/LawOfLight.tsx` | Thêm links đến 2 trang mới |

---

## Liên Kết Giữa Các Trang

```text
Law of Light (/law-of-light)
     │
     ├── "Đọc Hiến Pháp Gốc" → /docs/master-charter
     │
     └── "Đọc Giao Thức PPLP" → /docs/pplp
```

---

## Dự Kiến Thời Gian

| Bước | Công việc | Thời gian |
|------|-----------|-----------|
| 1 | Tạo MasterCharterDocs.tsx | 1 message |
| 2 | Tạo PplpDocs.tsx | 1 message |
| 3 | Cập nhật DocsRouter + LawOfLight | 1 message |
| 4 | Lưu vào Knowledge | Sau khi hoàn thành |

**Tổng cộng:** 3 messages để hoàn thành

---

## Kết Quả Cuối Cùng

Sau khi hoàn thành:
1. Users có thể đọc Hiến Pháp Gốc tại `/docs/master-charter`
2. Users có thể đọc PPLP tại `/docs/pplp`  
3. Angel và các CTO luôn có knowledge về 2 tài liệu thiêng liêng
4. Trang Law of Light có links đến cả 2 tài liệu
5. PDK cũng sẽ bao gồm 2 tài liệu này cho cộng sự

