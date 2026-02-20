
## Thiết Kế GOV-COMMUNITY Multisig: WILL + WISDOM + LOVE

---

### Hiểu kiến trúc hiện tại

Hiện tại, `lockWithPPLP(user, action, amount, evidenceHash, sigs[])` nhận một mảng chữ ký `bytes[]`. Smart contract (v1.2.1) đã được thiết kế để nhận **nhiều chữ ký từ nhiều Attester** — đây chính là nền tảng hoàn hảo cho Multisig.

Luồng hiện tại chỉ dùng **1 chữ ký** từ 1 trong 2 Attester cũ (`0xe32d...` hoặc `0xD41C...`). Kế hoạch này nâng cấp lên **3 chữ ký** từ 3 nhóm GOV-COMMUNITY.

---

### Cơ chế WILL + WISDOM + LOVE

Quy tắc: Mỗi lần mint FUN cần đủ **3 chữ ký độc lập**, mỗi chữ ký từ 1 trong 3 người thuộc nhóm tương ứng:

```
WILL  = Minh Trí  | Ánh Nguyệt | Thu Trang
WISDOM= Bé Giàu   | Bé Ngọc    | Ái Vân
LOVE  = Thanh Tiên| Bé Kim     | Bé Hà

Thỏa điều kiện: ký_WILL + ký_WISDOM + ký_LOVE = sigs[3]
→ gọi lockWithPPLP(..., [sig_will, sig_wisdom, sig_love])
```

---

### Các thay đổi cần thực hiện

#### 1. Database — Thêm cột lưu multi-signatures

Bảng `pplp_mint_requests` hiện chỉ có 1 cột `signature` (text) và 1 `signed_by`. Cần thêm cột JSONB để lưu đầy đủ:

```sql
ALTER TABLE pplp_mint_requests
  ADD COLUMN multisig_signatures JSONB DEFAULT '{}',
  ADD COLUMN multisig_required_groups TEXT[] DEFAULT ARRAY['will','wisdom','love'],
  ADD COLUMN multisig_completed_groups TEXT[] DEFAULT '{}';
```

Cấu trúc `multisig_signatures`:
```json
{
  "will": {
    "signer": "0xe32d50a0badE4cbD5B0d6120d3A5FD07f63694f1",
    "signature": "0x...",
    "signed_at": "2026-02-20T10:00:00Z",
    "signer_name": "Minh Trí"
  },
  "wisdom": {
    "signer": "0xCa31...",
    "signature": "0x...",
    "signed_at": "2026-02-20T10:05:00Z",
    "signer_name": "Bé Giàu"
  },
  "love": {
    "signer": "0x0e1b...",
    "signature": "0x...",
    "signed_at": "2026-02-20T10:10:00Z",
    "signer_name": "Thanh Tiên"
  }
}
```

Status flow mới:
```
pending_sig → signing (đang thu thập chữ ký) → signed (đủ 3) → submitted → confirmed
```

---

#### 2. Config — `src/config/pplp.ts`

Thay toàn bộ `ATTESTER_ADDRESSES` cũ bằng cấu hình 3 nhóm mới:

