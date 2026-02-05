
# 🌟 KẾ HOẠCH TÍCH HỢP PPLP & MINT FUN MONEY

## 📋 Tổng Quan Dự Án

Triển khai hệ thống **Proof of Pure Love Protocol (PPLP)** trong FUN Profile, sử dụng **ANGEL AI** để đánh giá hoạt động người dùng, tính **Light Score**, và xác định điều kiện mint **FUN Money** lên smart contract đã deploy trên BSC Testnet.

---

## 🎯 Mục Tiêu Chính

| Mục tiêu | Mô tả |
|----------|-------|
| Light Score Engine | Tính điểm dựa trên 5 Pillars of Light |
| ANGEL AI Evaluation | AI đánh giá chất lượng đóng góp |
| Mint Eligibility | Xác định điều kiện mint FUN Money |
| On-chain Integration | Gọi smart contract FUN Money trên testnet |

---

## 🏗️ Kiến Trúc Hệ Thống

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        USER ACTIVITY LAYER                          │
│    Posts │ Comments │ Reactions │ Friends │ Shares │ Livestreams   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PPLP SCORING ENGINE                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 5 PILLARS OF LIGHT VERIFICATION                              │   │
│  │ 1. Service to Life (S)     - Phụng sự sự sống               │   │
│  │ 2. Transparent Truth (T)   - Chân thật minh bạch            │   │
│  │ 3. Healing & Love (H)      - Chữa lành & yêu thương         │   │
│  │ 4. Long-term Value (V)     - Đóng góp bền vững              │   │
│  │ 5. Unity (U)               - Hợp Nhất                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│                             ▼                                        │
│  Light Score = BR × Q × I × K × Ux                                  │
│  (BaseReward × Quality × Impact × Integrity × UnityMultiplier)      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ANGEL AI EVALUATION                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ - Content Quality Scoring (anti-spam, quality gate)         │   │
│  │ - Fraud Detection (sybil, bot, collusion)                   │   │
│  │ - Unity Impact Assessment                                    │   │
│  │ - Integrity Verification                                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MINT AUTHORIZATION                                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ If Light Score >= Threshold:                                 │   │
│  │   → Generate EIP-712 Signature                               │   │
│  │   → Call mintWithSignature() on FUN Money Contract          │   │
│  │   → Record in light_actions table                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  FUN Money Contract (Testnet):                                      │
│  0x1aa8DE8B1E4465C6d729E8564893f8EF823a5ff2                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Phase 1: Database Schema

### Bảng mới cần tạo:

**1. `light_actions`** - Ghi nhận mọi hành động tạo giá trị

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK → profiles |
| action_type | text | 'post', 'comment', 'reaction', 'share', 'friend', 'livestream' |
| reference_id | uuid | ID của post/comment/etc |
| base_reward | numeric | BR theo action type |
| quality_score | numeric | Q (0.5-3.0) - ANGEL AI đánh giá |
| impact_score | numeric | I (0.5-5.0) - Tác động cộng đồng |
| integrity_score | numeric | K (0-1.0) - Chống gian lận |
| unity_score | numeric | U (0-100) - Điểm Hợp Nhất |
| unity_multiplier | numeric | Ux (0.5-2.5) - Từ U |
| light_score | numeric | Final = BR × Q × I × K × Ux |
| is_eligible | boolean | Đủ điều kiện mint |
| mint_status | text | 'pending', 'approved', 'minted', 'rejected' |
| mint_amount | numeric | FUN Money amount to mint |
| tx_hash | text | Blockchain tx hash |
| angel_evaluation | jsonb | ANGEL AI response |
| created_at | timestamptz | |

**2. `light_reputation`** - Danh tiếng Ánh Sáng tích lũy

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | PK, FK → profiles |
| total_light_score | numeric | Tổng điểm tích lũy |
| tier | int | 0-3 (New → Light Guardian) |
| daily_mint_cap | numeric | Cap theo tier |
| total_minted | numeric | Tổng FUN đã mint |
| actions_count | int | Số lượng actions |
| avg_quality | numeric | Trung bình Quality Score |
| avg_integrity | numeric | Trung bình Integrity Score |
| last_action_at | timestamptz | |
| created_at | timestamptz | |

