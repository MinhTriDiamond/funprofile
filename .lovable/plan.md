
# Nang cap tab "Lam dung" trong Admin Dashboard

## Muc tieu
Cai thien tab "Lam dung" (WalletAbuseTab) de hien thi thong tin chi tiet hon cho Admin: IP dang nhap, thiet bi, danh sach nick dung chung, tong CAMLY cua tung nick, va them nut "Duyet lai" va "Xoa vinh vien".

## Thay doi chinh

### 1. Mo rong tab "Thiet bi" (Device) - Hien thi chi tiet
Hien tai tab "Thiet bi" chi hien device_hash va danh sach username. Se bo sung:
- **IP gan nhat** cua tung user (lay tu bang `login_ip_logs`)
- **Thong tin thiet bi** (user_agent tu `login_ip_logs`)
- **Tong CAMLY** (pending_reward + approved_reward) cua tung nick trong nhom
- **Tong CAMLY nhom** (tong tat ca nick dung chung thiet bi)
- **Trang thai** (on_hold, approved, pending) cua tung nick
- Hien thi so ngay tao tai khoan

### 2. Them 2 nut hanh dong moi cho tung user
- **"Duyet lai"** (nut xanh): Chuyen reward_status tu `on_hold` ve `approved`, cho phep user tiep tuc nhan thuong
- **"Xoa vinh vien"** (nut do): Goi `ban_user_permanently` va reset pending_reward ve 0

### 3. Them hanh dong nhom
- **"Duyet lai tat ca"**: Duyet lai toan bo nhom thiet bi
- **"Cam tat ca"**: Cam toan bo nhom (da co san)

### 4. Cai thien giao dien tat ca cac tab
- Hien thi tong CAMLY (pending + approved + claimed) ro rang hon
- Them cot "IP gan nhat" cho moi user trong tat ca tab

## Chi tiet ky thuat

### File can sua: `src/components/admin/WalletAbuseTab.tsx`

**Du lieu bo sung can fetch:**
- `login_ip_logs`: Lay IP va user_agent gan nhat cua tung user co trong nhom lam dung
- `reward_claims`: Lay tong CAMLY da claim cua tung user
- `profiles.reward_status`: De hien thi trang thai hien tai

**Logic "Duyet lai":**
```typescript
const handleReapprove = async (userId: string) => {
  await supabase
    .from('profiles')
    .update({ reward_status: 'approved' })
    .eq('id', userId);
  // Ghi audit log
  await supabase.from('audit_logs').insert({
    admin_id: adminId,
    target_user_id: userId,
    action: 'reapprove_reward',
    reason: 'Admin duyet lai tu tab Lam dung'
  });
};
```

**Logic "Xoa vinh vien":**
```typescript
const handlePermanentDelete = async (user: UserData) => {
  // Ban user
  await supabase.rpc('ban_user_permanently', {
    p_admin_id: adminId,
    p_user_id: user.id,
    p_reason: 'Xoa vinh vien - lam dung da tai khoan'
  });
  // Reset reward
  await supabase.from('profiles').update({
    pending_reward: 0,
    approved_reward: 0,
    reward_status: 'banned'
  }).eq('id', user.id);
};
```

**Giao dien moi cho moi user trong nhom:**
```text
+---------------------------------------------------+
| [Avatar] username          | IP: 192.168.x.x      |
|           Trang thai: on_hold                      |
|           CAMLY: 150,000 pending | 50,000 approved |
|           Thiet bi: Chrome/Android                 |
|           Tao ngay: 2025-01-15                     |
|                        [Duyet lai] [Xoa vinh vien] |
+---------------------------------------------------+
```

### Khong can thay doi database
Tat ca du lieu da co san trong cac bang hien tai (`login_ip_logs`, `pplp_device_registry`, `profiles`, `reward_claims`). Chi can fetch va hien thi.
