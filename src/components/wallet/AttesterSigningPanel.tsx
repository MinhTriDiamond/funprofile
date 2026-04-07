import { memo, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Shield, CheckCircle2, Clock, Pen, CheckCheck, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';
import { useDateLocale } from '@/hooks/useDateLocale';
import { formatFUN, GOV_GROUPS, GovGroupKey } from '@/config/pplp';
import type { AttesterMintRequest } from '@/hooks/useAttesterSigning';

const GROUP_ORDER: GovGroupKey[] = ['will', 'wisdom', 'love'];

const GROUP_COLORS: Record<GovGroupKey, { bg: string; border: string; text: string; signedBg: string }> = {
  will: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    signedBg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  wisdom: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    signedBg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  love: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    signedBg: 'bg-rose-100 dark:bg-rose-900/40',
  },
};

const formatSignerAddress = (address?: string | null) => {
  if (!address) return null;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};

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

  const needsMySign = useMemo(() => requests.filter(r => {
    const sigs = r.multisig_signatures ?? {};
    const completed = r.multisig_completed_groups ?? [];
    return !sigs[attesterGroup] && !completed.includes(attesterGroup) && r.status !== 'signed';
  }), [requests, attesterGroup]);

  const signed = requests.filter(r => r.status === 'signed');
  const pending = requests.filter(r => r.status !== 'signed');
  const totalFunPending = pending.reduce((sum, r) => sum + Number(r.amount_display ?? 0), 0);
  const totalFunSigned = signed.reduce((sum, r) => sum + Number(r.amount_display ?? 0), 0);
  const isAnySigning = !!signingRequestId || signingAll;

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

  const handleSignSelected = async () => {
    const ids = Array.from(selectedIds).filter(id => needsMySign.some(r => r.id === id));
    if (ids.length === 0) return;
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
    <Card className="shadow-md border-border overflow-hidden">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-foreground font-semibold text-base">GOV Multisig Dashboard</span>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {needsMySign.length > 0
                  ? `${needsMySign.length} lệnh cần chữ ký · Tổng ${requests.length} lệnh`
                  : `${requests.length} lệnh · Không có lệnh nào cần ký`}
              </p>
            </div>
          </CardTitle>
          <Badge className="border-primary/20 bg-primary/5 text-primary text-xs font-medium">
            {group.emoji} {attesterName || group.nameVi}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Stats Row */}
        {!isLoading && requests.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{requests.length}</div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">Tổng lệnh</div>
            </div>
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{formatFUN(totalFunPending)}</div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">FUN chờ ký · {pending.length}</div>
            </div>
            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{formatFUN(totalFunSigned)}</div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">FUN hoàn tất · {signed.length}</div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isLoading && needsMySign.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleSignAll}
              disabled={isAnySigning}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
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
                  Ký tất cả ({needsMySign.length})
                </>
              )}
            </Button>
            {selectedIds.size > 0 && !signingAll && (
              <Button
                onClick={handleSignSelected}
                disabled={isAnySigning}
                variant="outline"
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
          <div className="space-y-1.5">
            <Progress value={(signAllProgress.current / signAllProgress.total) * 100} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Đang ký lệnh {signAllProgress.current}/{signAllProgress.total}…
            </p>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
              <Shield className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">Không có mint request nào</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <ScrollArea className="h-[520px]">
              {/* Table Header */}
              <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border">
                <div className="grid grid-cols-[36px_1fr_90px_1fr_72px] gap-2 px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center">
                    <Checkbox
                      checked={selectedIds.size === needsMySign.length && needsMySign.length > 0}
                      onCheckedChange={selectAll}
                      disabled={isAnySigning}
                    />
                  </div>
                  <div>Người nhận</div>
                  <div className="text-right">FUN</div>
                  <div className="text-center">Tiến trình ký (3/3)</div>
                  <div className="text-center">Ký</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-border">
                {requests.map(req => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    attesterGroup={attesterGroup}
                    isAnySigning={isAnySigning}
                    signingRequestId={signingRequestId}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onSign={onSign}
                    dateLocale={dateLocale}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

AttesterSigningPanel.displayName = 'AttesterSigningPanel';

/* ─── Request Row ─── */
interface RequestRowProps {
  req: AttesterMintRequest;
  attesterGroup: GovGroupKey;
  isAnySigning: boolean;
  signingRequestId: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSign: (id: string) => Promise<boolean>;
  dateLocale: Locale;
}

const RequestRow = memo(({
  req,
  attesterGroup,
  isAnySigning,
  signingRequestId,
  selectedIds,
  onToggleSelect,
  onSign,
  dateLocale,
}: RequestRowProps) => {
  const sigs = req.multisig_signatures ?? {};
  const completed = req.multisig_completed_groups ?? [];
  const myGroupSigned = !!sigs[attesterGroup];
  const isFullySigned = req.status === 'signed';
  const canSign = !myGroupSigned && !isFullySigned;
  const isThisSigning = signingRequestId === req.id;
  const signedCount = GROUP_ORDER.filter(gk => !!sigs[gk] || completed.includes(gk)).length;

  return (
    <div
      className={`grid grid-cols-[36px_1fr_100px_1fr_80px] gap-2 px-3 py-3 items-center text-sm transition-colors ${
        isThisSigning
          ? 'bg-primary/5'
          : 'hover:bg-muted/40'
      }`}
    >
      {/* Checkbox */}
      <div className="flex items-center">
        {canSign ? (
          <Checkbox
            checked={selectedIds.has(req.id)}
            onCheckedChange={() => onToggleSelect(req.id)}
            disabled={isAnySigning}
          />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        )}
      </div>

      {/* User info */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
        <span className="font-semibold text-foreground truncate text-base">
            {req.profiles?.username || 'Unknown'}
          </span>
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            #{req.id.slice(0, 6)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: dateLocale })}
          {req.action_types?.length > 0 && ` · ${req.action_types.join(', ')}`}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        <span className="font-bold text-amber-600 text-base">{formatFUN(req.amount_display)}</span>
      </div>

      {/* Signing progress — 3 group chips */}
      <TooltipProvider delayDuration={150}>
        <div className="flex items-center gap-1.5">
          {GROUP_ORDER.map(gk => {
            const sig = sigs[gk];
            const isSigned = !!sig || completed.includes(gk);
            const gInfo = GOV_GROUPS[gk];
            const colors = GROUP_COLORS[gk];
            const signerName = sig?.signer_name || formatSignerAddress(sig?.signer);

            return (
              <Tooltip key={gk}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium cursor-default transition-colors flex-1 min-w-0 ${
                      isSigned
                        ? `${colors.signedBg} ${colors.border} ${colors.text}`
                        : 'border-border bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <span className="shrink-0 text-xs">{gInfo.emoji}</span>
                    {isSigned ? (
                      <>
                        <span className="truncate font-semibold">{signerName || 'Đã ký'}</span>
                        <CheckCircle2 className="w-3 h-3 shrink-0 text-green-500" />
                      </>
                    ) : (
                      <>
                        <span className="truncate">Chờ ký</span>
                        <Clock className="w-3 h-3 shrink-0 opacity-50" />
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[220px] space-y-1">
                  <p className="font-semibold">{gInfo.emoji} {gInfo.nameVi}</p>
                  {isSigned ? (
                    <>
                      <p className="text-green-600">✅ {signerName || 'Đã ký'}</p>
                      {sig?.signer && (
                        <p className="font-mono text-[10px] text-muted-foreground break-all">{sig.signer}</p>
                      )}
                      {sig?.signed_at && (
                        <p className="text-muted-foreground">
                          {formatDistanceToNow(new Date(sig.signed_at), { addSuffix: true, locale: dateLocale })}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">⏳ Chờ ký bởi:</p>
                      {gInfo.members.map(m => (
                        <p key={m.name} className="text-[10px]">• {m.name}</p>
                      ))}
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
          {/* Counter badge */}
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] px-1.5 py-0.5 ${
              signedCount === 3
                ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700'
                : 'text-muted-foreground'
            }`}
          >
            {signedCount}/3
          </Badge>
        </div>
      </TooltipProvider>

      {/* Action */}
      <div className="flex justify-center">
        {canSign ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
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
          <span className="text-[11px] text-green-600 font-medium">✓ Đã ký</span>
        ) : (
          <Badge className="bg-green-100 text-green-700 border-0 text-[10px] dark:bg-green-900/40 dark:text-green-400">Hoàn tất</Badge>
        )}
      </div>
    </div>
  );
});

RequestRow.displayName = 'RequestRow';
