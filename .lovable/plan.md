

# Đồng bộ tính năng gửi/nhận BTC & hiển thị giao dịch từ ví ngoài

## Vấn đề hiện tại

1. **Edge function `scan-btc-transactions` đã tồn tại** và hoạt động đầy đủ (quét Mempool.space, tạo `donations`, `wallet_transfers`, `gift_celebration` posts, notifications, chat messages) — nhưng **không bao giờ được gọi từ frontend**.

2. **`scan-my-incoming`** (nút quét giao dịch) chỉ quét EVM (Moralis), **không quét BTC**. Tương tự `auto-scan-donations` cũng chỉ xử lý EVM.

3. **Trang Donations** (`/donations` — `SystemDonationHistory`) hiển thị từ bảng `donations`, đã hỗ trợ BTC (vì scanner ghi `token_symbol: 'BTC'`) — nhưng vì scanner chưa được gọi, dữ liệu BTC chưa có.

4. **HistoryTab** trong Ví đã merge on-chain (Mempool trực tiếp) + donations, nhưng trên mobile/desktop cần có dữ liệu trong DB để đồng bộ.

## Giải pháp

### 1. Tích hợp BTC scan vào `useScanIncoming` hook
**File:** `src/hooks/useScanIncoming.ts`
- Sau khi gọi `scan-my-incoming` (EVM), gọi thêm `scan-btc-transactions` để quét BTC.
- Gộp kết quả `newTransfers` từ cả hai scanner.
- Invalidate thêm query keys cho BTC history.

### 2. Tích hợp BTC scan vào `auto-scan-donations` edge function  
**File:** `supabase/functions/auto-scan-donations/index.ts`
- Cuối logic EVM scan, gọi thêm `scan-btc-transactions` (internal fetch) để quét BTC tự động theo cron.
- Hoặc đơn giản hơn: thêm cron riêng cho `scan-btc-transactions` trong `supabase/config.toml`.

### 3. Tích hợp BTC scan vào `scan-my-incoming` edge function
**File:** `supabase/functions/scan-my-incoming/index.ts`
- Thêm logic quét BTC (tương tự `scan-btc-transactions`) trực tiếp vào function này.
- Hoặc gọi `scan-btc-transactions` qua internal HTTP call sau khi hoàn tất EVM scan.

### 4. Đảm bảo trang `/donations` hiển thị BTC từ ví ngoài
- `SystemDonationHistory` đã hiển thị badge "Ví ngoài" cho `is_external` — `scan-btc-transactions` đã set `is_external: false` cho giao dịch giữa users Fun.Rich. Cần bổ sung trường hợp ví ngoài (sender không thuộc hệ thống) với `is_external: true`.

### 5. Sửa `scan-btc-transactions` để xử lý ví ngoài
**File:** `supabase/functions/scan-btc-transactions/index.ts`
- Hiện tại chỉ tạo `donations` khi **cả sender và recipient đều là user Fun.Rich** (`isRecognizedByFun`).
- Bổ sung: khi sender không phải user Fun.Rich nhưng recipient là user, vẫn tạo `donations` với `is_external: true`, `sender_id: null`, `sender_address: senderAddr`.

## Chi tiết kỹ thuật

### `scan-btc-transactions/index.ts` — Thêm external donations
```typescript
// Sau block isRecognizedByFun, thêm:
if (!isRecognizedByFun && isRecipient && recipientProfile) {
  donationsToInsert.push({
    sender_id: senderProfile?.id || null,
    sender_address: senderAddr,
    recipient_id: recipientProfile.id,
    amount,
    token_symbol: "BTC",
    chain_id: BTC_CHAIN_ID,
    chain_family: "bitcoin",
    tx_hash: tx.txid,
    status: "confirmed",
    is_external: true,
    // ... các trường khác
  });
}
```

### `useScanIncoming.ts` — Gọi thêm BTC scan
```typescript
// Sau scan-my-incoming, thêm:
const { data: btcData } = await supabase.functions.invoke('scan-btc-transactions');
const btcResult = btcData as { newTransfers: number };
const totalNew = (result.newTransfers || 0) + (btcResult?.newTransfers || 0);
```

### `scan-my-incoming/index.ts` — Gọi scan-btc-transactions cuối hàm
```typescript
// Cuối function, gọi internal:
try {
  const btcRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/scan-btc-transactions`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({}),
  });
  const btcData = await btcRes.json();
  totalNewTransfers += btcData.newTransfers || 0;
} catch (e) { console.error("BTC scan piggyback error:", e); }
```

## Kết quả mong đợi
- Giao dịch BTC từ ví ngoài sẽ tự động được ghi nhận vào DB khi quét.
- Trang `/donations` và HistoryTab hiển thị đầy đủ BTC (cả ví ngoài lẫn nội bộ).
- Đồng bộ trên cả máy tính và điện thoại (vì dữ liệu lưu trong DB, không phụ thuộc Mempool API realtime).
- Badge "Ví ngoài" hiển thị cho giao dịch BTC từ ví không thuộc hệ thống.

