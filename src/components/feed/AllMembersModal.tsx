import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AllMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MemberEntry {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export const AllMembersModal = ({ open, onOpenChange }: AllMembersModalProps) => {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  const { data: members, isLoading } = useQuery({
    queryKey: ['all-members-list'],
    queryFn: async (): Promise<MemberEntry[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, created_at')
        .eq('is_banned', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as MemberEntry[];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!members) return [];
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      m => m.username?.toLowerCase().includes(q) || m.full_name?.toLowerCase().includes(q)
    );
  }, [members, search]);

  const displayed = showAll ? filtered : filtered.slice(0, 50);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-800">
            <Users className="w-5 h-5" />
            Tổng Thành Viên ({members?.length || 0})
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        <ScrollArea className="flex-1 min-h-0 max-h-[60vh]">
          {isLoading ? (
            <div className="space-y-3 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Không tìm thấy thành viên nào</p>
          ) : (
            <div className="space-y-1 p-1">
              {/* Header */}
              <div className="grid grid-cols-[40px_1fr_auto] gap-3 px-2 py-1.5 text-xs font-semibold text-green-800 border-b">
                <span>#</span>
                <span>Thành viên</span>
                <span>Ngày tham gia</span>
              </div>

              {displayed.map((member, idx) => (
                <div
                  key={member.id}
                  className="grid grid-cols-[40px_1fr_auto] gap-3 items-center px-2 py-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/profile/${member.id}`);
                  }}
                >
                  <span className="text-xs text-muted-foreground font-medium">{idx + 1}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={member.avatar_url || ''} />
                      <AvatarFallback className="text-xs bg-primary/10">
                        {(member.username || '?')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.username}</p>
                      {member.full_name && (
                        <p className="text-xs text-muted-foreground truncate">{member.full_name}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(member.created_at)}
                  </span>
                </div>
              ))}

              {!showAll && filtered.length > 50 && (
                <button
                  className="w-full text-center text-sm text-green-700 hover:underline py-2"
                  onClick={() => setShowAll(true)}
                >
                  Xem thêm... ({filtered.length - 50} còn lại)
                </button>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="text-center text-sm font-semibold text-green-800 pt-1 border-t">
          Tổng: <span className="font-bold">{filtered.length}</span> thành viên
        </div>
      </DialogContent>
    </Dialog>
  );
};
