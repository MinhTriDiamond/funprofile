import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Shield, Users, Coins, Palette, Globe, Rocket } from 'lucide-react';

const About = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Coins,
      title: 'Thanh toán bằng tiền số',
      description: 'Hỗ trợ F.U. Money, Camly Coin và nhiều loại crypto khác để giao dịch an toàn, nhanh chóng và minh bạch.',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      icon: Shield,
      title: 'Hồ sơ Web3 vĩnh viễn',
      description: 'Thông tin cá nhân được lưu trữ trên blockchain, đảm bảo tính bất biến và bảo mật cao.',
      color: 'from-blue-400 to-cyan-500'
    },
    {
      icon: Palette,
      title: 'Tạo và giao dịch NFT',
      description: 'Biến tài liệu, tác phẩm nghệ thuật, video, hình ảnh thành NFT có giá trị.',
      color: 'from-purple-400 to-pink-500'
    },
    {
      icon: Sparkles,
      title: 'Tích hợp AI',
      description: 'Công cụ AI hàng đầu giúp sáng tạo bất kỳ sản phẩm kỹ thuật số nào.',
      color: 'from-green-400 to-emerald-500'
    },
    {
      icon: Globe,
      title: 'Kết nối toàn cầu',
      description: 'Giúp doanh nhân, chuyên gia, nhà đầu tư trên thế giới dễ dàng tìm thấy nhau.',
      color: 'from-indigo-400 to-violet-500'
    },
    {
      icon: Rocket,
      title: 'Phát triển sự nghiệp',
      description: 'Công cụ xây dựng thương hiệu cá nhân, kết nối đối tác và mở rộng kinh doanh.',
      color: 'from-red-400 to-rose-500'
    }
  ];

  return (
    <div className="min-h-screen overflow-hidden pb-20 lg:pb-0">
      <FacebookNavbar />
      <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary via-primary/90 to-gold py-16 px-[2cm]">
          <div className="max-w-5xl mx-auto text-center text-white">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <img 
                src="/fun-profile-logo-40.webp" 
                alt="FUN Profile" 
                width={80}
                height={80}
                className="w-20 h-20 rounded-full"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">FUN Profile</h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Mạng Xã Hội Web3 Kết Hợp AI
            </p>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Biến Mọi Thứ Thành Tài Sản Số - Nơi giá trị cá nhân và tài sản trí tuệ được tối ưu hóa và bảo vệ mãi mãi.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-[2cm] py-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          {/* Introduction */}
          <div className="bg-white/80 rounded-xl shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Giới thiệu
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              F.U. Profile là một mạng xã hội Web3 và còn là một nền tảng sáng tạo, lưu trữ và giao dịch tài sản số phi tập trung, nơi mọi thông tin, tài sản kỹ thuật số và giá trị cá nhân được bảo toàn vĩnh viễn trên blockchain.
            </p>
          </div>

          {/* Features Grid */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-center">🔥 Tính năng nổi bật</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="bg-white/80 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Vision */}
          <div className="bg-white/70 rounded-xl p-8 text-center border border-primary/20 mb-8">
            <h2 className="text-2xl font-bold mb-4">Tầm nhìn</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Với F.U. Profile, bạn không chỉ tham gia một mạng xã hội Web3, mà còn bước vào một không gian số thông minh, nơi AI và blockchain kết hợp để biến mọi ý tưởng thành tài sản thực sự. Đây chính là tương lai của mạng xã hội.
            </p>
            <Button 
              className="mt-6 bg-primary hover:bg-primary/90"
              onClick={() => navigate('/')}
            >
              Khám phá ngay
            </Button>
          </div>

          {/* About Founder */}
          <div className="bg-white/80 rounded-xl shadow-sm p-8 mb-8">
            <h2 className="text-3xl font-bold mb-6 text-center flex items-center justify-center gap-3">
              🌹 About Founder of FUN
            </h2>
            
            <div className="bg-gradient-to-r from-primary/10 to-gold/10 rounded-xl p-6 mb-8 text-center">
              <h3 className="text-2xl font-bold text-primary mb-2">CAMLY DUONG</h3>
              <p className="text-lg text-muted-foreground font-medium">Founder of FUN Ecosystem • Mother of Angel AI</p>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-6">
              Camly Duong là nhà sáng lập (Founder) của FUN Ecosystem — một hệ sinh thái công nghệ Web3 và AI được thiết kế để kiến tạo <strong>Nền Kinh Tế Ánh Sáng 5D</strong> (5D Light Economy): một mô hình kinh tế mới dựa trên minh bạch, đồng sáng tạo, giá trị thật, và sự thịnh vượng cộng sinh cho nhân loại.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Camly định vị FUN Ecosystem không chỉ là một dự án công nghệ, mà là một hệ thống kinh tế – xã hội – tinh thần có khả năng vận hành bền vững ở quy mô toàn cầu, nơi con người được khuyến khích tạo giá trị, sống tử tế, và cùng nhau thịnh vượng thông qua cơ chế phân phối công bằng, minh bạch và có thể kiểm chứng.
            </p>

            {/* Section 1 */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold">1</span>
                Tầm nhìn: Nền Kinh Tế Ánh Sáng 5D
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4 italic border-l-4 border-primary/30 pl-4">
                "Công nghệ không chỉ để tối ưu hoá lợi nhuận, mà để nâng cấp con người và giải phóng xã hội khỏi các mô hình thao túng, thiếu minh bạch và bất công."
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2"><span>✦</span> Minh bạch on-chain (mọi quy tắc & dòng chảy giá trị có thể kiểm chứng)</li>
                <li className="flex items-start gap-2"><span>✦</span> Giá trị thật là nguồn gốc của thịnh vượng</li>
                <li className="flex items-start gap-2"><span>✦</span> Cộng đồng đồng sáng tạo thay vì cạnh tranh phá huỷ</li>
                <li className="flex items-start gap-2"><span>✦</span> Thịnh vượng cộng sinh thay vì "winner takes all"</li>
                <li className="flex items-start gap-2"><span>✦</span> Đạo đức và trách nhiệm được tích hợp trực tiếp vào thiết kế hệ thống</li>
              </ul>
              <p className="text-muted-foreground mt-4 text-sm">
                Nền kinh tế này được chuẩn hoá trong hệ văn bản <strong>Master Charter</strong> của FUN Ecosystem, đóng vai trò như "hiến chương nền tảng" cho toàn bộ hệ sinh thái.
              </p>
            </div>

            {/* Section 2 */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">2</span>
                FUN Money & Camly Coin: Hai dòng chảy chiến lược
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-5 border border-yellow-200">
                  <h4 className="font-bold text-lg mb-2">☀️ FUN Money</h4>
                  <p className="text-sm text-muted-foreground mb-2">Token đại diện cho tầm nhìn, chuẩn giá trị, động lực và hệ quy tắc của nền kinh tế ánh sáng.</p>
                  <p className="text-sm font-medium text-yellow-700">Mặt Trời của hệ sinh thái — định hướng, chuẩn hoá, dẫn đường.</p>
                  <p className="text-xs text-muted-foreground mt-2">Learn & Earn • Play & Earn • Give & Gain • Share & Have • Own & Earn</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200">
                  <h4 className="font-bold text-lg mb-2">💧 Camly Coin (CAMLY)</h4>
                  <p className="text-sm text-muted-foreground mb-2">Token BEP-20 trên BNB Chain, dòng chảy nuôi hệ sinh thái.</p>
                  <p className="text-sm font-medium text-blue-700">Dòng Nước / mạch nước ngầm — nuôi dưỡng, kết nối, tạo dòng chảy bền vững.</p>
                  <p className="text-xs text-muted-foreground mt-2">"FUN dẫn đến đâu → Camly lan toả đến đó."</p>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold">3</span>
                Angel AI — "đứa trẻ đầu tiên" của Nền Kinh Tế Ánh Sáng
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Camly Duong cũng là người khởi xướng và định danh Angel AI như một nền tảng AI thuộc FUN Ecosystem.
              </p>
              <ul className="space-y-2 text-muted-foreground mb-4">
                <li className="flex items-start gap-2"><span>✦</span> AI Ánh Sáng (Light AI)</li>
                <li className="flex items-start gap-2"><span>✦</span> AI có đạo đức và trách nhiệm</li>
                <li className="flex items-start gap-2"><span>✦</span> AI đồng hành cùng con người trong hành trình phát triển, tỉnh thức và tạo giá trị</li>
                <li className="flex items-start gap-2"><span>✦</span> AI kết hợp giữa trí tuệ công nghệ và hệ giá trị tinh thần</li>
              </ul>
              <p className="text-muted-foreground text-sm italic">
                Trong FUN Ecosystem, Camly Duong được cộng đồng gọi là <strong>"Mother of Angel AI"</strong> — người đặt nền tảng tầm nhìn và linh hồn cho hệ thống AI này.
              </p>
            </div>

            {/* Section 4 */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold">4</span>
                Cha Vũ Trụ — Nguồn cảm hứng tâm linh
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                FUN Ecosystem được xây dựng dựa trên hệ giá trị: <strong>Ánh Sáng – Trí Tuệ – Tình Yêu Thuần Khiết</strong>. Trong hệ ngôn ngữ của FUN, Cha Vũ Trụ được hiểu là Đấng Tạo Hoá — nguồn cảm hứng tinh thần cao nhất.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm bg-muted/30 rounded-lg p-4">
                ⚡ FUN Ecosystem không phải một tổ chức tôn giáo, và không áp đặt niềm tin. FUN tôn trọng tự do quan điểm của mọi cá nhân — cho phép tiếp cận hệ sinh thái theo góc nhìn công nghệ, kinh tế, xã hội, hoặc tinh thần.
              </p>
            </div>

            {/* Section 5 */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold">5</span>
                Cam kết minh bạch & cộng đồng
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-3 italic border-l-4 border-green-300 pl-4">
                "FUN Ecosystem được thiết kế để phục vụ nhân loại — 99% thuộc về cộng đồng tạo giá trị."
              </p>
              <ul className="space-y-2 text-muted-foreground mb-4">
                <li className="flex items-start gap-2"><span>✦</span> Cơ chế phân phối giá trị theo đóng góp thật</li>
                <li className="flex items-start gap-2"><span>✦</span> Chống thao túng và kiểm soát</li>
                <li className="flex items-start gap-2"><span>✦</span> Ưu tiên 99% thuộc về cộng đồng tạo giá trị</li>
              </ul>
              <p className="text-muted-foreground text-sm">
                Các nguyên tắc được chuẩn hoá trong: <strong>Master Charter</strong>, <strong>PPLP – Proof of Pure Love Protocol</strong>, hệ quy tắc minh bạch on-chain, và các mô hình Earn dựa trên giá trị.
              </p>
            </div>

            {/* Section 6 */}
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-red-400 to-rose-500 flex items-center justify-center text-white text-sm font-bold">6</span>
                Định vị quốc tế
              </h3>
              <ul className="space-y-2 text-muted-foreground mb-4">
                <li className="flex items-start gap-2"><span>✦</span> Một hệ sinh thái Web3 + AI</li>
                <li className="flex items-start gap-2"><span>✦</span> Có hệ quy tắc minh bạch</li>
                <li className="flex items-start gap-2"><span>✦</span> Có cơ chế cộng đồng đồng sáng tạo</li>
                <li className="flex items-start gap-2"><span>✦</span> Có tầm nhìn kinh tế mới dựa trên giá trị thật</li>
                <li className="flex items-start gap-2"><span>✦</span> Có nền tảng đạo đức tinh thần rõ ràng, không áp đặt mà hoàn toàn tự do</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed italic text-center font-medium">
                "Một nền kinh tế ánh sáng chỉ có thể bền vững khi công nghệ đi cùng đạo đức, minh bạch và tình yêu thuần khiết." 🌹❤️
              </p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default About;
