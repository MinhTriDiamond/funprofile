
# Phân tích toàn diện Hệ thống PPLP & Light Score

## 1. Cách hệ thống hoạt động

### Luồng chính (Flow)

```text
User Action (post/comment/reaction/share/friend/livestream)
    │
    ▼
pplp-evaluate (Edge Function)
    ├── Xác thực JWT user
    ├── Xác định Beneficiary (ai nhận điểm?)
    │     ├── post/livestream/friend → actor nhận
    │     └── comment/reaction/share → chủ bài viết nhận
    ├── Kiểm tra trùng lặp (dedup)
    ├── Kiểm tra daily cap (post:10, comment:50, reaction:50...)
    ├── AI Evaluation (Gemini 2.5 Flash - 5 Pillars)
    │     ├── quality_score (0.5-3.0)
    │     ├── impact_score (0.5-5.0)
    │     ├── integrity_score (0-1.0)
    │     └── unity_score (0-100)
    ├── LS-Math-v1.0 Multipliers
    │     ├── M_cons = 1 + 0.6*(1 - e^(-streak/30))
    │     ├── M_seq  = 1 + 0.5*tanh(bonus/5)
    │     └── Penalty = 1 - min(0.5, 0.8*(1-integrity))
    ├── Final: BR × Q × I × K × Ux × M_cons × M_seq × Penalty
    └── Insert vào light_actions (mint_amount = 0)
    
    ▼ (Monthly)
pplp-epoch-snapshot (Admin trigger)
    ├── Tổng hợp Light Score mỗi user trong tháng
    ├── Lọc bỏ: banned users, LS < 10
    ├── Anti-Whale: cap 3% tổng quỹ (150K/5M FUN)
    ├── Phân bổ: user_share = user_LS / total_LS × mint_pool
    └── Insert mint_allocations
    
    ▼
pplp-mint-fun (User claim)
    ├── User gọi với allocation_id
    ├── Tạo pplp_mint_requests (pending_sig)
    ├── EIP-712 message cho Multisig 3-of-3
    └── GOV groups (WILL + WISDOM + LOVE) ký → on-chain mint
```

### Hệ thống song song (Legacy)
Có 2 luồng scoring tồn tại đồng thời:
- **`pplp-evaluate`**: Hệ thống **chính**, dùng AI + LS-Math-v1.0, ghi vào `light_actions` (40.753 records)
- **`pplp-submit-action` → `pplp-score-action`**: Hệ thống **cũ/PPLP chuẩn**, ghi vào `pplp_actions` + `pplp_scores` (hiện **0 records** trong pplp_actions)

**Kết luận**: `pplp-submit-action` + `pplp-score-action` + `pplp-batch-processor` hiện **không được sử dụng**. Chỉ `pplp-evaluate` đang hoạt động.

---

## 2. Dữ liệu thực tế (Database)

| Metric | Giá trị |
|--------|---------|
| Tổng light_actions | 40,753 |
| Eligible & approved | 28,773 |
| Pending signature | 11,831 |
| Rejected | 108 |
| **Bug: is_eligible=false nhưng mint_status=approved** | **41** |
| Users có reputation | 473 |
| Mint requests confirmed | 6 |
| Mint requests pending | 75 |
| Fraud signals | 177 |

### Phân bổ theo action type:
| Action | Count | Avg Light Score |
|--------|-------|-----------------|
| Reaction | 19,993 | 2.18 |
| Comment | 10,992 | 5.10 |
| Post | 8,633 | 51.49 |
| Friend | 1,060 | 15.41 |
| Livestream | 70 | 308.41 |
| Share | 5 | 15.58 |

### Hoạt động 24h gần nhất:
- Top user: **108 actions/24h** (10,060 LS) — vượt daily cap lý thuyết nhưng vẫn được ghi nhận

---

## 3. Các vấn đề phát hiện

### Lỗi dữ liệu (Data Bugs)
1. **41 records có is_eligible=false nhưng mint_status='approved'** — không nên xảy ra, có thể gây tính sai epoch allocation
2. **11,831 records mint_status='pending_sig'** — trạng thái này không rõ nguồn gốc vì `pplp-evaluate` chỉ set `approved` hoặc `rejected`