```typescript
export const GOV_GROUPS = {
  will: {
    name: 'Will',
    nameVi: 'Ý Chí',
    emoji: '💪',
    description: 'Kỹ thuật & Ý chí',
    color: 'blue',
    members: [
      { name: 'Minh Trí',   address: '0xe32d50a0badE4cbD5B0d6120d3A5FD07f63694f1' },
      { name: 'Ánh Nguyệt', address: '0xfd0Da7a744245e7aCECCd786d5a743Ef9291a557' },
      { name: 'Thu Trang',  address: '0x02D5578173bd0DB25462BB32A254Cd4b2E6D9a0D' },
    ],
  },
  wisdom: {
    name: 'Wisdom',
    nameVi: 'Trí Tuệ',
    emoji: '🌟',
    description: 'Tầm nhìn chiến lược',
    color: 'yellow',
    members: [
      { name: 'Bé Giàu', address: '0xCa319fBc39F519822385F2D0a0114B14fa89A301' },
      { name: 'Bé Ngọc', address: '0x699CC96A8C4E3555f95Bd620EC4A218155641E09' },
      { name: 'Ái Vân',  address: '0x5102Ecc4a458a1af76aFA50d23359a712658a402' },
    ],
  },
  love: {
    name: 'Love',
    nameVi: 'Yêu Thương',
    emoji: '❤️',
    description: 'Nhân ái & Chữa lành',
    color: 'rose',
    members: [
      { name: 'Thanh Tiên', address: '0x0e1b399E4a88eB11dd0f77cc21E9B54835f6d385' },
      { name: 'Bé Kim',     address: '0x38db3eC4e14946aE497992e6856216641D22c242' },
      { name: 'Bé Hà',      address: '0x9ec8C51175526BEbB1D04100256De71CF99B7CCC' },
    ],
  },
} as const;

export type GovGroupKey = keyof typeof GOV_GROUPS;

// Tất cả 9 địa chỉ đều là Attester (cần đăng ký trên contract)
export const ALL_GOV_ADDRESSES = Object.values(GOV_GROUPS).flatMap(g => g.members.map(m => m.address));

// Tìm nhóm của một địa chỉ
export function getGovGroupForAddress(addr: string): GovGroupKey | null {
  for (const [key, group] of Object.entries(GOV_GROUPS)) {
    if (group.members.some(m => m.address.toLowerCase() === addr.toLowerCase())) {
      return key as GovGroupKey;
    }
  }
  return null;
}

// Tìm tên thành viên
export function getGovMemberName(addr: string): string | null {
  for (const group of Object.values(GOV_GROUPS)) {
    const member = group.members.find(m => m.address.toLowerCase() === addr.toLowerCase());
    if (member) return member.name;
  }
  return null;
}
```

---

#### 3. Hook — `src/hooks/usePplpAdmin.ts`

**Thay đổi `signMintRequest`:**

Hàm ký hiện tại chỉ lưu 1 chữ ký. Cần nâng cấp để:
- Xác định nhóm GOV của ví đang kết nối
- Kiểm tra nhóm đó chưa ký cho request này
- Lưu chữ ký vào `multisig_signatures[group_key]`
- Tự động cập nhật `multisig_completed_groups`
- Khi đủ 3 nhóm → tự động chuyển status sang `signed`

```typescript
const signMintRequest = useCallback(async (request: MintRequest): Promise<string | null> => {
  // 1. Xác định nhóm của ví đang kết nối
  const groupKey = getGovGroupForAddress(address ?? '');
  if (!groupKey) {
    toast.error('Ví của bạn không thuộc nhóm GOV-COMMUNITY nào');
    return null;
  }

  // 2. Kiểm tra nhóm này đã ký chưa
  const currentSigs = request.multisig_signatures ?? {};
  if (currentSigs[groupKey]) {
    toast.warning(`Nhóm ${GOV_GROUPS[groupKey].nameVi} đã ký request này rồi`);
    return null;
  }

  // 3. Ký EIP-712 (giống hiện tại)
  const signature = await signTypedDataAsync({ ... });

  // 4. Cập nhật multisig_signatures
  const newSigs = {
    ...currentSigs,
    [groupKey]: {
      signer: address,
      signature,
      signed_at: new Date().toISOString(),
      signer_name: getGovMemberName(address ?? ''),
    },
  };

  const completedGroups = Object.keys(newSigs);
  const isFullySigned = completedGroups.length === 3;

  await supabase.from('pplp_mint_requests').update({
    multisig_signatures: newSigs,
    multisig_completed_groups: completedGroups,
    // Backward compat: lưu chữ ký cuối cùng vào cột signature cũ
    signature: isFullySigned ? signature : request.signature,
    signed_by: address,
    signed_at: new Date().toISOString(),
    status: isFullySigned ? 'signed' : 'signing', // trạng thái mới 'signing'
  }).eq('id', request.id);

  if (isFullySigned) {
    toast.success('✅ Đủ 3 chữ ký GOV! Request sẵn sàng Submit lên blockchain');
  } else {
    toast.success(`Nhóm ${GOV_GROUPS[groupKey].name} đã ký! Cần thêm ${3 - completedGroups.length} nhóm nữa`);
  }
  return signature;
}, [...]);
```

**Thay đổi `submitToChain`:**

