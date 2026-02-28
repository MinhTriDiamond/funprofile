

# Bo Sung Scoring Versioning, API Endpoints & Reason Codes vao Architecture Docs

## Tong Quan
Them 3 phan tai lieu ky thuat moi vao trang `/docs/architecture`, bao gom: Scoring Rule Versioning, API Endpoints chuan cho dev, va bo Reason Codes microcopy tich cuc.

## Cac buoc thuc hien

### 1. Tao component moi: `src/components/docs/ScoringApiAndVersioningDocs.tsx`
Component chua 3 phan chinh:

**Phan A: Scoring Rule Versioning (v1, v2...)**
- Bang version history: version, ngay ap dung, thay doi chinh
- Co che migration an toan: dual-write (chay song song v_old va v_new), so sanh ket qua, chi chuyen khi delta < nguong
- Rollback strategy: giu scoring model version trong light_score_ledger de co the tinh lai
- Schema: bang `scoring_rule_versions` (version_id, formula_config_json, activated_at, status)

**Phan B: API Endpoints chuan cho Dev**
- `POST /functions/v1/pplp-submit-action` — Event Ingest (da co san)
- `POST /functions/v1/pplp-score-action` — Score Action (da co san)
- `POST /functions/v1/pplp-rating-submit` — Rating Submit (5 tru cot, 0-2)
- `GET /functions/v1/pplp-score-read` — Doc Light Score cua user
- `GET /functions/v1/pplp-mint-status` — Trang thai mint epoch hien tai
- Moi endpoint co bang: Method, Path, Auth, Request Body, Response, Error Codes

**Phan C: Reason Codes Microcopy**
- Bang reason codes voi ngon ngu tich cuc, khong phan xet:
  - `QUALITY_HIGH` → "Noi dung cua ban duoc cong dong danh gia cao"
  - `SEQUENCE_COMPLETE` → "Ban da hoan thanh chuoi hanh dong tich cuc"
  - `CONSISTENCY_BONUS` → "Nhip dong gop deu dan cua ban duoc ghi nhan"
  - `INTEGRITY_ADJUSTMENT` → "He thong dang can bang nang luong de bao ve cong dong"
  - `MENTOR_IMPACT` → "Nguoi ban huong dan da tao ra gia tri"
  - Va 10+ reason codes khac
- Nguyen tac viet microcopy: khong dung tu "phat", "tru diem", "vi pham" — thay bang "can bang", "dieu chinh", "bao ve"

### 2. Cap nhat `src/pages/ArchitectureDocs.tsx`
- Them 3 muc moi vao `tocItems` (dat sau `ai-scoring-arch`, truoc `data-flow`):
  - `scoring-versioning` — Scoring Rule Versioning
  - `api-endpoints` — API Endpoints
  - `reason-codes` — Reason Codes Microcopy
- Import va render `ScoringApiAndVersioningDocs` component

### 3. Files can chinh sua
- `src/components/docs/ScoringApiAndVersioningDocs.tsx` (tao moi)
- `src/pages/ArchitectureDocs.tsx` (them tocItems + import)

## Ket qua
Trang `/docs/architecture` se co them 3 phan ky thuat quan trong, giup doi dev co the: (1) quan ly version cong thuc tinh diem an toan, (2) implement API theo chuan, (3) hien thi thong bao bang ngon ngu tich cuc dung tinh than PPLP.
