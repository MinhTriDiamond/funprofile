
# Dong bo trang thai banned voi danh sach cho mint FUN

## Van de
Khi admin ban user qua `ban_user_permanently`, cac mint request dang cho (pending_sig, signing) cua user do van ton tai trong danh sach. Admin phai tu tay tu choi tung request — de sot va gay nhap nhan.

## Giai phap 2 lop

### 1. Backend: Cap nhat ham `ban_user_permanently` (Database migration)
Them logic tu dong reject tat ca mint request dang cho cua user khi ban:

```sql
-- Reject pending mint requests
UPDATE pplp_mint_requests
SET status = 'rejected',
    error_message = 'User banned: ' || p_reason,
    reviewed_by = p_admin_id,
    reviewed_at = now()
WHERE user_id = p_user_id
  AND status IN ('pending', 'pending_sig', 'signing');
```

Dieu nay dam bao: bat ky user nao bi ban tu bat ky dau (UserReviewTab, WalletAbuseTab, Users page, QuickDeleteTab...) deu tu dong xoa khoi hang doi mint.

### 2. Frontend: Loc banned users khoi danh sach mint (`usePplpAdmin.ts`)
Cap nhat `fetchMintRequests` de:
- Fetch them truong `is_banned` tu profiles
- Loc bo cac request cua user bi banned khoi danh sach hien thi
- Hoac hien thi voi badge canh bao "Da cam" de admin biet

Cu the: khi fetch profiles, them truong `is_banned`:
```typescript
.select('id, username, avatar_url, is_banned')
```
Sau do loc:
```typescript
const enrichedRequests = (requests || [])
  .filter(req => {
    const profile = profileMap.get(req.user_id);
    return !profile?.is_banned;
  })
  .map(...)
```

## Chi tiet ky thuat

### File thay doi:
1. **Database migration** — Cap nhat ham `ban_user_permanently` them 1 lenh UPDATE reject mint requests
2. **`src/hooks/usePplpAdmin.ts`** (dong 154-166) — Fetch `is_banned`, loc banned users khoi danh sach mint

### Tac dong:
- Cac user da bi ban truoc do: mint requests se bi an khoi danh sach (frontend filter)
- Cac user bi ban tu bay gio: mint requests se bi reject tu dong (backend)
- Khong anh huong den cac request da confirmed/minted
