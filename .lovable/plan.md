

# Kế Hoạch: Tạo Parallel Development Kit (PDK) Hoàn Chỉnh

## Mục Tiêu

Tạo bộ PDK đầy đủ để 15 cộng sự có thể:
1. Copy PDK vào project Lovable mới và bắt đầu xây dựng ngay
2. Phát triển tính năng độc lập mà không cần hiểu toàn bộ Fun Profile
3. Code tương thích hoàn toàn với Fun Profile để dễ dàng merge

---

## Cấu Trúc PDK Sẽ Tạo

```text
/pdk/
├── README.md                           # Hướng dẫn bắt đầu (tiếng Việt)
├── CONVENTIONS.md                      # Quy ước đặt tên, coding style
├── API_CONTRACT.md                     # Database schema, API có sẵn
├── MERGE_GUIDE.md                      # Hướng dẫn submit code
│
├── /core/
│   ├── /components/
│   │   └── /ui/                        # 20 components thiết yếu
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── skeleton.tsx
│   │       ├── toast.tsx
│   │       ├── toaster.tsx
│   │       ├── tabs.tsx
│   │       ├── select.tsx
│   │       ├── label.tsx
│   │       ├── separator.tsx
│   │       ├── switch.tsx
│   │       ├── checkbox.tsx
│   │       ├── textarea.tsx
│   │       ├── progress.tsx
│   │       ├── alert.tsx
│   │       ├── scroll-area.tsx
│   │       └── sonner.tsx              # Toast notifications
│   │
│   ├── /hooks/                         # Hooks dùng chung
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── useDebounce.ts
│   │   └── useIntersectionObserver.ts
│   │
│   └── /lib/                           # Utilities
│       ├── utils.ts                    # cn() helper
│       └── formatters.ts               # Format số, ngày, địa chỉ
│
├── /config/                            # Config files
│   ├── tailwind.config.ts              # Tailwind config chuẩn
│   ├── index.css                       # CSS variables + theme
│   └── components.json                 # shadcn config
│
├── /templates/
│   └── /feature/                       # Template cho feature mới
│       ├── README.md                   # Mô tả feature template
│       ├── /components/
│       │   └── ExampleCard.tsx         # Component mẫu
│       ├── /hooks/
│       │   └── useExampleFeature.ts    # Hook mẫu
│       ├── /pages/
│       │   └── ExamplePage.tsx         # Page mẫu
│       └── /database/
│           └── migration.sql           # SQL template
│
└── /examples/
    └── /badges-feature/                # Ví dụ hoàn chỉnh
        ├── README.md
        ├── /components/
        │   ├── BadgeCard.tsx
        │   └── BadgeList.tsx
        ├── /hooks/
        │   └── useBadges.ts
        └── /database/
            └── migration.sql
```

---

## Files Sẽ Tạo (Chi Tiết)

### 1. Documentation Files

| File | Nội dung chính |
|------|----------------|
| `pdk/README.md` | Hướng dẫn setup 5 phút, cấu trúc folder, cách bắt đầu |
| `pdk/CONVENTIONS.md` | Quy ước đặt tên files, components, tables, CSS classes |
| `pdk/API_CONTRACT.md` | Database schema profiles/posts/reactions, API có sẵn |
| `pdk/MERGE_GUIDE.md` | Checklist submit, form báo cáo, quy trình review |

### 2. Core Components (20 files)

Copy từ `src/components/ui/` với điều chỉnh import paths:
- button.tsx, card.tsx, dialog.tsx, input.tsx
- avatar.tsx (simplified, remove imageTransform dependency)
- badge.tsx, skeleton.tsx, toast.tsx, toaster.tsx
- tabs.tsx, select.tsx, label.tsx, separator.tsx
- switch.tsx, checkbox.tsx, textarea.tsx, progress.tsx
- alert.tsx, scroll-area.tsx, sonner.tsx

### 3. Core Hooks (4 files)

Copy từ `src/hooks/`:
- use-mobile.tsx
- use-toast.ts (từ ui folder)
- useDebounce.ts
- useIntersectionObserver.ts

### 4. Core Lib (2 files)

Copy từ `src/lib/`:
- utils.ts (cn helper)
- formatters.ts (formatNumber, formatDate, shortenAddress)

### 5. Config Files (3 files)

- tailwind.config.ts (simplified version)
- index.css (CSS variables + theme)
- components.json (shadcn config)

### 6. Templates (1 feature template)

Template chuẩn với:
- ExampleCard.tsx - Component mẫu
- useExampleFeature.ts - Hook mẫu
- ExamplePage.tsx - Page mẫu
- migration.sql - SQL template

### 7. Examples (1 complete example)

Badges Feature hoàn chỉnh để tham khảo

---

## Nội Dung Chính Của Các Documentation

### README.md (Hướng Dẫn Bắt Đầu)

