import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Coins, Shield, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const STORAGE_KEY = 'fun-money-guide-dismissed';

export function FunMoneyGuide() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  });

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem(STORAGE_KEY, next ? 'false' : 'true');
  };

  const steps = [
    { icon: FileText, title: t('funMoneyStep1Title'), desc: t('funMoneyStep1Desc') },
    { icon: Coins, title: t('funMoneyStep2Title'), desc: t('funMoneyStep2Desc') },
    { icon: BookOpen, title: t('funMoneyStep3Title'), desc: t('funMoneyStep3Desc') },
    { icon: Shield, title: t('funMoneyStep4Title'), desc: t('funMoneyStep4Desc') },
    { icon: Wallet, title: t('funMoneyStep5Title'), desc: t('funMoneyStep5Desc') },
  ];

  return (
    <Card className="border-[#DAA520]/30 bg-gradient-to-br from-amber-950/20 to-yellow-950/10">
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={toggle}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#DAA520]" />
          <h3 className="font-semibold text-sm text-[#166534] dark:text-[#E8D5A3]">
            {t('funMoneyGuideTitle')}
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
                    <p className="text-sm font-medium text-[#B8860B] dark:text-[#E8D5A3]">{step.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center italic">
            {t('funMoneyGuideTip')}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
