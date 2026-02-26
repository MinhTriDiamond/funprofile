import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Coins, Shield, Wallet, ChevronDown, ChevronUp } from 'lucide-react';

const STORAGE_KEY = 'fun-money-guide-dismissed';

const steps = [
  {
    icon: FileText,
    title: '1. Tạo Light Activities ✨',
    desc: 'Đăng bài, bình luận, thả cảm xúc trên mạng xã hội để tích điểm FUN. Mỗi hành động đều được ghi nhận và chấm điểm tự động.',
  },
  {
    icon: Coins,
    title: '2. Tích đủ 200 FUN 🎯',
    desc: 'Bạn cần tối thiểu 200 FUN chưa mint để đủ điều kiện. Mỗi ngày được mint tối đa 2 lần.',
  },
  {
    icon: BookOpen,
    title: '3. Nhấn "Mint FUN" 🚀',
    desc: 'Khi đủ điều kiện, nút Mint FUN sẽ sáng lên. Nhấn vào để gửi yêu cầu lên hệ thống duyệt.',
  },
  {
    icon: Shield,
    title: '4. Admin ký duyệt 🔐',
    desc: '3 người ký xác nhận (WILL · WISDOM · LOVE) sẽ duyệt yêu cầu. Sau khi đủ chữ ký, FUN được gửi lên blockchain.',
  },
  {
    icon: Wallet,
    title: '5. Activate & Claim 💰',
    desc: 'FUN vừa mint sẽ ở trạng thái Locked. Nhấn "Activate" để mở khóa, sau đó "Claim" để nhận về ví của bạn.',
  },
];

export function FunMoneyGuide() {
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  });

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem(STORAGE_KEY, next ? 'false' : 'true');
  };

  return (
    <Card className="border-[#DAA520]/30 bg-gradient-to-br from-amber-950/20 to-yellow-950/10">
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={toggle}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#DAA520]" />
          <h3 className="font-semibold text-sm text-[#E8D5A3]">
            Hướng Dẫn Mint FUN Money
          </h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toggle(); }}>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {isOpen && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="space-y-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#DAA520]/15 border border-[#DAA520]/30 flex items-center justify-center mt-0.5">
                    <Icon className="w-4 h-4 text-[#DAA520]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#E8D5A3]">{step.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center italic">
            💡 Mẹo: Hãy tạo nội dung chất lượng để nhận điểm FUN cao hơn!
          </p>
        </CardContent>
      )}
    </Card>
  );
}
