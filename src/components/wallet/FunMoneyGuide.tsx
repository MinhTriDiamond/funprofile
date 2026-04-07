import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="shadow-md border-border overflow-hidden h-fit">
      <CardHeader
        className="pb-3 border-b border-border cursor-pointer select-none"
        onClick={toggle}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-amber-600" />
            </div>
            {t('funMoneyGuideTitle')}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); toggle(); }}>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-4 pb-4 space-y-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground text-center italic pt-1">
            {t('funMoneyGuideTip')}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
