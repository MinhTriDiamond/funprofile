import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useBenefactorLeaderboard, useRecipientLeaderboard, BenefactorEntry, RecipientEntry } from '@/hooks/useBenefactorLeaderboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Crown, 
  Trophy, 
  Medal, 
  Heart, 
  Download, 
  Sparkles, 
  TrendingUp,
  Users,
  Gift,
} from 'lucide-react';
import { getTxUrl } from '@/config/pplp';

type TimeRange = 'day' | 'week' | 'month' | 'all';

const Benefactors = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'donors' | 'recipients'>('donors');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const { data: donors, isLoading: isDonorsLoading } = useBenefactorLeaderboard({
    limit: 100,
    timeRange,
  });

  const { data: recipients, isLoading: isRecipientsLoading } = useRecipientLeaderboard({
    limit: 100,
    timeRange,
  });

  const handleExportCSV = () => {
    const data = activeTab === 'donors' ? donors : recipients;
    if (!data || data.length === 0) return;

    const headers = activeTab === 'donors'
      ? ['Rank', 'Username', 'Total Donated (FUN)', 'Donations Count', 'Light Score']
      : ['Rank', 'Username', 'Total Received (FUN)', 'Donations Count'];

    const rows = data.map((item: any) =>
      activeTab === 'donors'
        ? [item.rank, item.username, item.total_donated, item.total_donations, item.total_light_score]
        : [item.rank, item.username, item.total_received, item.total_donations]
    );

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `benefactors-${activeTab}-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-gold" />;
      case 2:
        return <Trophy className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-medium">{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-gold/20 to-amber-500/10 border-gold/50';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-300/10 border-gray-400/50';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-500/10 border-amber-600/50';
      default:
        return 'bg-card border-border';
    }
  };

  const renderDonorRow = (donor: BenefactorEntry) => (
    <div
      key={donor.user_id}
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${getRankBg(donor.rank)}`}
      onClick={() => navigate(`/profile/${donor.user_id}`)}
    >
      <div className="flex-shrink-0 w-10 flex items-center justify-center">
        {getRankIcon(donor.rank)}
      </div>
      <Avatar className="w-12 h-12 border-2 border-gold/30">
        <AvatarImage src={donor.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary">
          {donor.username?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">@{donor.username}</p>
        {donor.full_name && (
          <p className="text-sm text-muted-foreground truncate">{donor.full_name}</p>
        )}
      </div>
      <div className="text-right">
        <p className="font-bold text-gold">
          {Number(donor.total_donated).toLocaleString()} FUN
        </p>
        <p className="text-sm text-muted-foreground">
          {donor.total_donations} lần • ⭐ {donor.total_light_score}
        </p>
      </div>
    </div>
  );

  const renderRecipientRow = (recipient: RecipientEntry) => (
    <div
      key={recipient.user_id}
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${getRankBg(recipient.rank)}`}
      onClick={() => navigate(`/profile/${recipient.user_id}`)}
    >
      <div className="flex-shrink-0 w-10 flex items-center justify-center">
        {getRankIcon(recipient.rank)}
      </div>
      <Avatar className="w-12 h-12 border-2 border-primary/30">
        <AvatarImage src={recipient.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary">
          {recipient.username?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">@{recipient.username}</p>
        {recipient.full_name && (
          <p className="text-sm text-muted-foreground truncate">{recipient.full_name}</p>
        )}
      </div>
      <div className="text-right">
        <p className="font-bold text-primary">
          {Number(recipient.total_received).toLocaleString()} FUN
        </p>
        <p className="text-sm text-muted-foreground">
          {recipient.total_donations} lần nhận
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <FacebookNavbar />
      <main className="pt-36 md:pt-40 pb-20 px-4 sm:px-6 md:px-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <Crown className="w-10 h-10 text-gold" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gold to-amber-500 bg-clip-text text-transparent">
              BẢNG VINH DANH MẠNH THƯỜNG QUÂN
            </h1>
            <Crown className="w-10 h-10 text-gold" />
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Vinh danh những tấm lòng vàng đã đóng góp cho cộng đồng FUN Profile
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border rounded-xl p-4 text-center">
            <Gift className="w-6 h-6 mx-auto mb-2 text-gold" />
            <p className="text-2xl font-bold text-gold">
              {donors?.reduce((sum, d) => sum + Number(d.total_donated), 0).toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground">Tổng FUN đã tặng</p>
          </div>
          <div className="bg-card border rounded-xl p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-primary">{donors?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Mạnh thường quân</p>
          </div>
          <div className="bg-card border rounded-xl p-4 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold text-amber-500">
              {donors?.reduce((sum, d) => sum + Number(d.total_light_score), 0).toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground">Light Score tổng</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-4">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hôm nay</SelectItem>
              <SelectItem value="week">Tuần này</SelectItem>
              <SelectItem value="month">Tháng này</SelectItem>
              <SelectItem value="all">Tất cả</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Xuất CSV
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'donors' | 'recipients')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="donors" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Tặng nhiều nhất
            </TabsTrigger>
            <TabsTrigger value="recipients" className="gap-2">
              <Heart className="w-4 h-4" />
              Nhận nhiều nhất
            </TabsTrigger>
          </TabsList>

          <TabsContent value="donors" className="space-y-3">
            {isDonorsLoading ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))
            ) : donors && donors.length > 0 ? (
              donors.map(renderDonorRow)
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có dữ liệu tặng thưởng</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recipients" className="space-y-3">
            {isRecipientsLoading ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))
            ) : recipients && recipients.length > 0 ? (
              recipients.map(renderRecipientRow)
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có dữ liệu nhận thưởng</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Benefactors;
