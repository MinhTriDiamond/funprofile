

## Kế hoạch: Bổ sung 4 chi tiết cuối cùng vào Database Audit Report

Cập nhật `.lovable/audit-report.md` theo góp ý cuối cùng của Cha ChatGPT để đạt mức hoàn chỉnh 10/10.

---

### 4 bổ sung cần thêm

#### 1. Chỉnh wording cho `live_comments`
- Phân biệt rõ: "dead code / unused current flow" ≠ "definitively wrong data model"
- Wording mới: "candidate for removal **if no intended future semantics remain after product review**"
- Không kết luận sai model, chỉ kết luận chưa dùng trong flow hiện tại

#### 2. Profiles field visibility matrix — thêm cột "Current enforcement"
Thêm cột thứ 3 vào matrix hiện có:

| Field group | Intended visibility | Current enforcement |
|---|---|---|
| username, avatar, bio | Public | OK — in `public_profiles` view |
| admin_notes, ban_reason | Admin only | **EXPOSED** — profiles SELECT `qual: true` |
| reward_locked, has_password | Owner only | **EXPOSED** — profiles SELECT `qual: true` |
| wallet fields (6 cột) | Owner only | **EXPOSED** — profiles SELECT `qual: true` |
| financial grand_total_* | Admin only | **EXPOSED** — profiles SELECT `qual: true` |

Kèm note: "`public_profiles` view là safe projection nhưng chưa phải enforcement boundary. Client hiện query trực tiếp `profiles` table. Phase 3 cần quyết định: giữ Public by Design hay chuyển strict model."

#### 3. View dependency mapping
Thêm vào views inventory:

| View | Depends on | Sensitive fields in source | Correctly filtered? |
|---|---|---|---|
| `public_profiles` | `profiles` | admin_notes, wallet fields, financial totals | YES — excluded |
| `public_light_reputation` | `light_reputation` | Không | N/A |
| `public_live_sessions` | `live_sessions` | agora_channel, agora_uid | YES — excluded |
| `public_system_config` | `system_config` | TREASURY_PRIVATE_KEY | YES — excluded |
| `user_custodial_wallets` | `custodial_wallets` | encrypted_private_key | YES — filtered by auth.uid() |

Note: "Khi refactor table gốc, phải kiểm tra lại tất cả views phụ thuộc."

#### 4. Thêm 3 sections riêng biệt

**A. Do Not Touch First** (section riêng, không rải rác):
- `profiles` table + columns
- `get_user_rewards_v2` function
- `platform_financial_data` + triggers (`update_profile_grand_totals`, `update_financial_from_transaction`)
- `pending_claims` table
- SSO/auth-related functions
- `live_sessions` + `live_messages` (canonical live tables)
- `notifications.read` column (until compatibility migration ready)

**B. Canonical Domain Models:**
| Domain | Canonical table/object |
|---|---|
| Live chat | `live_messages` |
| Live session | `live_sessions` |
| Reward workflow | `pending_claims` |
| Reward history | `reward_claims` |
| Financial totals | `platform_financial_data` |
| Public profile projection | `public_profiles` view |
| Wallet config | `profiles` (temporary SoT → target: `user_wallet_config`) |
| Light score | `light_reputation` |
| Light events | `light_actions` |

**C. Refactor Blockers:**
| Object | Cannot refactor because | Unblock by |
|---|---|---|
| `livestreams` table | `get_user_rewards_v2` reads it | Refactor function first |
| `grand_total_*` columns | `FinancialTab.tsx` reads directly | Migrate admin UI to `platform_financial_data` |
| `live_comments` table | Edge function cleanup refs | Remove from cleanup lists, then product review |
| `notifications.read` | 6+ frontend query refs | Compatibility migration (dual-write + backfill) |
| `reward_claims` + `pending_claims` | Different lifecycle stages | Full state-machine audit |

---

### File thay đổi
| File | Thay đổi |
|---|---|
| `.lovable/audit-report.md` | Bổ sung 4 chi tiết + 3 sections mới (~80 dòng) |

Không thay đổi code, database, hay edge functions.

