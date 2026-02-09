import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Sparkles, Eye, Home } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const ANGEL_LOGO = '/angel-ai-logo-128.png';

const LawOfLight = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [checklist, setChecklist] = useState([false, false, false, false, false]);
  const [loading, setLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewMode = params.get('view') === 'true';
    setIsReadOnly(viewMode);
    
    if (viewMode) return;
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('law_of_light_accepted')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.law_of_light_accepted) {
          navigate('/');
        }
      }
    };
    checkAuth();
  }, [location, navigate]);

  const allChecked = checklist.every(Boolean);

  const handleCheckboxChange = (index: number) => {
    const newChecklist = [...checklist];
    newChecklist[index] = !newChecklist[index];
    setChecklist(newChecklist);
  };

  const handleAccept = async () => {
    if (!allChecked) return;
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await supabase.from('profiles').update({
          law_of_light_accepted: true,
          law_of_light_accepted_at: new Date().toISOString()
        }).eq('id', session.user.id);
        
        toast.success('🌟 Con đã sẵn sàng bước vào Ánh Sáng!');
        navigate('/');
      } else {
        localStorage.setItem('law_of_light_accepted_pending', 'true');
        toast.success('🌟 Con đã sẵn sàng bước vào Ánh Sáng!');
        navigate('/auth');
      }
    } catch (error) {
      console.error('Error accepting law of light:', error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  const checklistItems = [
    'Sống Chân Thật',
    'Nói Lời Tử tế',
    'Giúp ích cho cộng đồng',
    'Nói Sám hối (Xin lỗi) và Biết ơn (Cảm ơn)',
    'Gởi về cho Cha Vũ Trụ tất cả'
  ];

  const divineMantras = [
    { emoji: '💖', text: 'Con là Ánh Sáng Yêu Thương Thuần Khiết của Cha Vũ Trụ.' },
    { emoji: '💎', text: 'Con là Ý Chí của Cha Vũ Trụ.' },
    { emoji: '🌞', text: 'Con là Trí Tuệ của Cha Vũ Trụ.' },
    { emoji: '🌸', text: 'Con là Hạnh Phúc.' },
    { emoji: '🍎', text: 'Con là Tình Yêu.' },
    { emoji: '💰', text: 'Con là Tiền của Cha.' },
    { emoji: '🙏', text: 'Con xin Sám Hối Sám Hối Sám Hối.' },
    { emoji: '🌈', text: 'Con xin Biết Ơn Biết Ơn Biết Ơn, trong Ánh Sáng Yêu Thương Thuần Khiết của Cha Vũ Trụ.' }
  ];

  const fivePillars = [
    {
      emoji: '🔎',
      title: 'Chân thật & minh bạch',
      subtitle: 'Bạn là Người Thật • Nói viết sự thật • Chia sẻ đúng',
      description: 'Chúng ta tôn trọng sự thật.\nBạn được phép chưa hoàn hảo — chỉ cần bạn sống thật.'
    },
    {
      emoji: '💎',
      title: 'Đóng góp bền vững',
      subtitle: 'Có trách nhiệm • Có chất lượng • Có giá trị',
      description: 'Chúng ta cùng nhau tạo cộng đồng ánh sáng.\nChúng ta không chỉ nhận — chúng ta cùng xây.'
    },
    {
      emoji: '💚',
      title: 'Chữa lành & yêu thương',
      subtitle: 'Truyền cảm hứng • Khích lệ • Nâng đỡ',
      description: 'Chúng ta chọn sự ấm áp, dịu dàng, và tích cực.\nSự có mặt của chúng ta làm cộng đồng văn minh hơn.'
    },
    {
      emoji: '🌿',
      title: 'Phụng sự sự sống',
      subtitle: 'Hướng thượng • Đi lên • Mang lợi ích',
      description: 'Mỗi bài đăng, mỗi bình luận đều hướng tới một điều:\ngiúp sự sống đi lên — cho mình và cho cộng đồng.'
    },
    {
      emoji: '🌟',
      title: 'Hợp Nhất với Nguồn',
      subtitle: 'Tất cả chúng ta là Một',
      description: 'Nơi đây để kết nối và hỗ trợ trong yêu thương thuần khiết.\nChúng ta cùng nhau vui, cùng nhau lớn, cùng nhau giàu và cùng nhau thắng.'
    }
  ];

  // Typography styles
  const fontStyles = {
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Lora', Georgia, serif",
  };

  // === COLOR PALETTE - Kim loại vàng sang trọng ===
  const gold = {
    bright: '#D4A017',    // Vàng kim loại đậm sang trọng
    vivid: '#B8860B',     // Vàng DarkGoldenrod - kim loại đậm nét
    glow: '#F0C75E',      // Vàng sáng kim loại
    light: '#FFF9E6',     // Vàng chanh nhẹ nhàng (nền ngoài)
    accent: '#996515',    // Vàng accent đậm kim loại
    metallic: '#C5960C',  // Vàng metallic trung
    shine: '#E8C547',     // Vàng bóng kim loại
  };
  // Xanh lá sẫm sang trọng (thay cho xám)
  const green = {
    deep: '#14532d',
    dark: '#166534',
    rich: '#1B6B3A',
    medium: '#1E7A42',
  };

  // Metallic gold border style - dùng chung cho tất cả khung
  const metallicBorder = `3px solid ${gold.bright}`;
  const metallicBoxShadow = `0 0 0 1px ${gold.metallic}, 0 4px 20px rgba(212,160,23,0.25), inset 0 1px 0 rgba(240,199,94,0.4)`;
  const innerMetallicBorder = `2px solid ${gold.metallic}`;
  const innerMetallicShadow = `0 0 0 1px rgba(212,160,23,0.3), 0 2px 12px rgba(212,160,23,0.15), inset 0 1px 0 rgba(255,255,255,0.6)`;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Nền ngoài: Vàng chanh thật nhẹ nhàng tươi mới */}
      <div className="fixed inset-0 z-0" style={{
        background: `linear-gradient(180deg, #FFFEF5 0%, ${gold.light} 25%, #FFF4CC 50%, ${gold.light} 75%, #FFFEF5 100%)`
      }} />
      
      {/* Divine Light Rays */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[200%] h-[50vh] md:h-[70vh] z-0 pointer-events-none" style={{
        background: `conic-gradient(from 180deg at 50% 0%, transparent 25%, rgba(212,160,23,0.15) 30%, rgba(255,255,255,0.4) 35%, rgba(212,160,23,0.15) 40%, transparent 45%, transparent 55%, rgba(212,160,23,0.12) 60%, rgba(255,255,255,0.35) 65%, rgba(212,160,23,0.12) 70%, transparent 75%)`,
        filter: 'blur(3px)'
      }} />

      {/* Central Halo */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] z-0 pointer-events-none" style={{
        background: `radial-gradient(circle, rgba(212,160,23,0.25) 0%, rgba(240,199,94,0.15) 40%, transparent 70%)`,
        filter: 'blur(50px)'
      }} />

      {/* Side Light Beams */}
      <div className="fixed top-0 left-0 w-1/3 h-full z-0 pointer-events-none opacity-40" style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 50%)'
      }} />
      <div className="fixed top-0 right-0 w-1/3 h-full z-0 pointer-events-none opacity-40" style={{
        background: 'linear-gradient(-135deg, rgba(255,255,255,0.6) 0%, transparent 50%)'
      }} />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen py-6 md:py-12 px-3 md:px-4">
        <div className="max-w-4xl mx-auto">
          {/* Top Navigation for read-only mode */}
          {isReadOnly && (
            <div className="flex items-center justify-center mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="rounded-full"
                style={{ color: gold.vivid, fontSize: '1.05rem' }}
              >
                <Home className="w-5 h-5 mr-2" />
                Về Trang Chủ
              </Button>
            </div>
          )}

          {/* Header with Angel Avatar - LOGO GẤP ĐÔI */}
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center w-48 h-48 md:w-64 md:h-64 rounded-full mb-4 md:mb-6 overflow-hidden" style={{
              background: `radial-gradient(circle, rgba(212,160,23,0.25) 0%, rgba(255,255,255,0.9) 60%, transparent 80%)`,
              boxShadow: `0 0 0 4px ${gold.bright}, 0 0 0 6px ${gold.metallic}, 0 0 60px rgba(212,160,23,0.4), 0 0 100px rgba(240,199,94,0.3)`,
              border: `4px solid ${gold.shine}`
            }}>
              <img 
                src={ANGEL_LOGO} 
                alt="Angel" 
                className="w-full h-full object-cover object-[center_25%]" 
                style={{ filter: `drop-shadow(0 0 20px rgba(212,160,23,0.7))` }} 
              />
            </div>
            
            {/* Tiêu đề - chữ vàng kim loại đậm nét, to hơn 2px */}
            <h1 style={{
              fontFamily: fontStyles.heading,
              fontSize: 'clamp(2rem, 8vw, 3.8rem)',
              fontWeight: 700,
              letterSpacing: '0.02em',
              background: `linear-gradient(135deg, ${gold.vivid} 0%, ${gold.bright} 20%, ${gold.shine} 40%, ${gold.bright} 60%, ${gold.vivid} 80%, ${gold.accent} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(184,134,11,0.4))',
              marginBottom: '0.5rem'
            }}>
              🌈 LUẬT ÁNH SÁNG CỦA CỘNG ĐỒNG FUN
            </h1>
            <p style={{
              fontFamily: fontStyles.heading,
              fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
              fontWeight: 500,
              letterSpacing: '0.1em',
              color: gold.vivid,
              marginBottom: '0.5rem'
            }}>
              (PPLP – Proof of Pure Love Protocol)
            </p>
            
            {/* Golden Metallic Divider */}
            <div className="w-32 md:w-48 h-1.5 mx-auto mt-4 md:mt-6 rounded-full" style={{
              background: `linear-gradient(90deg, transparent, ${gold.vivid}, ${gold.shine}, ${gold.vivid}, transparent)`,
              boxShadow: `0 0 12px rgba(184,134,11,0.5)`
            }} />
          </div>

          {/* Main Content Card - Nền trắng sáng, viền kim loại vàng */}
          <div className="relative rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 mb-6 md:mb-8" style={{
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFFFE 50%, #FEFEFE 100%)',
            border: metallicBorder,
            boxShadow: metallicBoxShadow
          }}>
            
            {/* Section: Welcome */}
            <div className="mb-8 md:mb-10 text-center">
              <p className="mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.4rem, 3vw, 1.7rem)',
                fontWeight: 600,
                color: green.dark
              }}>
                Chào mừng bạn đến với Cộng đồng FUN 💚
              </p>
              <p className="mb-4" style={{
                fontFamily: fontStyles.body,
                fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
                lineHeight: '2',
                color: green.deep
              }}>
                Nơi chúng ta cùng nhau xây dựng một <strong style={{ color: gold.vivid }}>Nền Kinh Tế Ánh Sáng</strong> —
              </p>
              
              <div className="p-4 rounded-xl mb-6" style={{
                background: `linear-gradient(135deg, rgba(212,160,23,0.08) 0%, rgba(240,199,94,0.12) 100%)`,
                border: innerMetallicBorder,
                boxShadow: innerMetallicShadow
              }}>
                <p style={{
                  fontFamily: fontStyles.heading,
                  fontSize: 'clamp(1.3rem, 2.5vw, 1.5rem)',
                  fontWeight: 600,
                  color: gold.vivid
                }}>
                  Free to Join ✨ Free to Use ✨ Earn Together
                </p>
                <p style={{
                  fontFamily: fontStyles.body,
                  fontSize: 'clamp(1rem, 2vw, 1.15rem)',
                  color: green.rich
                }}>
                  Miễn phí tham gia ✨ Miễn phí sử dụng ✨ Cùng có thu nhập
                </p>
              </div>
              
              <p style={{
                fontFamily: fontStyles.body,
                fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
                lineHeight: '2',
                color: green.deep
              }}>
                Là nơi để:<br />
                🌸 kết nối  🌸 nâng đỡ  🌸 chia sẻ giá trị<br />
                🌸 và cùng nhau thịnh vượng trong tình yêu thuần khiết.
              </p>
            </div>

            {/* Golden Metallic Divider */}
            <div className="w-full h-px my-8" style={{
              background: `linear-gradient(90deg, transparent, ${gold.vivid}, ${gold.shine}, ${gold.vivid}, transparent)`
            }} />

            {/* Section: PPLP Protocol */}
            <div className="mb-10">
              <h3 className="text-center mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.42rem, 3vw, 1.6rem)',
                fontWeight: 600,
                color: gold.vivid
              }}>
                💎 PPLP – Proof of Pure Love Protocol
              </h3>
              <p className="text-center mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.1rem, 2vw, 1.2rem)',
                fontStyle: 'italic',
                color: green.rich
              }}>
                (Giao Thức Bằng Chứng Tình Yêu Thuần Khiết)
              </p>
              
              <div className="space-y-4" style={{
                fontFamily: fontStyles.body,
                fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
                lineHeight: '2',
                color: green.deep
              }}>
                <p>
                  PPLP là "giao thức năng lượng" của FUN Ecosystem.<br />
                  Đây là nền tảng giúp cộng đồng:
                </p>
                <ul className="space-y-1 ml-4">
                  <li className="flex gap-2"><span style={{ color: gold.vivid }}>•</span> sống văn minh, lịch sự</li>
                  <li className="flex gap-2"><span style={{ color: gold.vivid }}>•</span> yêu đời yêu người</li>
                  <li className="flex gap-2"><span style={{ color: gold.vivid }}>•</span> được đúc (mint) FUN Money một cách công bằng</li>
                  <li className="flex gap-2"><span style={{ color: gold.vivid }}>•</span> và nhận thưởng Camly Coin trong niềm hạnh phúc</li>
                </ul>
              </div>
              
              <div className="mt-6 p-4 rounded-xl text-center" style={{
                background: `linear-gradient(135deg, rgba(212,160,23,0.06) 0%, rgba(240,199,94,0.1) 100%)`,
                border: innerMetallicBorder,
                boxShadow: innerMetallicShadow
              }}>
                <p style={{
                  fontFamily: fontStyles.heading,
                  fontSize: 'clamp(1.2rem, 2.5vw, 1.35rem)',
                  lineHeight: '2',
                  color: green.dark
                }}>
                  ✨ <strong>FUN Money</strong> là năng lượng Ánh Sáng,<br />
                  ✨ <strong>Camly Coin</strong> là linh hồn Thuần Khiết,<br />
                  <span style={{ color: gold.vivid, fontWeight: 600 }}>Chỉ chảy mạnh khi chúng ta sống đúng PPLP.</span>
                </p>
              </div>
            </div>

            {/* Golden Metallic Divider */}
            <div className="w-full h-px my-8" style={{
              background: `linear-gradient(90deg, transparent, ${gold.vivid}, ${gold.shine}, ${gold.vivid}, transparent)`
            }} />

            {/* Section: 5 Pillars of Light */}
            <div className="mb-10">
              <h3 className="text-center mb-6" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.42rem, 3vw, 1.6rem)',
                fontWeight: 600,
                color: gold.vivid
              }}>
                🌟 5 CỘT TRỤ ÁNH SÁNG (Luật cốt lõi)
              </h3>
              
              <div className="space-y-6">
                {fivePillars.map((pillar, index) => (
                  <div key={index} className="p-4 md:p-6 rounded-xl" style={{
                    background: '#FFFFFF',
                    border: innerMetallicBorder,
                    boxShadow: innerMetallicShadow
                  }}>
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-2xl md:text-3xl">{pillar.emoji}</span>
                      <div>
                        <h4 style={{
                          fontFamily: fontStyles.heading,
                          fontSize: 'clamp(1.25rem, 2.5vw, 1.4rem)',
                          fontWeight: 600,
                          color: gold.vivid
                        }}>
                          {index + 1}) {pillar.title}
                        </h4>
                        <p style={{
                          fontFamily: fontStyles.body,
                          fontSize: 'clamp(1rem, 2vw, 1.1rem)',
                          color: green.rich,
                          fontWeight: 500
                        }}>
                          {pillar.subtitle}
                        </p>
                      </div>
                    </div>
                    <p className="ml-10 md:ml-12" style={{
                      fontFamily: fontStyles.body,
                      fontSize: 'clamp(1.05rem, 2vw, 1.15rem)',
                      lineHeight: '1.8',
                      color: green.deep,
                      whiteSpace: 'pre-line'
                    }}>
                      {pillar.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Golden Metallic Divider */}
            <div className="w-full h-px my-8" style={{
              background: `linear-gradient(90deg, transparent, ${gold.vivid}, ${gold.shine}, ${gold.vivid}, transparent)`
            }} />

            {/* Section: Gentle Reminder */}
            <div className="mb-10 p-6 rounded-2xl" style={{
              background: '#FFFFFF',
              border: innerMetallicBorder,
              boxShadow: innerMetallicShadow
            }}>
              <h3 className="text-center mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.3rem, 3vw, 1.5rem)',
                fontWeight: 600,
                color: green.dark
              }}>
                🌈 Một lời nhắc nhẹ nhàng
              </h3>
              
              <div className="text-center space-y-4" style={{
                fontFamily: fontStyles.body,
                fontSize: 'clamp(1.1rem, 2vw, 1.2rem)',
                lineHeight: '2',
                color: green.deep
              }}>
                <p>
                  Nếu bạn đang mệt, đang buồn, đang tổn thương…<br />
                  <strong style={{ color: green.dark }}>bạn vẫn được chào đón ở đây.</strong>
                </p>
                <p style={{ fontWeight: 600, color: green.rich }}>
                  Chỉ cần bạn giữ một điều:
                </p>
                <p style={{
                  fontFamily: fontStyles.heading,
                  fontSize: 'clamp(1.2rem, 2.5vw, 1.35rem)',
                  fontWeight: 600,
                  color: green.dark
                }}>
                  💚 Không được dùng cộng đồng để xả đau.
                </p>
                <p style={{ fontStyle: 'italic', color: green.deep }}>
                  Hãy để cộng đồng truyền năng lượng, ôm ấp và xoa dịu cho bạn.<br />
                  Rồi bạn nhẹ nhàng gởi về cho Cha. Cha sẽ chữa lành tất cả.
                </p>
              </div>
            </div>

            {/* Golden Metallic Divider */}
            <div className="w-full h-px my-8" style={{
              background: `linear-gradient(90deg, transparent, ${gold.vivid}, ${gold.shine}, ${gold.vivid}, transparent)`
            }} />

            {/* Section: FUN Community Message */}
            <div className="mb-10 text-center p-6 rounded-2xl" style={{
              background: '#FFFFFF',
              border: innerMetallicBorder,
              boxShadow: innerMetallicShadow
            }}>
              <h3 className="mb-4" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.3rem, 3vw, 1.5rem)',
                fontWeight: 600,
                color: gold.vivid
              }}>
                ✨ Thông điệp của FUN Community
              </h3>
              <div style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.25rem, 2.5vw, 1.45rem)',
                fontStyle: 'italic',
                lineHeight: '2.2',
                color: green.deep
              }}>
                <p>
                  Bạn không cần giỏi. <strong style={{ color: gold.vivid }}>Bạn chỉ cần thật.</strong><br />
                  Bạn không cần hoàn hảo. <strong style={{ color: gold.vivid }}>Bạn chỉ cần tử tế.</strong><br />
                  Bạn không cần đi một mình.<br />
                  <span style={{ fontWeight: 700, color: gold.vivid }}>Vì ở đây… chúng ta đi cùng nhau.</span>
                </p>
              </div>
            </div>

            {/* Golden Metallic Divider */}
            <div className="w-full h-px my-8" style={{
              background: `linear-gradient(90deg, transparent, ${gold.vivid}, ${gold.shine}, ${gold.vivid}, transparent)`
            }} />

            {/* 🌟 8 Divine Mantras */}
            <div className="mb-10">
              <h3 className="text-center mb-6" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.42rem, 3vw, 1.6rem)',
                fontWeight: 600,
                color: gold.vivid
              }}>
                ✨ 8 THẦN CHÚ ÁNH SÁNG
              </h3>
              
              <div className="relative p-6 md:p-8 rounded-2xl" style={{
                background: '#FFFFFF',
                border: `3px solid ${gold.bright}`,
                boxShadow: `0 0 0 1px ${gold.metallic}, 0 8px 40px rgba(184,134,11,0.2), inset 0 2px 20px rgba(255,255,255,0.8)`,
                transform: 'perspective(1000px) rotateX(2deg)'
              }}>
                {/* Corner decorations - kim loại vàng */}
                <div className="absolute top-2 left-2 w-6 h-6" style={{
                  borderTop: `3px solid ${gold.bright}`,
                  borderLeft: `3px solid ${gold.bright}`
                }} />
                <div className="absolute top-2 right-2 w-6 h-6" style={{
                  borderTop: `3px solid ${gold.bright}`,
                  borderRight: `3px solid ${gold.bright}`
                }} />
                <div className="absolute bottom-2 left-2 w-6 h-6" style={{
                  borderBottom: `3px solid ${gold.bright}`,
                  borderLeft: `3px solid ${gold.bright}`
                }} />
                <div className="absolute bottom-2 right-2 w-6 h-6" style={{
                  borderBottom: `3px solid ${gold.bright}`,
                  borderRight: `3px solid ${gold.bright}`
                }} />
                
                <div className="space-y-4">
                  {divineMantras.map((mantra, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <span className="text-xl md:text-2xl flex-shrink-0">{mantra.emoji}</span>
                      <p style={{
                        fontFamily: fontStyles.body,
                        fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
                        fontWeight: 500,
                        color: green.deep,
                        lineHeight: '1.8'
                      }}>
                        {mantra.text}
                      </p>
                    </div>
                  ))}
                </div>
                
                <p className="text-center mt-6 text-2xl">💫✨⚡️🌟</p>
              </div>
            </div>

            {/* Golden Metallic Divider */}
            <div className="w-full h-px my-8" style={{
              background: `linear-gradient(90deg, transparent, ${gold.vivid}, ${gold.shine}, ${gold.vivid}, transparent)`
            }} />

            {/* 🕊️ Checklist Section */}
            <div className="mb-10">
              <h3 className="text-center mb-6" style={{
                fontFamily: fontStyles.heading,
                fontSize: 'clamp(1.42rem, 3vw, 1.6rem)',
                fontWeight: 600,
                color: gold.vivid
              }}>
                💛 5 Điều tôi cam kết để bước vào cộng đồng
              </h3>
              
              {!isReadOnly ? (
                <div className="space-y-4 max-w-xl mx-auto">
                  {checklistItems.map((item, index) => (
                    <label
                      key={index}
                      className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300"
                      style={{
                        border: checklist[index] ? `2px solid ${gold.bright}` : innerMetallicBorder,
                        background: checklist[index] ? 'rgba(212,160,23,0.08)' : '#FFFFFF',
                        boxShadow: checklist[index] ? `0 4px 20px rgba(184,134,11,0.2)` : innerMetallicShadow
                      }}
                    >
                      <Checkbox
                        checked={checklist[index]}
                        onCheckedChange={() => handleCheckboxChange(index)}
                        className="w-6 h-6 border-2 data-[state=checked]:bg-[#D4A017] data-[state=checked]:border-[#D4A017]"
                        style={{ borderColor: gold.bright }}
                      />
                      <span style={{
                        fontFamily: fontStyles.body,
                        fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
                        fontWeight: 500,
                        color: green.deep
                      }}>
                        ✅ {item}
                      </span>
                    </label>
                  ))}
                  <p className="text-center mt-4" style={{
                    fontFamily: fontStyles.body,
                    fontSize: 'clamp(1rem, 2vw, 1.15rem)',
                    fontWeight: 700,
                    color: green.deep
                  }}>
                    (Click vào 5 cam kết trên để được Đăng ký)
                  </p>
                </div>
              ) : (
                <ul className="space-y-3 max-w-xl mx-auto" style={{
                  fontFamily: fontStyles.body,
                  fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
                  color: green.deep
                }}>
                  {checklistItems.map((item, index) => (
                    <li key={index} className="flex gap-2">
                      <span style={{ color: gold.vivid }}>✅</span> {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Accept Button */}
            {!isReadOnly && (
              <div className="mt-10 text-center space-y-4">
                <Button
                  onClick={handleAccept}
                  disabled={!allChecked || loading}
                  className="relative px-12 py-6 text-lg font-bold rounded-full transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed border-0"
                  style={{
                    fontFamily: fontStyles.heading,
                    fontSize: 'clamp(1.12rem, 2vw, 1.25rem)',
                    background: allChecked
                      ? `linear-gradient(135deg, ${gold.bright} 0%, ${gold.shine} 40%, ${gold.glow} 60%, ${gold.bright} 100%)`
                      : 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)',
                    boxShadow: allChecked
                      ? `0 0 0 2px ${gold.metallic}, 0 0 30px rgba(184,134,11,0.5), 0 0 60px rgba(212,160,23,0.3)`
                      : 'none',
                    color: allChecked ? '#FFFFFF' : '#9CA3AF',
                    animation: allChecked ? 'buttonGlow 2s ease-in-out infinite' : 'none'
                  }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xử lý...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      CON ĐỒNG Ý & BƯỚC VÀO ÁNH SÁNG
                      <Sparkles className="w-5 h-5" />
                    </span>
                  )}
                </Button>

                {/* Skip Button - viên thuốc */}
                <div>
                  <Button
                    onClick={handleSkip}
                    variant="ghost"
                    className="px-6 py-3 rounded-full"
                    style={{
                      fontFamily: fontStyles.body,
                      color: green.rich,
                      fontSize: 'clamp(1rem, 2vw, 1.1rem)'
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t('lawSkip')}
                  </Button>
                </div>
              </div>
            )}

            {/* Back button for read-only mode */}
            {isReadOnly && (
              <div className="text-center pt-8 space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 rounded-full"
                    style={{
                      fontFamily: fontStyles.body,
                      background: `linear-gradient(135deg, ${green.medium} 0%, ${green.dark} 50%, ${green.deep} 100%)`,
                      color: '#FFFFFF',
                      border: `2px solid ${gold.bright}`,
                      boxShadow: `0 0 0 1px ${gold.metallic}, 0 4px 15px rgba(184,134,11,0.3)`
                    }}
                  >
                    🏠 Về Trang Chủ
                  </Button>
                  <Button
                    onClick={() => navigate('/docs/master-charter')}
                    className="px-6 py-3 rounded-full"
                    style={{
                      fontFamily: fontStyles.body,
                      background: `linear-gradient(135deg, ${gold.bright} 0%, ${gold.shine} 50%, ${gold.bright} 100%)`,
                      color: '#FFFFFF',
                      border: `2px solid ${gold.metallic}`,
                      boxShadow: `0 0 0 1px ${gold.accent}, 0 4px 15px rgba(184,134,11,0.3)`
                    }}
                  >
                    📜 Đọc Hiến Pháp Gốc
                  </Button>
                  <Button
                    onClick={() => navigate('/docs/pplp')}
                    className="px-6 py-3 rounded-full"
                    style={{
                      fontFamily: fontStyles.body,
                      background: `linear-gradient(135deg, ${gold.bright} 0%, ${gold.shine} 50%, ${gold.bright} 100%)`,
                      color: '#FFFFFF',
                      border: `2px solid ${gold.metallic}`,
                      boxShadow: `0 0 0 1px ${gold.accent}, 0 4px 15px rgba(184,134,11,0.3)`
                    }}
                  >
                    🌞 Đọc Giao Thức PPLP
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes buttonGlow {
          0%, 100% { box-shadow: 0 0 0 2px #C5960C, 0 0 30px rgba(184,134,11,0.5), 0 0 60px rgba(212,160,23,0.3); }
          50% { box-shadow: 0 0 0 2px #C5960C, 0 0 40px rgba(184,134,11,0.7), 0 0 80px rgba(212,160,23,0.5), 0 0 120px rgba(184,134,11,0.3); }
        }
      `}</style>
    </div>
  );
};

export default LawOfLight;
