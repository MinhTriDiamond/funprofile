import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string, details: string) => Promise<void>;
}

const REASONS = [
  { value: 'spam', label: 'Spam / Quảng cáo' },
  { value: 'harassment', label: 'Quấy rối / Bắt nạt' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'scam', label: 'Lừa đảo' },
  { value: 'other', label: 'Khác' },
];

export function ReportDialog({ open, onOpenChange, onSubmit }: ReportDialogProps) {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(reason, details);
      setReason('spam');
      setDetails('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Phản hồi vi phạm</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={reason} onValueChange={setReason}>
            {REASONS.map(r => (
              <div key={r.value} className="flex items-center space-x-2">
                <RadioGroupItem value={r.value} id={r.value} />
                <Label htmlFor={r.value}>{r.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea
            placeholder="Mô tả thêm (tùy chọn)..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
