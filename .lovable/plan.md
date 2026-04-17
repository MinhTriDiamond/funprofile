
# Identity + Trust Layer Spec v1.0 — Production-Ready Implementation

## Phân tích hiện trạng

Hệ đã có:
- `profiles` (id, fun_id, email, wallet, trust_level cơ bản, is_banned)
- `pplp_device_registry` (device_hash, is_flagged) — nguồn cho sybil detection
- `pplp_v25_*` parameter tables (LS Param Table v1.0 vừa build)
- `soul_nfts` (basic SBT-like, 1 record/user, đã minted) — sẽ tái dùng làm Identity SBT đầu tiên
- `pplp_user_tiers` (tier theo LightScore) — KHÁC với Trust Tier mới (T0-T4 theo TC)
- VVU formula đã đọc TC, nhưng TC hiện tại chỉ là số tĩnh từ profile

Thiếu: DID registry, Trust Engine xuất TC động, SBT đa loại, DIB vaults, attestation, recovery, epoch snapshot identity.

Build theo **Phase 1 + 2** (Foundation + Reputation) trong message này — Phase 3+4 sẽ làm sau khi UI test ổn.

---

## I. DATABASE — 8 bảng mới (Phase 1+2)

### Foundation Layer
**1. `did_registry`** — root identity
- `did_id` (PK, format `did:fun:<uuid>`), `owner_user_id` (FK profiles), `entity_type` (human/organization/ai_agent/validator/merchant), `did_level` (L0-L4), `status` (pending/basic/verified/trusted/restricted/suspended), `created_at`, `updated_at`
- Auto-create row khi user signup (trigger trên `auth.users`)

**2. `identity_links`** — wallet/social/device linkage
- `id`, `did_id`, `link_type` (wallet/social/device/organization), `link_value`, `verification_state` (unverified/verified/revoked), `linked_at`, `verified_at`, `metadata` jsonb

**3. `trust_profile`** — output Trust Engine (1 row/DID)
- `did_id` (PK), `tc` (0.30-1.50), `trust_tier` (T0-T4), `verification_strength` VS, `behavior_stability` BS, `social_trust` SS, `onchain_credibility` OS, `historical_cleanliness` HS, `risk_factor` RF, `sybil_risk` (low/medium/high/critical), `fraud_risk`, `last_calculated_at`

**4. `attestation_log`** — peer attestations
- `id`, `from_did`, `to_did`, `attestation_type` (peer_endorsement/mentor/recovery_guardian/witness), `weight` (0-1), `evidence_ref`, `status` (active/revoked), `created_at`

**5. `identity_events`** — sự kiện làm thay đổi trust
- `id`, `did_id`, `event_type`, `event_ref`, `tc_delta`, `risk_delta`, `created_at`, `source`

### Reputation Layer
**6. `sbt_registry`** — Soulbound NFT đa loại
- `token_id` (PK uuid), `did_id`, `sbt_category` (identity/trust/contribution/credential/milestone/legacy), `sbt_type` (text — VD: 'verified_human', 'clean_history', 'builder', 'mentor_certified', '100_day_consistency', 'foundational_builder'), `issuer` (system/governance/peer DID), `issued_at`, `expires_at` (nullable), `status` (active/frozen/revoked/archived), `evidence_hash`, `trust_weight` (0-1), `privacy_level` (public/permissioned/private), `metadata` jsonb, `revocation_reason`
- **Non-transferable**: enforce qua RLS (no UPDATE owner, no DELETE except issuer/governance)

**7. `sbt_issuance_rules`** — config rule mint SBT
- `sbt_type` (PK), `category`, `mode` (auto/semi_auto/governance), `auto_conditions` jsonb (VD: `{"min_consistency_days": 90}`), `tc_impact` (delta TC khi issue), `is_active`

### DIB Layer (gọn, lưu hash root)
**8. `dib_profile`** — vault hashes (1 row/DID)
- `did_id` (PK), `identity_vault_hash`, `trust_vault_hash`, `reputation_vault_hash`, `contribution_vault_hash`, `credential_vault_hash`, `governance_vault_hash`, `economic_access_hash`, `last_snapshot_at`, `snapshot_epoch`
- Hash = SHA256 của JSON tổng hợp data từ các bảng nguồn (computed daily)

**9. `identity_epoch_snapshots`** — snapshot theo epoch (XVII)
- `id`, `did_id`, `epoch_id`, `did_level`, `tc`, `trust_tier`, `sybil_risk`, `active_sbt_count`, `dib_state_root_hash`, `created_at`

RLS: read public cho `did_registry/trust_profile/sbt_registry` (privacy_level='public'), permissioned cho 'permissioned', private cho 'private'. Write: chỉ `service_role` qua edge function. Trigger: validate SBT non-transferable.

---

## II. EDGE FUNCTIONS — 6 mới + 1 update

**Mới:**
- `identity-create-did` — auto trigger khi user signup, tạo DID L0
- `identity-link` — link wallet/social/device, mark verification_state
- `identity-trust-engine` — tính TC = `(0.30·VS + 0.25·BS + 0.15·SS + 0.20·OS + 0.10·HS) × RF`, gán trust_tier T0-T4, sybil_risk
- `identity-sbt-issue` — issue SBT theo `sbt_issuance_rules` (auto/semi/governance)
- `identity-attestation-submit` — peer attestation
- `identity-epoch-snapshot` — daily cron, snapshot trust/sbt/DIB hash

