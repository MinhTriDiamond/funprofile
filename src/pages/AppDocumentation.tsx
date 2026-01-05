import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, FileText, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TableOfContents } from '@/components/docs/TableOfContents';
import { DocSection, DocSubSection, DocParagraph, DocList, DocTable, DocAlert } from '@/components/docs/DocSection';
import { CodeBlock } from '@/components/docs/CodeBlock';
import {
  TechStackDiagram,
  AuthFlowDiagram,
  WalletSystemDiagram,
  SoulNFTDiagram,
  SocialFeedDiagram,
  RewardFlowDiagram,
  MediaPipelineDiagram,
  DatabaseSchemaDiagram,
  EdgeFunctionsDiagram,
  SecurityDiagram
} from '@/components/docs/AppDiagrams';

const tocItems = [
  { id: 'overview', title: '1. Tổng Quan Hệ Thống' },
  { id: 'tech-stack', title: '2. Tech Stack', level: 2 },
  { id: 'authentication', title: '3. Hệ Thống Xác Thực' },
  { id: 'wallet-blockchain', title: '4. Wallet & Blockchain' },
  { id: 'soul-nft', title: '5. Soul NFT', level: 2 },
  { id: 'social-feed', title: '6. Social Feed' },
  { id: 'profile-friends', title: '7. Profile & Friends' },
  { id: 'reward-system', title: '8. Hệ Thống Reward' },
  { id: 'admin-panel', title: '9. Admin Panel' },
  { id: 'media-system', title: '10. Media System' },
  { id: 'notifications', title: '11. Notifications' },
  { id: 'database-schema', title: '12. Database Schema' },
  { id: 'edge-functions', title: '13. Edge Functions' },
  { id: 'security', title: '14. Security Features' },
  { id: 'performance', title: '15. Performance' },
  { id: 'secrets', title: '16. Secrets & Environment' },
];