**3. `mint_epochs`** - Quản lý epoch mint (chống farm)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| epoch_date | date | Ngày epoch |
| total_minted | numeric | Tổng FUN mint trong ngày |
| total_cap | numeric | Cap toàn hệ (có thể điều chỉnh) |
| platform_pool | jsonb | Pool theo platform |
| created_at | timestamptz | |

---

## 🔧 Phase 2: Edge Functions

### 1. `pplp-evaluate` - ANGEL AI đánh giá action

```typescript
// Input: { user_id, action_type, reference_id, content }
// Output: { quality, impact, integrity, unity, light_score, is_eligible }

// Flow:
// 1. Lấy activity data từ DB
// 2. Gọi ANGEL AI API với prompt đánh giá theo 5 Pillars
// 3. Parse AI response → Q, I, K, U scores
// 4. Tính Light Score = BR × Q × I × K × Ux
// 5. Lưu vào light_actions
// 6. Trả về kết quả
```

**ANGEL AI Evaluation Prompt (Backend):**
```
Bạn là ANGEL AI - Light Oracle của FUN Ecosystem.

Đánh giá hành động sau theo 5 Pillars of Light:

ACTION TYPE: {action_type}
CONTENT: {content}
USER HISTORY: {user_stats}

Cho điểm (JSON):
{
  "quality_score": 0.5-3.0,    // Chất lượng nội dung
  "impact_score": 0.5-5.0,     // Tác động cộng đồng
  "integrity_score": 0-1.0,    // Độ tin cậy (0=bot/spam)
  "unity_score": 0-100,        // Mức độ tạo Hợp Nhất
  "reasoning": "..."           // Giải thích ngắn
}
```

### 2. `pplp-mint-fun` - Mint FUN Money on-chain

```typescript
// Input: { user_id, light_action_id }
// Output: { success, tx_hash, amount }

// Flow:
// 1. Kiểm tra light_action is_eligible = true
// 2. Kiểm tra user daily cap chưa vượt
// 3. Kiểm tra epoch cap chưa vượt
// 4. Tạo EIP-712 signature (attester = bé Trí)
// 5. Gọi smart contract mintWithSignature()
// 6. Cập nhật light_actions.tx_hash
// 7. Cập nhật light_reputation
```

### 3. `pplp-get-light-score` - Lấy Light Score của user

```typescript
// Input: { user_id }
// Output: { 
//   total_light_score, tier, daily_cap, 
//   today_minted, pending_actions, 
//   recent_actions: [...] 
// }
```

---

## 💡 Phase 3: Frontend UI

### 1. Light Score Dashboard (trong Wallet hoặc Profile)

