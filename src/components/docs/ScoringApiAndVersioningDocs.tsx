import { DocSection, DocSubSection, DocParagraph, DocList, DocAlert, DocTable } from '@/components/docs/DocSection';

const ScoringApiAndVersioningDocs = () => {
  return (
    <>
      {/* ====== SCORING RULE VERSIONING ====== */}
      <DocSection id="scoring-versioning" title="🔄 Scoring Rule Versioning">
        <DocParagraph>
          Công thức tính điểm PPLP sẽ tiến hóa theo thời gian. Hệ thống cần cơ chế quản lý phiên bản an toàn, 
          đảm bảo không làm xáo trộn điểm của người dùng khi nâng cấp.
        </DocParagraph>

        <DocSubSection title="Lịch Sử Phiên Bản">
          <DocTable
            headers={['Version', 'Ngày Áp Dụng', 'Thay Đổi Chính']}
            rows={[
              ['v1.0', 'Launch', 'Công thức gốc: 5 Pillars × Community × Reputation × Consistency − Penalty'],
              ['v1.1', 'TBD', 'Thêm Sequence Multiplier, tinh chỉnh Integrity Penalty decay rate'],
              ['v2.0', 'TBD', 'AI-assisted pillar scoring, cross-platform weight normalization'],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Cơ Chế Migration An Toàn (Dual-Write)">
          <DocParagraph>
            Khi nâng cấp từ v_old → v_new, hệ thống chạy song song cả hai công thức trong giai đoạn chuyển tiếp.
          </DocParagraph>
          <pre className="bg-muted rounded-lg p-4 text-xs sm:text-sm overflow-x-auto my-4 text-foreground font-mono leading-relaxed">
{`Event Ingest
     ↓
┌─────────────────────┐
│  Scoring Engine      │
│  ┌───────┐ ┌───────┐│
│  │v_old  │ │v_new  ││
│  │score  │ │score  ││
│  └───┬───┘ └───┬───┘│
│      ↓         ↓    │
│  Compare Delta      │
│  delta < threshold? │
│      ↓              │
│  YES → Switch       │
│  NO  → Alert + Keep │
└─────────────────────┘`}
          </pre>
          <DocList ordered items={[
            'Giai đoạn 1: Shadow Mode — v_new chạy nền, chỉ ghi log, không ảnh hưởng điểm thật',
            'Giai đoạn 2: Compare — So sánh delta giữa v_old và v_new trên toàn bộ user base',
            'Giai đoạn 3: Switch — Khi delta < ngưỡng cho phép (ví dụ < 5%), chuyển hoàn toàn sang v_new',
            'Giai đoạn 4: Archive — Giữ v_old config để có thể rollback bất cứ lúc nào',
          ]} />
        </DocSubSection>

        <DocSubSection title="Rollback Strategy">
          <DocAlert type="info">
            Mỗi bản ghi trong <code>light_score_ledger</code> đều lưu <code>scoring_version</code>. 
            Nếu cần rollback, hệ thống có thể tính lại điểm từ events gốc bằng phiên bản cũ.
          </DocAlert>
          <DocList items={[
            'Mọi event là immutable (append-only) — nguồn sự thật duy nhất',
            'Scoring là hàm thuần túy: cùng input + cùng version = cùng output',
            'Rollback = re-run scoring engine với version cũ trên event stream',
          ]} />
        </DocSubSection>

        <DocSubSection title="Schema: scoring_rule_versions">
          <DocTable
            headers={['Field', 'Type', 'Mô tả']}
            rows={[
              ['version_id', 'string (pk)', 'Mã phiên bản (v1.0, v1.1, v2.0…)'],
              ['formula_config_json', 'jsonb', 'Toàn bộ config công thức: weights, thresholds, multipliers'],
              ['activated_at', 'timestamp', 'Thời điểm bắt đầu áp dụng chính thức'],
              ['deactivated_at', 'timestamp?', 'Thời điểm ngừng sử dụng (null = đang active)'],
              ['status', 'enum', 'draft | shadow | active | archived'],
              ['changelog', 'text', 'Mô tả thay đổi so với phiên bản trước'],
              ['created_by', 'string', 'Admin/team tạo phiên bản'],
              ['created_at', 'timestamp', 'Thời điểm tạo'],
            ]}
          />
        </DocSubSection>
      </DocSection>

      {/* ====== API ENDPOINTS ====== */}
      <DocSection id="api-endpoints" title="🔌 API Endpoints (Dev Reference)">
        <DocParagraph>
          Các endpoint chuẩn để dev team implement. Tất cả đều yêu cầu Authentication (JWT Bearer Token) 
          trừ khi ghi chú khác.
        </DocParagraph>

        <DocSubSection title="1. Event Ingest — Submit Action">
          <DocTable
            headers={['Thuộc tính', 'Chi tiết']}
            rows={[
              ['Method', 'POST'],
              ['Path', '/functions/v1/pplp-submit-action'],
              ['Auth', 'Bearer Token (required)'],
              ['Mô tả', 'Ghi nhận một hành động của user vào Event Store'],
            ]}
          />
          <DocSubSection title="Request Body">
            <pre className="bg-muted rounded-lg p-4 text-xs sm:text-sm overflow-x-auto my-2 text-foreground font-mono">
{`{
  "action_type": "POST_CREATED",
  "reference_type": "post",
  "reference_id": "uuid-of-post",
  "content_preview": "Bài viết về...",
  "metadata": {
    "word_count": 350,
    "has_media": true,
    "tags": ["healing", "community"]
  }
}`}
            </pre>
          </DocSubSection>
          <DocSubSection title="Response (200)">
            <pre className="bg-muted rounded-lg p-4 text-xs sm:text-sm overflow-x-auto my-2 text-foreground font-mono">
{`{
  "action_id": "uuid",
  "light_score": 7.2,
  "mint_status": "pending",
  "message": "Hành động đã được ghi nhận"
}`}
            </pre>
          </DocSubSection>
        </DocSubSection>

        <DocSubSection title="2. Rating Submit — Đánh Giá 5 Trụ Cột">
          <DocTable
            headers={['Thuộc tính', 'Chi tiết']}
            rows={[
              ['Method', 'POST'],
              ['Path', '/functions/v1/pplp-rating-submit'],
              ['Auth', 'Bearer Token (required)'],
              ['Mô tả', 'Gửi đánh giá PPLP cho một nội dung (5 trụ cột, mỗi trụ 0-2)'],
            ]}
          />
          <DocSubSection title="Request Body">
            <pre className="bg-muted rounded-lg p-4 text-xs sm:text-sm overflow-x-auto my-2 text-foreground font-mono">
{`{
  "content_id": "uuid-of-content",
  "pillar_truth": 2,
  "pillar_sustain": 1,
  "pillar_heal_love": 2,
  "pillar_life_service": 1,
  "pillar_unity_source": 2,
  "comment": "Bài viết rất sâu sắc..."
}`}
            </pre>
          </DocSubSection>
          <DocSubSection title="Response (200)">
            <pre className="bg-muted rounded-lg p-4 text-xs sm:text-sm overflow-x-auto my-2 text-foreground font-mono">
{`{
  "rating_id": "uuid",
  "weight_applied": 1.3,
  "message": "Đánh giá đã được ghi nhận"
}`}
            </pre>
          </DocSubSection>
        </DocSubSection>

        <DocSubSection title="3. Score Read — Đọc Light Score">
          <DocTable
            headers={['Thuộc tính', 'Chi tiết']}
            rows={[
              ['Method', 'GET'],
              ['Path', '/functions/v1/pplp-score-read?user_id={id}'],
              ['Auth', 'Bearer Token (required)'],
              ['Mô tả', 'Trả về Light Score hiện tại, level, và trend của user'],
            ]}
          />
          <DocSubSection title="Response (200)">
            <pre className="bg-muted rounded-lg p-4 text-xs sm:text-sm overflow-x-auto my-2 text-foreground font-mono">
{`{
  "user_id": "uuid",
  "total_light_score": 1250,
  "level": "Light Builder",
  "trend": "growing",
  "tier": 3,
  "pillars": {
    "truth": 85,
    "sustain": 72,
    "heal_love": 91,
    "life_service": 68,
    "unity_source": 77
  },
  "last_action_at": "2026-02-27T10:30:00Z"
}`}
            </pre>
          </DocSubSection>
          <DocAlert type="warning">
            Lưu ý: Response chỉ hiển thị <strong>level</strong> và <strong>trend</strong> cho public view. 
            Chi tiết pillars chỉ dành cho chính user đó (self-read) hoặc admin.
          </DocAlert>
        </DocSubSection>

        <DocSubSection title="4. Mint Status — Trạng Thái Epoch">
          <DocTable
            headers={['Thuộc tính', 'Chi tiết']}
            rows={[
              ['Method', 'GET'],
              ['Path', '/functions/v1/pplp-mint-status'],
              ['Auth', 'Bearer Token (required)'],
              ['Mô tả', 'Trạng thái mint epoch hiện tại và phân bổ của user'],
            ]}
          />
          <DocSubSection title="Response (200)">
            <pre className="bg-muted rounded-lg p-4 text-xs sm:text-sm overflow-x-auto my-2 text-foreground font-mono">
{`{
  "current_epoch": {
    "epoch_id": "uuid",
    "period": "2026-02-24 → 2026-03-02",
    "status": "active",
    "mint_pool_amount": 50000,
    "total_contributors": 1234
  },
  "my_allocation": {
    "eligible": true,
    "estimated_amount": 42.5,
    "contribution_ratio": 0.00085,
    "reason_codes": ["QUALITY_HIGH", "CONSISTENCY_BONUS"]
  }
}`}
            </pre>
          </DocSubSection>
        </DocSubSection>

        <DocSubSection title="Error Codes Chung">
          <DocTable
            headers={['Code', 'HTTP', 'Mô tả']}
            rows={[
              ['AUTH_REQUIRED', '401', 'Chưa xác thực — cần Bearer Token'],
              ['FORBIDDEN', '403', 'Không có quyền truy cập resource này'],
              ['RATE_LIMITED', '429', 'Vượt giới hạn tần suất — thử lại sau'],
              ['INVALID_INPUT', '400', 'Dữ liệu đầu vào không hợp lệ'],
              ['NOT_ELIGIBLE', '403', 'User chưa đủ điều kiện (chưa accept PPLP, chưa verify…)'],
              ['EPOCH_NOT_ACTIVE', '409', 'Epoch hiện tại chưa mở hoặc đã kết thúc'],
            ]}
          />
        </DocSubSection>
      </DocSection>

      {/* ====== REASON CODES MICROCOPY ====== */}
      <DocSection id="reason-codes" title="💬 Reason Codes & Microcopy">
        <DocParagraph>
          Mọi thông báo hiển thị cho người dùng đều tuân theo nguyên tắc: 
          <strong> Tích cực — Không phán xét — Khuyến khích tăng trưởng</strong>.
        </DocParagraph>

        <DocAlert type="info">
          Nguyên tắc vàng: Không dùng từ "phạt", "trừ điểm", "vi phạm". 
          Thay bằng "cân bằng", "điều chỉnh", "bảo vệ", "nuôi dưỡng".
        </DocAlert>

        <DocSubSection title="Reason Codes — Tích Cực (Positive)">
          <DocTable
            headers={['Code', 'Microcopy (hiển thị cho user)', 'Ghi chú']}
            rows={[
              ['QUALITY_HIGH', '✨ Nội dung của bạn được cộng đồng đánh giá cao', 'Điểm PPLP trung bình cao'],
              ['SEQUENCE_COMPLETE', '🔗 Bạn đã hoàn thành chuỗi hành động tích cực', 'Sequence đạt chuẩn'],
              ['CONSISTENCY_BONUS', '🌱 Nhịp đóng góp đều đặn của bạn được ghi nhận', 'Streak ≥ 30 ngày'],
              ['MENTOR_IMPACT', '💛 Người bạn hướng dẫn đã tạo ra giá trị', 'Mentor chain thành công'],
              ['COMMUNITY_BUILDER', '🏘 Bạn đang xây dựng một cộng đồng nhỏ tích cực', 'Tạo group/thread có giá trị'],
              ['HEALING_CONTRIBUTION', '💚 Năng lượng chữa lành của bạn lan tỏa đến người khác', 'Pillar heal_love cao'],
              ['GOVERNANCE_ACTIVE', '🗳 Tiếng nói quản trị của bạn đang tạo ảnh hưởng tích cực', 'Tham gia vote có trách nhiệm'],
              ['ONCHAIN_VERIFIED', '⛓ Hành động on-chain của bạn đã được xác thực', 'Staking, mint NFT…'],
              ['FIRST_CONTRIBUTION', '🌟 Chào mừng đóng góp đầu tiên của bạn!', 'User mới bắt đầu'],
              ['CROSS_PLATFORM', '🌐 Đóng góp đa nền tảng của bạn được ghi nhận', 'Hoạt động trên nhiều FUN platforms'],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Reason Codes — Điều Chỉnh (Adjustment)">
          <DocTable
            headers={['Code', 'Microcopy (hiển thị cho user)', 'Ghi chú nội bộ']}
            rows={[
              ['INTEGRITY_ADJUSTMENT', '🔄 Hệ thống đang cân bằng năng lượng để bảo vệ cộng đồng', 'Phát hiện pattern bất thường'],
              ['COOLDOWN_ACTIVE', '⏳ Hệ thống đang trong giai đoạn nghỉ — hãy quay lại sau', 'Rate limit đạt ngưỡng'],
              ['REVIEW_PENDING', '🔍 Đóng góp đang được xem xét để đảm bảo chất lượng', 'AI flagged, chờ review'],
              ['ENERGY_BALANCE', '☯ Năng lượng đang được điều hòa tự nhiên', 'Time decay applied'],
              ['GROWTH_OPPORTUNITY', '🌿 Đây là cơ hội để bạn phát triển sâu hơn', 'Điểm thấp nhưng khuyến khích'],
              ['DIVERSITY_NEEDED', '🎨 Hãy thử đa dạng hóa loại đóng góp của bạn', 'Quá tập trung vào 1 loại'],
              ['VERIFICATION_NEEDED', '🔐 Cần xác thực thêm để tiếp tục nhận ghi nhận', 'KYC hoặc wallet verify'],
              ['PATTERN_LEARNING', '📊 Hệ thống đang học nhịp đóng góp của bạn', 'User mới, chưa đủ data'],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Nguyên Tắc Viết Microcopy PPLP">
          <DocList ordered items={[
            'Luôn bắt đầu bằng emoji phù hợp — tạo cảm xúc tích cực',
            'Dùng ngôi "bạn" — tạo kết nối cá nhân, không xa cách',
            'Không bao giờ dùng: "phạt", "trừ", "vi phạm", "cảnh cáo"',
            'Thay bằng: "cân bằng", "điều chỉnh", "bảo vệ", "nuôi dưỡng", "cơ hội"',
            'Mỗi thông báo adjustment phải kèm hướng tích cực (next step)',
            'Không hiển thị con số cụ thể bị trừ — chỉ hiện trend',
            'Tone giọng: như người thầy nhẹ nhàng, không như cảnh sát',
          ]} />
        </DocSubSection>

        <DocSubSection title="Ví Dụ Đối Chiếu">
          <DocTable
            headers={['❌ Cách viết cũ (Ego-driven)', '✅ Cách viết PPLP (Light-driven)']}
            rows={[
              ['Bạn bị trừ 50 điểm vì spam', '🔄 Hệ thống đang cân bằng năng lượng để bảo vệ cộng đồng'],
              ['Cảnh cáo: Hành vi bất thường', '🌿 Đây là cơ hội để bạn phát triển sâu hơn'],
              ['Bạn đứng hạng #47', '🌱 Light Growing — nhịp đóng góp của bạn đang tăng trưởng'],
              ['Điểm của bạn: 1,247.5', '💡 Light Builder — bạn đang tạo giá trị bền vững'],
              ['Vi phạm quy định lần 2', '☯ Năng lượng đang được điều hòa tự nhiên'],
            ]}
          />
        </DocSubSection>
      </DocSection>
    </>
  );
};

export default ScoringApiAndVersioningDocs;
