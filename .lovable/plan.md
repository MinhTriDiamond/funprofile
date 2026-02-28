

# Bo Sung Tai Lieu PPLP Mint Flow, DB Logic & AI Scoring Architecture

## Tong Quan
Them 3 phan tai lieu lon moi vao trang `/docs/architecture`, bo sung co che tinh thuong & mint FUN Money, thiet ke logic DB (event-based scoring model), va so do kien truc AI cham Light Score.

## Cac buoc thuc hien

### 1. Tao component moi: `src/components/docs/PplpMintAndDbDocs.tsx`
Tach noi dung moi thanh component rieng (giong LightScoreActivities) de giu ArchitectureDocs.tsx gon gang. Component nay chua 3 phan chinh:

**Phan A: Co che tinh thuong & Mint FUN Money (PPLP Bonus)**
- Phan biet 3 lop: Light Score / Mint Eligibility / FUN Money Mint Flow
- Cong thuc PPLP Score hoan chinh voi 4 lop nhan: Reputation Weight, Consistency Multiplier, Sequence Multiplier, Integrity Penalty
- Co che Mint theo chu ky (epoch-based) voi FUN Mint Formula
- Phan biet Light Score vs FUN Money (tranh nuoi Ego)
- 3 lop bao ve chong Ego: khong leaderboard canh tranh, khong hien diem chi tiet, mint khong tuc thi
- Ket noi FUN Money & Camly Coin (Mat Troi vs Dong Nuoc)
- 8 Cau Than Chu Thieng Lieng

**Phan B: Thiet ke Logic DB (Event-based Scoring Model)**
- Nguyen tac thiet ke: event-sourcing, pipeline, audit-first, privacy/anti-ego
- 11 bang/collection loi: users, profiles, content, events (trai tim), pplp_ratings, signals_anti_farm, features_user_day, light_score_ledger, score_explanations, mint_epochs, mint_allocations
- Bang sequences cho Sequence Engine
- Luong xu ly pipeline 6 buoc: Ingest -> Validate -> Feature -> Score -> Mint -> On-chain

**Phan C: Kien truc AI cham Light Score**
- So do tong quan: Client -> Event API -> Event Store -> 4 dich vu chinh
- 4 services: Policy & Integrity, Content & Pillar Analyzer (AI), Reputation & Weight, Scoring Engine (Deterministic)
- Diem mau chot "Khong nuoi Ego" trong kien truc
- 4 AI models/heuristics: Ego Risk Classifier, Pillar Support Scorer, Spam Detector, Sybil Signals
- Event schema chuan cho dev implement

### 2. Cap nhat `src/pages/ArchitectureDocs.tsx`
- Them 6 muc moi vao `tocItems` (dat sau `score-formula`, truoc `data-flow`):
  - `pplp-mint-mechanism` — Co Che Tinh Thuong & Mint
  - `pplp-ego-protection` — Bao Ve Chong Ego
  - `pplp-mantras` — 8 Than Chu Thieng Lieng
  - `db-logic-design` — Thiet Ke Logic DB
  - `db-pipeline` — Pipeline Xu Ly Diem
  - `ai-scoring-arch` — Kien Truc AI Cham Diem
- Import va render `PplpMintAndDbDocs` component giua LightScoreActivities va Data Flow Summary

### 3. Files can chinh sua
- `src/components/docs/PplpMintAndDbDocs.tsx` (tao moi)
- `src/pages/ArchitectureDocs.tsx` (them tocItems + import component)

## Ket qua
- Trang `/docs/architecture` se co day du: 7 layers + hoat dong + chuoi hanh vi + co che mint + DB design + AI architecture — tao thanh tai lieu ky thuat toan dien cho doi dev FUN Profile.
