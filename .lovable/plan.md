
# Kế Hoạch: Bổ Sung Tài Liệu & Resources cho PDK

## Mục Tiêu

Thêm các resources giúp collaborators làm việc hiệu quả hơn:
1. Quick Start Guide (1 trang tóm tắt)
2. Thêm 2 ví dụ feature hoàn chỉnh (Referral, Missions)
3. Tài liệu UI Patterns phổ biến
4. Common Prompts để giao tiếp với Angel Lovable
5. Troubleshooting Guide chi tiết

---

## Cấu Trúc Bổ Sung

```text
pdk/
├── (files hiện có)
│
├── docs/                          ← THƯ MỤC MỚI
│   ├── QUICK_START.md             # 1 trang setup nhanh
│   ├── UI_PATTERNS.md             # Các patterns UI phổ biến
│   ├── COMMON_PROMPTS.md          # Prompts giao tiếp với Lovable AI
│   ├── TROUBLESHOOTING.md         # Xử lý lỗi thường gặp
│   └── FEATURE_IDEAS.md           # Gợi ý tính năng có thể phát triển
│
└── examples/
    ├── badges-feature/            # (đã có)
    │
    ├── referral-feature/          ← VÍ DỤ MỚI
    │   ├── README.md
    │   ├── components/
    │   │   ├── ReferralCard.tsx
    │   │   ├── ReferralCodeInput.tsx
    │   │   └── ReferralStats.tsx
    │   ├── hooks/
    │   │   └── useReferral.ts
    │   └── database/
    │       └── migration.sql
    │
    └── missions-feature/          ← VÍ DỤ MỚI
        ├── README.md
        ├── components/
        │   ├── MissionCard.tsx
        │   ├── MissionProgress.tsx
        │   └── MissionList.tsx
        ├── hooks/
        │   └── useMissions.ts
        └── database/
            └── migration.sql
```

---

## Chi Tiết Files Mới

### 1. QUICK_START.md (Setup trong 2 phút)

Tóm tắt ngắn gọn nhất cho người muốn bắt đầu ngay:

| Mục | Nội dung |
|-----|----------|
| Bước 1 | Prompt mẫu để Lovable AI tạo PDK từ GitHub |
| Bước 2 | Prompt để install dependencies |
| Bước 3 | Prompt để tạo feature đầu tiên |
| Checklist | 5 điểm kiểm tra trước khi submit |

### 2. UI_PATTERNS.md (Patterns UI phổ biến)

Các patterns thường dùng với code mẫu:

| Pattern | Mô tả |
|---------|-------|
| Card Grid | Grid responsive cho list items |
| Modal Dialog | Dialog với form |
| Tab Navigation | Tabs cho các sections |
| Empty State | Hiển thị khi không có data |
| Loading Skeleton | Skeleton loading |
| Infinite Scroll | Load thêm khi scroll |
| Search & Filter | Tìm kiếm và lọc |
| Toast Notifications | Hiển thị thông báo |

### 3. COMMON_PROMPTS.md (Prompts cho Lovable AI)

Các prompts mẫu để giao tiếp với Angel:

| Mục đích | Prompt mẫu |
|----------|------------|
| Setup PDK | "Angel ơi, giúp bé tạo folder pdk/..." |
| Tạo component | "Angel tạo component XYZ..." |
| Tạo database | "Angel tạo table cho feature..." |
| Fix lỗi RLS | "Angel fix lỗi RLS policy..." |
| Test mobile | "Angel test responsive..." |

### 4. TROUBLESHOOTING.md (Xử lý lỗi)

Các lỗi thường gặp và cách sửa:

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| RLS policy violation | Thiếu user_id | Thêm user_id khi insert |
| Import not found | Sai path | Sử dụng @/pdk/... |
| Type error | Thiếu interface | Định nghĩa interface |
| Toast không hiện | Thiếu Toaster | Thêm Toaster vào App |
| Database error | Chưa run migration | Gửi migration cho Angel |

### 5. FEATURE_IDEAS.md (Gợi ý tính năng)

Danh sách tính năng có thể phát triển:

| Feature | Độ khó | Mô tả |
|---------|--------|-------|
| Referral System | Trung bình | Hệ thống mời bạn |
| Missions | Trung bình | Nhiệm vụ hàng ngày |
| Achievements | Dễ | Huy hiệu thành tích |
| Leaderboard Widget | Dễ | Widget bảng xếp hạng |
| Notification Settings | Dễ | Cài đặt thông báo |
| Profile Widgets | Trung bình | Widgets cho profile |
| Story Highlights | Khó | Lưu stories nổi bật |
| Polls | Trung bình | Tạo khảo sát |

---

## Ví Dụ Referral Feature (Chi tiết)

### Cấu trúc components

| Component | Chức năng |
|-----------|-----------|
| ReferralCard.tsx | Hiển thị mã referral của user |
| ReferralCodeInput.tsx | Form nhập mã referral |
| ReferralStats.tsx | Thống kê số người đã mời |

### Database schema

```sql
referral_codes:
- id, user_id, code, total_uses, is_active

referral_uses:
- id, code_id, referrer_id, referred_id, reward_amount
```

---

## Ví Dụ Missions Feature (Chi tiết)

### Cấu trúc components

| Component | Chức năng |
|-----------|-----------|
| MissionCard.tsx | Hiển thị 1 nhiệm vụ |
| MissionProgress.tsx | Progress bar nhiệm vụ |
| MissionList.tsx | Danh sách tất cả nhiệm vụ |

### Database schema

```sql
mission_definitions:
- id, name, description, reward, target

mission_progress:
- id, user_id, mission_id, current_progress, completed_at
```

---

## Tóm Tắt Files Sẽ Tạo

| Folder | File | Mô tả |
|--------|------|-------|
| pdk/docs/ | QUICK_START.md | Setup 2 phút |
| pdk/docs/ | UI_PATTERNS.md | 8 patterns UI |
| pdk/docs/ | COMMON_PROMPTS.md | 10+ prompts mẫu |
| pdk/docs/ | TROUBLESHOOTING.md | 15+ lỗi thường gặp |
| pdk/docs/ | FEATURE_IDEAS.md | 10+ gợi ý feature |
| pdk/examples/referral-feature/ | 5 files | Ví dụ hoàn chỉnh |
| pdk/examples/missions-feature/ | 5 files | Ví dụ hoàn chỉnh |

**Tổng cộng: 15 files mới**

---

## Lợi Ích

1. **QUICK_START**: Bắt đầu trong 2 phút thay vì 5 phút
2. **UI_PATTERNS**: Copy-paste code patterns sẵn có
3. **COMMON_PROMPTS**: Không cần nghĩ cách hỏi Angel
4. **TROUBLESHOOTING**: Tự xử lý lỗi không cần hỏi
5. **FEATURE_IDEAS**: Có ý tưởng ngay để bắt đầu
6. **2 Examples mới**: Tham khảo nhiều loại feature hơn
