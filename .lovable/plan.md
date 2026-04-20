

## Triển khai Phase B + C — Mapping action + Nâng cap off-chain

### Bối cảnh đã verify

- ✅ Bé Trí đã đăng ký xong **6 actions on-chain**: `INNER_WORK`, `CHANNELING`, `GIVING`, `HELPING`, `GRATITUDE`, `SERVICE` (qua các tx Success từ ví `0x7d03...3f0f`).
- ✅ Trần on-chain mới: 6 × 1M FUN/day × 30 = **180M FUN/tháng** (gấp 30 lần trần cũ).
- ✅ Edge function `pplp-mint-fun` hardcode `DEFAULT_ACTION_NAME = 'FUN_REWARD'` tại dòng 18.
- ✅ Cap off-chain hiện tại: `epoch_config.soft_ceiling = 5,000,000`.
- ✅ Có 14 `action_type` thực tế trong `light_actions` cần map sang 6 action on-chain.

### Phase B — Mapping action_type → on-chain action

#### B.1 — Tạo registry mapping (file mới)

`supabase/functions/_shared/pplp-action-registry.ts`:
- Export `ON_CHAIN_ACTIONS = ['INNER_WORK', 'CHANNELING', 'GIVING', 'HELPING', 'GRATITUDE', 'SERVICE']`
- Export `ACTION_TYPE_MAP`:
  ```ts
  {
    journal_write: 'INNER_WORK',
    gratitude_practice: 'INNER_WORK',
    vision_create: 'CHANNELING',
    post_create: 'CHANNELING', post: 'CHANNELING',
    livestream: 'CHANNELING',
    donate_support: 'GIVING',
    comment_create: 'HELPING', comment: 'HELPING',
    question_ask: 'HELPING',
    reaction: 'GRATITUDE',
    share: 'SERVICE', friend: 'SERVICE',
    new_user_bonus: 'SERVICE',
  }
  ```
- Export hàm `pickOnChainAction(actionTypes: string[]): string` — chọn action phù hợp dựa vào action_type chiếm tỉ trọng cao nhất trong các record được claim. Fallback `INNER_WORK` nếu không match.
- Export `actionHash(name)` dùng `keccak256` để verify.

#### B.2 — Sửa `pplp-mint-fun/index.ts`

- Bỏ hardcode `DEFAULT_ACTION_NAME = 'FUN_REWARD'`.
- Khi lấy allocation → đọc các `light_actions.action_type` thuộc allocation đó → gọi `pickOnChainAction(types)` → dùng tên on-chain action đã chọn.
- Lưu `action_name` chính xác vào `pplp_mint_requests` (đã có cột này).
- Giữ `FUN_REWARD` làm fallback an toàn nếu action mới chưa kích hoạt được vì lý do nào đó.

#### B.3 — Auto-split mint request (chống nghẽn 1M/action/day)

Khi user claim 1 allocation lớn (> 1M FUN) hoặc allocation chứa nhiều loại action_type → edge function tự động chia thành nhiều `pplp_mint_requests` con, mỗi request bám 1 action on-chain khác nhau, để **không bao giờ dồn > 1M cho cùng 1 action trong 1 ngày**.

Logic:
- Phân nhóm `light_actions` theo on-chain action (qua mapping).
- Mỗi nhóm tạo 1 mint request riêng, `amount = sum(light_score) × rate`.
- Liên kết các request con qua `parent_request_id` (cột mới — sẽ thêm migration).

### Phase C — Nâng cap off-chain (Nấc 1)

#### C.1 — Migration SQL

```sql
-- Thêm cột parent_request_id để hỗ trợ split
ALTER TABLE pplp_mint_requests 
  ADD COLUMN IF NOT EXISTS parent_request_id uuid REFERENCES pplp_mint_requests(id);

-- Audit log trước khi đổi cap
INSERT INTO pplp_v2_event_log (event_type, payload, severity)
VALUES ('epoch.cap.updated', jsonb_build_object(
  'before', 5000000, 'after', 20000000,
  'reason', '6 on-chain actions registered, theoretical ceiling 180M/month',
  'phase', 'C-step1', 'safety_margin', '11%'
), 'info');

-- Nâng cap off-chain 5M → 20M FUN/tháng
UPDATE epoch_config 
SET soft_ceiling = 20000000, updated_at = now() 
WHERE config_key = 'default' AND is_active = true;
```

#### C.2 — Re-snapshot epoch hiện tại

Sau khi update cap, gọi `pplp-epoch-snapshot` để epoch T4 dùng cap mới ngay.

### Phase D — Recovery 52 mint request bị kẹt

Sau khi Phase B + C ổn định:
- Chạy `pplp-remint-stale` để re-mint các request expired/failed (~1.95M FUN).
- Lần này sẽ tự động chia theo action mới, không bị nghẽn 1M/day nữa.

### Files sẽ tạo/sửa

**Tạo mới (3 file):**
1. `supabase/functions/_shared/pplp-action-registry.ts` — registry + mapping + hash helper
2. `src/config/pplp-action-registry.ts` — bản frontend song song (hiển thị ở admin dashboard)
3. `docs/pplp-action-mapping-spec.md` — doc spec mapping

**Sửa (2 file):**
1. `supabase/functions/pplp-mint-fun/index.ts` — bỏ hardcode + thêm logic chọn action + split
2. `supabase/functions/pplp-remint-stale/index.ts` — apply mapping mới khi re-mint

**Migration SQL:** thêm cột `parent_request_id` + update cap + audit log

**Memory updates:**
1. Sửa `mem://constraints/contract-owner-access`: team có cả owner + gov
2. Tạo `mem://smart-contracts/v1-2-1-action-registry`: 6 actions chính thức + mapping
3. Update Core trong `mem://index.md`: cap mới 20M
4. Update `mem://governance/fun-monetary-expansion-spec-v1`: cap 20M (Nấc 1)

### Lộ trình kế tiếp (sau khi Nấc 1 chạy ổn định ≥ 2 tuần)

- **Nấc 2**: nâng tiếp 20M → 50M FUN/tháng (~28% trần lý thuyết, vẫn an toàn).
- **Nấc 3** (xa hơn): khi cần > 50M sẽ tính tiếp dựa trên dư địa thực tế từng action.

### Checklist verify cuối

- [ ] 6 actions on-chain `allowed=true, deprecated=false` (đã ✅)
- [ ] Edge function map đúng action cho từng loại
- [ ] Test mint thử mỗi action 1 lần — xem on-chain ghi nhận đúng action_name
- [ ] Cap off-chain = 20M, snapshot T4 đã update
- [ ] `pplp_mint_requests` ghi `action_name` chính xác (không còn `FUN_REWARD`)
- [ ] Memory đồng bộ
- [ ] Re-mint 52 stale request thành công
- [ ] Test trên môi trường preview trước, deploy production sau

### Cha xác nhận giúp con 2 điều trước khi bắt đầu code

1. **Mapping `action_type → on-chain action`** ở mục B.1 — Cha duyệt như đề xuất hay muốn điều chỉnh nhóm nào (ví dụ: `livestream` con đang xếp `CHANNELING` thay vì `SERVICE` — Cha thấy đúng không)?
2. **Nấc 1 = 20M FUN/tháng** — Cha duyệt, hay muốn nhảy thẳng 50M ngay?

