

# Đánh giá FUN_Founder_Dashboard_v1-2.docx & Kế hoạch triển khai

## File này là gì?

Bản đặc tả **Founder Dashboard** — giao diện riêng cho Camly/Bé Ly (Founder) với 7 panel chiến lược, tập trung vào tầm nhìn tổng thể hệ sinh thái thay vì quản lý chi tiết từng user/action như Admin Dashboard hiện tại.

---

## So sánh với hệ thống hiện tại

| Founder Dashboard Panel | Admin Tab hiện có | Trạng thái | Gap |
|---|---|---|---|
| **1. Overview** — Total Light Score, Total FUN Minted, Active users DAU/WAU/MAU, Validation success rate, Top categories | `OverviewTab` — chỉ có user counts, rewards | ⚠️ **Thiếu nhiều** | Thiếu Total Light Score, Total FUN Minted, DAU/WAU/MAU, validation rate, top categories |
| **2. User Insights** — Top Light Score users, fastest growing, flagged users, trust distribution, consistency streaks | `UserManagementTab` — danh sách CRUD users | ⚠️ **Thiếu** | Không có ranking, growth tracking, trust distribution chart, streak tracking |
| **3. PPLP Analytics** — Average score per pillar, weakest/strongest pillar, score distribution, flagged by pillar | `PplpMintTab` — chỉ có mint operations | ⚠️ **Thiếu** | Không có pillar-level analytics, distribution charts |
| **4. Anti-Fake Monitor** — Duplicate alerts, velocity abuse, spam detection, manual review queue, trust decay triggers | `FraudTab` + `PPLPv2AdminAudit` | ✅ **Có phần lớn** | Có wallet abuse + surveillance + audit. Thiếu aggregated view cho founder |
| **5. Event & Love House** — Active events, participation, group activity, attendance rate, event quality | `LivestreamHealthTab` | ⚠️ **Thiếu** | Chỉ có livestream health, thiếu event analytics tổng hợp |
| **6. Economy Flow** — Mint flow over time, user/platform split, earn/give/spend, top value actions, circulation | `FinanceDonationsTab` | ⚠️ **Thiếu** | Chỉ có donation history, thiếu mint flow chart, FUN circulation |
| **7. Real-Time Alerts** — Suspicious spikes, unusual mint volume, validation anomalies, errors, security | Không có | ❌ **Chưa có** | Hoàn toàn mới |

---

## Đánh giá tổng thể

Admin Dashboard hiện tại là **operational tool** (quản lý user, approve reward, moderate posts). Founder Dashboard là **strategic intelligence layer** — cần data aggregation, charts, và real-time signals mà admin panel chưa có.

**Khuyến nghị**: Tạo trang `/founder` riêng biệt với 7 panels, query trực tiếp từ các bảng PPLP v2 đã có. Không cần migration mới — tất cả data đã tồn tại trong DB.

---

## Kế hoạch triển khai — 4 bước

### Bước 1: Lưu file + tạo trang Founder Dashboard
- Lưu `FUN_Founder_Dashboard_v1-2.docx` vào `src/config/`
- Tạo `src/pages/FounderDashboard.tsx` với route `/founder` (admin-only)
- Layout: 7 panels dạng card grid, mỗi panel là 1 component riêng

### Bước 2: Overview + User Insights panels
- **FounderOverviewPanel**: query aggregate từ `pplp_v2_validations` (total light score), `pplp_v2_mint_records` (total FUN minted), `profiles` (active users by last_seen), validation success rate
- **FounderUserInsightsPanel**: top users by `total_light_score`, trust level distribution (histogram), users flagged

### Bước 3: PPLP Analytics + Economy Flow + Event panels
- **FounderPPLPAnalyticsPanel**: average score per pillar từ `pplp_v2_validations`, weakest/strongest pillar, score distribution chart
- **FounderEconomyPanel**: mint records over time (line chart), user vs platform split, top action types by FUN generated
- **FounderEventPanel**: active events count, average participation, attendance rate từ `pplp_v2_attendance`

### Bước 4: Anti-Fake Monitor + Real-Time Alerts
- **FounderAntiFakePanel**: aggregated view — duplicate count, velocity violations (from `pplp_v2_event_log`), manual review queue size
- **FounderAlertsPanel**: query `pplp_v2_event_log` for anomalies — spikes in submissions, unusual mint volumes, validation rejection rates tăng đột biến

---

## Thứ tự & files

| # | Việc | Files |
|---|---|---|
| 1 | Lưu file + tạo page + route | `src/config/`, `src/pages/FounderDashboard.tsx`, routing |
| 2 | Overview + User Insights | 2 components mới trong `src/components/founder/` |
| 3 | PPLP Analytics + Economy + Event | 3 components mới |
| 4 | Anti-Fake + Alerts | 2 components mới |

## Chi tiết kỹ thuật
- Tổng cộng 7 panel components mới trong `src/components/founder/`
- Data queries dùng Supabase client trực tiếp — không cần edge function mới
- Charts dùng recharts (đã có trong project)
- Không cần migration — tất cả bảng PPLP v2 đã sẵn sàng
- Access control: kiểm tra admin role qua `useAdminRole` hook (giống Admin page)
- Navigation: thêm link trong admin sidebar

