import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Check, 
  Copy, 
  Shield, 
  Zap, 
  RefreshCw,
  Plus,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

interface WalletManagementProps {
  custodialWalletAddress?: string | null;
  onRefresh: () => void;
}

export const WalletManagement = ({
  custodialWalletAddress,
  onRefresh
}: WalletManagementProps) => {
  const [isCreatingCustodial, setIsCreatingCustodial] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const shortenAddress = (address: string) => 
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success('Đã copy địa chỉ ví');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Create custodial wallet
  const handleCreateCustodialWallet = useCallback(async () => {
    setIsCreatingCustodial(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-custodial-wallet', {
        body: { chain_id: 56 }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Không thể tạo ví');
      }

      toast.success('Đã tạo ví custodial thành công!');
      onRefresh();
    } catch (error: any) {
      console.error('[WalletManagement] Create custodial error:', error);
      toast.error(error?.message || 'Không thể tạo ví custodial');
    } finally {
      setIsCreatingCustodial(false);
    }
  }, [onRefresh]);

  const hasAnyWallet = !!custodialWalletAddress;

  return (
    <div className="space-y-6">
      {/* Custodial Wallet Card */}
      <Card className="relative overflow-hidden transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <CardTitle className="text-lg">Ví F.U.</CardTitle>
            </div>
          </div>
          <CardDescription>
            Ví custodial - Hệ thống quản lý an toàn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {custodialWalletAddress ? (
            <>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <code className="text-sm flex-1 font-mono">
                  {shortenAddress(custodialWalletAddress)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyAddress(custodialWalletAddress)}
                >
                  {copiedAddress === custodialWalletAddress ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                >
                  <a
                    href={`https://bscscan.com/address/${custodialWalletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
              
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-500" />
                <span>Dễ sử dụng, không cần cài đặt ví. Phù hợp cho người mới bắt đầu.</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-4">
                <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Chưa tạo ví custodial
                </p>
              </div>
              
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={handleCreateCustodialWallet}
                disabled={isCreatingCustodial}
              >
                {isCreatingCustodial ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isCreatingCustodial ? 'Đang tạo...' : 'Tạo ví F.U.'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Thông tin ví
        </h4>
        <p className="text-xs text-muted-foreground">
          Ví custodial được hệ thống quản lý an toàn. Để sử dụng ví external (MetaMask, Trust Wallet...), hãy kết nối trực tiếp trên trang Wallet.
        </p>
      </div>
    </div>
  );
};
