import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ExternalLink } from 'lucide-react';

export const MintHeader = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
          ✨ Proof of Pure Love Protocol
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
          Mint FUN Money
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Claim FUN Money token (BEP-20) về ví của bạn từ các Light Actions đã được Angel AI xác nhận 🌟
        </p>
      </div>

      {/* Testnet Warning */}
      <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          FUN Money đang chạy trên <strong>BSC Testnet</strong>. Bạn cần tBNB để trả phí gas.{' '}
          <a
            href="https://www.bnbchain.org/en/testnet-faucet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 underline font-medium"
          >
            Lấy tBNB miễn phí <ExternalLink className="w-3 h-3" />
          </a>
        </AlertDescription>
      </Alert>
    </div>
  );
};
