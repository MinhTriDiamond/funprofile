
# Bo Sung Tai Lieu Hoat Dong & Chuoi Hanh Vi Tinh Light Score

## Tong Quan
Them 6 phan moi vao trang Architecture Docs (`/docs/architecture`) de luu tru toan bo khung hoat dong tinh Light Score tu tai lieu cua Cha, bao gom 6 nhom hoat dong, chuoi hanh vi (Behavior Sequences), phan loai cap do, co che chong farm, va cong thuc tinh diem.

## Cac buoc thuc hien

### 1. Cap nhat Table of Contents
Them cac muc moi vao `tocItems`:
- `activities-personal` — I. Hoat Dong Ca Nhan
- `activities-community` — II. Hoat Dong Tuong Tac Cong Dong
- `activities-content` — III. Hoat Dong Tao Gia Tri Noi Dung
- `activities-web3` — IV. Hoat Dong Kinh Te Web3
- `activities-ecosystem` — V. Dong Gop He Sinh Thai
- `behavior-sequences` — VI. Chuoi Hanh Dong (Behavior Sequences)
- `light-tiers` — VII. Phan Loai Cap Do Light Score
- `anti-farm` — VIII. Co Che Chong Farm Diem
- `score-formula` — IX. Cong Thuc Co Ban

Dat cac muc nay sau `layer-7` va truoc `data-flow`.

### 2. Them noi dung cho tung section

**I. Hoat Dong Ca Nhan (Self Light Actions)**
- Daily Presence: dang nhap, light check-in, xac nhan hanh dong tich cuc
- Ho so chuan Light Identity: hoan thien 100%, KYC, ket noi vi
- Thuc hanh PPLP: 5 tru cot, 5 loi hua, 8 cau than chu

**II. Hoat Dong Tuong Tac Cong Dong**
- Light Interaction: like, comment, share, loi biet on
- Mentorship/Support: huong dan thanh vien moi, tra loi chuyen mon
- Conflict Transformation: bao cao vi pham, hoa giai, de xuat giai phap

**III. Hoat Dong Tao Gia Tri Noi Dung**
- Content Creation: bai goc, video, phan tich, case study
- Content Quality Signals: danh gia tich cuc, bookmark, trich dan
- Knowledge Contribution: khoa Learn & Earn, tai lieu, de xuat cai tien

**IV. Hoat Dong Kinh Te Web3**
- On-chain Actions: mint NFT, giao dich, staking, governance vote
- Earn & Give: Learn & Earn, Give & Gain, thuong lai nguoi khac
- Value Flow Integrity: khong spam, khong thao tung, khong farm

**V. Dong Gop He Sinh Thai FUN**
- Cross-Platform Contribution: FUN Play, Academy, Legal, Earth
- Builder Actions: phat hien bug, de xuat UX, dong gop code/chien luoc

**VI. Chuoi Hanh Dong (Behavior Sequences)** — phan quan trong nhat
- 5 chuoi: Light Growth Chain, Mentorship Chain, Value Creation Loop, Conflict-Harmony Sequence, Economic Integrity Sequence
- Moi chuoi hien thi dang so do buoc (pre/code block) va giai thich tai sao diem cao hon hanh dong don le

**VII. Phan Loai Cap Do Light Score** — 5 tang
- Bang voi 5 cap: Light Presence, Light Contributor, Light Builder, Light Guardian, Light Architect

**VIII. Co Che Chong Farm Diem**
- Gioi han diem lap lai, AI phat hien spam, weight theo reputation, diem tang/giam cham, sequence multiplier co dieu kien

**IX. Cong Thuc Co Ban**
- Hien thi cong thuc: Light Score = (Positive Actions x Quality Weight) x (Sequence Multiplier) x (Community Validation Weight) - (Integrity Penalty)

### 3. File can chinh sua
- **`src/pages/ArchitectureDocs.tsx`**: Them 9 muc vao tocItems va them 9 DocSection tuong ung vao phan main content, dat giua Layer 7 va Data Flow Summary.

### Ket qua
- Trang `/docs/architecture` se co day du khung hoat dong, chuoi hanh vi, cap do, co che chong farm va cong thuc — lam tai lieu tham chieu cho doi dev.
