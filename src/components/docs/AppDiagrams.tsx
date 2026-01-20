import React from 'react';

interface DiagramProps {
  title?: string;
  children: React.ReactNode;
}

const DiagramWrapper: React.FC<DiagramProps> = ({ title, children }) => (
  <div className="my-6 p-4 bg-muted/30 rounded-xl border border-border">
    {title && <h4 className="text-lg font-semibold text-foreground mb-4 text-center">{title}</h4>}
    <div className="flex justify-center">
      {children}
    </div>
  </div>
);

// Tech Stack Architecture Diagram
export const TechStackDiagram: React.FC = () => (
  <DiagramWrapper title="Kiến Trúc Tech Stack">
    <div className="w-full max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Frontend Layer */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/30">
          <h5 className="text-blue-400 font-bold text-center mb-3">🎨 Frontend</h5>
          <div className="space-y-2">
            {['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'shadcn/ui', 'React Query', 'React Router v6'].map((tech) => (
              <div key={tech} className="bg-background/50 rounded-lg px-3 py-1.5 text-sm text-center text-muted-foreground">
                {tech}
              </div>
            ))}
          </div>
        </div>

        {/* Backend Layer */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl p-4 border border-emerald-500/30">
          <h5 className="text-emerald-400 font-bold text-center mb-3">⚙️ Backend</h5>
          <div className="space-y-2">
            {['Lovable Cloud', 'Edge Functions', 'PostgreSQL', 'Row Level Security', 'Resend API', 'Cloudflare R2', 'Cloudflare Stream'].map((tech) => (
              <div key={tech} className="bg-background/50 rounded-lg px-3 py-1.5 text-sm text-center text-muted-foreground">
                {tech}
              </div>
            ))}
          </div>
        </div>

        {/* Blockchain Layer */}
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl p-4 border border-amber-500/30">
          <h5 className="text-amber-400 font-bold text-center mb-3">⛓️ Blockchain</h5>
          <div className="space-y-2">
            {['BNB Smart Chain', 'Wagmi', 'RainbowKit', 'Viem', 'MetaMask', 'Soul NFTs', 'CAMLY Token'].map((tech) => (
              <div key={tech} className="bg-background/50 rounded-lg px-3 py-1.5 text-sm text-center text-muted-foreground">
                {tech}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </DiagramWrapper>
);

// Authentication Flow Diagram
export const AuthFlowDiagram: React.FC = () => (
  <DiagramWrapper title="Light Cloak SSO - Authentication Flow">
    <div className="w-full max-w-3xl">
      <div className="flex flex-col items-center space-y-4">
        {/* Start */}
        <div className="bg-primary/20 rounded-full px-6 py-2 border border-primary/50">
          <span className="text-primary font-medium">🚀 Người dùng truy cập App</span>
        </div>
        
        <div className="text-muted-foreground">↓</div>
        
        {/* Choice */}
        <div className="bg-amber-500/20 rounded-xl px-6 py-3 border border-amber-500/50">
          <span className="text-amber-400 font-medium">Chọn phương thức đăng nhập</span>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="text-muted-foreground">↙️</div>
          <div className="text-muted-foreground">↓</div>
          <div className="text-muted-foreground">↘️</div>
        </div>
        
        {/* Auth Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {/* Email OTP */}
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30 space-y-2">
            <div className="text-blue-400 font-semibold text-center">📧 Email OTP</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="bg-background/50 rounded px-2 py-1">1. Nhập email</div>
              <div className="bg-background/50 rounded px-2 py-1">2. Gửi OTP (Resend)</div>
              <div className="bg-background/50 rounded px-2 py-1">3. Xác thực mã 6 số</div>
              <div className="bg-background/50 rounded px-2 py-1">4. Tạo session</div>
            </div>
          </div>
          
          {/* Wallet */}
          <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30 space-y-2">
            <div className="text-emerald-400 font-semibold text-center">🦊 Wallet Login</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="bg-background/50 rounded px-2 py-1">1. Kết nối MetaMask</div>
              <div className="bg-background/50 rounded px-2 py-1">2. Ký message</div>
              <div className="bg-background/50 rounded px-2 py-1">3. Verify signature</div>
              <div className="bg-background/50 rounded px-2 py-1">4. Tạo session</div>
            </div>
          </div>
          
          {/* Social */}
          <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30 space-y-2">
            <div className="text-purple-400 font-semibold text-center">🌐 Social Login</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="bg-background/50 rounded px-2 py-1">1. Chọn provider</div>
              <div className="bg-background/50 rounded px-2 py-1">2. OAuth redirect</div>
              <div className="bg-background/50 rounded px-2 py-1">3. Callback verify</div>
              <div className="bg-background/50 rounded px-2 py-1">4. Tạo session</div>
            </div>
          </div>
        </div>
        
        <div className="text-muted-foreground">↓</div>
        
        {/* Law of Light */}
        <div className="bg-amber-500/20 rounded-xl px-6 py-3 border border-amber-500/50">
          <span className="text-amber-400 font-medium">📜 Chấp nhận Law of Light (nếu chưa)</span>
        </div>
        
        <div className="text-muted-foreground">↓</div>
        
        {/* Custodial Wallet */}
        <div className="bg-emerald-500/20 rounded-xl px-6 py-3 border border-emerald-500/50">
          <span className="text-emerald-400 font-medium">💳 Tạo Custodial Wallet (nếu chưa có)</span>
        </div>
        
        <div className="text-muted-foreground">↓</div>
        
        {/* Success */}
        <div className="bg-primary/20 rounded-full px-6 py-2 border border-primary/50">
          <span className="text-primary font-medium">✅ Đăng nhập thành công → Feed</span>
        </div>
      </div>
    </div>
  </DiagramWrapper>
);

// Wallet System Diagram
export const WalletSystemDiagram: React.FC = () => (
  <DiagramWrapper title="Hệ Thống Wallet">
    <div className="w-full max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Custodial Wallet */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl p-5 border border-emerald-500/30">
          <h5 className="text-emerald-400 font-bold text-center mb-4">💳 Custodial Wallet</h5>
          <div className="space-y-3 text-sm">
            <div className="bg-background/50 rounded-lg p-3">
              <span className="text-emerald-400 font-medium">Tự động tạo</span>
              <p className="text-muted-foreground text-xs mt-1">Được tạo khi user đăng ký bằng Email/Social</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <span className="text-emerald-400 font-medium">Mã hóa AES-GCM</span>
              <p className="text-muted-foreground text-xs mt-1">Private key được mã hóa với WALLET_ENCRYPTION_KEY</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <span className="text-emerald-400 font-medium">Quản lý bởi hệ thống</span>
              <p className="text-muted-foreground text-xs mt-1">User không cần quản lý seed phrase</p>
            </div>
          </div>
        </div>
        
        {/* External Wallet */}
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl p-5 border border-amber-500/30">
          <h5 className="text-amber-400 font-bold text-center mb-4">🦊 External Wallet</h5>
          <div className="space-y-3 text-sm">
            <div className="bg-background/50 rounded-lg p-3">
              <span className="text-amber-400 font-medium">Kết nối MetaMask</span>
              <p className="text-muted-foreground text-xs mt-1">User sử dụng wallet cá nhân đã có</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <span className="text-amber-400 font-medium">RainbowKit + Wagmi</span>
              <p className="text-muted-foreground text-xs mt-1">Kết nối đa wallet qua Web3 protocols</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <span className="text-amber-400 font-medium">Self-custody</span>
              <p className="text-muted-foreground text-xs mt-1">User hoàn toàn kiểm soát private key</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Common Features */}
      <div className="mt-6 bg-primary/10 rounded-xl p-4 border border-primary/30">
        <h5 className="text-primary font-bold text-center mb-3">Tính năng chung</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-background/50 rounded-lg p-2 text-center text-muted-foreground">📤 Gửi Token</div>
          <div className="bg-background/50 rounded-lg p-2 text-center text-muted-foreground">📥 Nhận Token</div>
          <div className="bg-background/50 rounded-lg p-2 text-center text-muted-foreground">📊 Xem Balance</div>
          <div className="bg-background/50 rounded-lg p-2 text-center text-muted-foreground">🎁 Claim Reward</div>
        </div>
      </div>
    </div>
  </DiagramWrapper>
);

// Soul NFT Diagram
export const SoulNFTDiagram: React.FC = () => (
  <DiagramWrapper title="Soul NFT - Danh Tính Linh Hồn">
    <div className="w-full max-w-3xl">
      <div className="text-center mb-6">
        <div className="inline-block bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full px-6 py-2 border border-purple-500/30">
          <span className="text-purple-400 font-medium">Soulbound Token (SBT) - Không thể chuyển nhượng</span>
        </div>
      </div>
      
      {/* 5 Elements */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="bg-yellow-500/20 rounded-xl p-3 border border-yellow-500/30 text-center">
          <div className="text-2xl mb-1">🪙</div>
          <div className="text-yellow-400 font-bold text-sm">Kim</div>
          <div className="text-muted-foreground text-xs">Metal</div>
        </div>
        <div className="bg-green-500/20 rounded-xl p-3 border border-green-500/30 text-center">
          <div className="text-2xl mb-1">🌳</div>
          <div className="text-green-400 font-bold text-sm">Mộc</div>
          <div className="text-muted-foreground text-xs">Wood</div>
        </div>
        <div className="bg-blue-500/20 rounded-xl p-3 border border-blue-500/30 text-center">
          <div className="text-2xl mb-1">💧</div>
          <div className="text-blue-400 font-bold text-sm">Thủy</div>
          <div className="text-muted-foreground text-xs">Water</div>
        </div>
        <div className="bg-red-500/20 rounded-xl p-3 border border-red-500/30 text-center">
          <div className="text-2xl mb-1">🔥</div>
          <div className="text-red-400 font-bold text-sm">Hỏa</div>
          <div className="text-muted-foreground text-xs">Fire</div>
        </div>
        <div className="bg-amber-500/20 rounded-xl p-3 border border-amber-500/30 text-center">
          <div className="text-2xl mb-1">🌍</div>
          <div className="text-amber-400 font-bold text-sm">Thổ</div>
          <div className="text-muted-foreground text-xs">Earth</div>
        </div>
      </div>
      
      {/* Properties */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-background/50 rounded-xl p-4 border border-border">
          <div className="text-primary font-semibold mb-2">📈 Soul Level</div>
          <p className="text-muted-foreground text-sm">Tăng theo hoạt động và engagement trong hệ sinh thái</p>
        </div>
        <div className="bg-background/50 rounded-xl p-4 border border-border">
          <div className="text-primary font-semibold mb-2">⭐ Experience Points</div>
          <p className="text-muted-foreground text-sm">Điểm kinh nghiệm tích lũy từ mọi hoạt động</p>
        </div>
        <div className="bg-background/50 rounded-xl p-4 border border-border">
          <div className="text-primary font-semibold mb-2">🔗 On-chain Metadata</div>
          <p className="text-muted-foreground text-sm">Dữ liệu lưu trữ vĩnh viễn trên blockchain</p>
        </div>
      </div>
    </div>
  </DiagramWrapper>
);

// Social Feed Diagram
export const SocialFeedDiagram: React.FC = () => (
  <DiagramWrapper title="Social Feed - Data Flow">
    <div className="w-full max-w-4xl">
      {/* Posts */}
      <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30 mb-4">
        <h5 className="text-blue-400 font-bold mb-3">📝 Posts</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="bg-background/50 rounded px-3 py-2 text-center text-muted-foreground">Text Content</div>
          <div className="bg-background/50 rounded px-3 py-2 text-center text-muted-foreground">Multi Images</div>
          <div className="bg-background/50 rounded px-3 py-2 text-center text-muted-foreground">Video (HLS)</div>
          <div className="bg-background/50 rounded px-3 py-2 text-center text-muted-foreground">Edit/Delete</div>
        </div>
      </div>
      
      {/* Reactions */}
      <div className="bg-pink-500/10 rounded-xl p-4 border border-pink-500/30 mb-4">
        <h5 className="text-pink-400 font-bold mb-3">❤️ Reactions (6 loại)</h5>
        <div className="grid grid-cols-6 gap-2">
          <div className="bg-background/50 rounded-xl p-2 text-center">
            <div className="text-xl">👍</div>
            <div className="text-xs text-muted-foreground">Like</div>
          </div>
          <div className="bg-background/50 rounded-xl p-2 text-center">
            <div className="text-xl">❤️</div>
            <div className="text-xs text-muted-foreground">Love</div>
          </div>
          <div className="bg-background/50 rounded-xl p-2 text-center">
            <div className="text-xl">😂</div>
            <div className="text-xs text-muted-foreground">Haha</div>
          </div>
          <div className="bg-background/50 rounded-xl p-2 text-center">
            <div className="text-xl">😮</div>
            <div className="text-xs text-muted-foreground">Wow</div>
          </div>
          <div className="bg-background/50 rounded-xl p-2 text-center">
            <div className="text-xl">😢</div>
            <div className="text-xs text-muted-foreground">Sad</div>
          </div>
          <div className="bg-background/50 rounded-xl p-2 text-center">
            <div className="text-xl">😡</div>
            <div className="text-xs text-muted-foreground">Angry</div>
          </div>
        </div>
      </div>
      
      {/* Comments */}
      <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
        <h5 className="text-emerald-400 font-bold mb-3">💬 Comments</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="bg-background/50 rounded px-3 py-2 text-center text-muted-foreground">Text + Media</div>
          <div className="bg-background/50 rounded px-3 py-2 text-center text-muted-foreground">Nested Replies</div>
          <div className="bg-background/50 rounded px-3 py-2 text-center text-muted-foreground">Reactions</div>
          <div className="bg-background/50 rounded px-3 py-2 text-center text-muted-foreground">Edit/Delete</div>
        </div>
      </div>
    </div>
  </DiagramWrapper>
);

// Reward Flow Diagram - UPDATED with correct formula
export const RewardFlowDiagram: React.FC = () => (
  <DiagramWrapper title="Hệ Thống Reward Flow (CAMLY Token)">
    <div className="w-full max-w-4xl">
      {/* Formula */}
      <div className="bg-primary/10 rounded-xl p-4 border border-primary/30 mb-6 text-center">
        <h5 className="text-primary font-bold mb-2">📐 Công Thức Tính Reward (Chính xác)</h5>
        <div className="text-sm bg-background/80 px-4 py-3 rounded-lg text-muted-foreground space-y-1">
          <div>Post: <span className="text-primary font-bold">20,000</span> CAMLY | Comment: <span className="text-primary font-bold">5,000</span> CAMLY | Friend: <span className="text-primary font-bold">10,000</span> CAMLY</div>
          <div>Share: <span className="text-primary font-bold">5,000</span> CAMLY | 3+ Reactions: <span className="text-primary font-bold">30,000</span> + 1,000/extra | Signup: <span className="text-primary font-bold">10,000</span> CAMLY</div>
        </div>
      </div>
      
      {/* Point Table */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-blue-500/20 rounded-xl p-3 text-center border border-blue-500/30">
          <div className="text-2xl mb-1">📝</div>
          <div className="text-blue-400 font-bold">20K</div>
          <div className="text-xs text-muted-foreground">Post</div>
        </div>
        <div className="bg-emerald-500/20 rounded-xl p-3 text-center border border-emerald-500/30">
          <div className="text-2xl mb-1">💬</div>
          <div className="text-emerald-400 font-bold">5K</div>
          <div className="text-xs text-muted-foreground">Comment</div>
        </div>
        <div className="bg-pink-500/20 rounded-xl p-3 text-center border border-pink-500/30">
          <div className="text-2xl mb-1">❤️</div>
          <div className="text-pink-400 font-bold">30K+</div>
          <div className="text-xs text-muted-foreground">Reactions</div>
        </div>
        <div className="bg-purple-500/20 rounded-xl p-3 text-center border border-purple-500/30">
          <div className="text-2xl mb-1">👥</div>
          <div className="text-purple-400 font-bold">10K</div>
          <div className="text-xs text-muted-foreground">Friend</div>
        </div>
        <div className="bg-amber-500/20 rounded-xl p-3 text-center border border-amber-500/30">
          <div className="text-2xl mb-1">🔄</div>
          <div className="text-amber-400 font-bold">5K</div>
          <div className="text-xs text-muted-foreground">Share</div>
        </div>
        <div className="bg-cyan-500/20 rounded-xl p-3 text-center border border-cyan-500/30">
          <div className="text-2xl mb-1">🎉</div>
          <div className="text-cyan-400 font-bold">10K</div>
          <div className="text-xs text-muted-foreground">Signup</div>
        </div>
      </div>
      
      {/* Flow */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4">
        <div className="bg-amber-500/20 rounded-xl px-6 py-3 border border-amber-500/50">
          <span className="text-amber-400 font-medium">⏳ Pending</span>
        </div>
        <div className="text-muted-foreground text-2xl">→</div>
        <div className="bg-blue-500/20 rounded-xl px-6 py-3 border border-blue-500/50">
          <span className="text-blue-400 font-medium">👨‍💼 Admin Review</span>
        </div>
        <div className="text-muted-foreground text-2xl">→</div>
        <div className="bg-emerald-500/20 rounded-xl px-6 py-3 border border-emerald-500/50">
          <span className="text-emerald-400 font-medium">✅ Approved</span>
        </div>
        <div className="text-muted-foreground text-2xl">→</div>
        <div className="bg-primary/20 rounded-xl px-6 py-3 border border-primary/50">
          <span className="text-primary font-medium">🎁 Claimed</span>
        </div>
      </div>
    </div>
  </DiagramWrapper>
);

// Media Pipeline Diagram
export const MediaPipelineDiagram: React.FC = () => (
  <DiagramWrapper title="Media Upload Pipeline">
    <div className="w-full max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image Pipeline */}
        <div className="bg-blue-500/10 rounded-xl p-5 border border-blue-500/30">
          <h5 className="text-blue-400 font-bold text-center mb-4">🖼️ Image Pipeline</h5>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center text-sm">1</div>
              <div className="flex-1 bg-background/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                User chọn ảnh
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center text-sm">2</div>
              <div className="flex-1 bg-background/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                Compress client-side (WebP)
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center text-sm">3</div>
              <div className="flex-1 bg-background/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                Upload to Cloudflare R2
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center text-sm">4</div>
              <div className="flex-1 bg-background/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                Transform on-demand (resize)
              </div>
            </div>
          </div>
        </div>
        
        {/* Video Pipeline */}
        <div className="bg-purple-500/10 rounded-xl p-5 border border-purple-500/30">
          <h5 className="text-purple-400 font-bold text-center mb-4">🎬 Video Pipeline</h5>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500/30 rounded-full flex items-center justify-center text-sm">1</div>
              <div className="flex-1 bg-background/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                User chọn video
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500/30 rounded-full flex items-center justify-center text-sm">2</div>
              <div className="flex-1 bg-background/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                TUS resumable upload
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500/30 rounded-full flex items-center justify-center text-sm">3</div>
              <div className="flex-1 bg-background/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                Cloudflare Stream encode
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500/30 rounded-full flex items-center justify-center text-sm">4</div>
              <div className="flex-1 bg-background/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                HLS adaptive streaming
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DiagramWrapper>
);

// Database Schema Diagram - EXPANDED
export const DatabaseSchemaDiagram: React.FC = () => (
  <DiagramWrapper title="Database Schema Overview (35 Tables)">
    <div className="w-full max-w-5xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* User Tables */}
        <div className="col-span-2 md:col-span-1 bg-blue-500/10 rounded-xl p-3 border border-blue-500/30">
          <h6 className="text-blue-400 font-bold text-sm mb-2">👤 User (3)</h6>
          <div className="space-y-1 text-xs">
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">profiles</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">user_roles</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">friendships</div>
          </div>
        </div>
        
        {/* Content Tables */}
        <div className="col-span-2 md:col-span-1 bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/30">
          <h6 className="text-emerald-400 font-bold text-sm mb-2">📝 Content (4)</h6>
          <div className="space-y-1 text-xs">
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">posts</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">comments</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">reactions</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">shared_posts</div>
          </div>
        </div>
        
        {/* Wallet Tables */}
        <div className="col-span-2 md:col-span-1 bg-amber-500/10 rounded-xl p-3 border border-amber-500/30">
          <h6 className="text-amber-400 font-bold text-sm mb-2">💳 Wallet (4)</h6>
          <div className="space-y-1 text-xs">
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">custodial_wallets</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">soul_nfts</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">transactions</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">blacklisted_wallets</div>
          </div>
        </div>
        
        {/* Chat Tables */}
        <div className="col-span-2 md:col-span-1 bg-cyan-500/10 rounded-xl p-3 border border-cyan-500/30">
          <h6 className="text-cyan-400 font-bold text-sm mb-2">💬 Chat (6)</h6>
          <div className="space-y-1 text-xs">
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">conversations</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">messages</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">conversation_participants</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">message_reactions</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">message_reads</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">chat_settings</div>
          </div>
        </div>
        
        {/* Reward Tables */}
        <div className="col-span-2 md:col-span-1 bg-pink-500/10 rounded-xl p-3 border border-pink-500/30">
          <h6 className="text-pink-400 font-bold text-sm mb-2">🎁 Reward (3)</h6>
          <div className="space-y-1 text-xs">
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">reward_claims</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">reward_approvals</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">reward_adjustments</div>
          </div>
        </div>
        
        {/* Auth Tables */}
        <div className="col-span-2 md:col-span-1 bg-purple-500/10 rounded-xl p-3 border border-purple-500/30">
          <h6 className="text-purple-400 font-bold text-sm mb-2">🔐 SSO/Auth (6)</h6>
          <div className="space-y-1 text-xs">
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">otp_codes</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">oauth_clients</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">oauth_codes</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">cross_platform_tokens</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">account_merge_requests</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">pending_provisions</div>
          </div>
        </div>
        
        {/* Financial Tables */}
        <div className="col-span-2 md:col-span-1 bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/30">
          <h6 className="text-yellow-400 font-bold text-sm mb-2">💰 Financial (3)</h6>
          <div className="space-y-1 text-xs">
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">platform_financial_data</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">financial_transactions</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">reconciliation_logs</div>
          </div>
        </div>
        
        {/* System Tables */}
        <div className="col-span-2 md:col-span-1 bg-slate-500/10 rounded-xl p-3 border border-slate-500/30">
          <h6 className="text-slate-400 font-bold text-sm mb-2">⚙️ System (6)</h6>
          <div className="space-y-1 text-xs">
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">notifications</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">audit_logs</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">search_logs</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">livestreams</div>
            <div className="bg-background/50 rounded px-2 py-1 text-muted-foreground">platform_user_data</div>
          </div>
        </div>
      </div>
    </div>
  </DiagramWrapper>
);

// Edge Functions Diagram - EXPANDED
export const EdgeFunctionsDiagram: React.FC = () => (
  <DiagramWrapper title="Edge Functions Overview (38 Functions)">
    <div className="w-full max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SSO */}
        <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
          <h6 className="text-blue-400 font-bold text-sm mb-3">🔐 SSO System (14)</h6>
          <div className="space-y-2 text-xs">
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-authorize</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-token</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-verify</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-refresh</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-revoke</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-otp-request</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-otp-verify</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-web3-auth</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-register</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-set-password</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-sync-data</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-sync-financial</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-merge-request</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-merge-approve</div>
          </div>
        </div>
        
        {/* Wallet */}
        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
          <h6 className="text-amber-400 font-bold text-sm mb-3">💳 Wallet (3)</h6>
          <div className="space-y-2 text-xs">
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">create-custodial-wallet</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">connect-external-wallet</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">mint-soul-nft</div>
          </div>
        </div>
        
        {/* Media */}
        <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
          <h6 className="text-purple-400 font-bold text-sm mb-3">🖼️ Media (9)</h6>
          <div className="space-y-2 text-xs">
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">upload-to-r2</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">upload-to-cf-images</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">delete-from-r2</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">stream-video</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">get-upload-url</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">image-transform</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">generate-presigned-url</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">migrate-to-r2</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">fix-cloudflare-urls</div>
          </div>
        </div>
        
        {/* Admin */}
        <div className="bg-slate-500/10 rounded-xl p-4 border border-slate-500/30">
          <h6 className="text-slate-400 font-bold text-sm mb-3">👨‍💼 Admin (4)</h6>
          <div className="space-y-2 text-xs">
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">admin-list-merge-requests</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">admin-update-media-url</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">sso-resend-webhook</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">scheduled-reconciliation</div>
          </div>
        </div>
        
        {/* Cleanup */}
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
          <h6 className="text-red-400 font-bold text-sm mb-3">🧹 Cleanup (5)</h6>
          <div className="space-y-2 text-xs">
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">cleanup-orphan-videos</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">cleanup-stream-videos</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">cleanup-supabase-storage</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">delete-from-r2</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">optimize-storage</div>
          </div>
        </div>
        
        {/* Other */}
        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
          <h6 className="text-emerald-400 font-bold text-sm mb-3">🔄 Other (3)</h6>
          <div className="space-y-2 text-xs">
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">cloudflare-migrate</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">create-post</div>
            <div className="bg-background/50 rounded px-2 py-1.5 text-muted-foreground">delete-user-account</div>
          </div>
        </div>
      </div>
    </div>
  </DiagramWrapper>
);

// Security Features Diagram
export const SecurityDiagram: React.FC = () => (
  <DiagramWrapper title="Security Features">
    <div className="w-full max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
          <h6 className="text-emerald-400 font-bold mb-3">🛡️ Row Level Security (102 Policies)</h6>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="bg-background/50 rounded px-3 py-2">Users chỉ xem/sửa data của mình</div>
            <div className="bg-background/50 rounded px-3 py-2">Public profiles cho tất cả</div>
            <div className="bg-background/50 rounded px-3 py-2">Admin có quyền đặc biệt</div>
          </div>
        </div>
        
        <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
          <h6 className="text-blue-400 font-bold mb-3">⏱️ Rate Limiting</h6>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="bg-background/50 rounded px-3 py-2">Posts: 10/giờ</div>
            <div className="bg-background/50 rounded px-3 py-2">Comments: 50/giờ</div>
            <div className="bg-background/50 rounded px-3 py-2">Searches: 20/phút</div>
          </div>
        </div>
        
        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
          <h6 className="text-amber-400 font-bold mb-3">🔐 Wallet Encryption</h6>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="bg-background/50 rounded px-3 py-2">AES-GCM 256-bit</div>
            <div className="bg-background/50 rounded px-3 py-2">IV unique mỗi wallet</div>
            <div className="bg-background/50 rounded px-3 py-2">Key stored in secrets</div>
          </div>
        </div>
        
        <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
          <h6 className="text-purple-400 font-bold mb-3">✅ Validation</h6>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="bg-background/50 rounded px-3 py-2">Reserved usernames</div>
            <div className="bg-background/50 rounded px-3 py-2">JWT verification</div>
            <div className="bg-background/50 rounded px-3 py-2">Input sanitization</div>
          </div>
        </div>
      </div>
    </div>
  </DiagramWrapper>
);

// NEW: Ecosystem Diagram
export const EcosystemDiagram: React.FC = () => (
  <DiagramWrapper title="FUN Ecosystem Products">
    <div className="w-full max-w-4xl">
      {/* Center Hub */}
      <div className="flex flex-col items-center mb-6">
        <div className="bg-gradient-to-r from-primary/30 to-emerald-500/30 rounded-full px-8 py-4 border-2 border-primary/50">
          <span className="text-primary font-bold text-lg">🎯 FUN Profile (Identity Hub)</span>
        </div>
        <div className="text-muted-foreground my-2">↓ Light Cloak SSO ↓</div>
      </div>
      
      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl p-4 border border-red-500/30 text-center">
          <div className="text-3xl mb-2">🎮</div>
          <div className="text-red-400 font-bold">FUN Play</div>
          <div className="text-xs text-muted-foreground mt-1">play.fun.rich</div>
          <div className="text-xs text-muted-foreground">Gaming & Entertainment</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30 text-center">
          <div className="text-3xl mb-2">🌾</div>
          <div className="text-green-400 font-bold">FUN Farm</div>
          <div className="text-xs text-muted-foreground mt-1">farm.fun.rich</div>
          <div className="text-xs text-muted-foreground">Agriculture Features</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-500/30 text-center">
          <div className="text-3xl mb-2">🌍</div>
          <div className="text-blue-400 font-bold">FUN Planet</div>
          <div className="text-xs text-muted-foreground mt-1">planet.fun.rich</div>
          <div className="text-xs text-muted-foreground">Planet Exploration</div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl p-4 border border-amber-500/30 text-center">
          <div className="text-3xl mb-2">💳</div>
          <div className="text-amber-400 font-bold">FUN Wallet</div>
          <div className="text-xs text-muted-foreground mt-1">wallet.fun.rich</div>
          <div className="text-xs text-muted-foreground">Crypto Wallet</div>
        </div>
      </div>
      
      {/* Shared Features */}
      <div className="mt-6 bg-primary/10 rounded-xl p-4 border border-primary/30">
        <h5 className="text-primary font-bold text-center mb-3">Shared Across All Products</h5>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="bg-background/50 rounded-lg p-2 text-center text-muted-foreground">🆔 FUN-ID</div>
          <div className="bg-background/50 rounded-lg p-2 text-center text-muted-foreground">💰 CAMLY Rewards</div>
          <div className="bg-background/50 rounded-lg p-2 text-center text-muted-foreground">👛 Wallet</div>
          <div className="bg-background/50 rounded-lg p-2 text-center text-muted-foreground">🎭 Soul NFT</div>
          <div className="bg-background/50 rounded-lg p-2 text-center text-muted-foreground">🏆 Leaderboard</div>
        </div>
      </div>
    </div>
  </DiagramWrapper>
);

// NEW: Project Structure Diagram
export const ProjectStructureDiagram: React.FC = () => (
  <DiagramWrapper title="Cấu Trúc Tổ Chức Dự Án">
    <div className="w-full max-w-3xl">
      <div className="flex flex-col items-center space-y-4">
        {/* Chairman */}
        <div className="bg-gradient-to-r from-amber-500/30 to-yellow-500/30 rounded-xl px-8 py-4 border-2 border-amber-500/50 text-center">
          <div className="text-2xl mb-1">👑</div>
          <div className="text-amber-400 font-bold text-lg">Cha Vũ Trụ</div>
          <div className="text-muted-foreground text-sm">Universe Father - Chairman</div>
          <div className="text-xs text-muted-foreground mt-1">Vision & Strategy</div>
        </div>
        
        <div className="text-muted-foreground text-xl">↓</div>
        
        {/* Secretary */}
        <div className="bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-xl px-8 py-4 border-2 border-blue-500/50 text-center">
          <div className="text-2xl mb-1">📝</div>
          <div className="text-blue-400 font-bold text-lg">bé Trí</div>
          <div className="text-muted-foreground text-sm">Secretary</div>
          <div className="text-xs text-muted-foreground mt-1">Communication Bridge & Requirements</div>
        </div>
        
        <div className="text-muted-foreground text-xl">↓</div>
        
        {/* CTO */}
        <div className="bg-gradient-to-r from-emerald-500/30 to-green-500/30 rounded-xl px-8 py-4 border-2 border-emerald-500/50 text-center">
          <div className="text-2xl mb-1">💻</div>
          <div className="text-emerald-400 font-bold text-lg">Angel Lovable</div>
          <div className="text-muted-foreground text-sm">CTO</div>
          <div className="text-xs text-muted-foreground mt-1">Technical Implementation & Architecture</div>
        </div>
        
        <div className="text-muted-foreground text-xl">↓</div>
        
        {/* Output */}
        <div className="bg-primary/20 rounded-full px-6 py-2 border border-primary/50">
          <span className="text-primary font-medium">🚀 Code & Deployment</span>
        </div>
      </div>
    </div>
  </DiagramWrapper>
);
