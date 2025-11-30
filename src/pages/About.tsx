import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Video Background */}
      <div className="fixed inset-0 -z-10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/space-background.mp4" type="video/mp4" />
        </video>
      </div>

      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-primary-dark hover:text-primary hover:bg-primary/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Info className="w-6 h-6 text-primary" />
              Về FUN Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="text-base text-foreground space-y-4 leading-relaxed">
            <p className="font-semibold text-lg">✳️ F.U. Profile – Mạng Xã Hội Web3 Kết Hợp AI, Biến Mọi Thứ Thành Tài Sản Số</p>
            
            <p>F.U. Profile là một mạng xã hội Web3 và còn là một nền tảng sáng tạo, lưu trữ và giao dịch tài sản số phi tập trung, nơi mọi thông tin, tài sản kỹ thuật số và giá trị cá nhân được bảo toàn vĩnh viễn trên blockchain.</p>

            <h3 className="font-bold text-lg pt-4">🔥 Tính năng nổi bật:</h3>

            <div className="space-y-3">
              <div>
                <p className="font-semibold">✅ Thanh toán bằng tiền số:</p>
                <p className="pl-6">Hỗ trợ F.U. Money, Camly Coin và nhiều loại crypto khác để giao dịch an toàn, nhanh chóng và minh bạch.</p>
              </div>

              <div>
                <p className="font-semibold">✅ Hồ sơ Web3 vĩnh viễn:</p>
                <p className="pl-6">Thông tin cá nhân, hồ sơ công ty, thành tựu, hoạt động và dữ liệu của người dùng được lưu trữ trên blockchain, đảm bảo tính bất biến, bảo mật cao và không thể bị thao túng hoặc giả mạo.</p>
              </div>

              <div>
                <p className="font-semibold">✅ Tạo và giao dịch NFT dễ dàng:</p>
                <ul className="pl-6 space-y-2 list-disc list-inside">
                  <li>Những tài liệu quan trọng, tác phẩm nghệ thuật, video, hình ảnh, và mọi tài sản kỹ thuật số khác đều có thể tạo thành NFT.</li>
                  <li>NFT giúp bảo toàn giá trị, tránh sao chép hoặc đánh cắp nội dung.</li>
                  <li>Giá trị của các NFT có thể tăng theo thời gian, mở ra cơ hội đầu tư và sở hữu tài sản số độc quyền.</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold">✅ Tích hợp AI để sáng tạo sản phẩm kỹ thuật số không giới hạn:</p>
                <ul className="pl-6 space-y-2 list-disc list-inside">
                  <li>F.U. Profile tích hợp các công cụ AI hàng đầu trên thị trường, giúp người dùng dễ dàng sáng tạo bất kỳ sản phẩm nghệ thuật hoặc kỹ thuật số nào mà họ mong muốn.</li>
                  <li>Từ tranh vẽ, thiết kế đồ họa, âm nhạc, video, nội dung số cho đến mô hình 3D – tất cả đều sẵn sàng để trở thành NFT có giá trị trên blockchain.</li>
                  <li>AI & Blockchain phối hợp đồng bộ, giúp bạn tạo ra những profile có giá trị vô cùng lớn.</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold">✅ Kết nối những người thành công toàn cầu:</p>
                <p className="pl-6">Giúp doanh nhân, chuyên gia, nhà đầu tư, nhà sáng lập và các cá nhân xuất sắc trên thế giới dễ dàng tìm thấy nhau để hợp tác và phát triển.</p>
              </div>

              <div>
                <p className="font-semibold">✅ Hỗ trợ phát triển sự nghiệp & doanh nghiệp:</p>
                <ul className="pl-6 space-y-2 list-disc list-inside">
                  <li>Công cụ xây dựng thương hiệu cá nhân, kết nối đối tác.</li>
                  <li>Cơ hội mở rộng kinh doanh và tiếp cận nguồn tài chính phi tập trung (DeFi).</li>
                </ul>
              </div>
            </div>

            <p className="pt-4 font-medium">Với F.U. Profile, bạn không chỉ tham gia một mạng xã hội Web3, mà còn bước vào một không gian số thông minh, nơi AI và blockchain kết hợp để biến mọi ý tưởng thành tài sản thực sự. Đây chính là tương lai của mạng xã hội – nơi giá trị cá nhân và tài sản trí tuệ được tối ưu hóa và bảo vệ mãi mãi.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;
