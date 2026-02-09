

# Kế Hoạch: Thêm Nút Home Cho 3 Trang Tài Liệu Thiêng Liêng

## Tổng Quan

Thêm nút Home để navigate về Feed (`/`) ở đầu trang và cuối trang của 3 trang: Law of Light, Master Charter và PPLP Docs.

## Cấu Trúc Thay Đổi

```text
┌─────────────────────────────────────────────────────────────┐
│  ĐẦU TRANG                                                  │
│  ┌──────────────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ 🏠 Về Trang Chủ      │  │ (nút hiện tại)│  │ Chia sẻ   │  │
│  └──────────────────────┘  └──────────────┘  └───────────┘  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      NỘI DUNG TRANG                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  CUỐI TRANG                                                 │
│  ┌──────────────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ 🏠 Về Trang Chủ      │  │ (nút hiện tại)│  │ (nút khác)│  │
│  └──────────────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Chi Tiết Thay Đổi Theo File

### 1. LawOfLight.tsx

**Thêm import:**
- Import icon `Home` từ lucide-react

**Đầu trang (trong isReadOnly mode):**
- Thêm section navigation phía trên header với nút "🏠 Về Trang Chủ" navigate đến `/`

**Cuối trang (trong isReadOnly mode):**
- Thêm nút "🏠 Về Trang Chủ" vào group buttons hiện có (cạnh "Đọc Hiến Pháp Gốc" và "Đọc Giao Thức PPLP")

### 2. MasterCharterDocs.tsx

**Thêm import:**
- Import icon `Home` từ lucide-react

**Đầu trang:**
- Hiện tại có: "Quay về Luật Ánh Sáng" | "Chia sẻ"
- Thêm: "🏠 Về Trang Chủ" ở đầu tiên bên trái

**Cuối trang:**
- Hiện tại có: "Đọc Giao Thức PPLP" | "Quay về Luật Ánh Sáng"  
- Thêm: "🏠 Về Trang Chủ" vào group

### 3. PplpDocs.tsx

**Thêm import:**
- Import icon `Home` từ lucide-react

**Đầu trang:**
- Hiện tại có: "Quay về Luật Ánh Sáng" | "Chia sẻ"
- Thêm: "🏠 Về Trang Chủ" ở đầu tiên bên trái

**Cuối trang:**
- Hiện tại có: "Đọc Hiến Pháp Gốc" | "Quay về Luật Ánh Sáng"
- Thêm: "🏠 Về Trang Chủ" vào group

## Thiết Kế Nút Home

**Style nhất quán cho cả 3 trang:**

| Vị trí | Style |
|--------|-------|
| Đầu trang | `variant="ghost"` với màu gold (`#B8860B`), icon Home, hover gold |
| Cuối trang | Gradient gold background hoặc outline style phù hợp với các nút hiện có |

**Code mẫu cho nút:**

```tsx
// Đầu trang - ghost style
<Button
  variant="ghost"
  onClick={() => navigate('/')}
  className="text-[#B8860B] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
>
  <Home className="w-4 h-4 mr-2" />
  Về Trang Chủ
</Button>

// Cuối trang - gradient style
<Button
  onClick={() => navigate('/')}
  className="bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a] text-[#E8D5A3] border-2 border-[#DAA520] rounded-full px-6"
>
  🏠 Về Trang Chủ
</Button>
```

## Files Cần Sửa

| File | Hành động |
|------|-----------|
| `src/pages/LawOfLight.tsx` | **Sửa** - Thêm import Home, thêm nút đầu/cuối trang |
| `src/pages/MasterCharterDocs.tsx` | **Sửa** - Thêm import Home, thêm nút đầu/cuối trang |
| `src/pages/PplpDocs.tsx` | **Sửa** - Thêm import Home, thêm nút đầu/cuối trang |

## Kết Quả Mong Đợi

- Người dùng có thể dễ dàng navigate về trang chủ (Feed) từ bất kỳ vị trí nào trên 3 trang tài liệu
- Nút Home xuất hiện rõ ràng ở cả đầu và cuối trang
- Style nhất quán với design system hiện tại (màu gold, font Cormorant/Lora)
- UX cải thiện: không cần scroll hoặc dùng browser back button

