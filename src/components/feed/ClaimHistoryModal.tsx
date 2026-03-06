import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import { Search, Wallet } from 'lucide-react';
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
}

export const ClaimHistoryModal = ({ open, onOpenChange }: ClaimHistoryModalProps) => {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');

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

  const filtered = useMemo(() => {
    if (!claims) return [];
    if (!search.trim()) return claims;
    const q = search.toLowerCase();
    return claims.filter(c =>
      c.username.toLowerCase().includes(q) ||
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      c.wallet_address.toLowerCase().includes(q)
    );
  }, [claims, search]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-center">
            📋 {t('claimHistoryTitle')}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('searchClaim')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-lg border">
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
                  <th className="text-left p-2 hidden sm:table-cell">{t('claimFullName')}</th>
                  <th className="text-left p-2">{t('claimWalletAddress')}</th>
                  <th className="text-right p-2">{t('claimAmount')}</th>
                  <th className="text-right p-2 hidden sm:table-cell">{t('claimDate')}</th>
                  <th className="text-right p-2 hidden sm:table-cell">{t('claimTime')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={c.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/10">{c.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate max-w-[100px]">{c.username}</span>
                      </div>
                    </td>
                    <td className="p-2 text-muted-foreground truncate max-w-[120px] hidden sm:table-cell">{c.full_name || '—'}</td>
                    <td className="p-2 font-mono text-xs text-muted-foreground">{truncateWallet(c.wallet_address)}</td>
                    <td className="p-2 text-right font-bold text-[#FFD700]">
                      <span className="flex items-center justify-end gap-1">
                        {formatAmount(c.amount)}
                        <img src={camlyLogo} alt="CAMLY" className="w-4 h-4 inline-block" />
                      </span>
                    </td>
                    <td className="p-2 text-right text-muted-foreground hidden sm:table-cell">{formatDate(c.created_at)}</td>
                    <td className="p-2 text-right text-muted-foreground hidden sm:table-cell">{formatTime(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-1">
          {filtered.length} {language === 'vi' ? 'bản ghi' : 'records'}
        </div>
      </DialogContent>
    </Dialog>
  );
};
