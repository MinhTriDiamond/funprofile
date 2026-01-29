
# Kế Hoạch Bổ Sung Tính Năng Trả Thưởng Tự Động CAMLY

## Mục Tiêu

1. **Đồng bộ công thức tính thưởng** - sử dụng đúng công thức từ RPC `get_user_rewards_v2`
2. **Hiển thị chi tiết công thức** - cho user biết cách tính thưởng
3. **Cho phép user tự claim** - khi đã được Admin duyệt

## Phân Tích Vấn Đề

### Công thức ĐÚNG (từ hình ảnh và RPC `get_user_rewards_v2`):

| Hành động | Thưởng mỗi lần | Giới hạn/ngày | Thưởng tối đa/ngày |
|-----------|----------------|---------------|-------------------|
| Đăng ký mới | 50,000 CAMLY | 1 lần duy nhất | 50,000 CAMLY |
| Đăng bài | 10,000 CAMLY | 10 bài | 100,000 CAMLY |
| Nhận Reaction | 1,000 CAMLY | 50 reactions | 50,000 CAMLY |
| Nhận Comment (>20 ký tự) | 2,000 CAMLY | 50 comments | 100,000 CAMLY |
| Được Share bài | 10,000 CAMLY | 5 shares | 50,000 CAMLY |
| Kết bạn | 10,000 CAMLY | 10 bạn | 100,000 CAMLY |
| Livestream (10-120 phút) | 20,000 CAMLY | 5 sessions | 100,000 CAMLY |

**Tổng thưởng tối đa/ngày: 500,000 CAMLY**

### Vấn đề cần sửa:

**File `WalletCenterContainer.tsx` (dòng 176-224)** đang dùng công thức CŨ:
```typescript
// CÔNG THỨC CŨ (SAI)
const postsReward = postsCount * 20000;  // Sai: 20k thay vì 10k
let reactionsReward = 0;
if (reactionsOnPosts >= 3) {
  reactionsReward = 30000 + (reactionsOnPosts - 3) * 1000; // Logic khác
}
const commentsReward = commentsOnPosts * 5000; // Sai: 5k thay vì 2k
const sharesReward = sharesCount * 5000;       // Sai: 5k thay vì 10k
const friendsReward = (friendsCount || 0) * 10000 + 10000;
```

## Chi Tiết Thay Đổi

### 1. Sửa `WalletCenterContainer.tsx` - Sử dụng RPC thay vì tính thủ công

**Thay đổi hàm `fetchClaimableReward()`:**

```typescript
// TRƯỚC (dòng 176-224) - Tính thủ công
const fetchClaimableReward = async () => {
  // ... logic tính thủ công (SAI)
};

// SAU - Gọi RPC get_user_rewards_v2
const fetchClaimableReward = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  const userId = session.user.id;

  // Gọi RPC để lấy reward đã tính đúng công thức
  const { data: rewardsData } = await supabase.rpc('get_user_rewards_v2', {
    limit_count: 10000
  });

  const userData = rewardsData?.find((u: any) => u.id === userId);
  const totalReward = Number(userData?.total_reward) || 0;

  // Lấy số đã claimed
  const { data: claims } = await supabase
    .from('reward_claims')
    .select('amount')
    .eq('user_id', userId);
    
  const claimedAmount = claims?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
  setClaimableReward(Math.max(0, totalReward - claimedAmount));
};
```

### 2. Thêm Component Hiển Thị Công Thức Tính Thưởng

Tạo file mới `src/components/wallet/RewardFormulaCard.tsx`:

```typescript
// Component hiển thị công thức tính thưởng CAMLY
export const RewardFormulaCard = ({ userStats }) => {
  // Hiển thị bảng công thức giống hình user gửi
  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-amber-50">
      <CardHeader>
        <CardTitle>🏆 Công Thức Tính Thưởng CAMLY</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          {/* Bảng công thức như hình */}
        </Table>
      </CardContent>
    </Card>
  );
};
```

### 3. Cập nhật giao diện Wallet hiển thị chi tiết thưởng

Thêm vào `WalletCenterContainer.tsx`:
- State mới để lưu chi tiết thưởng (posts_count, reactions, etc.)
- Component hiển thị breakdown: "Đăng bài: 5 × 10,000 = 50,000 CAMLY"

### 4. Cập nhật Edge Function `claim-reward` - Đã OK

Edge function đã sửa `MINIMUM_CLAIM = 1` ✅

## Files Cần Sửa

