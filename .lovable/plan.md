

# Them Nut Khoi Phuc (Reset) Cho Cac Trang Thai PPLP

## Van De
Hien tai nut "Thu lai" (reset ve cho ky) chi hien thi o tab "That bai". Admin khong the khoi phuc cac request dang o trang thai "Dang ky", "Da ky", hoac "Tu choi" ve lai "Cho ky".

## Giai Phap
Mo rong nut Reset de hien thi o cac tab: **signing**, **signed**, **submitted**, **rejected**, va **failed**.

## Chi tiet ky thuat

### File 1: `src/components/admin/PplpMintTab.tsx`
- Sua bien `showReset` tu chi cho `failed` thanh cho ca `signing`, `signed`, `submitted`, `rejected`, `failed`
- Doi nhan nut tuy theo trang thai: "Thu lai" (failed) vs "Ve cho ky" (cac trang thai khac)
- Them xac nhan (confirm dialog) truoc khi reset de tranh nham

### File 2: `src/hooks/usePplpAdmin.ts`
- Khong can thay doi logic `resetToPending` vi ham nay da reset day du (xoa signature, tx_hash, multisig_signatures...)
- Ham hien tai da hoat dong dung cho moi trang thai

### Ket qua
- Tab "Dang ky": Co nut "Ve cho ky" de xoa chu ky chua hoan tat
- Tab "Da ky": Co nut "Ve cho ky" de reset 3 chu ky va ky lai
- Tab "Da gui": Co nut "Ve cho ky" de thu lai giao dich on-chain
- Tab "Tu choi": Co nut "Ve cho ky" de khoi phuc request bi tu choi
- Tab "That bai": Giu nguyen nut "Thu lai" nhu hien tai

