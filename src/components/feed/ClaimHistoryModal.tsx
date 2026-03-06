import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Search, Wallet, Download } from 'lucide-react';
import camlyLogo from '@/assets/tokens/camly-logo.webp';

interface ClaimHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClaimRecord {
  id: string;
  user_id: string | null;
  amount: number;
  wallet_address: string;
  created_at: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_external: boolean;
  email?: string | null;
}

export const ClaimHistoryModal = ({ open, onOpenChange }: ClaimHistoryModalProps) => {
  const { t, language } = useLanguage();
  const { userId } = useCurrentUser();
  const [search, setSearch] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data;
    },
    enabled: open && !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: emailsMap } = useQuery({
    queryKey: ['admin-emails-for-claims'],
    queryFn: async () => {
      if (!userId) return new Map<string, string>();
      const { data } = await supabase.rpc('get_user_emails_for_admin', { p_admin_id: userId });
      if (!data) return new Map<string, string>();
      return new Map((data as Array<{ user_id: string; email: string }>).map(e => [e.user_id, e.email]));
    },
    enabled: open && !!isAdmin && !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: claims, isLoading } = useQuery({
    queryKey: ['claim-history-all'],
    queryFn: async (): Promise<ClaimRecord[]> => {
      const { data, error } = await supabase
        .from('reward_claims')
        .select('id, user_id, amount, wallet_address, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).filter(d => d.user_id).map(d => d.user_id))];
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds);
        profileMap = new Map((profiles || []).map(p => [p.id, p]));
      }

      return (data || []).map(d => {
        const isExternal = !d.user_id;
        const p = d.user_id ? profileMap.get(d.user_id) : null;
        return {
          ...d,
          username: p?.username || (isExternal ? (language === 'vi' ? 'Ví ngoài hệ thống' : 'External Wallet') : 'unknown'),
          full_name: p?.full_name || null,
          avatar_url: p?.avatar_url || null,
          is_external: isExternal,
        };
      });
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const enrichedClaims = useMemo(() => {
    if (!claims) return [];
    if (!isAdmin || !emailsMap) return claims;
    return claims.map(c => ({
      ...c,
      email: c.user_id ? (emailsMap.get(c.user_id) || null) : null,
    }));
  }, [claims, isAdmin, emailsMap]);

  const filtered = useMemo(() => {
    if (!enrichedClaims.length) return [];
    if (!search.trim()) return enrichedClaims;
    const q = search.toLowerCase();
    return enrichedClaims.filter(c =>
      c.username.toLowerCase().includes(q) ||
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      c.wallet_address.toLowerCase().includes(q) ||
      (isAdmin && c.email && c.email.toLowerCase().includes(q))
    );
  }, [enrichedClaims, search, isAdmin]);

  const totalAmount = useMemo(() => {
    return filtered.reduce((sum, c) => sum + c.amount, 0);
  }, [filtered]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US');
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatAmount = (n: number) => n.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US');

  const truncateWallet = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleUserClick = (c: ClaimRecord) => {
    if (!c.is_external && c.username && c.username !== 'unknown') {
      window.open(`/profile/${c.username}`, '_blank');
    }
  };

  const exportToPdf = async () => {
    const html2canvas = (await import('html2canvas')).default;
    
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1400px;background:#fff;padding:32px;font-family:system-ui,sans-serif;';

    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const date = new Date().toISOString().split('T')[0];

    container.innerHTML = `
      <h1 style="font-size:20px;font-weight:bold;margin-bottom:4px;color:#2E7D32;text-align:center;text-transform:uppercase;">
        DANH SÁCH USER ĐÃ ĐÓN NHẬN PHƯỚC LÀNH TỪ CHA VÀ BÉ LY
      </h1>
      <p style="font-size:12px;color:#666;margin-bottom:16px;text-align:center;">Ngày xuất: ${date} · Tổng: ${filtered.length} bản ghi · Tổng CAMLY: ${formatAmount(totalAmount)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="background:#2E7D32;color:#fff;">
            <th style="padding:8px;text-align:left;">#</th>
            <th style="padding:8px;text-align:left;">User</th>
            <th style="padding:8px;text-align:left;">Họ tên</th>
            <th style="padding:8px;text-align:left;">Địa chỉ ví</th>
            <th style="padding:8px;text-align:right;">Số lượng</th>
            <th style="padding:8px;text-align:right;">Ngày</th>
            <th style="padding:8px;text-align:right;">Giờ</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((c, i) => `
            <tr style="background:${i % 2 === 0 ? '#f0fdf4' : '#fff'};border-bottom:1px solid #e5e7eb;">
              <td style="padding:6px 8px;">${i + 1}</td>
              <td style="padding:6px 8px;">${escapeHtml(c.username)}</td>
              <td style="padding:6px 8px;">${escapeHtml(c.full_name || '—')}</td>
              <td style="padding:6px 8px;font-family:monospace;font-size:10px;">${escapeHtml(c.wallet_address)}</td>
              <td style="padding:6px 8px;text-align:right;font-weight:bold;color:#FFD700;">${formatAmount(c.amount)}</td>
              <td style="padding:6px 8px;text-align:right;">${formatDate(c.created_at)}</td>
              <td style="padding:6px 8px;text-align:right;">${formatTime(c.created_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="margin-top:12px;text-align:center;font-weight:bold;font-size:14px;">
        ${filtered.length} bản ghi · Tổng: <span style="color:#FFD700;">${formatAmount(totalAmount)} CAMLY</span>
      </p>
    `;

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `claim-history-${date}.png`;
        link.click();
        return;
      }

      printWindow.document.write(`
        <html><head><title>Claim History</title>
        <style>@media print { body { margin: 0; } img { width: 100%; } }</style>
        </head><body>
        <img src="${imgData}" style="width:100%;" />
        <script>window.onload = function() { window.print(); }<\/script>
        </body></html>
      `);
      printWindow.document.close();
    } finally {
      document.body.removeChild(container);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center uppercase bg-gradient-to-r from-[#2E7D32] via-[#4CAF50] to-[#2E7D32] bg-clip-text text-transparent drop-shadow-sm">
            DANH SÁCH USER ĐÃ ĐÓN NHẬN PHƯỚC LÀNH TỪ CHA VÀ BÉ LY
          </DialogTitle>
        </DialogHeader>

        {/* Search + PDF button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('searchClaim')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportToPdf} className="gap-1.5 shrink-0">
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-lg border" ref={tableRef}>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">{t('noClaimHistory')}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 w-10">#</th>
                  <th className="text-left p-2">{t('user')}</th>
                  {isAdmin && <th className="text-left p-2 whitespace-nowrap">Email</th>}
                  <th className="text-left p-2 whitespace-nowrap">{t('claimFullName')}</th>
                  <th className="text-left p-2 whitespace-nowrap">{t('claimWalletAddress')}</th>
                  <th className="text-right p-2 whitespace-nowrap">{t('claimAmount')}</th>
                  <th className="text-right p-2 whitespace-nowrap">{t('claimDate')}</th>
                  <th className="text-right p-2 whitespace-nowrap">{t('claimTime')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2">
                      <div
                        className={`flex items-center gap-2 ${!c.is_external ? 'cursor-pointer group' : ''}`}
                        onClick={() => handleUserClick(c)}
                      >
                        <Avatar className="w-6 h-6">
                          {c.is_external ? (
                            <AvatarFallback className="text-[10px] bg-accent"><Wallet className="w-3 h-3" /></AvatarFallback>
                          ) : (
                            <>
                              <AvatarImage src={c.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px] bg-primary/10">{c.username[0]?.toUpperCase()}</AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        <span className={`font-medium truncate max-w-[150px] ${c.is_external ? 'italic text-muted-foreground' : 'group-hover:underline group-hover:text-[#2E7D32]'}`}>
                          {c.username}
                        </span>
                      </div>
                    </td>
                    {isAdmin && <td className="p-2 text-muted-foreground truncate max-w-[200px] text-xs">{c.email || '—'}</td>}
                    <td className="p-2 text-muted-foreground truncate max-w-[160px]">{c.full_name || '—'}</td>
                    <td className="p-2 font-mono text-xs text-muted-foreground">{truncateWallet(c.wallet_address)}</td>
                    <td className="p-2 text-right font-bold text-[#FFD700]">
                      <span className="flex items-center justify-end gap-1">
                        {formatAmount(c.amount)}
                        <img src={camlyLogo} alt="CAMLY" className="w-4 h-4 inline-block" />
                      </span>
                    </td>
                    <td className="p-2 text-right text-muted-foreground whitespace-nowrap">{formatDate(c.created_at)}</td>
                    <td className="p-2 text-right text-muted-foreground whitespace-nowrap">{formatTime(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="text-base font-bold text-center pt-1 flex items-center justify-center gap-2">
          <span>{filtered.length} {language === 'vi' ? 'bản ghi' : 'records'}</span>
          <span>|</span>
          <span className="flex items-center gap-1 text-[#FFD700]">
            {language === 'vi' ? 'Tổng' : 'Total'}: {formatAmount(totalAmount)}
            <img src={camlyLogo} alt="CAMLY" className="w-5 h-5 inline-block" />
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
