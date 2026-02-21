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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RedEnvelopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { token: 'CAMLY' | 'BNB'; totalAmount: number; totalCount: number }) => Promise<void>;
}

export function RedEnvelopeDialog({ open, onOpenChange, onSubmit }: RedEnvelopeDialogProps) {
  const [token, setToken] = useState<'CAMLY' | 'BNB'>('CAMLY');
  const [amount, setAmount] = useState('');
  const [count, setCount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const totalAmount = parseFloat(amount);
    const totalCount = parseInt(count, 10);
    if (!totalAmount || totalAmount <= 0 || !totalCount || totalCount <= 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ token, totalAmount, totalCount });
      setAmount('');
      setCount('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-500">🧧 Tạo Lì Xì</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Token</Label>
            <Select value={token} onValueChange={(v) => setToken(v as 'CAMLY' | 'BNB')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CAMLY">CAMLY</SelectItem>
                <SelectItem value="BNB">BNB</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tổng số tiền</Label>
            <Input type="number" placeholder="100" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" />
          </div>
          <div>
            <Label>Số lượng lì xì</Label>
            <Input type="number" placeholder="5" value={count} onChange={(e) => setCount(e.target.value)} min="1" step="1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-red-500 hover:bg-red-600 text-white">
            {isSubmitting ? 'Đang tạo...' : 'Tạo Lì Xì'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
