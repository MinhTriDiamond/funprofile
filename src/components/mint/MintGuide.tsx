import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Search, Zap, ArrowDownToLine } from 'lucide-react';

const steps = [
  {
    icon: Wallet,
    title: 'Kết nối ví',
    desc: 'Kết nối MetaMask vào BSC Testnet (Chain ID: 97)',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30',
  },
  {
    icon: Search,
    title: 'Kiểm tra Token Lifecycle',
    desc: 'Xem số FUN đang ở trạng thái Locked',
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30',
  },
  {
    icon: Zap,
    title: 'Activate All',
    desc: 'Chuyển Locked → Activated (cần gas tBNB)',
    color: 'text-green-500 bg-green-50 dark:bg-green-950/30',
  },
  {
    icon: ArrowDownToLine,
    title: 'Claim All',
    desc: 'FUN chuyển về ví cá nhân của bạn',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30',
  },
];

export const MintGuide = () => {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">📋 Hướng dẫn Activate & Claim</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${step.color}`}>
                <step.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">
                  <span className="text-muted-foreground mr-1">B{i + 1}.</span>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
