

# Cập nhật hệ thống Mint FUN theo đúng cơ chế

## Vấn đề phát hiện

1. **Mint Pool sai giá trị mặc định**: Hiện tại là 100,000 FUN, cần đổi thành 5,000,000 FUN
2. **Không lọc user bị banned/fraud**: Epoch snapshot lấy tất cả user có light actions mà không kiểm tra `profiles.is_banned`

## Giải pháp

### File 1: `supabase/functions/pplp-epoch-snapshot/index.ts`

**Thay đổi 1** - Đổi DEFAULT_MINT_POOL:
```
const DEFAULT_MINT_POOL = 5000000; // 5M FUN
```

**Thay đổi 2** - Lọc user bị banned:
Sau khi tổng hợp `allScores` (sau dòng 95), thêm bước lọc:
- Lấy danh sách tất cả user_id từ allScores
- Query `profiles` để kiểm tra `is_banned = true`
- Loại bỏ user bị banned khỏi allScores trước khi tính allocation
- Thêm các user bị banned vào danh sách ineligible với reason_code `FRAUD_BANNED`

### File 2: `src/components/admin/PplpMintTab.tsx`

**Thay đổi** - Đổi giá trị mặc định mintPool trên UI:
```
const [mintPool, setMintPool] = useState(5000000);
```

### Tóm tắt sau khi sửa

| Quy tắc | Trạng thái |
|---------|-----------|
| Pool = 5M FUN | Sửa (100K -> 5M) |
| FUN = Pool x (LS/Total LS) | Da dung |
| Anti-whale 3% = 150K | Da dung (cap tu dong theo pool) |
| LS >= 10 | Da dung |
| PPLP approved | Da dung |
| Khong fraud | Them moi (loc is_banned) |

