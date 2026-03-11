

## Chuyển đổi Anti-Farm: Từ phát hiện đăng ký → phát hiện hành vi Claim

### Vấn đề hiện tại

Hệ thống đang tự động đình chỉ (`on_hold`) và thậm chí cấm (`banned`) tài khoản dựa trên:
- Cùng IP đăng nhập (`log-login-ip` + `daily-fraud-scan`)
- Cùng device hash (`log-login-ip` line 192: auto-ban, line 212: auto-hold)
- Cụm email giống nhau (`log-login-ip` + `daily-fraud-scan`)

Điều này gây false positive lớn khi nhiều người đăng ký cùng lúc tại sự kiện cộng đồng.

### Nguyên tắc mới

**Đăng ký/đăng nhập** → Chỉ ghi log cảnh báo, KHÔNG tự động đình chỉ
**Claim** → Phát hiện và đình chỉ khi có hành vi farm claim đồng bộ

---

### Thay đổi — 3 files

#### 1. `supabase/functions/log-login-ip/index.ts`

**Bỏ toàn bộ auto-hold/auto-ban trong `handleDeviceFingerprint`:**
- Line 189-201: Bỏ auto-ban `RAPID_REGISTRATION` (>3 TK/24h cùng device). Chuyển thành chỉ ghi fraud signal severity 3 + thông báo admin
- Line 202-215: Bỏ auto-hold cho shared device. Chỉ ghi fraud signal + flag device registry
- Giữ nguyên: flag device registry, ghi fraud signal, thông báo admin (chỉ cảnh báo, không đình chỉ)

**Bỏ auto-hold trong `detectEmailFarm`:**
- Hiện tại chỉ ghi signal + thông báo admin (không hold) → giữ nguyên

**Giữ nguyên:** `handleBlacklistedIp` (IP bị blacklist thủ công vẫn hold — đây là quyết định admin)

#### 2. `supabase/functions/daily-fraud-scan/index.ts`

**Bỏ toàn bộ `autoHoldUsers` calls:**
- Section 1 (shared device, line 151-155): Bỏ auto-hold → chỉ ghi signal
- Section 2 (email farm, line 212-215): Bỏ auto-hold → chỉ ghi signal
- Section 3 IP clusters:
  - IP_DEVICE_CLUSTER (line 300-304): Bỏ auto-hold → chỉ ghi signal
  - IP_SPAM_CLUSTER (line 359-362): Bỏ auto-hold → chỉ ghi signal
  - IP_CLUSTER (đã không hold) → giữ nguyên

**Thêm Section mới: Claim Farm Detection**
Phát hiện farm dựa trên hành vi claim trong `pending_claims` + `reward_claims`:
- Query claims trong 1 giờ gần nhất, nhóm theo IP/device
- **Trigger khi TẤT CẢ điều kiện sau đều đúng:**
  - ≥5 tài khoản claim trong cùng 1 giờ
  - Từ cùng IP hoặc cùng device hash
  - ≥60% accounts claim số tiền tối đa (500k CAMLY)
  - Khoảng cách giữa các claim < 5 phút (đồng bộ bot-like)
- Khi phát hiện: auto-hold tất cả accounts trong cluster + ghi signal `CLAIM_FARM` severity 5

#### 3. `supabase/functions/claim-reward/index.ts`

**Sửa Section 7f (line 265-371) — Auto fraud detection tại claim time:**
- **Bỏ** auto-hold dựa trên shared device (line 323-327) và hold related users (line 332-337)
- **Giữ** duplicate avatar check và duplicate wallet check → nhưng chỉ ghi warning signal, KHÔNG hold
- **Thêm** claim synchronization check:
  - Query claims từ cùng IP trong 30 phút gần nhất
  - Nếu ≥3 accounts claim từ cùng IP trong 30 phút → hold + signal `CLAIM_SYNC_SUSPICIOUS`

### Tóm tắt

```text
TRƯỚC:                              SAU:
─────────────────────────           ─────────────────────────
Đăng ký cùng IP → HOLD             Đăng ký cùng IP → LOG ONLY
Cùng device → HOLD/BAN             Cùng device → LOG ONLY  
Email giống → HOLD                  Email giống → LOG ONLY
Cùng IP login → HOLD               Cùng IP login → LOG ONLY
                                    
                                    ≥5 TK claim cùng lúc → HOLD
                                    Claim max đồng bộ → HOLD
                                    Bot-like claim timing → HOLD
```

Người dùng tại sự kiện cộng đồng có thể đăng ký, đăng nhập, kết nối ví tự do. Hệ thống chỉ can thiệp khi phát hiện hành vi claim bất thường.