Truyền đủ 3 chữ ký vào `sigs[]`:
```typescript
// Lấy 3 chữ ký từ multisig_signatures theo thứ tự will → wisdom → love
const orderedSigs = ['will', 'wisdom', 'love']
  .map(group => request.multisig_signatures?.[group]?.signature)
  .filter(Boolean) as `0x${string}`[];

const txHash = await writeContractAsync({
  functionName: 'lockWithPPLP',
  args: [
    request.recipient_address as `0x${string}`,
    request.action_name,
    BigInt(request.amount_wei),
    request.evidence_hash as `0x${string}`,
    orderedSigs, // [sig_will, sig_wisdom, sig_love]
  ],
});
```

---

#### 4. UI — `src/components/admin/PplpMintTab.tsx`

**Thêm tab mới `signing` (Đang ký):**

```
[Chờ ký (N)] [Đang ký (M)] [Đã ký (K)] [Đã gửi] [Hoàn tất] [Từ chối] [Thất bại]
```

**Component `MultisigProgressPanel`** — hiển thị trong mỗi request card:

```
💪 WILL      ✅ Minh Trí ký — 20/02/2026 10:00
🌟 WISDOM    ⏳ Chờ ký từ Bé Giàu / Bé Ngọc / Ái Vân
❤️ LOVE      ⏳ Chờ ký từ Thanh Tiên / Bé Kim / Bé Hà

[███████░░░░] 1/3 nhóm đã ký
```

**Logic nút Ký trong `MintRequestRow`:**

- Nếu ví kết nối thuộc 1 trong 9 địa chỉ GOV → hiện nút "Ký với tư cách [Tên]"
- Nếu nhóm của ví đã ký → nút disabled với text "Nhóm WILL đã ký ✓"
- Nếu ví không thuộc GOV nào → ẩn nút ký

**Banner thông minh hiển thị danh tính người ký:**

```
🔗 Ví đang kết nối: Minh Trí (Nhóm WILL)
```

---

#### 5. Database Migration

```sql
-- Thêm cột multisig
ALTER TABLE pplp_mint_requests
  ADD COLUMN IF NOT EXISTS multisig_signatures JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS multisig_required_groups TEXT[] DEFAULT ARRAY['will','wisdom','love'],
  ADD COLUMN IF NOT EXISTS multisig_completed_groups TEXT[] DEFAULT '{}';

-- Thêm status 'signing' vào constraint (nếu có)
-- Cập nhật các request pending_sig cũ: giữ nguyên workflow cũ
-- (backward compatible: signature cũ vẫn hoạt động)
```

---

### Tổng hợp file thay đổi

| File | Thay đổi |
|---|---|
| Migration SQL | Thêm 3 cột multisig vào `pplp_mint_requests` |
| `src/config/pplp.ts` | Thêm `GOV_GROUPS`, helper functions, 9 địa chỉ mới |
| `src/hooks/usePplpAdmin.ts` | Nâng cấp `signMintRequest`, `submitToChain`, interface `MintRequest` |
| `src/components/admin/PplpMintTab.tsx` | Thêm tab `signing`, `MultisigProgressPanel`, logic nút ký thông minh |

---

### Luồng hoàn chỉnh sau khi cài xong

```
[Tạo request]
      ↓
status: pending_sig
      ↓ (Minh Trí kết nối ví → bấm Ký)
multisig_signatures.will = {...}
status: signing  ← Nhóm WILL đã ký (1/3)
      ↓ (Bé Giàu kết nối ví → bấm Ký)
multisig_signatures.wisdom = {...}
status: signing  ← 2/3 nhóm đã ký
      ↓ (Bé Kim kết nối ví → bấm Ký)
multisig_signatures.love = {...}
status: signed   ← ĐỦ 3 NHÓM! 🎉
      ↓ (Attester Submit)
lockWithPPLP(..., [sig_will, sig_wisdom, sig_love])
status: submitted → confirmed
```

---

### Lưu ý quan trọng về Smart Contract

Để Multisig hoạt động **on-chain**, cả 9 địa chỉ GOV phải được đăng ký trên contract qua `govRegisterAttester(address)`. Contract sẽ verify từng chữ ký trong mảng `sigs[]` và kiểm tra mỗi signer có phải là Attester hợp lệ không. Nếu chưa đăng ký → transaction sẽ revert với lỗi "Attester not registered".

Việc đăng ký on-chain là bước thực hiện **song song ngoài codebase này** (cần transaction từ contract owner/gov).