const AppDocumentation: React.FC = () => {
  const [activeId, setActiveId] = useState('overview');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0% -80% 0%' }
    );

    tocItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                FUN Ecosystem Documentation
              </h1>
              <p className="text-sm text-muted-foreground">Tài liệu kỹ thuật chi tiết</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/docs/ecosystem">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                SSO Docs
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              In PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Table of Contents */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <TableOfContents items={tocItems} activeId={activeId} />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="pr-4">
                
                {/* Section 1: Overview */}
                <DocSection id="overview" title="1. Tổng Quan Hệ Thống">
                  <DocParagraph>
                    FUN Ecosystem là một mạng xã hội Web3 toàn diện, kết hợp các tính năng social truyền thống 
                    với công nghệ blockchain và hệ thống reward token. Nền tảng được xây dựng trên kiến trúc 
                    hiện đại, bảo mật cao và khả năng mở rộng linh hoạt.
                  </DocParagraph>
                  
                  <DocAlert type="info">
                    <strong>Light Cloak SSO</strong> - Hệ thống xác thực đa nền tảng cho phép đăng nhập qua Email OTP, 
                    Wallet, hoặc Social Login với một danh tính thống nhất (FUN-ID).
                  </DocAlert>

                  <DocSubSection title="Tính năng chính">
                    <DocList items={[
                      "🔐 Light Cloak SSO - Xác thực đa phương thức (Email OTP, Wallet, Social)",
                      "💳 Custodial & External Wallet - Hỗ trợ cả người mới và expert",
                      "🎭 Soul NFT - Danh tính linh hồn không thể chuyển nhượng",
                      "📝 Social Feed - Đăng bài, reactions, comments với media",
                      "🎁 Token Rewards - Hệ thống thưởng CAMLY token cho hoạt động",
                      "👨‍💼 Admin Panel - Quản trị toàn diện với audit logging"
                    ]} />
                  </DocSubSection>
                </DocSection>

                {/* Section 2: Tech Stack */}
                <DocSection id="tech-stack" title="2. Tech Stack">
                  <TechStackDiagram />
                  
                  <DocSubSection title="Frontend Technologies">
                    <DocTable 
                      headers={['Technology', 'Version', 'Mục đích']}
                      rows={[
                        ['React', '18.3.1', 'UI Library chính'],
                        ['TypeScript', 'Latest', 'Type safety'],
                        ['Vite', 'Latest', 'Build tool & dev server'],
                        ['Tailwind CSS', '3.x', 'Utility-first CSS'],
                        ['shadcn/ui', 'Latest', 'UI Component library'],
                        ['React Query', '5.x', 'Server state management'],
                        ['React Router', 'v6', 'Client-side routing'],
                        ['Framer Motion', 'Latest', 'Animations'],
                      ]}
                    />
                  </DocSubSection>

                  <DocSubSection title="Backend Technologies">
                    <DocTable 
                      headers={['Technology', 'Mục đích']}
                      rows={[
                        ['Lovable Cloud', 'Backend-as-a-Service (Supabase)'],
                        ['Edge Functions', 'Serverless compute (Deno)'],
                        ['PostgreSQL', 'Primary database'],
                        ['Resend API', 'Email delivery (OTP)'],
                        ['Cloudflare R2', 'Image storage'],
                        ['Cloudflare Stream', 'Video encoding & delivery'],
                      ]}
                    />
                  </DocSubSection>

                  <DocSubSection title="Blockchain Technologies">
                    <DocTable 
                      headers={['Technology', 'Mục đích']}
                      rows={[
                        ['BNB Smart Chain', 'Primary blockchain (Chain ID: 56)'],
                        ['Wagmi', 'React hooks for Ethereum'],
                        ['RainbowKit', 'Wallet connection UI'],
                        ['Viem', 'TypeScript interface for Ethereum'],
                        ['CAMLY Token', 'Reward token'],
                      ]}
                    />
                  </DocSubSection>
                </DocSection>

                {/* Section 3: Authentication */}
                <DocSection id="authentication" title="3. Hệ Thống Xác Thực (Light Cloak SSO)">
                  <DocParagraph>
                    Light Cloak SSO là hệ thống single sign-on cho phép người dùng đăng nhập qua nhiều phương thức 
                    khác nhau với một danh tính thống nhất. Tất cả users đều nhận được FUN-ID duy nhất.
                  </DocParagraph>

                  <AuthFlowDiagram />

                  <DocSubSection title="Email OTP Flow">
                    <DocParagraph>
                      Người dùng nhập email, hệ thống gửi mã OTP 6 số qua Resend API. Mã có hiệu lực 5 phút 
                      và tối đa 3 lần thử.
                    </DocParagraph>
                    <CodeBlock 
                      title="Gọi Edge Function gửi OTP"
                      language="typescript"
                      code={`// Request OTP
const { data, error } = await supabase.functions.invoke('sso-otp-request', {
  body: { identifier: 'user@example.com', type: 'email' }
});

// Verify OTP
const { data: verifyData } = await supabase.functions.invoke('sso-otp-verify', {
  body: { identifier: 'user@example.com', code: '123456', type: 'email' }
});`}
                    />
                  </DocSubSection>

                  <DocSubSection title="Wallet Login Flow">
                    <DocParagraph>
                      Người dùng kết nối MetaMask, ký message xác thực, hệ thống verify signature và tạo session.
                    </DocParagraph>
                    <CodeBlock 
                      title="Wallet Authentication"
                      language="typescript"
                      code={`// 1. Connect wallet với RainbowKit
const { address } = useAccount();

// 2. Sign message
const signature = await signMessageAsync({
  message: \`Sign in to FUN Ecosystem\\nNonce: \${nonce}\`
});

// 3. Verify với Edge Function
const { data } = await supabase.functions.invoke('sso-web3-auth', {
  body: { address, signature, message }
});`}
                    />
                  </DocSubSection>

                  <DocSubSection title="Law of Light">
                    <DocAlert type="warning">
                      Tất cả người dùng mới phải chấp nhận "Law of Light" - quy tắc ứng xử của cộng đồng 
                      trước khi sử dụng app. Trạng thái được lưu trong <code>profiles.law_of_light_accepted</code>.
                    </DocAlert>
                  </DocSubSection>
                </DocSection>

                {/* Section 4: Wallet & Blockchain */}
                <DocSection id="wallet-blockchain" title="4. Wallet & Blockchain">
                  <DocParagraph>
                    FUN Ecosystem hỗ trợ hai loại wallet: Custodial (hệ thống quản lý) và External (user tự quản lý). 
                    Cả hai đều có thể nhận rewards và tương tác với blockchain.
                  </DocParagraph>

                  <WalletSystemDiagram />

                  <DocSubSection title="Custodial Wallet">
                    <DocParagraph>
                      Wallet được tạo tự động khi user đăng ký bằng Email/Social. Private key được mã hóa 
                      AES-GCM và lưu trong database.
                    </DocParagraph>
                    <CodeBlock 
                      title="Tạo Custodial Wallet"
                      language="typescript"
                      code={`// Edge Function: create-custodial-wallet
const wallet = Wallet.createRandom();

// Mã hóa private key với AES-GCM
const encrypted = await encryptPrivateKey(wallet.privateKey, WALLET_ENCRYPTION_KEY);

// Lưu vào database
await supabase.from('custodial_wallets').insert({
  user_id: userId,
  wallet_address: wallet.address,
  encrypted_private_key: encrypted,
  chain_id: 56 // BNB Smart Chain
});`}
                    />
                  </DocSubSection>

                  <DocSubSection title="Token Operations">
                    <DocTable 
                      headers={['Operation', 'Mô tả', 'Yêu cầu']}
                      rows={[
                        ['View Balance', 'Xem số dư CAMLY & BNB', 'Đăng nhập'],
                        ['Send Token', 'Gửi token đến địa chỉ khác', 'Đủ balance + gas'],
                        ['Receive', 'Nhận token qua QR code', 'Wallet address'],
                        ['Claim Reward', 'Claim CAMLY từ approved rewards', 'Approved reward > 0'],
                      ]}
                    />
                  </DocSubSection>
                </DocSection>

                {/* Section 5: Soul NFT */}
                <DocSection id="soul-nft" title="5. Soul NFT">
                  <DocParagraph>
                    Soul NFT là Soulbound Token (SBT) đại diện cho danh tính linh hồn của user trong FUN Ecosystem. 
                    NFT này không thể chuyển nhượng và gắn liền với tài khoản vĩnh viễn.
                  </DocParagraph>

                  <SoulNFTDiagram />

                  <DocSubSection title="5 Ngũ Hành (Elements)">
                    <DocTable 
                      headers={['Element', 'Tên', 'Ý nghĩa']}
                      rows={[
                        ['🪙 Kim', 'Metal', 'Sắc bén, quyết đoán, công bằng'],
                        ['🌳 Mộc', 'Wood', 'Sáng tạo, phát triển, nhân ái'],
                        ['💧 Thủy', 'Water', 'Khôn ngoan, linh hoạt, sâu sắc'],
                        ['🔥 Hỏa', 'Fire', 'Đam mê, năng động, nhiệt huyết'],
                        ['🌍 Thổ', 'Earth', 'Ổn định, chân thành, bền vững'],
                      ]}
                    />
                  </DocSubSection>

                  <DocSubSection title="Soul Properties">
                    <DocList items={[
                      "Soul Level: Tăng theo engagement và thời gian hoạt động",
                      "Experience Points: Tích lũy từ mọi hoạt động trong ecosystem",
                      "Soul Element: Được xác định dựa trên hành vi và preferences",
                      "Metadata URI: Lưu trữ on-chain vĩnh viễn"
                    ]} />
                  </DocSubSection>
                </DocSection>

                {/* Section 6: Social Feed */}
                <DocSection id="social-feed" title="6. Social Feed">
                  <DocParagraph>
                    Feed là trung tâm hoạt động của FUN Ecosystem, nơi users có thể đăng bài, tương tác, 
                    và kết nối với cộng đồng.
                  </DocParagraph>

                  <SocialFeedDiagram />

                  <DocSubSection title="Posts">
                    <DocList items={[
                      "Text content với emoji support",
                      "Multi-image upload (lên đến 10 ảnh)",
                      "Video upload với HLS streaming",
                      "Edit/Delete bài viết của mình",
                      "Infinite scroll loading"
                    ]} />
                  </DocSubSection>

                  <DocSubSection title="6 Loại Reactions">
                    <DocTable 
                      headers={['Icon', 'Type', 'Điểm Reward']}
                      rows={[
                        ['👍', 'like', '+2'],
                        ['❤️', 'love', '+2'],
                        ['😂', 'haha', '+2'],
                        ['😮', 'wow', '+2'],
                        ['😢', 'sad', '+2'],
                        ['😡', 'angry', '+2'],
                      ]}
                    />
                  </DocSubSection>

                  <DocSubSection title="Comments System">
                    <DocList items={[
                      "Text comments với emoji",
                      "Image/Video attachment",
                      "Nested replies (multi-level)",
                      "Reactions on comments",
                      "Edit/Delete comments"
                    ]} />
                  </DocSubSection>
                </DocSection>

                {/* Section 7: Profile & Friends */}
                <DocSection id="profile-friends" title="7. Profile & Friends">
                  <DocSubSection title="Profile Routes">
                    <DocTable 
                      headers={['Route', 'Mô tả', 'Ví dụ']}
                      rows={[
                        ['/profile', 'Profile của current user', '/profile'],
                        ['/profile/:id', 'Profile theo UUID', '/profile/abc-123'],
                        ['/@:username', 'Profile theo username', '/@johndoe'],
                        ['/:username', 'Shorthand username route', '/johndoe'],
                      ]}
                    />
                  </DocSubSection>

                  <DocSubSection title="Profile Features">
                    <DocList items={[
                      "Avatar upload với cropping",
                      "Cover photo với editing",
                      "Bio và thông tin cá nhân",
                      "FUN-ID display",
                      "Soul NFT badge",
                      "Reward statistics"
                    ]} />
                  </DocSubSection>

                  <DocSubSection title="Friendship States">
                    <DocTable 
                      headers={['State', 'Mô tả', 'Actions']}
                      rows={[
                        ['none', 'Chưa kết bạn', 'Send Request'],
                        ['pending', 'Đã gửi lời mời', 'Cancel Request'],
                        ['incoming', 'Nhận được lời mời', 'Accept / Decline'],
                        ['accepted', 'Đã là bạn bè', 'Unfriend'],
                      ]}
                    />
                  </DocSubSection>
                </DocSection>

                {/* Section 8: Reward System */}
                <DocSection id="reward-system" title="8. Hệ Thống Reward">
                  <DocParagraph>
                    Hệ thống reward CAMLY token khuyến khích hoạt động và đóng góp tích cực trong cộng đồng. 
                    Rewards được tính toán tự động và cần admin approval trước khi claim.
                  </DocParagraph>

                  <RewardFlowDiagram />

                  <DocSubSection title="Công Thức Tính Reward">
                    <CodeBlock 
                      title="Reward Calculation"
                      language="typescript"
                      code={`// Công thức tính reward
const calculateReward = (stats: UserStats): number => {
  return (
    (stats.postsCount * 50) +      // 50 điểm / post
    (stats.commentsCount * 10) +   // 10 điểm / comment
    (stats.reactionsCount * 2) +   // 2 điểm / reaction
    (stats.friendsCount * 25) +    // 25 điểm / friend
    (stats.sharesCount * 15)       // 15 điểm / share
  );
};`}
                    />
                  </DocSubSection>

                  <DocSubSection title="Reward Flow">
                    <DocList ordered items={[
                      "User thực hiện hoạt động (post, comment, react...)",
                      "Hệ thống tự động tính pending_reward",
                      "Admin review và approve/reject reward",
                      "User có thể claim approved_reward về wallet"
                    ]} />
                  </DocSubSection>
                </DocSection>

                {/* Section 9: Admin Panel */}
                <DocSection id="admin-panel" title="9. Admin Panel">
                  <DocParagraph>
                    Admin Panel cung cấp công cụ quản trị toàn diện cho administrators, bao gồm 
                    user management, reward approval, và content moderation.
                  </DocParagraph>

                  <DocSubSection title="Admin Tabs">
                    <DocTable 
                      headers={['Tab', 'Chức năng', 'Quyền']}
                      rows={[
                        ['Overview', 'Dashboard thống kê tổng quan', 'admin'],
                        ['Reward Approval', 'Duyệt/Từ chối rewards', 'admin'],
                        ['User Review', 'Xem xét và ban users', 'admin'],
                        ['Wallet Abuse', 'Phát hiện wallet spam/abuse', 'admin'],
                        ['Quick Delete', 'Xóa nhanh posts/comments', 'admin'],
                        ['Blockchain', 'Các operations trên chain', 'admin'],
                        ['Media Migration', 'Di chuyển media sang Cloudflare', 'admin'],
                      ]}
                    />
                  </DocSubSection>

                  <DocSubSection title="Database Functions">
                    <CodeBlock 
                      title="Admin Database Functions"
                      language="sql"
                      code={`-- Approve user reward
SELECT approve_user_reward(p_admin_id, p_user_id, p_note);

-- Reject user reward  
SELECT reject_user_reward(p_admin_id, p_user_id, p_note);

-- Ban user permanently
SELECT ban_user_permanently(p_admin_id, p_user_id, p_reason);

-- Check admin role
SELECT has_role('admin', user_id);`}
                    />
                  </DocSubSection>
                </DocSection>

                {/* Section 10: Media System */}
                <DocSection id="media-system" title="10. Media System">
                  <DocParagraph>
                    Hệ thống media sử dụng Cloudflare R2 cho images và Cloudflare Stream cho videos, 
                    đảm bảo delivery nhanh và tiết kiệm bandwidth.
                  </DocParagraph>

                  <MediaPipelineDiagram />

                  <DocSubSection title="Image Pipeline">
                    <DocList items={[
                      "Client-side compression (WebP format)",
                      "Upload to Cloudflare R2 via presigned URL",
                      "On-demand transformation (resize, crop)",
                      "CDN delivery với caching"
                    ]} />
                  </DocSubSection>

                  <DocSubSection title="Video Pipeline">
                    <DocList items={[
                      "TUS resumable upload protocol",
                      "Cloudflare Stream encoding (multiple qualities)",
                      "HLS adaptive bitrate streaming",
                      "Lazy loading với thumbnail preview"
                    ]} />
                  </DocSubSection>
                </DocSection>

                {/* Section 11: Notifications */}
                <DocSection id="notifications" title="11. Notifications">
                  <DocSubSection title="Notification Types">
                    <DocTable 
                      headers={['Type', 'Trigger', 'Message']}
                      rows={[
                        ['comment', 'Ai đó comment bài của bạn', 'X commented on your post'],
                        ['reaction', 'Ai đó react bài của bạn', 'X reacted to your post'],
                        ['friend_request', 'Nhận lời mời kết bạn', 'X sent you a friend request'],
                        ['friend_accept', 'Lời mời được chấp nhận', 'X accepted your friend request'],
                        ['reward_approved', 'Reward được duyệt', 'Your reward has been approved'],
                        ['reward_rejected', 'Reward bị từ chối', 'Your reward was rejected'],
                        ['account_banned', 'Tài khoản bị ban', 'Your account has been banned'],
                      ]}
                    />
                  </DocSubSection>
                </DocSection>

                {/* Section 12: Database Schema */}
                <DocSection id="database-schema" title="12. Database Schema">
                  <DatabaseSchemaDiagram />

                  <DocSubSection title="Core Tables">
                    <DocTable 
                      headers={['Table', 'Mô tả', 'RLS']}
                      rows={[
                        ['profiles', 'Thông tin user (avatar, bio, rewards...)', 'Yes'],
                        ['posts', 'Bài viết với content và media', 'Yes'],
                        ['comments', 'Comments và replies', 'Yes'],
                        ['reactions', 'Reactions trên posts/comments', 'Yes'],
                        ['friendships', 'Quan hệ bạn bè', 'Yes'],
                        ['notifications', 'Thông báo cho users', 'Yes'],
                        ['custodial_wallets', 'Wallet được quản lý bởi hệ thống', 'Yes'],
                        ['soul_nfts', 'Thông tin Soul NFT', 'Yes'],
                        ['transactions', 'Lịch sử giao dịch', 'Yes'],
                        ['user_roles', 'Phân quyền (admin/user)', 'Yes'],
                        ['audit_logs', 'Lịch sử admin actions', 'Admin only'],
                        ['otp_codes', 'Mã OTP tạm thời', 'System only'],
                      ]}
                    />
                  </DocSubSection>
                </DocSection>

                {/* Section 13: Edge Functions */}
                <DocSection id="edge-functions" title="13. Edge Functions">
                  <EdgeFunctionsDiagram />

                  <DocSubSection title="Authentication Functions">
                    <DocTable 
                      headers={['Function', 'Method', 'Mô tả']}
                      rows={[
                        ['sso-otp-request', 'POST', 'Gửi OTP qua email'],
                        ['sso-otp-verify', 'POST', 'Xác thực OTP và tạo session'],
                        ['sso-web3-auth', 'POST', 'Xác thực qua wallet signature'],
                      ]}
                    />
                  </DocSubSection>

                  <DocSubSection title="Media Functions">
                    <DocTable 
                      headers={['Function', 'Mô tả']}
                      rows={[
                        ['upload-to-r2', 'Upload ảnh lên Cloudflare R2'],
                        ['upload-to-cf-images', 'Upload ảnh lên Cloudflare Images'],
                        ['stream-video', 'Khởi tạo video upload'],
                        ['get-upload-url', 'Lấy presigned URL'],
                        ['image-transform', 'Transform ảnh (resize, crop)'],
                        ['generate-presigned-url', 'Tạo presigned URL cho R2'],
                      ]}
                    />
                  </DocSubSection>
                </DocSection>

                {/* Section 14: Security */}
                <DocSection id="security" title="14. Security Features">
                  <SecurityDiagram />

                  <DocSubSection title="Row Level Security (RLS)">
                    <CodeBlock 
                      title="Example RLS Policy"
                      language="sql"
                      code={`-- Users can only view their own data
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Public profiles view for everyone
CREATE POLICY "Public profiles are viewable"
ON public_profiles FOR SELECT
USING (true);`}
                    />
                  </DocSubSection>

                  <DocSubSection title="Rate Limiting">
                    <DocTable 
                      headers={['Action', 'Limit', 'Window']}
                      rows={[
                        ['Create Post', '10 posts', '1 phút'],
                        ['Create Comment', '30 comments', '1 phút'],
                        ['Search', '60 requests', '1 phút'],
                        ['OTP Request', '3 requests', '5 phút'],
                      ]}
                    />
                  </DocSubSection>
                </DocSection>

                {/* Section 15: Performance */}
                <DocSection id="performance" title="15. Performance Optimization">
                  <DocSubSection title="Frontend Optimizations">
                    <DocList items={[
                      "Lazy loading pages với React.lazy()",
                      "React Query caching với staleTime/cacheTime",
                      "Image lazy loading với Intersection Observer",
                      "Infinite scroll thay vì pagination",
                      "Memoization với useMemo và useCallback",
                      "Code splitting theo routes"
                    ]} />
                  </DocSubSection>

                  <DocSubSection title="Media Optimizations">
                    <DocList items={[
                      "WebP format cho images",
                      "HLS adaptive streaming cho videos",
                      "Cloudflare CDN với edge caching",
                      "Thumbnail previews cho videos",
                      "Progressive image loading"
                    ]} />
                  </DocSubSection>
                </DocSection>

                {/* Section 16: Secrets */}
                <DocSection id="secrets" title="16. Secrets & Environment">
                  <DocAlert type="warning">
                    <strong>Bảo mật:</strong> Không bao giờ commit secrets vào git. Tất cả secrets được 
                    quản lý qua Lovable Cloud secrets management.
                  </DocAlert>

                  <DocSubSection title="Configured Secrets">
                    <DocTable 
                      headers={['Secret', 'Mục đích', 'Used By']}
                      rows={[
                        ['WALLET_ENCRYPTION_KEY', 'Mã hóa custodial wallet private keys', 'create-custodial-wallet'],
                        ['RESEND_API_KEY', 'Gửi email OTP', 'sso-otp-request'],
                        ['CLOUDFLARE_ACCOUNT_ID', 'Cloudflare account', 'R2, Stream, Images'],
                        ['CLOUDFLARE_R2_ACCESS_KEY', 'R2 access', 'upload-to-r2'],
                        ['CLOUDFLARE_R2_SECRET_KEY', 'R2 secret', 'upload-to-r2'],
                        ['CLOUDFLARE_R2_BUCKET', 'R2 bucket name', 'upload-to-r2'],
                        ['CLOUDFLARE_STREAM_TOKEN', 'Stream API token', 'stream-video'],
                        ['CLOUDFLARE_IMAGES_TOKEN', 'Images API token', 'upload-to-cf-images'],
                        ['TREASURY_PRIVATE_KEY', 'Treasury wallet key', 'Token distribution'],
                        ['LOVABLE_API_KEY', 'Lovable AI integration', 'AI features'],
                      ]}
                    />
                  </DocSubSection>

                  <DocSubSection title="Environment Variables">
                    <CodeBlock 
                      title=".env (Auto-generated)"
                      language="bash"
                      code={`# These are automatically provided by Lovable Cloud
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]
VITE_SUPABASE_PROJECT_ID=[project-id]`}
                    />
                  </DocSubSection>
                </DocSection>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-border text-center text-muted-foreground text-sm">
                  <p>© 2026 FUN Ecosystem. All rights reserved.</p>
                  <p className="mt-2">
                    Documentation version 1.0 | Last updated: January 2026
                  </p>
                </div>

              </div>
            </ScrollArea>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppDocumentation;
