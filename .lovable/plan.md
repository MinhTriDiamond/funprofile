

## Tổng hợp Audit Report hiện tại & Kế hoạch hoàn thiện

---

### TÌNH TRẠNG HIỆN TẠI: Chỉ mới audit, chưa thay đổi gì

Toàn bộ công việc đã làm là **viết tài liệu audit** trong `.lovable/audit-report.md` (633 dòng, 20 phần). **Chưa có migration SQL, chưa sửa code, chưa thêm index, chưa đổi RLS** — database và codebase vẫn nguyên trạng.

---

### TÓM TẮT AUDIT REPORT (20 Phần)

| Phần | Nội dung | Loại |
|------|----------|------|
| 1-2 | Frontend audit (50+ hooks rải, 44 files feed, 156 `as any`, 77 `console.log`) | Codebase |
| 3 | Target architecture (module-based structure) | Thiết kế |
| 4 | Naming conventions đề xuất | Thiết kế |
| 5 | Capability/Policy layer (`useCapabilities`) | Thiết kế |
| 6 | Navigation/Routing chuẩn hóa | Thiết kế |
| 7 | Error handling chuẩn hóa | Thiết kế |
| 8 | Logging/Audit phân tầng | Thiết kế |
| 9 | Types/Schema/Validation (`as any` audit) | Codebase |
| 10 | Edge functions cleanup (gộp 15 media functions) | Thiết kế |
| 11 | Testing strategy | Thiết kế |
| 12 | Refactor roadmap 3 phases | Kế hoạch |
| 13 | Files ưu tiên xử lý | Kế hoạch |
| 14 | Nguyên tắc triển khai | Kế hoạch |
| 15 | Live messaging semantics (`live_messages` = canonical) | DB Audit |
| 16 | Profiles field visibility matrix (enforcement gap) | DB Audit |
| 17 | View dependency mapping (5 views, tất cả filter đúng) | DB Audit |
| 18 | Do Not Touch First list (7 objects cao rủi ro) | DB Audit |
| 19 | Canonical Domain Models (11 domains mapped) | DB Audit |
| 20 | Refactor Blockers (6 blockers cụ thể) | DB Audit |

**Vấn đề lớn nhất phát hiện:**
- `profiles` = God Table (45+ columns, chứa wallet + rewards + finance + admin notes)
- Profiles RLS SELECT `qual: true` — tất cả fields exposed (nhưng đây là "Public by Design" có chủ đích)
- 15 media edge functions chồng chéo
- 50+ hooks không nhóm theo domain
- `livestreams` table legacy nhưng bị `get_user_rewards_v2` phụ thuộc
- `notifications.read` cần compatibility migration trước khi rename

---

### KẾ HOẠCH HOÀN THIỆN — TRIỂN KHAI THỰC TẾ

#### PHASE 1 — Safe Database Cleanup (rủi ro THẤP)

**1A. Thêm missing indexes** (performance win ngay lập tức)
```sql
CREATE INDEX CONCURRENTLY idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX CONCURRENTLY idx_reactions_post_type ON reactions(post_id, type);
CREATE INDEX CONCURRENTLY idx_light_actions_user_created ON light_actions(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_chunked_chunks_status ON chunked_recording_chunks(status);
```

**1B. Thêm SQL comments cho tất cả tables** — documentation trong DB

**1C. Phân loại 35 tables 0-rows** thành Active/Planned/Legacy/Deletable

#### PHASE 1 — Safe Codebase Cleanup (rủi ro THẤP)

**1D.** Thay 77 `console.log` → `logger`  
**1E.** Tạo `useAdminRole()` shared hook (thay vì mỗi component tự gọi `has_role`)  
**1F.** Gom edge function `_shared/` helpers (cors, auth, response)

#### PHASE 2 — Structural Improvements (rủi ro TRUNG BÌNH)

**2A.** State enum documentation trong DB  
**2B.** Merge `search_logs` → `search_history`  
**2C.** `notifications.read` → `is_read` compatibility migration (backfill + dual-write)  
**2D.** Xóa `useLiveComments` hook (dead code)  
**2E.** Module hóa `hooks/` theo domain  
**2F.** Tách `components/feed/` thành sub-domains  
**2G.** Tạo `shared/policies/useCapabilities`  

#### PHASE 3 — Deep Refactor (rủi ro CAO)

**3A.** Tách wallet fields từ `profiles` → `user_wallet_config`  
**3B.** Claims lifecycle audit → quyết định merge `reward_claims` + `pending_claims`  
**3C.** Migrate `FinancialTab.tsx` → đọc từ `platform_financial_data` → drop `grand_total_*` cache columns  
**3D.** Refactor `get_user_rewards_v2` → dùng `live_sessions` thay `livestreams`  
**3E.** Product review `live_comments` → quyết định drop hoặc giữ  
**3F.** Profiles RLS tightening (nếu quyết định chuyển khỏi Public by Design)  
**3G.** Gộp 15 media edge functions thành router pattern  

---

### ĐỀ XUẤT BƯỚC TIẾP THEO

Bắt đầu với **Phase 1A + 1B** — thêm 5 missing indexes + SQL comments cho tables. Đây là thay đổi zero-risk, không ảnh hưởng code hay data, nhưng cải thiện performance và documentation ngay lập tức.