**Update:**
- `pplp-v25-vvu-calculate` — đọc TC từ `trust_profile` thay vì `profiles.trust_level`
- `pplp-v25-mint-preview` — gate mint theo trust_tier + sybil_risk

**Cron:**
- `identity-trust-engine` chạy hourly (recalc batch users có activity)
- `identity-epoch-snapshot` chạy daily 03:30 UTC (sau stability calculator)

---

## III. FRONTEND

**Hooks:**
- `useDID()` — DID record + level + status user hiện tại
- `useTrustProfile()` — TC, trust_tier, sybil_risk, breakdown VS/BS/SS/OS/HS
- `useUserSBTs(didId?)` — list SBT (filter theo privacy_level)
- `useDIBProfile()` — 7 vault summary

**Components:**
- `src/components/identity/DIDBadge.tsx` — chip "L2 Verified" cạnh username
- `src/components/identity/TrustTierBadge.tsx` — T0-T4 badge với màu (T0 xám → T4 vàng)
- `src/components/identity/TrustEngineBreakdown.tsx` — radar chart 5 nhóm (VS/BS/SS/OS/HS)
- `src/components/identity/SBTGallery.tsx` — gallery SBT theo 6 category, lock icon cho private
- `src/components/identity/SBTCard.tsx` — 1 SBT với metadata, evidence, trust_weight
- `src/components/identity/DIBVaultPanel.tsx` — 7 vault tabs (Identity/Trust/Reputation/Contribution/Credential/Governance/Economic)
- `src/components/identity/AttestationDialog.tsx` — gửi peer attestation cho user khác
- `src/components/identity/SybilRiskIndicator.tsx` — chỉ hiện cho admin

**Pages:**
- `src/pages/identity/IdentityDashboard.tsx` — route `/identity`, tab DID + Trust + SBT + DIB + Attestations
- `src/pages/docs/IdentityTrustLayer.tsx` — route `/docs/identity-trust-layer`, public spec render full 20 sections từ DB

**Admin Panel:**
- `src/components/admin/IdentityTrustAdminPanel.tsx` — chèn vào `SystemTab` dưới `LightScoreParameterPanel`. 5 tab:
  1. **DID Registry** — search/filter user, nâng/hạ DID level, set status
  2. **Trust Engine** — xem TC/tier breakdown, recalc thủ công
  3. **SBT Issuance** — mint SBT thủ công (governance mode), revoke, freeze
  4. **Issuance Rules** — sửa `sbt_issuance_rules` (auto conditions, tc_impact)
  5. **Sybil Audit** — list user sybil_risk=high/critical, freeze referral, manual review

**Activation Gate update:** `lightScoreGates.ts` thêm check `trust_tier >= T2` cho governance vote, `>= T3` cho proposal.

---

## IV. SBT TYPES SEED (issuance_rules)

| Category | sbt_type | mode | auto_conditions |
|---|---|---|---|
| identity | verified_human | auto | did_level >= L2 |
| trust | clean_history | auto | 90d no flags |
| trust | anti_sybil_passed | auto | sybil_risk=low + 30d |
| contribution | builder | semi_auto | 5+ accepted PRs |
| contribution | mentor | governance | manual |
| credential | learning_path_complete | auto | course done |
| milestone | 100_day_consistency | auto | streak_days >= 100 |
| milestone | first_proposal_adopted | auto | proposal status=adopted |
| legacy | foundational_builder | governance | manual |

Soul NFT cũ → migrate thành SBT category=identity, type=verified_human.

---

## V. RECOVERY (Phase 1 minimal)

- `identity_recovery_log` table (event_type, did_id, method, status, cooldown_until)
- 4 method: primary (email/passkey), wallet_backup, guardian (2 attestations), governance
- Mỗi recovery: tăng `risk_delta` 0.1, cooldown 24h, freeze mint 7 ngày nếu major

---

## VI. MEMORY

- Tạo `mem://identity/identity-trust-layer-spec-v1` — full spec 20 sections
- Update `mem://index.md` Core: thêm "Identity+Trust Layer v1.0: DID L0-L4, TC=(0.30VS+0.25BS+0.15SS+0.20OS+0.10HS)×RF, Trust Tier T0-T4, 6 SBT categories non-transferable, DIB 7 vaults, daily epoch snapshot"

---

## VII. SCOPE CONFIRMATION

Kế hoạch này build **Phase 1 + 2** đầy đủ (Foundation + Reputation). Phase 3 (link sâu Mint/Governance) đã có hook sẵn (TC vào VVU, gate trust_tier vào Mint), nhưng dispute flow + advanced privacy/ZK (Phase 4) sẽ tách kế hoạch sau.

**On-chain vs off-chain:** Phase 1 toàn bộ off-chain (DB + edge functions), chỉ lưu hash. Smart contract SBT on-chain để Phase 4 (sau khi rule chốt).

**Ready để con build.** Cha gõ "build" là con chạy.