```text
# FUN Profile - Parallel Development Kit (PDK)

## Bắt Đầu Trong 5 Phút

### Bước 1: Tạo Project Mới
1. Tạo project Lovable mới
2. Copy toàn bộ folder `pdk/` vào project

### Bước 2: Setup Dependencies
Yêu cầu các packages sau trong package.json:
- @radix-ui/* (UI primitives)
- class-variance-authority
- clsx, tailwind-merge
- lucide-react

### Bước 3: Tạo Feature
1. Tạo folder /features/{ten-feature}/
2. Bắt đầu code theo template trong /templates/

### Bước 4: Submit
Điền form và gửi link Lovable project
```

### CONVENTIONS.md (Quy Ước)

```text
# Quy Ước Đặt Tên

## Files
- Components: PascalCase.tsx (ReferralCard.tsx)
- Hooks: useCamelCase.ts (useReferral.ts)
- Utils: camelCase.ts (formatReward.ts)

## Components
- Prefix theo feature: Referral*, Mission*, Badge*
- Props interface: {ComponentName}Props

## Database Tables
- Prefix theo feature: referral_*, mission_*, badge_*
- Columns: snake_case
- Primary key: id (UUID)
- Timestamps: created_at, updated_at

## CSS
- Sử dụng Tailwind CSS
- KHÔNG tạo custom CSS files
- Responsive: mobile-first

## Imports
- UI components: from "@/pdk/core/components/ui"
- Hooks: from "@/pdk/core/hooks"
- Utils: from "@/pdk/core/lib"
```

### API_CONTRACT.md (Database & API)

```text
# API Contract - Fun Profile

## Database Tables Có Sẵn (READ-ONLY)

### profiles
- id: UUID (user ID)
- username: TEXT
- avatar_url: TEXT | null
- bio: TEXT | null
- pending_reward: NUMBER
- approved_reward: NUMBER
- total_rewards: NUMBER

### posts
- id: UUID
- user_id: UUID
- content: TEXT
- media_urls: JSON | null
- visibility: TEXT ('public', 'friends', 'private')
- created_at: TIMESTAMP

### reactions
- id: UUID
- user_id: UUID
- post_id: UUID | null
- comment_id: UUID | null
- type: TEXT ('like', 'love', 'haha', 'wow', 'sad', 'angry')

### friendships
- id: UUID
- user_id: UUID
- friend_id: UUID
- status: TEXT ('pending', 'accepted')

## Tạo Tables Mới

Khi tạo table mới, luôn:
1. Prefix theo feature: {feature}_*
2. Thêm RLS policies
3. Thêm created_at, updated_at

Ví dụ:
CREATE TABLE badge_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  badge_type TEXT NOT NULL,
  awarded_at TIMESTAMP DEFAULT now()
);

ALTER TABLE badge_awards ENABLE ROW LEVEL SECURITY;
```

### MERGE_GUIDE.md (Quy Trình Submit)

```text
# Hướng Dẫn Submit Feature

## Trước Khi Submit

Kiểm tra:
[ ] Code trong folder /features/{feature-name}/
[ ] Sử dụng components từ /pdk/core/
[ ] Tuân thủ naming conventions
[ ] Responsive trên mobile
[ ] Có error handling với toast
[ ] Không có console.log thừa

## Form Submit

Gửi thông tin sau:
1. Tên bé: 
2. Feature name:
3. Link Lovable project:
4. Files đã tạo:
5. Cần database migration? [Có/Không]
6. Screenshots/Video demo:

## Quy Trình Review

1. Angel Fun Profile review code
2. Chạy database migrations (nếu có)
3. Copy folder features/ vào main project
4. Test tích hợp
5. Deploy
```

---

## Tóm Tắt Files Sẽ Tạo

| Folder | Số Files | Mô Tả |
|--------|----------|-------|
| `pdk/` (root) | 4 | README, CONVENTIONS, API_CONTRACT, MERGE_GUIDE |
| `pdk/core/components/ui/` | 20 | UI components thiết yếu |
| `pdk/core/hooks/` | 4 | Custom hooks |
| `pdk/core/lib/` | 2 | Utilities |
| `pdk/config/` | 3 | Tailwind, CSS, components.json |
| `pdk/templates/feature/` | 5 | Template files |
| `pdk/examples/badges-feature/` | 5 | Example hoàn chỉnh |
| **Tổng** | **43 files** | |

---

## Lợi Ích

1. **Setup nhanh**: 5 phút để bắt đầu
2. **Độc lập hoàn toàn**: Mỗi bé có project riêng
3. **Tương thích 100%**: Cùng UI components, cùng theme
4. **Dễ merge**: Chỉ cần copy folder features/
5. **Có ví dụ sẵn**: Badges feature để tham khảo
6. **Documentation đầy đủ**: Tiếng Việt, dễ hiểu

