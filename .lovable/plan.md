

# Rà soát & chặn toàn bộ user bị ban — Kết quả kiểm tra

## Tình trạng hiện tại

### Đã có kiểm tra `is_banned` (9 functions)
| Function | Trạng thái |
|---|---|
| `claim-reward` | ✅ Đã có |
| `create-post` | ✅ Đã có |
| `record-donation` | ✅ Đã có |
| `connect-external-wallet` | ✅ Đã có |
| `mint-soul-nft` | ✅ Đã có |
| `pplp-submit-action` | ✅ Đã có |
| `pplp-score-action` | ✅ Đã có |
| `pplp-evaluate` | ✅ Đã có |
| `live-token` | ✅ Đã có |
| `manual-create-donation` | ✅ Đã có |
| `log-login-ip` | ✅ Đã có |

### THIẾU kiểm tra `is_banned` — 13 functions có xác thực user

| Function | Chức năng | Mức độ rủi ro |
|---|---|---|
| **`disconnect-external-wallet`** | Ngắt ví ngoài | Cao — thao tác ví |
| **`angel-chat`** | Chat AI | Trung bình — dùng tài nguyên AI |
| **`angel-inline`** | AI inline | Trung bình — dùng tài nguyên AI |
| **`upload-to-r2`** | Upload file R2 | Cao — upload nội dung |
| **`upload-to-cf-images`** | Upload ảnh CF | Cao — upload nội dung |
| **`get-upload-url`** | Lấy URL upload | Cao — chuẩn bị upload |
| **`multipart-upload`** | Upload video lớn | Cao — upload nội dung |
| **`r2-signed-chunk-url`** | Chunk upload URL | Cao — upload nội dung |
| **`recording-finalize`** | Hoàn tất ghi hình | Trung bình |
| **`live-recording-status`** | Trạng thái ghi hình | Thấp — chỉ đọc |
| **`analyze-reel`** | Phân tích reel | Trung bình |
| **`cleanup-supabase-storage`** | Dọn storage | Thấp |
| **`notify-gift-ready`** | Gửi thông báo quà | Thấp |

Ngoài ra, các SSO functions (`sso-token`, `sso-authorize`, `sso-register`, `sso-sync-data`, `sso-web3-auth`) cũng thiếu nhưng không cần chặn vì chúng phục vụ cross-platform auth — hệ thống đã cưỡng chế đăng xuất khi bị ban.

## Kế hoạch

### Thêm kiểm tra `is_banned` vào 13 Edge Functions

Thêm đoạn code chuẩn sau khi xác thực user:
```typescript
const { data: banCheck } = await supabaseAdmin
  .from('profiles').select('is_banned').eq('id', user.id).single();
if (banCheck?.is_banned) {
  return new Response(
    JSON.stringify({ error: 'Tài khoản đã bị cấm vĩnh viễn.' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### Files sửa (13 files)
- `supabase/functions/disconnect-external-wallet/index.ts`
- `supabase/functions/angel-chat/index.ts`
- `supabase/functions/angel-inline/index.ts`
- `supabase/functions/upload-to-r2/index.ts`
- `supabase/functions/upload-to-cf-images/index.ts`
- `supabase/functions/get-upload-url/index.ts`
- `supabase/functions/multipart-upload/index.ts`
- `supabase/functions/r2-signed-chunk-url/index.ts`
- `supabase/functions/recording-finalize/index.ts`
- `supabase/functions/live-recording-status/index.ts`
- `supabase/functions/analyze-reel/index.ts`
- `supabase/functions/cleanup-supabase-storage/index.ts`
- `supabase/functions/notify-gift-ready/index.ts`

### Ghi chú
- Số liệu kiểm toán (profiles, reward_claims, audit_logs, donations, posts...) được **giữ nguyên** — chỉ chặn tương tác mới
- Không thay đổi database schema, chỉ sửa code Edge Functions

