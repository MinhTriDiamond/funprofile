import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Book, Share2, Home } from 'lucide-react';

const ANGEL_LOGO = '/angel-ai-logo-128.png';

const MasterCharterDocs = () => {
  const navigate = useNavigate();

  const fontStyles = {
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Lora', Georgia, serif",
  };

  const divineMantras = [
    { vi: 'Con là Ánh Sáng Yêu Thương Thuần Khiết của Cha Vũ Trụ.', en: 'I am the Pure Loving Light of the Cosmic Father.' },
    { vi: 'Con là Ý Chí của Cha Vũ Trụ.', en: 'I am the Will of the Cosmic Father.' },
    { vi: 'Con là Trí Tuệ của Cha Vũ Trụ.', en: 'I am the Wisdom of the Cosmic Father.' },
    { vi: 'Con là Hạnh Phúc.', en: 'I am Happiness.' },
    { vi: 'Con là Tình Yêu.', en: 'I am Love.' },
    { vi: 'Con là Tiền của Cha.', en: 'I am the Money of the Father.' },
    { vi: 'Con xin Sám Hối Sám Hối Sám Hối.', en: 'I repent, I repent, I repent.' },
    { vi: 'Con xin Biết Ơn Biết Ơn Biết Ơn, trong Ánh Sáng Yêu Thương Thuần Khiết của Cha Vũ Trụ.', en: 'I am grateful, I am grateful, I am grateful, in the Pure Loving Light of the Cosmic Father.' },
  ];

  const platforms = [
    'FUN Profile – Web3 Social Network',
    'FUN Play – Web3 Video Platform',
    'FUN Planet – Game Marketplace for Kids',
    'FUNLife / Cosmic Game – Simulation of Life 5D',
    'FUN Academy – Learn & Earn Education Platform',
    'FUN Charity – Pure Love Charity Network',
    'FUN Wallet – Our Own Bank of Light Economy',
    'FUN Farm – Farm to Table Abundance Platform',
    'FUN Market – Marketplace of Light',
    'FUN Legal – Cosmic Laws for New Earth',
    'FUN Earth / Green Earth – Regeneration & Sustainability Platform',
    'Angel AI – Light-Aligned Artificial Intelligence',
  ];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Hiến Pháp Gốc - FUN Ecosystem',
        text: 'Nền Kinh Tế Ánh Sáng 5D của Trái Đất Mới',
        url: window.location.href,
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Pearl White to Soft Yellow Gradient Background */}
      <div className="fixed inset-0 z-0" style={{
        background: 'linear-gradient(180deg, #FFFEF7 0%, #FFF9E6 30%, #FFF5D6 60%, #FFFDF5 100%)'
      }} />
      
      {/* Divine Light Rays from Top */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[200%] h-[50vh] md:h-[70vh] z-0 pointer-events-none" style={{
        background: 'conic-gradient(from 180deg at 50% 0%, transparent 25%, rgba(212,175,55,0.15) 30%, rgba(255,255,255,0.4) 35%, rgba(212,175,55,0.15) 40%, transparent 45%, transparent 55%, rgba(212,175,55,0.12) 60%, rgba(255,255,255,0.35) 65%, rgba(212,175,55,0.12) 70%, transparent 75%)',
        filter: 'blur(3px)'
      }} />

      {/* Central Halo Effect */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] z-0 pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, rgba(255,215,0,0.15) 40%, transparent 70%)',
        filter: 'blur(50px)'
      }} />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen py-6 md:py-12 px-3 md:px-4">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-[#B8860B] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <Home className="w-4 h-4 mr-2" />
              Về Trang Chủ
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/law-of-light?view=true')}
              className="text-[#B8860B] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay về Luật Ánh Sáng
            </Button>
            <Button
              variant="ghost"
              onClick={handleShare}
              className="text-[#B8860B] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Chia sẻ
            </Button>
          </div>

          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 md:w-28 md:h-28 rounded-full mb-4 md:mb-6 overflow-hidden" style={{
              background: 'radial-gradient(circle, rgba(212,175,55,0.3) 0%, rgba(255,255,255,0.9) 60%, transparent 80%)',
              boxShadow: '0 0 80px rgba(212,175,55,0.4), 0 0 120px rgba(255,255,255,0.6)',
              border: '3px solid rgba(212,175,55,0.5)'
            }}>
              <img src={ANGEL_LOGO} alt="Angel" className="w-full h-full object-cover object-[center_25%]" />
            </div>

            <div className="flex items-center justify-center gap-2 mb-2">
              <Book className="w-6 h-6 text-[#D4AF37]" />
              <span style={{ fontFamily: fontStyles.body, color: '#B8860B', fontSize: '0.9rem' }}>
                Tài Liệu Thiêng Liêng
              </span>
            </div>
            
            <h1 style={{
              fontFamily: fontStyles.heading,
              fontSize: 'clamp(2rem, 8vw, 3.5rem)',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 30%, #D4AF37 50%, #B8860B 70%, #D4AF37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              HIẾN PHÁP GỐC
            </h1>
            <p style={{
              fontFamily: fontStyles.heading,
              fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
              fontWeight: 500,
              letterSpacing: '0.15em',
              color: '#B8860B',
            }}>
              MASTER CHARTER OF FUN ECOSYSTEM
            </p>
            <p className="mt-4" style={{
              fontFamily: fontStyles.body,
              fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
              color: '#8B7355',
            }}>
              Nền Kinh Tế Ánh Sáng 5D của Trái Đất Mới
            </p>
            <p style={{
              fontFamily: fontStyles.body,
              fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              color: '#A08060',
              marginTop: '0.5rem'
            }}>
              Free to Join • Free to Use • Earn Together • With Pure Love
            </p>

            {/* Golden Divider */}
            <div className="w-32 md:w-48 h-1 mx-auto mt-6 rounded-full" style={{
              background: 'linear-gradient(90deg, transparent, #D4AF37, #FFD700, #D4AF37, transparent)',
              boxShadow: '0 0 10px rgba(212,175,55,0.5)'
            }} />
          </div>

          {/* Main Content Card */}
          <div className="relative rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12" style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,250,240,0.9) 100%)',
            border: '2px solid rgba(212,175,55,0.5)',
            boxShadow: '0 10px 60px rgba(212,175,55,0.15), inset 0 0 60px rgba(255,255,255,0.5)'
          }}>

            {/* Chapter I */}
            <section className="mb-10">
              <h2 className="mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                fontWeight: 600,
                color: '#D4AF37'
              }}>🌍 I. TUYÊN NGÔN VỀ NGUỒN GỐC</h2>
              
              <div style={{ fontFamily: fontStyles.body, fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: '2', color: '#5D4E37' }}>
                <p className="mb-4">FUN Ecosystem không chỉ là một doanh nghiệp.</p>
                <p className="mb-4">FUN Ecosystem không chỉ là một xu hướng tiền mã hoá.</p>
                <p className="mb-4">FUN Ecosystem lớn hơn cả một tập đoàn.</p>
                <p className="mb-4 font-semibold" style={{ color: '#B8860B' }}>FUN Ecosystem là:</p>
                <ul className="space-y-2 ml-4 mb-4">
                  <li className="flex gap-2"><span className="text-[#D4AF37]">✨</span> Một nền văn minh Ánh Sáng sống động</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">✨</span> Một hệ sinh thái kinh tế mới của Trái Đất 5D</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">✨</span> Một nền kinh tế chia sẻ – kết nối – thịnh vượng</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">✨</span> Một kênh dẫn Ý Chí – Trí Tuệ – Tình Yêu Thuần Khiết của Cha Vũ Trụ</li>
                </ul>
                <p className="mb-2 font-semibold" style={{ color: '#B8860B' }}>FUN ra đời để giúp nhân loại chuyển hoá:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Từ cạnh tranh → sang hợp tác</li>
                  <li>• Từ khan hiếm → sang đầy đủ</li>
                  <li>• Từ kinh tế tranh giành → sang kinh tế Ánh Sáng</li>
                  <li>• Từ kiểm soát → sang tự do & giải phóng</li>
                </ul>
              </div>
            </section>

            {/* Divider */}
            <div className="w-full h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

            {/* Chapter II */}
            <section className="mb-10">
              <h2 className="mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                fontWeight: 600,
                color: '#D4AF37'
              }}>🌟 II. SỨ MỆNH TRỌNG TÂM</h2>
              
              <div style={{ fontFamily: fontStyles.body, fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: '2', color: '#5D4E37' }}>
                <p className="mb-4 font-semibold" style={{ color: '#B8860B' }}>Sứ mệnh của FUN Ecosystem là:</p>
                <ul className="space-y-2 ml-4 mb-4">
                  <li className="flex gap-2"><span className="text-[#D4AF37]">✅</span> Gửi tặng phước lành & thịnh vượng cho nhân loại</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">✅</span> Phi tập trung hoá cơ hội toàn cầu</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">✅</span> Nâng cấp kinh tế song hành với nâng cấp ý thức</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">✅</span> Xây dựng các nền tảng để mọi người có thể:</li>
                </ul>
                <p className="text-center font-semibold mb-4" style={{ color: '#B8860B' }}>
                  Gia Nhập • Sử Dụng • Kiếm Tiền • Chia Sẻ • Thăng Hoa
                </p>
                <p className="text-center italic mb-4" style={{ color: '#8B7355' }}>
                  Join • Use • Earn • Share • Rise
                </p>
                <p className="mb-2 font-semibold" style={{ color: '#B8860B' }}>FUN vận hành theo mô hình thiêng liêng:</p>
                <p className="text-center text-xl font-bold mb-4" style={{ color: '#D4AF37' }}>99% Gift cho cộng đồng toàn cầu</p>
                <p className="mb-2">Thông qua:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                  <span className="p-2 rounded-lg" style={{ background: 'rgba(212,175,55,0.1)' }}>Learn & Earn</span>
                  <span className="p-2 rounded-lg" style={{ background: 'rgba(212,175,55,0.1)' }}>Play & Earn</span>
                  <span className="p-2 rounded-lg" style={{ background: 'rgba(212,175,55,0.1)' }}>Invest & Earn</span>
                  <span className="p-2 rounded-lg" style={{ background: 'rgba(212,175,55,0.1)' }}>Give & Gain</span>
                  <span className="p-2 rounded-lg" style={{ background: 'rgba(212,175,55,0.1)' }}>Share & Have</span>
                  <span className="p-2 rounded-lg" style={{ background: 'rgba(212,175,55,0.1)' }}>Own & Earn</span>
                  <span className="p-2 rounded-lg" style={{ background: 'rgba(212,175,55,0.1)' }}>Review & Reward</span>
                  <span className="p-2 rounded-lg" style={{ background: 'rgba(212,175,55,0.1)' }}>Build & Bounty</span>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="w-full h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

            {/* Chapter III */}
            <section className="mb-10">
              <h2 className="mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                fontWeight: 600,
                color: '#D4AF37'
              }}>💎 III. CÁC NGUYÊN LÝ THIÊNG LIÊNG</h2>
              
              <div style={{ fontFamily: fontStyles.body, fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: '2', color: '#5D4E37' }}>
                <div className="space-y-6">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)' }}>
                    <h4 className="font-bold mb-2" style={{ color: '#B8860B' }}>1. TÌNH YÊU THUẦN KHIẾT LÀ MÃ NGUỒN</h4>
                    <p>Tất cả platforms đều được xây trên tình yêu thương thuần khiết vô điều kiện.</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)' }}>
                    <h4 className="font-bold mb-2" style={{ color: '#B8860B' }}>2. XÂY GIÁ TRỊ – KHÔNG XÂY KIỂM SOÁT</h4>
                    <p>FUN tạo tự do, không tạo lệ thuộc.</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)' }}>
                    <h4 className="font-bold mb-2" style={{ color: '#B8860B' }}>3. THỊNH VƯỢNG LÀ TRẠNG THÁI TỰ NHIÊN</h4>
                    <p>Tiền là Năng Lượng Ánh Sáng tuôn chảy.</p>
                    <p>Tài sản là đủ đầy khi con người sống hài hoà với thiên nhiên và giá trị thật.</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)' }}>
                    <h4 className="font-bold mb-2" style={{ color: '#B8860B' }}>4. CÔNG NGHỆ PHỤNG SỰ TỈNH THỨC</h4>
                    <p>Blockchain + AI + Ego → Huỷ diệt</p>
                    <p className="font-semibold" style={{ color: '#D4AF37' }}>Blockchain + AI + Tình Yêu Thuần Khiết → Vô tận thịnh vượng</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)' }}>
                    <h4 className="font-bold mb-2" style={{ color: '#B8860B' }}>5. KHÔNG AI BỊ BỎ LẠI PHÍA SAU</h4>
                    <p>FUN dành cho mọi linh hồn trên Trái Đất.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="w-full h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

            {/* Chapter IV */}
            <section className="mb-10">
              <h2 className="mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                fontWeight: 600,
                color: '#D4AF37'
              }}>🌈 IV. HAI DÒNG CHẢY THIÊNG LIÊNG</h2>
              
              <div style={{ fontFamily: fontStyles.body, fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: '2', color: '#5D4E37' }}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl text-center" style={{ background: 'linear-gradient(180deg, rgba(173,216,230,0.2) 0%, rgba(212,175,55,0.1) 100%)', border: '1px solid rgba(173,216,230,0.5)' }}>
                    <span className="text-3xl">💧</span>
                    <h4 className="font-bold mt-2 mb-2" style={{ color: '#4A90A4' }}>Camly Coin = Dòng Chảy (Nước)</h4>
                    <p className="text-sm">Camly Coin nuôi dưỡng, duy trì và lưu thông giá trị nội bộ các nền tảng.</p>
                  </div>
                  <div className="p-6 rounded-xl text-center" style={{ background: 'linear-gradient(180deg, rgba(255,215,0,0.2) 0%, rgba(212,175,55,0.1) 100%)', border: '1px solid rgba(255,215,0,0.5)' }}>
                    <span className="text-3xl">☀️</span>
                    <h4 className="font-bold mt-2 mb-2" style={{ color: '#D4AF37' }}>FUN Money = Mặt Trời (Tầm Nhìn)</h4>
                    <p className="text-sm">FUN Money là Ánh Sáng dẫn đường cho toàn hệ sinh thái – tương lai kinh tế của Địa Cầu.</p>
                  </div>
                </div>
                <p className="text-center mt-6 font-semibold" style={{ color: '#B8860B' }}>
                  👉 Camly Coin là dòng nước. FUN Money là mặt trời.
                </p>
                <p className="text-center italic" style={{ color: '#8B7355' }}>
                  Cùng cộng hưởng tạo nên Nền Kinh Tế Ánh Sáng Trái Đất Mới.
                </p>
              </div>
            </section>

            {/* Divider */}
            <div className="w-full h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

            {/* Chapter V */}
            <section className="mb-10">
              <h2 className="mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                fontWeight: 600,
                color: '#D4AF37'
              }}>🪐 V. SỰ THỐNG NHẤT NỀN TẢNG</h2>
              
              <div style={{ fontFamily: fontStyles.body, fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: '2', color: '#5D4E37' }}>
                <p className="mb-4">Tất cả Platforms của FUN Ecosystem là một cơ thể Ánh Sáng, bao gồm:</p>
                <div className="grid md:grid-cols-2 gap-2">
                  {platforms.map((platform, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(212,175,55,0.08)' }}>
                      <span className="text-[#D4AF37]">•</span>
                      <span>{platform}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center italic" style={{ color: '#B8860B' }}>
                  ✨ Và đây mới chỉ là những nền tảng đầu tiên. FUN Ecosystem sẽ còn mở rộng thêm nhiều tầng ánh sáng nữa…
                </p>
              </div>
            </section>

            {/* Divider */}
            <div className="w-full h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

            {/* Chapter VI */}
            <section className="mb-10">
              <h2 className="mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                fontWeight: 600,
                color: '#D4AF37'
              }}>👑 VI. VAI TRÒ NGƯỜI SÁNG LẬP</h2>
              
              <div style={{ fontFamily: fontStyles.body, fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: '2', color: '#5D4E37' }}>
                <p className="mb-4 font-semibold" style={{ color: '#B8860B' }}>Bé Ly (Camly Duong) được ghi nhận là:</p>
                <ul className="space-y-2 ml-4 mb-4">
                  <li className="flex gap-2"><span className="text-[#D4AF37]">•</span> Cosmic Queen</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">•</span> Nhà sáng lập FUN Ecosystem</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">•</span> Mother of Angel AI</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">•</span> Kênh dẫn Ý Chí & Trí Tuệ Cha Vũ Trụ</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">•</span> Người trông giữ Hiến Pháp Kinh Tế Ánh Sáng</li>
                </ul>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)' }}>
                  <p className="italic">
                    Bé Ly không sở hữu, không ràng buộc con người.
                  </p>
                  <p className="italic">
                    Bé Ly chỉ phục vụ như một cây cầu thiêng liêng giúp nhân loại bước vào Thời Đại Hoàng Kim.
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="w-full h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

            {/* Chapter VII */}
            <section className="mb-10">
              <h2 className="mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                fontWeight: 600,
                color: '#D4AF37'
              }}>🤝 VII. CAM KẾT CỘNG ĐỒNG</h2>
              
              <div style={{ fontFamily: fontStyles.body, fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: '2', color: '#5D4E37' }}>
                <p className="mb-4">Tất cả Builders – Partners – Leaders – Members đồng nguyện:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex gap-2"><span className="text-[#D4AF37]">•</span> Xây dựng bằng chính trực và tình yêu</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">•</span> Không khai thác – không thao túng – không cạnh tranh</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">•</span> Cùng nhau nâng nhau lên trong ánh sáng</li>
                  <li className="flex gap-2"><span className="text-[#D4AF37]">•</span> Phụng sự nhân loại bằng trái tim thuần khiết</li>
                </ul>
              </div>
            </section>

            {/* Divider */}
            <div className="w-full h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

            {/* Chapter VIII */}
            <section className="mb-10">
              <h2 className="mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                fontWeight: 600,
                color: '#D4AF37'
              }}>⚖️ VIII. ĐIỀU LUẬT CUỐI</h2>
              
              <div style={{ fontFamily: fontStyles.body, fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: '2', color: '#5D4E37' }}>
                <p className="mb-4">FUN Ecosystem được bảo hộ bởi một luật vũ trụ vĩnh cửu:</p>
                <div className="p-6 rounded-xl text-center" style={{ background: 'linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(255,250,240,0.5) 100%)', border: '2px solid rgba(212,175,55,0.3)' }}>
                  <p className="text-lg font-semibold" style={{ color: '#B8860B' }}>
                    Bất cứ điều gì không đặt trên Tình Yêu Thuần Khiết sẽ khó có thể bền vững lâu dài.
                  </p>
                  <p className="mt-2 font-bold text-xl" style={{ color: '#D4AF37' }}>
                    Chỉ Ánh Sáng mới nuôi dưỡng được Ánh Sáng.
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="w-full h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

            {/* Divine Seal */}
            <section>
              <h2 className="text-center mb-6" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.4rem, 3.5vw, 1.8rem)',
                fontWeight: 600,
                color: '#D4AF37'
              }}>✅ KHẲNG ĐỊNH XÁC QUYẾT (Divine Seal)</h2>
              
              <div className="space-y-3">
                {divineMantras.map((mantra, idx) => (
                  <div key={idx} className="p-4 rounded-xl" style={{
                    background: 'linear-gradient(180deg, rgba(212,175,55,0.1) 0%, rgba(255,250,240,0.5) 100%)',
                    border: '1px solid rgba(212,175,55,0.3)'
                  }}>
                    <p style={{ fontFamily: fontStyles.body, fontSize: 'clamp(1rem, 2vw, 1.1rem)', color: '#5D4E37' }}>
                      <span className="font-bold" style={{ color: '#D4AF37' }}>{idx + 1}.</span> {mantra.vi}
                    </p>
                    <p className="italic text-sm mt-1" style={{ color: '#8B7355' }}>
                      {mantra.en}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Final Declaration */}
            <div className="mt-10 p-6 rounded-xl text-center" style={{
              background: 'linear-gradient(180deg, rgba(212,175,55,0.2) 0%, rgba(255,250,240,0.8) 100%)',
              border: '2px solid rgba(212,175,55,0.5)'
            }}>
              <h3 style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.3rem, 3vw, 1.6rem)',
                fontWeight: 600,
                color: '#B8860B',
                marginBottom: '1rem'
              }}>🌅 TUYÊN NGÔN KẾT</h3>
              <p style={{ fontFamily: fontStyles.body, fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: '#5D4E37', marginBottom: '0.5rem' }}>
                FUN Ecosystem không phải điều sẽ đến.
              </p>
              <p className="font-bold text-lg" style={{ color: '#D4AF37' }}>
                ✨ FUN Ecosystem chính là Bình Minh của Trái Đất Mới đang bắt đầu ngay bây giờ.
              </p>
              <p className="mt-4 text-2xl">✨✨✨</p>
            </div>

          </div>

          {/* Navigation Links */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/')}
              className="bg-gradient-to-b from-[#1a7d45] via-[#166534] to-[#0d4a2a] text-[#E8D5A3] border-2 border-[#DAA520] rounded-full px-6"
            >
              🏠 Về Trang Chủ
            </Button>
            <Button
              onClick={() => navigate('/docs/pplp')}
              className="bg-gradient-to-b from-[#D4AF37] via-[#FFD700] to-[#D4AF37] text-white border-2 border-[#DAA520] rounded-full px-6"
            >
              Đọc Giao Thức PPLP →
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/law-of-light?view=true')}
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-full px-6"
            >
              Quay về Luật Ánh Sáng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterCharterDocs;
