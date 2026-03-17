
# Database & Codebase Audit — Implementation Roadmap

## Tài liệu tham chiếu
- `.lovable/audit-report.md` — Audit report đầy đủ (633 dòng, 20 phần)

---

## ĐÃ HOÀN THÀNH

### Phase 0 — Audit & Documentation ✅
| # | Công việc | Trạng thái |
|---|----------|-----------|
| 0A | Viết audit report 20 phần | ✅ Done |
| 0B | Xác định Canonical Domain Models | ✅ Done |
| 0C | Xác định Do Not Touch First list | ✅ Done |
| 0D | Xác định Refactor Blockers | ✅ Done |

### Phase 1A — Performance Indexes ✅
| Index | Table | Columns | Mục đích |
|-------|-------|---------|----------|
| `idx_notifications_user_read` | notifications | user_id, read | Badge count + dropdown |
| `idx_reactions_post_type` | reactions | post_id, type | Reaction counts per post |
| `idx_light_actions_user_created` | light_actions | user_id, created_at DESC | Light Score history |
| `idx_posts_user_created` | posts | user_id, created_at DESC | Profile feed |
| `idx_chunked_chunks_status` | chunked_recording_chunks | status | Cleanup queries |
| `idx_donations_sender_status` | donations | sender_id, status | Benefactor leaderboard |
| `idx_donations_recipient_status` | donations | recipient_id, status | Recipient leaderboard |
| `idx_comments_post_created` | comments | post_id, created_at | Comment thread load |
| `idx_friendships_user_status` | friendships | user_id, status | Friend lookup |
| `idx_friendships_friend_status` | friendships | friend_id, status | Friend lookup |

### Phase 1B — SQL Comments Documentation ✅
- COMMENT ON TABLE cho tất cả 93 tables
- COMMENT ON VIEW cho tất cả 5 views
- Phân loại theo domain: Core, Social, Messaging, Live, Recording, Light Score, Rewards, Wallet, Auth, OAuth, Search, Content, System, PPLP

---

## CHƯA LÀM — KẾ HOẠCH TIẾP THEO

### Phase 1C-F — Safe Cleanup (rủi ro THẤP)

| # | Công việc | Chi tiết |
|---|----------|---------|
| 1C | Phân loại empty tables | 35 tables 0-rows → Active/Planned/Legacy/Deletable |
| 1D | console.log → logger | 77 instances cần thay thế |
| 1E | useAdminRole shared hook | Đã tạo, cần migrate các component dùng trực tiếp `has_role` |
| 1F | Edge function _shared helpers | cors, auth, response — đã tạo ✅ |

### Phase 2 — Structural Improvements (rủi ro TRUNG BÌNH)

| # | Công việc | Chi tiết |
|---|----------|---------|
| 2A | State enum documentation | Document các status/type enums trong DB |
| 2B | Merge search_logs → search_history | Consolidate duplicate search tracking |
| 2C | notifications.read → is_read | Compatibility migration (backfill + dual-write) |
| 2D | Xóa useLiveComments | Dead code cleanup |
| 2E | Module hóa hooks/ | Nhóm theo domain (social, chat, live, wallet, etc.) |
| 2F | Tách components/feed/ | Sub-domains cho feed components |
| 2G | useCapabilities layer | Đã tạo ✅, cần migrate consumers |

### Phase 3 — Deep Refactor (rủi ro CAO)

| # | Công việc | Blocker |
|---|----------|---------|
| 3A | Tách profiles → user_wallet_config | Nhiều component đọc trực tiếp profiles |
| 3B | Claims lifecycle audit | reward_claims + pending_claims khác lifecycle |
| 3C | FinancialTab → platform_financial_data | Admin UI đang đọc grand_total_* từ profiles |
| 3D | get_user_rewards_v2 refactor | Đang dùng livestreams table, cần chuyển live_sessions |
| 3E | live_comments product review | Quyết định drop hoặc giữ |
| 3F | Profiles RLS tightening | Public by Design → quyết định enforcement model |
| 3G | Gộp 15 media edge functions | Router pattern |

---

## Linter Warnings (có sẵn, chưa xử lý)
- **RLS Enabled No Policy**: Một số tables có RLS enabled nhưng chưa có policy
- **RLS Policy Always True**: Một số policies dùng `USING (true)` cho INSERT/UPDATE/DELETE
- Sẽ xử lý trong Phase 2-3 khi refactor từng domain

## Light Score 5 Trụ Cột — Phase 1 ✅ HOÀN THÀNH
(Chi tiết xem phiên bản trước của plan)
