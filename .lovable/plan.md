

# Sửa lỗi "Admin only" trong migrate-stream-to-r2

## Nguyên nhân

Edge function `migrate-stream-to-r2` hardcode danh sách admin ID cũ (dòng 17):

```text
ADMIN_IDS = ['e7b21a96-bf54-4594-97a5-c581c4e504f0']
```

ID này không khớp với bất kỳ admin nào trong hệ thống hiện tại. Các admin thực tế:
- `5f9de7c5-...` (nguyenaivan10389)
- `a39d467c-...` (hoangtydo88)
- `ac174b69-...` (daothianhnguyet.pt)

## Giải pháp

### File: `supabase/functions/migrate-stream-to-r2/index.ts`

Thay thế kiểm tra hardcoded `ADMIN_IDS` bằng truy vấn bảng `user_roles` qua `supabaseAdmin`, giống cách các edge function khác trong hệ thống hoạt động.

**Xoa dong 17** (xoa bien `ADMIN_IDS`)

**Thay doi dong 44-49** -- thay the logic kiem tra admin:

Truoc:
```typescript
const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
if (userError || !user || !ADMIN_IDS.includes(user.id)) {
  return new Response(JSON.stringify({ error: 'Admin only' }), {
    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

Sau:
```typescript
const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
if (userError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Check admin role via user_roles table
const { data: roleData } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .eq('role', 'admin')
  .maybeSingle();

if (!roleData) {
  return new Response(JSON.stringify({ error: 'Admin only' }), {
    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

## Ket qua

- Moi admin trong bang `user_roles` deu co the su dung chuc nang migrate
- Khong can cap nhat code khi them/xoa admin
- Nhat quan voi cach kiem tra quyen trong toan he thong

