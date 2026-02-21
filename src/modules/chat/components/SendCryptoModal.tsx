import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface SendCryptoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientUserId: string;
  recipientUsername: string;
  recipientWalletAddress: string | null;
  conversationId: string;
}

export function SendCryptoModal({
  open,
  onOpenChange,
  recipientUsername,
  recipientWalletAddress,
}: SendCryptoModalProps) {
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!recipientWalletAddress) {
      toast.error('Người nhận chưa có địa chỉ ví');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    setIsSending(true);
    try {
      // Placeholder - actual crypto send logic would go here via wagmi
      toast.info('Tính năng tặng crypto đang được phát triển');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Gửi thất bại');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tặng crypto cho {recipientUsername}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Số tiền (CAMLY)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          {!recipientWalletAddress && (
            <p className="text-sm text-destructive">Người nhận chưa liên kết ví</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSend} disabled={isSending || !recipientWalletAddress}>
            {isSending ? 'Đang gửi...' : 'Gửi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