| File | Action | Mô tả |
|------|--------|-------|
| `src/components/wallet/WalletCenterContainer.tsx` | UPDATE | Sửa `fetchClaimableReward()` dùng RPC |
| `src/components/wallet/RewardFormulaCard.tsx` | CREATE | Component hiển thị công thức |
| `src/components/wallet/RewardBreakdown.tsx` | CREATE | Component hiển thị chi tiết thưởng user |

## Flow Trả Thưởng Hoàn Chỉnh

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    FLOW TRẢ THƯỞNG CAMLY                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User hoạt động                                                  │
│     ├── Đăng bài → +10,000 CAMLY                                   │
│     ├── Nhận reaction → +1,000 CAMLY                               │
│     ├── Nhận comment (>20 chars) → +2,000 CAMLY                    │
│     ├── Được share → +10,000 CAMLY                                 │
│     ├── Kết bạn → +10,000 CAMLY                                    │
│     └── Livestream → +20,000 CAMLY                                 │
│                                                                     │
│  2. Hệ thống tính toán (RPC get_user_rewards_v2)                   │
│     ├── Áp dụng daily limits                                       │
│     ├── Tính total_reward                                          │
│     └── Hiển thị trên /wallet                                      │
│                                                                     │
│  3. Admin duyệt (/admin → Duyệt thưởng)                            │
│     ├── Xem danh sách users có claimable > 0                       │
│     ├── Click "Duyệt" → reward_status = 'approved'                 │
│     └── Hoặc "Từ chối" với lý do                                   │
│                                                                     │
│  4. User tự Claim (/wallet)                                        │
│     ├── Nhấn "Claim to Wallet"                                     │
│     ├── Nhập số lượng (tối thiểu 1 CAMLY)                          │
│     ├── Edge function chuyển CAMLY → ví external                   │
│     └── Ghi nhận vào reward_claims                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Giao Diện Wallet Mới

```text
┌──────────────────────────────────────────────────────────────────────┐
│                           My Wallet                                   │
│                        BNB Smart Chain                                │
├──────────────────────────────────────────────────────────────────────┤
│  External Wallet Card                                                 │
│  0xABC1...DEF4   [Copy] [Connect]                                    │
│  Total: $XXX.XX                                                       │
│  ── Tokens ──                                                         │
│  BNB    $XXX.XX    0.XXX                                              │
│  CAMLY  $XXX.XX    XXX                                                │
├──────────────────────────────────────────────────────────────────────┤
│  🎁 Claimable: 383,000 CAMLY (~$XX.XX)                               │
│  Trạng thái: Sẵn sàng Claim   [Claim to Wallet]                      │
├──────────────────────────────────────────────────────────────────────┤
│  📊 Chi Tiết Thưởng Của Bạn                                          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ 🎁 Bonus đăng ký              50,000 CAMLY                    │  │
│  │ 📝 Đăng bài       5 bài × 10,000    =    50,000 CAMLY         │  │
│  │ ❤️ Nhận reaction  10 × 1,000        =    10,000 CAMLY         │  │
│  │ 💬 Nhận comment   8 × 2,000         =    16,000 CAMLY         │  │
│  │ 🔄 Được share     2 × 10,000        =    20,000 CAMLY         │  │
│  │ 👥 Kết bạn        8 × 10,000        =    80,000 CAMLY         │  │
│  │ 📺 Livestream     0 × 20,000        =         0 CAMLY         │  │
│  │ ─────────────────────────────────────────────────────────────│  │
│  │ 💰 TỔNG THƯỞNG:                         226,000 CAMLY         │  │
│  │ ✅ Đã claim:                            -43,000 CAMLY         │  │
│  │ ⏳ Còn claim được:                       183,000 CAMLY         │  │
│  └────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│  📋 Công Thức Tính Thưởng (Thu gọn/Mở rộng)                          │
│  [Xem chi tiết] ↓                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

## Tóm Tắt

1. **Sửa công thức** - WalletCenterContainer sử dụng RPC `get_user_rewards_v2` thay vì tính thủ công
2. **Thêm hiển thị chi tiết** - User thấy breakdown từng loại thưởng
3. **Thêm hiển thị công thức** - User hiểu cách tính thưởng
4. **Flow hoàn chỉnh** - User hoạt động → Admin duyệt → User claim

## Lưu Ý Quan Trọng

- Admin vẫn cần duyệt (reward_status = 'approved') trước khi user claim
- Mỗi lần claim tốn gas fee BSC (~$0.01-0.05)
- Daily limits được áp dụng từ ngày 2025-01-15 trở đi
- Dữ liệu trước 2025-01-15 không bị giới hạn
