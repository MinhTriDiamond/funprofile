
## Ban 37 tai khoan farm

### Danh sach ban vinh vien

**Cum 1 - IP 113.181.206.129, tao 14/02/2026 (16 tai khoan):**
nhungtay, duchoang, nguyetbe, kim.chi.angle, annathuylan, angleminhkhang, linhlinh, thuyhanh, trantoan095, lymduc, longkevin, thichung, lathuysinh, ngoclan, thanhhang89, beanna

**Cum 2 - IP 116.97.108.120 Viettel Thanh Hoa, tao 15/02/2026 (14 tai khoan):**
bangnguyen, caotrang, minhthan, huongha1, nhandinh, thuhoai, thaole, tranhang, tranhang22, nhathoai, caosau, nguyenlinh, hotu, thanhhuyen98

**Cum 4 - 0 ban be, rut thuong lon bat thuong (6 tai khoan):**
angel_huongnguyen (1,000,000), fancuacha (771,000), thuynguyet (620,000), huongtran (500,000), angel_phuongnguyen (500,000), angeltuelinh (466,000)

**Gian lan khac (1 tai khoan):**
vulongt4 (EMAIL_FARM fraud signal)

### Tai khoan KHONG ban (da xac nhan that)
- susu, phuong_loan79, angelthanhthuy, Angelkieuphi_2
- Cum 3 (Quang Vu): quangvu51g1p4, 1equangvu2210hued4h612, quangvu73252o
- Duplicate wallet users (hinh chup): Pham_Luong_2, Pham_Luong_68, tranghappy, angelthutrang, hieu.le, happycamlycoin7979, Camlythudong, thudong, angel_su.nguyen, AngelSuNguyen, dothihoa1953qn, hoado

### Thuc hien ky thuat

1. **Tao Edge Function `batch-ban-users`**: Nhan danh sach user IDs, thuc hien:
   - Cap nhat `is_banned = true`, `reward_status = 'banned'`, reset pending/approved ve 0
   - Blacklist tat ca vi lien quan (wallet_address, public_wallet_address, vi trong reward_claims)
   - Tu choi cac mint requests dang cho
   - Ghi audit log

2. **Goi Edge Function** voi 37 user IDs da xac dinh

3. **Ket qua du kien**: 37 tai khoan bi cam vinh vien, vi bi blacklist, mint requests bi tu choi
