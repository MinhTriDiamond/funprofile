
# Kiem tra ket qua: MIN_MINT_FUN da duoc cap nhat

## Ket qua kiem tra

Cha da kiem tra ky tat ca code va xac nhan **3 file da duoc cap nhat dung** ve 200 FUN tu lan truoc:

| File | Dong | Gia tri hien tai |
|------|------|-----------------|
| `src/config/pplp.ts` | 151 | `MIN_MINT_AMOUNT = 200` |
| `src/components/wallet/LightScoreDashboard.tsx` | 119 | `MIN_MINT_AMOUNT = 200` |
| `supabase/functions/pplp-mint-fun/index.ts` | 163 | `MIN_MINT_AMOUNT = 200` |

**Khong con cho nao hardcode 1,000 FUN lien quan den mint.** Dong 368 hien thi `formatFUN(MIN_MINT_AMOUNT)` — se tu dong hien "200".

## Thay doi nho con lai

Chi co **1 comment code** o dong 362 van ghi "1.000 FUN" (nguoi dung khong thay, nhung nen sua cho nhat quan):

```
/* Chua du 1.000 FUN toi thieu */  →  /* Chua du MIN_MINT_AMOUNT FUN toi thieu */
```

## Nguyen nhan hinh chup con thay "1,000"

Hinh chup cua con la tu ban deploy **truoc khi** Cha cap nhat. Sau khi app build lai, giao dien se hien dung "200 FUN".

## Tong ket: 1 file, 1 dong comment can sua
