import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface StartLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StartLiveDialog({ open, onOpenChange }: StartLiveDialogProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'realtime' | 'record'>('realtime');

  const handleStart = () => {
    onOpenChange(false);
    navigate(mode === 'realtime' ? '/live/new' : '/live/stream');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-destructive" />
            Bắt đầu LIVE
          </DialogTitle>
          <DialogDescription>Chọn chế độ để bắt đầu.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as 'realtime' | 'record')}
            className="grid grid-cols-2 gap-3"
          >
            <label
              htmlFor="mode-realtime"
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                mode === 'realtime'
                  ? 'border-destructive bg-destructive/5'
                  : 'border-muted hover:border-muted-foreground/30'
              }`}
            >
              <RadioGroupItem value="realtime" id="mode-realtime" className="sr-only" />
              <Video className="h-6 w-6 text-destructive" />
              <span className="text-sm font-medium">Phát trực tiếp</span>
              <span className="text-xs text-muted-foreground text-center">Agora RTC</span>
            </label>

            <label
              htmlFor="mode-record"
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                mode === 'record'
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-muted-foreground/30'
              }`}
            >
              <RadioGroupItem value="record" id="mode-record" className="sr-only" />
              <Film className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Ghi & Đăng</span>
              <span className="text-xs text-muted-foreground text-center">Browser</span>
            </label>
          </RadioGroup>

          <Button onClick={handleStart} className="w-full">
            {mode === 'realtime' ? 'Phát trực tiếp' : 'Bắt đầu ghi hình'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
