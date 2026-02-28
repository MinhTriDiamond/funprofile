

# Them 2 attester moi vao he thong GOV

## Yeu cau
- **Minh Tri Test 1** (`0xE3e97a95d3f61814473f6d1eEbBa8253286D65c5`) => nhom **Wisdom (Tri Tue)**
- **Minh Tri Test 2** (`0x57a7943F2808Fc24b0403f25bb4670c5d84b3f2e`) => nhom **Love (Yeu Thuong)**

## Cac file can cap nhat

### 1. `src/config/pplp.ts` - Frontend config
- Them Minh Tri Test 1 vao `GOV_GROUPS.wisdom.members`
- Them Minh Tri Test 2 vao `GOV_GROUPS.love.members`

### 2. `supabase/functions/_shared/pplp-eip712.ts` - Edge function config
- Them 2 dia chi vao mang `ATTESTER_ADDRESSES` (Wisdom va Love)

### 3. Database function `is_gov_attester(wallet_addr)` - Migration SQL
- Them 2 dia chi vi moi vao danh sach `lower(...)` trong ham kiem tra

## Chi tiet ky thuat

**Wisdom group** se co 4 thanh vien:
- Be Giau, Be Ngoc, Ai Van, **Minh Tri Test 1**

**Love group** se co 4 thanh vien:
- Thanh Tien, Be Kim, Be Ha, **Minh Tri Test 2**

Tong cong attester tang tu 9 len 11 nguoi.