### Lỗ hổng bảo mật (Security Vulnerabilities)

#### Mức Nghiêm trọng (Critical)
1. **`pplp-submit-action` enrichment mặc định tất cả về positive** (dòng 50-68): `has_evidence: true, verified: true, sentiment_score: 0.75, outcome: 'positive', promotes_unity: true, healing_effect: true, anti_sybil_score: 0.85`. Hacker chỉ cần gọi API này → luôn nhận điểm cao. Tuy nhiên function này hiện không được frontend gọi, nên rủi ro thực tế thấp.

2. **`pplp-evaluate` khi AI không khả dụng → default scores 1.0/1.0/1.0/50** (dòng 231-237): Nếu AI gateway down, mọi action đều nhận điểm mặc định, không có penalty.

#### Mức Trung bình (Medium)
3. **Daily cap check race condition**: Giữa lúc kiểm tra count và insert action, user có thể spam concurrent requests để vượt cap.
4. **Không validate `action_type` whitelist** trong `pplp-evaluate`: Chỉ check `BASE_REWARDS[action_type]` tồn tại, nhưng user có thể gửi `livestream` type mà không thực sự livestream.
5. **`pplp-authorize-mint` đánh dấu actions là 'minted' trước khi thực sự on-chain**: Nếu mint thất bại, actions đã bị đánh dấu sai.

#### Mức Thấp (Low)
6. **Epoch snapshot dùng `var` thay vì `const/let`** (dòng 123): `var bannedScores` — không an toàn, có thể gây hoisting bug.
7. **`pplp-detect-fraud` chỉ chạy khi admin manually trigger** — không tự động.

### Kiến trúc chưa tối ưu
8. **2 hệ thống scoring song song** (`pplp-evaluate` vs `pplp-submit-action`/`pplp-score-action`): Gây nhầm lẫn, `pplp_actions` table trống nhưng vẫn có code reference.
9. **Epoch chưa từng chạy**: `mint_epochs` và `mint_allocations` đều trống — hệ thống epoch chưa bao giờ được trigger.

---

## 4. Kế hoạch Test & Mô phỏng tấn công

Nếu con muốn, Cha có thể thực hiện các bài test sau:

### A. Unit Tests (Edge Function Tests)
- Test `pplp-evaluate` với các kịch bản: post thường, spam content, self-action, daily cap exceeded
- Test `pplp-epoch-snapshot` với dữ liệu mẫu
- Test anti-whale cap tính toán

### B. Mô phỏng tấn công (Attack Simulation)
1. **Spam Attack**: Gửi 100 requests liên tiếp đến `pplp-evaluate` → kiểm tra daily cap có chặn đúng không
2. **Self-farming**: User tự like/comment bài mình → verify dedup hoạt động
3. **Fake Livestream**: Gửi action_type='livestream' (308 LS/action) mà không thực sự live → verify validation
4. **AI Bypass**: Test khi AI gateway trả lỗi → verify default scores có an toàn không
5. **Nonce Replay**: Tạo 2 mint request cùng nonce → verify contract chặn

### C. Sửa lỗi cấp bách
- Fix 41 records is_eligible=false + approved
- Dọn dẹp hệ thống scoring cũ (pplp-submit-action, pplp-score-action)
- Thêm validation action_type trong pplp-evaluate

---

## Tóm tắt

**Hệ thống chuẩn chỉnh ở mức nào?**
- ✅ Luồng chính (pplp-evaluate) hoạt động đúng, AI evaluation tích hợp tốt
- ✅ LS-Math-v1.0 (streak, sequence, penalty) đã implement
- ✅ Anti-whale, daily caps, dedup, banned filter đã có
- ✅ Fraud detection đa tầng (device, email, IP)
- ⚠️ 2 hệ thống scoring song song gây nhầm lẫn
- ⚠️ Epoch snapshot chưa từng chạy (mint_allocations trống)
- ⚠️ Có 41 records dữ liệu không nhất quán
- ❌ Thiếu validation action_type (có thể fake livestream để nhận 308 LS)
- ❌ AI fallback default quá cao (nên giảm xuống 0.5-0.7)
