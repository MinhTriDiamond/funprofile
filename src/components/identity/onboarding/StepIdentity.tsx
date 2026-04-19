import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Fingerprint, Loader2, Mail, Sparkles, Wallet } from 'lucide-react';
import { useDID } from '@/hooks/useDID';
import { useDIDEligibility } from '@/hooks/useDIDEligibility';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export function StepIdentity({ onNext }: { onNext: () => void }) {
  const { data: did, refetch } = useDID();
  const { data: checks = [], refetch: refetchEl } = useDIDEligibility();
  const [promoting, setPromoting] = useState(false);

  const l1 = checks.find((c) => c.level === 'L1');
  const hasEmail = l1?.requirements[0]?.met ?? false;
  const isAtLeastL1 = ['L1', 'L2', 'L3', 'L4'].includes(did?.did_level ?? '');

  const promote = async () => {
    if (!did?.did_id) return;
    setPromoting(true);
    try {
      const { error } = await supabase.functions.invoke('identity-did-auto-promote', {
        body: { did_id: did.did_id, dry_run: false },
      });
      if (error) throw error;
      await Promise.all([refetch(), refetchEl()]);
      toast.success('Đã kiểm tra cấp DID');
    } catch (e: any) {
      toast.error('Không thể nâng cấp', { description: e.message });
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Fingerprint className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Định danh phi tập trung của bạn</h3>
              <p className="text-[11px] font-mono text-muted-foreground break-all mt-0.5">
                {did?.did_id ?? '—'}
              </p>
            </div>
            <Badge variant="outline">{did?.did_level ?? 'L0'}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Điều kiện nâng cấp lên L1
        </h4>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2 text-sm rounded-lg border p-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1">Email đã xác thực</span>
            {hasEmail ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link to="/settings">Thêm email</Link>
              </Button>
            )}
          </li>
          <li className="flex items-center gap-2 text-sm rounded-lg border p-3">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1">Liên kết ví (khuyến nghị, cần cho L2)</span>
            <Button asChild size="sm" variant="outline" className="h-7 text-xs">
              <Link to="/wallet">Mở ví</Link>
            </Button>
          </li>
          <li className="flex items-center gap-2 text-sm rounded-lg border p-3">
            <Circle className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1">Đồng ý Quy ước Ánh sáng</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </li>
        </ul>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={promote} disabled={promoting || !did?.did_id} className="flex-1">
          {promoting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Kiểm tra cấp DID
        </Button>
        <Button onClick={onNext} disabled={!isAtLeastL1 && !hasEmail} className="flex-1">
          Tiếp tục
        </Button>
      </div>
      {!isAtLeastL1 && (
        <p className="text-[11px] text-muted-foreground text-center">
          Bạn vẫn có thể tiếp tục onboarding và nâng cấp DID sau.
        </p>
      )}
    </div>
  );
}
