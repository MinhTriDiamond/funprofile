

# Bo Sung Scoring Config, End-to-End Example & Unit Test Cases

## Tong Quan
Them 3 phan tai lieu ky thuat moi vao trang `/docs/architecture`: Scoring Config chuan V1 (YAML/JSON), Vi du tinh diem End-to-End voi so cu the, va Unit Test Cases cho dev team.

## Cac buoc thuc hien

### 1. Tao component moi: `src/components/docs/ScoringConfigAndExampleDocs.tsx`

Component chua 5 phan chinh:

**Phan A: Scoring Config V1**
- Hien thi day du config YAML/JSON chuan voi cac tham so:
  - `weights`: base_action_weight (0.4), content_weight (0.6)
  - `reputation`: alpha (0.25), w_min (0.5), w_max (2.0)
  - `content`: gamma (1.3), type_multiplier cho post/comment/video/course/bug_report/proposal
  - `consistency`: beta (0.6), lambda (30)
  - `sequence`: eta (0.5), kappa (5)
  - `penalty`: theta (0.8), max_penalty (0.5)
  - `mint`: epoch_type (monthly), anti_whale_cap (0.03), min_light_threshold (10)

**Phan B: End-to-End Example**
- Mo phong thuc te cho user "u_ly" trong Epoch thang 02/2026 voi Mint Pool 100,000 FUN
- Tinh toan chi tiet tung buoc:
  1. Content Score: 3 bai post voi rating → cong thuc `h(P_c) = (P_c/10)^gamma`
  2. Base Action Score: checkin + mentor + comment = 10
  3. Raw Score: `L_raw = 0.4 x B + 0.6 x C = 5.398`
  4. Consistency Multiplier: streak 30 ngay → `M_cons = 1 + beta(1 - e^(-streak/lambda)) = 1.379`
  5. Sequence Multiplier: mentor chain → `M_seq = 1 + eta x tanh(bonus/kappa) = 1.268`
  6. Integrity Penalty: risk 0.1 → `1 - min(max_penalty, theta x risk) = 0.92`
  7. Final Light Score: `5.398 x 1.379 x 1.268 x 0.92 = 8.67`

**Phan C: Mint Calculation**
- Share = 8.67 / 10,000 = 0.000867
- Allocation = 100,000 x 0.000867 = 86.7 FUN
- Anti-Whale check: 86.7 < 3,000 (3% cap) → OK

**Phan D: Unit Test Cases**
- Test 1 — Spam burst: 50 posts/ngay, rating thap → diem thap
- Test 2 — Viral drama: nhieu rating nhung pillar healing = 0 → P_c thap
- Test 3 — Silent consistent contributor: 60 ngay on dinh, it bai nhung chat luong → multiplier cao, vuot nguoi on ao
- Test 4 — Rating ring: 5 user cham lan nhau → reputation giam + risk tang → penalty kich hoat

**Phan E: System Guarantees**
- 6 dam bao he thong: khong dot bien mint, khong post-tien ngay, khong ranking, khong farm vo han, chat luong > so luong, ben vung > bung no

### 2. Cap nhat `src/pages/ArchitectureDocs.tsx`
- Them 3 muc moi vao `tocItems` (dat sau `long-term-protection`, truoc `data-flow`):
  - `scoring-config` — Scoring Config V1
  - `e2e-example` — Vi Du Tinh Diem End-to-End
  - `unit-test-cases` — Unit Test Cases
- Import va render `ScoringConfigAndExampleDocs` component

### 3. Files can chinh sua
- `src/components/docs/ScoringConfigAndExampleDocs.tsx` (tao moi)
- `src/pages/ArchitectureDocs.tsx` (them tocItems + import)

## Chi tiet ky thuat
- Su dung cac component `DocSection`, `DocSubSection`, `DocParagraph`, `DocTable`, `DocList`, `DocAlert` da co san
- Hien thi config bang `<pre>` block voi font mono
- Hien thi cong thuc tinh diem tung buoc bang bang DocTable de de theo doi
- Moi test case co bang: Ten, Dieu kien, Ket qua mong doi, Ly do

