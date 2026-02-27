import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Shield, CheckCircle2, Clock, Pen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatFUN, GOV_GROUPS, GovGroupKey } from '@/config/pplp';
import type { AttesterMintRequest } from '@/hooks/useAttesterSigning';

const GROUP_ORDER: GovGroupKey[] = ['will', 'wisdom', 'love'];

interface MultisigProgressProps {
  signatures: Record<string, any> | null;
  completedGroups: string[] | null;
}

const MultisigProgress = ({ signatures, completedGroups }: MultisigProgressProps) => {
  const sigs = signatures ?? {};
  const completed = completedGroups ?? [];
  const progressValue = (completed.length / 3) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Chữ ký GOV</span>
        <span className="font-bold">{completed.length}/3</span>
      </div>
      <Progress value={progressValue} className="h-2" />
      <div className="grid gap-1.5">
        {GROUP_ORDER.map((groupKey) => {
          const group = GOV_GROUPS[groupKey];
          const sig = sigs[groupKey];
          const isSigned = !!sig;

          return (
            <div
              key={groupKey}
              className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                isSigned
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                  : 'bg-muted/30 border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{group.emoji}</span>
                <span className="font-medium">{group.nameVi}</span>
              </div>
              {isSigned ? (
                <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{sig.signer_name || 'Đã ký'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Chờ ký</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface RequestCardProps {
  request: AttesterMintRequest;
  attesterGroup: GovGroupKey | null;
  isSigning: boolean;
  onSign: (id: string) => void;
}

const RequestCard = ({ request, attesterGroup, isSigning, onSign }: RequestCardProps) => {
  const sigs = request.multisig_signatures ?? {};
  const myGroupSigned = attesterGroup ? !!sigs[attesterGroup] : false;
  const isFullySigned = request.status === 'signed';
  const canSign = attesterGroup && !myGroupSigned && !isFullySigned && request.status !== 'signed';

  return (
    <div className="border rounded-xl p-3 space-y-3 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-amber-600">{formatFUN(request.amount_display)} FUN</span>
          {isFullySigned && (
            <Badge className="bg-green-100 text-green-700 border-0 text-xs">Sẵn sàng Submit</Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          #{request.id.slice(0, 8)}
        </span>
      </div>

      {/* User info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Người nhận:</span>
        <span className="font-medium text-foreground">{request.profiles?.username || 'Unknown'}</span>
        <span>·</span>
        <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: vi })}</span>
      </div>

      {/* Action types */}
      {request.action_types?.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {request.action_types.map(t => (
            <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">{t}</Badge>
          ))}
        </div>
      )}

      {/* Multisig Progress */}
      <MultisigProgress
        signatures={request.multisig_signatures}
        completedGroups={request.multisig_completed_groups}
      />

      {/* Sign Button */}
      {canSign && (
        <Button
          onClick={() => onSign(request.id)}
          disabled={isSigning}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
          size="sm"
        >
          {isSigning ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Pen className="w-4 h-4 mr-2" />
          )}
          Ký với tư cách {attesterGroup ? GOV_GROUPS[attesterGroup].nameVi : ''}
        </Button>
      )}

      {myGroupSigned && !isFullySigned && (
        <div className="text-center text-xs text-green-600 dark:text-green-400 py-1">
          ✓ Nhóm {attesterGroup ? GOV_GROUPS[attesterGroup].nameVi : ''} đã ký
        </div>
      )}
    </div>
  );
};

interface AttesterSigningPanelProps {
  attesterGroup: GovGroupKey;
  attesterName: string | null;
  requests: AttesterMintRequest[];
  isLoading: boolean;
  isSigning: boolean;
  onSign: (id: string) => void;
}

export const AttesterSigningPanel = memo(({
  attesterGroup,
  attesterName,
  requests,
  isLoading,
  isSigning,
  onSign,
}: AttesterSigningPanelProps) => {
  const group = GOV_GROUPS[attesterGroup];
  const pendingForMe = requests.filter(r => {
    const sigs = r.multisig_signatures ?? {};
    return !sigs[attesterGroup] && r.status !== 'signed';
  });

  const signed = requests.filter(r => r.status === 'signed');
  const pending = requests.filter(r => r.status !== 'signed');
  const totalFunPending = pending.reduce((sum, r) => sum + Number(r.amount_display ?? 0), 0);
  const totalFunSigned = signed.reduce((sum, r) => sum + Number(r.amount_display ?? 0), 0);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-violet-600" />
            <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              GOV Multisig
            </span>
          </CardTitle>
          <Badge variant="outline" className="border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-300">
            {group.emoji} {attesterName || group.nameVi}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Bạn đang kết nối với ví Attester nhóm {group.nameVi}. 
          {pendingForMe.length > 0 
            ? ` Có ${pendingForMe.length} request cần chữ ký của bạn.`
            : ' Không có request nào cần ký lúc này.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats summary */}
        {!isLoading && requests.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2.5 text-center">
              <div className="text-lg font-bold text-amber-600">{formatFUN(totalFunPending)}</div>
              <div className="text-[10px] text-muted-foreground font-medium">FUN chờ ký · {pending.length} lệnh</div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-2.5 text-center">
              <div className="text-lg font-bold text-green-600">{formatFUN(totalFunSigned)}</div>
              <div className="text-[10px] text-muted-foreground font-medium">FUN đã ký · {signed.length} lệnh</div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            Không có mint request nào đang chờ ký
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-3">
              {requests.map(req => (
                <RequestCard
                  key={req.id}
                  request={req}
                  attesterGroup={attesterGroup}
                  isSigning={isSigning}
                  onSign={onSign}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
});

AttesterSigningPanel.displayName = 'AttesterSigningPanel';
