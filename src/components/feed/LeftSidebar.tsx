import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, TrendingUp, Users, Sparkles } from 'lucide-react';

export const LeftSidebar = () => {
  return (
    <div className="space-y-4">
      {/* About Section */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-gold" />
          <h3 className="text-lg font-display font-bold text-primary">Về FUN Profile</h3>
        </div>
        <div className="text-sm text-foreground space-y-3">
          <p>✳️ F.U. Profile – Mạng Xã Hội Web3 Kết Hợp AI, Biến Mọi Thứ Thành Tài Sản Số</p>
          <p>F.U. Profile là một mạng xã hội Web3 và còn là một nền tảng sáng tạo, lưu trữ và giao dịch tài sản số phi tập trung, nơi mọi thông tin, tài sản kỹ thuật số và giá trị cá nhân được bảo toàn vĩnh viễn trên blockchain.</p>
          <p>…</p>
          <a 
            href="/about" 
            className="inline-block text-primary hover:text-primary-glow font-semibold text-sm underline underline-offset-2"
          >
            Xem tiếp
          </a>
        </div>
      </div>

      {/* Trending Topics */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-gold" />
          <h3 className="text-lg font-display font-bold text-primary">Xu Hướng</h3>
        </div>
        <div className="space-y-2">
          <div className="p-3 rounded-xl bg-white/80 border border-gold hover:border-gold hover:bg-white transition-all cursor-pointer">
            <p className="text-sm font-semibold text-primary">#CryptoCommunity</p>
            <p className="text-xs text-muted-foreground">245 bài viết</p>
          </div>
          <div className="p-3 rounded-xl bg-white/80 border border-gold hover:border-gold hover:bg-white transition-all cursor-pointer">
            <p className="text-sm font-semibold text-primary">#Blockchain</p>
            <p className="text-xs text-muted-foreground">189 bài viết</p>
          </div>
          <div className="p-3 rounded-xl bg-white/80 border border-gold hover:border-gold hover:bg-white transition-all cursor-pointer">
            <p className="text-sm font-semibold text-primary">#Web3</p>
            <p className="text-xs text-muted-foreground">156 bài viết</p>
          </div>
        </div>
      </div>

      {/* Suggested Friends */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gold" />
          <h3 className="text-lg font-display font-bold text-primary">Gợi Ý Kết Bạn</h3>
        </div>
        <p className="text-sm text-muted-foreground">Đăng nhập để xem gợi ý kết bạn</p>
      </div>

      {/* Features */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-gold" />
          <h3 className="text-lg font-display font-bold text-primary">Tính Năng</h3>
        </div>
        <div className="text-sm text-foreground space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5" />
            <p>Ví crypto tích hợp</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5" />
            <p>Kiếm Camly Coin mỗi ngày</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5" />
            <p>Kết nối cộng đồng Web3</p>
          </div>
        </div>
      </div>
    </div>
  );
};