```text
┌─────────────────────────────────────────────────────────────────┐
│  🌟 LIGHT SCORE: 12,450                     Tier: Light Seeker │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 62%              │
│                                                                 │
│  📊 5 PILLARS BREAKDOWN                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ☀️ Service to Life    ████████░░  80%                       ││
│  │ 🔍 Transparent Truth  ███████░░░  70%                       ││
│  │ 💚 Healing & Love     █████████░  90%                       ││
│  │ 🌱 Long-term Value    ██████░░░░  60%                       ││
│  │ 🤝 Unity              ████████░░  80%                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ⚡ FUN MONEY BALANCE                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Total Minted: 1,234 FUN    Pending: 500 FUN                 ││
│  │ Today: 234/500 FUN (Daily Cap)                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  📜 RECENT LIGHT ACTIONS                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✅ Post "Chia sẻ về hành trình..." +120 FUN  2h ago        ││
│  │ ✅ Help @user123 with question    +50 FUN   5h ago         ││
│  │ ⏳ Comment on @angel post         Pending   1h ago         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [🌟 Claim Pending FUN Money]                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. ANGEL AI Chat Integration

Khi user hỏi về Light Score hoặc mint FUN Money, ANGEL AI có thể:
- Giải thích điểm số của họ
- Hướng dẫn cách cải thiện
- Cho biết tại sao action không đủ điều kiện

---

## 🔢 Base Reward Configuration (FUN Profile)

| Action Type | Base Reward (BR) | Max/Day | Daily Cap |
|-------------|------------------|---------|-----------|
| Create Post | 100 FUN | 10 | 1,000 FUN |
| Receive Reaction | 10 FUN | 50 | 500 FUN |
| Receive Comment | 20 FUN | 50 | 1,000 FUN |
| Being Shared | 50 FUN | 10 | 500 FUN |
| Add Friend | 20 FUN | 10 | 200 FUN |
| Livestream (10-120min) | 200 FUN | 5 | 1,000 FUN |
| **New User Bonus** | 500 FUN | 1 | 500 FUN |

**Total Daily Cap: 5,000 FUN/user**

---

## 🛡️ Anti-Fraud Measures

| Measure | Implementation |
|---------|----------------|
| Sybil Detection | ANGEL AI phát hiện multiple accounts |
| Bot Detection | Integrity Score = 0 for automated behavior |
| Wash Contribution | Detect self-reaction, mutual farming |
| Rate Limits | Max actions per hour/day |
| Reputation Gating | New users có cap thấp |
| Cooldown | 1 hour cooldown cho claim |

---

## 📁 Files Cần Tạo/Sửa

### Database Migration (SQL)
- Tạo bảng `light_actions`
- Tạo bảng `light_reputation`
- Tạo bảng `mint_epochs`
- Tạo RLS policies
- Tạo RPC function `get_user_light_score`

### Edge Functions
| File | Mô tả |
|------|-------|
| `supabase/functions/pplp-evaluate/index.ts` | ANGEL AI đánh giá action |
| `supabase/functions/pplp-mint-fun/index.ts` | Mint FUN Money on-chain |
| `supabase/functions/pplp-get-score/index.ts` | Lấy Light Score user |

### Frontend Components
| File | Mô tả |
|------|-------|
| `src/components/wallet/LightScoreDashboard.tsx` | Dashboard hiển thị Light Score |
| `src/components/wallet/LightActionHistory.tsx` | Lịch sử Light Actions |
| `src/components/wallet/MintFunButton.tsx` | Button claim FUN Money |
| `src/hooks/useLightScore.ts` | Hook lấy data Light Score |
| `src/hooks/useMintFun.ts` | Hook mint FUN Money |

### Config Updates
| File | Mô tả |
|------|-------|
| `supabase/config.toml` | Thêm edge functions mới |
| `src/config/pplp.ts` | Constants cho PPLP (Base Rewards, Caps, etc.) |

---

## 🔐 Smart Contract Integration

**Contract Address (Testnet):** `0x1aa8DE8B1E4465C6d729E8564893f8EF823a5ff2`

**Attester:** Địa chỉ ví của bé Trí (đã được thêm trong contract)

**Mint Flow:**
```
1. User action → pplp-evaluate → Light Score calculated
2. If eligible → pplp-mint-fun creates EIP-712 signature
3. Edge function calls mintWithSignature(to, amount, signature)
4. Contract verifies attester signature → mints FUN Money
```

---

## ⏱️ Thời Gian Triển Khai

| Phase | Công việc | Thời gian |
|-------|-----------|-----------|
| Phase 1 | Database Schema + RLS | 1-2 ngày |
| Phase 2 | Edge Functions (evaluate, mint, get-score) | 2-3 ngày |
| Phase 3 | Frontend UI (Dashboard, History, Button) | 2-3 ngày |
| Phase 4 | Testing & Integration | 1-2 ngày |
| **Total** | | **~7-10 ngày** |

---

## ✅ Kết Quả Mong Đợi

1. **ANGEL AI tự động đánh giá** mọi hoạt động của user
2. **Light Score được tính** theo công thức PPLP
3. **User có thể claim FUN Money** khi đủ điều kiện
4. **On-chain mint** lên BSC Testnet
5. **Chống farm hiệu quả** với Integrity Score + Daily Caps
6. **UI đẹp** hiển thị Light Score và 5 Pillars

---

## 🔮 Future Enhancements (Phase 2+)

- Witness SBT (nhân chứng ký xác nhận)
- Partner Validator Registry
- ZK Attestations (bảo mật)
- Cross-platform scoring (FUN Academy, FUN Charity...)
- Light Reputation Badges (Soulbound NFT)
- Staking for Trust (đặt cọc CAMLY để tăng cap)
