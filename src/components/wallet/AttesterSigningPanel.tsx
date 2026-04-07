import { memo, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Shield, CheckCircle2, Clock, Pen, CheckCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { useDateLocale } from '@/hooks/useDateLocale';
import { formatFUN, GOV_GROUPS, GovGroupKey } from '@/config/pplp';
import type { AttesterMintRequest } from '@/hooks/useAttesterSigning';

const GROUP_ORDER: GovGroupKey[] = ['will', 'wisdom', 'love'];

interface AttesterSigningPanelProps {
  attesterGroup: GovGroupKey;
  attesterName: string | null;
  requests: AttesterMintRequest[];
  isLoading: boolean;
  signingRequestId: string | null;
  onSign: (id: string) => Promise<boolean>;
}

export const AttesterSigningPanel = memo(({
  attesterGroup,
  attesterName,
  requests,
  isLoading,
  signingRequestId,
  onSign,
}: AttesterSigningPanelProps) => {
  const group = GOV_GROUPS[attesterGroup];
  const dateLocale = useDateLocale();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [signingAll, setSigningAll] = useState(false);
  const [signAllProgress, setSignAllProgress] = useState({ current: 0, total: 0 });

  // Requests that need MY group's signature
  const needsMySign = useMemo(() => requests.filter(r => {
    const sigs = r.multisig_signatures ?? {};
    return !sigs[attesterGroup] && r.status !== 'signed';
  }), [requests, attesterGroup]);

  const signed = requests.filter(r => r.status === 'signed');
  const pending = requests.filter(r => r.status !== 'signed');
  const totalFunPending = pending.reduce((sum, r) => sum + Number(r.amount_display ?? 0), 0);
  const totalFunSigned = signed.reduce((sum, r) => sum + Number(r.amount_display ?? 0), 0);

  const isAnySigning = !!signingRequestId || signingAll;

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === needsMySign.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(needsMySign.map(r => r.id)));
    }
  };

  // Sign selected requests sequentially
  const handleSignSelected = async () => {
    const ids = Array.from(selectedIds).filter(id => needsMySign.some(r => r.id === id));
    if (ids.length === 0) return;

    setSigningAll(true);
    setSignAllProgress({ current: 0, total: ids.length });

    for (let i = 0; i < ids.length; i++) {
      setSignAllProgress({ current: i + 1, total: ids.length });
      const success = await onSign(ids[i]);
      if (!success) break; // Stop on failure (user rejected, etc.)
    }

    setSigningAll(false);
    setSelectedIds(new Set());
  };

  // Sign all pending
  const handleSignAll = async () => {
    const ids = needsMySign.map(r => r.id);
    setSelectedIds(new Set(ids));
    setSigningAll(true);
    setSignAllProgress({ current: 0, total: ids.length });

    for (let i = 0; i < ids.length; i++) {
      setSignAllProgress({ current: i + 1, total: ids.length });
      const success = await onSign(ids[i]);
      if (!success) break;
    }

    setSigningAll(false);
    setSelectedIds(new Set());
  };

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
          {needsMySign.length > 0
            ? ` Có ${needsMySign.length} request cần chữ ký của bạn.`
            : ' Không có request nào cần ký lúc này.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats */}
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

        {/* Action buttons */}
        {!isLoading && needsMySign.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleSignAll}
              disabled={isAnySigning}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
              size="sm"
            >
              {signingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang ký {signAllProgress.current}/{signAllProgress.total}
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Ký tất cả ({needsMySign.length} lệnh)
                </>
              )}
            </Button>
            {selectedIds.size > 0 && !signingAll && (
              <Button
                onClick={handleSignSelected}
                disabled={isAnySigning}
                variant="outline"
                className="border-violet-300 text-violet-700"
                size="sm"
              >
                <Pen className="w-4 h-4 mr-2" />
                Ký đã chọn ({selectedIds.size})
              </Button>
            )}
          </div>
        )}

        {/* Signing progress bar */}
        {signingAll && (
          <div className="space-y-1">
            <Progress value={(signAllProgress.current / signAllProgress.total) * 100} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Đang ký lệnh {signAllProgress.current}/{signAllProgress.total}...
            </p>
          </div>
        )}

        {/* Table */}
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
            {/* Header */}
            <div className="sticky top-0 z-10 bg-violet-50 dark:bg-violet-950/40 border-b border-border">
              <div className="grid grid-cols-[32px_1fr_100px_140px_80px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center">
                  <Checkbox
                    checked={selectedIds.size === needsMySign.length && needsMySign.length > 0}
                    onCheckedChange={selectAll}
                    disabled={isAnySigning}
                  />
                </div>
                <div>Người nhận</div>
                <div className="text-right">Số FUN</div>
                <div className="text-center">Tiến trình ký</div>
                <div className="text-center">Hành động</div>
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {requests.map(req => {
                const sigs = req.multisig_signatures ?? {};
                const completed = req.multisig_completed_groups ?? [];
                const myGroupSigned = !!sigs[attesterGroup];
                const isFullySigned = req.status === 'signed';
                const canSign = !myGroupSigned && !isFullySigned;
                const isThisSigning = signingRequestId === req.id;

                return (
                  <div
                    key={req.id}
                    className={`grid grid-cols-[32px_1fr_100px_140px_80px] gap-2 px-3 py-2.5 items-center text-sm hover:bg-muted/30 transition-colors ${
                      isThisSigning ? 'bg-violet-100/50 dark:bg-violet-900/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center">
                      {canSign ? (
                        <Checkbox
                          checked={selectedIds.has(req.id)}
                          onCheckedChange={() => toggleSelect(req.id)}
                          disabled={isAnySigning}
                        />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>

                    {/* User info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{req.profiles?.username || 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">#{req.id.slice(0, 6)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: dateLocale })}
                        {req.action_types?.length > 0 && ` · ${req.action_types.join(', ')}`}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right font-bold text-amber-600 text-xs">
                      {formatFUN(req.amount_display)}
                    </div>

                    {/* Signing progress */}
                    <div className="flex items-center justify-center gap-1">
                      {GROUP_ORDER.map(gk => {
                        const isSigned = !!sigs[gk];
                        const gInfo = GOV_GROUPS[gk];
                        return (
                          <div
                            key={gk}
                            title={`${gInfo.nameVi}: ${isSigned ? (sigs[gk]?.signer_name || 'Đã ký') : 'Chờ ký'}`}
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              isSigned
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <span>{gInfo.emoji}</span>
                            {isSigned ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Action */}
                    <div className="flex justify-center">
                      {canSign ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-violet-700 hover:bg-violet-100 dark:text-violet-300"
                          onClick={() => onSign(req.id)}
                          disabled={isAnySigning}
                        >
                          {isThisSigning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Pen className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      ) : myGroupSigned ? (
                        <span className="text-[10px] text-green-600">✓ Đã ký</span>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">Hoàn tất</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
});

AttesterSigningPanel.displayName = 'AttesterSigningPanel';
