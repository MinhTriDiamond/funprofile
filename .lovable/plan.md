
# Light Score 5 Trụ Cột — Phase 1 ✅ HOÀN THÀNH

## Đã triển khai

| # | Resource | Trạng thái |
|---|----------|-----------|
| 1 | DB: Bảng `user_dimension_scores` + RLS | ✅ Done |
| 2 | Edge Function: `pplp-compute-dimensions/index.ts` | ✅ Done |
| 3 | Edge Function: `pplp-get-score/index.ts` (thêm dimension data) | ✅ Done |
| 4 | Config: `src/config/pplp.ts` (DIMENSIONS, DIMENSION_LEVELS, DIMENSION_WEIGHTS) | ✅ Done |
| 5 | Hook: `src/hooks/useDimensionScores.ts` | ✅ Done |
| 6 | UI: `src/components/wallet/DimensionScoreCard.tsx` + tích hợp vào LightScoreDashboard | ✅ Done |
| 7 | Docs: `docs/LIGHT_SCORE_MATH_SPEC.md` | ✅ Done |

## 5 Trụ Cột

- 🪪 Identity (Danh tính) — profile, wallet, account age
- ⚡ Activity (Hoạt động) — normalized light score + time decay
- ⛓️ On-Chain — wallet, donations sent/received
- 🔍 Transparency (Minh bạch) — fraud signals penalty
- 🌐 Ecosystem (Hệ sinh thái) — posts, comments, donations, streak

## Cấp độ mới

| Level | Tên | Điểm |
|-------|-----|------|
| 🌱 | Light Seed | 0-99 |
| 🔨 | Light Builder | 100-249 |
| 🛡️ | Light Guardian | 250-499 |
| 👑 | Light Leader | 500-799 |
| 🌌 | Cosmic Contributor | 800+ |

## Bước tiếp theo

- Chạy `pplp-compute-dimensions` lần đầu để tính dimension scores cho tất cả users
- Thiết lập cron job daily để tự động cập nhật
- Phase 2: Dump Penalty, nâng chuẩn mint eligibility
- Phase 3: Reputation NFT, Digital Identity Bank
