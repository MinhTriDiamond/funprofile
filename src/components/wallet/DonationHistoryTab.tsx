import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Send, Gift, Loader2, History, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDonationHistory, useDonationStats, DonationRecord } from '@/hooks/useDonationHistory';
import { exportDonationsToCSV } from '@/utils/exportDonations';
import { DonationHistoryItem } from './DonationHistoryItem';
import { DonationSuccessCard } from '@/components/donations/DonationSuccessCard';
import { DonationReceivedCard } from '@/components/donations/DonationReceivedCard';
import { formatNumber } from '@/lib/formatters';
import { toast } from 'sonner';

export function DonationHistoryTab() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [selectedDonation, setSelectedDonation] = useState<DonationRecord | null>(null);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  
  const { data: sentDonations, isLoading: isSentLoading } = useDonationHistory('sent');
  const { data: receivedDonations, isLoading: isReceivedLoading } = useDonationHistory('received');
  const { data: stats } = useDonationStats();

  const currentDonations = activeTab === 'sent' ? sentDonations : receivedDonations;
  const isLoading = activeTab === 'sent' ? isSentLoading : isReceivedLoading;

  const handleDonationClick = (donation: DonationRecord, type: 'sent' | 'received') => {
    setActiveTab(type);
    setSelectedDonation(donation);
    setIsCelebrationOpen(true);
  };

  const handleCloseCelebration = () => {
    setIsCelebrationOpen(false);
    setSelectedDonation(null);
  };

  const handleExport = () => {
    if (!currentDonations || currentDonations.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    exportDonationsToCSV(currentDonations, activeTab);
    toast.success(`Đã xuất ${currentDonations.length} records ra file CSV`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-gray-900">Lịch Sử Tặng Thưởng</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!currentDonations || currentDonations.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất CSV</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/donations')}
            className="gap-2"
          >
            <span className="hidden sm:inline">Xem tất cả</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-100">
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-700 font-medium">Đã gửi</span>
          </div>
          <div className="text-lg font-bold text-emerald-800">
            {stats?.totalSentCount || 0} lần
          </div>
          {stats?.sent && Object.keys(stats.sent).length > 0 && (
            <div className="text-xs text-emerald-600 mt-1">
              {Object.entries(stats.sent).map(([token, amount]) => (
                <span key={token} className="mr-2">
                  {formatNumber(amount)} {token}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700 font-medium">Đã nhận</span>
          </div>
          <div className="text-lg font-bold text-amber-800">
            {stats?.totalReceivedCount || 0} lần
          </div>
          {stats?.received && Object.keys(stats.received).length > 0 && (
            <div className="text-xs text-amber-600 mt-1">
              {Object.entries(stats.received).map(([token, amount]) => (
                <span key={token} className="mr-2">
                  {formatNumber(amount)} {token}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sent' | 'received')}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="sent" className="flex-1 gap-2">
            <Send className="w-4 h-4" />
            Đã gửi ({sentDonations?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="received" className="flex-1 gap-2">
            <Gift className="w-4 h-4" />
            Đã nhận ({receivedDonations?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="mt-0">
          <DonationList 
            donations={sentDonations} 
            isLoading={isSentLoading} 
            type="sent" 
            onItemClick={(donation) => handleDonationClick(donation, 'sent')}
          />
        </TabsContent>
        
        <TabsContent value="received" className="mt-0">
          <DonationList 
            donations={receivedDonations} 
            isLoading={isReceivedLoading} 
            type="received" 
            onItemClick={(donation) => handleDonationClick(donation, 'received')}
          />
        </TabsContent>
      </Tabs>

      {/* Celebration Cards */}
      {selectedDonation && activeTab === 'sent' && (
        <DonationSuccessCard
          isOpen={isCelebrationOpen}
          onClose={handleCloseCelebration}
          data={{
            id: selectedDonation.id,
            amount: selectedDonation.amount,
            tokenSymbol: selectedDonation.token_symbol,
            senderUsername: selectedDonation.sender?.username || 'Unknown',
            senderAvatarUrl: selectedDonation.sender?.avatar_url,
            recipientUsername: selectedDonation.recipient?.username || 'Unknown',
            recipientAvatarUrl: selectedDonation.recipient?.avatar_url,
            message: selectedDonation.message,
            txHash: selectedDonation.tx_hash,
            lightScoreEarned: selectedDonation.light_score_earned || 0,
            createdAt: selectedDonation.created_at,
          }}
        />
      )}

      {selectedDonation && activeTab === 'received' && (
        <DonationReceivedCard
          isOpen={isCelebrationOpen}
          onClose={handleCloseCelebration}
          data={{
            id: selectedDonation.id,
            amount: selectedDonation.amount,
            tokenSymbol: selectedDonation.token_symbol,
            senderUsername: selectedDonation.sender?.username || 'Unknown',
            senderAvatarUrl: selectedDonation.sender?.avatar_url,
            senderId: selectedDonation.sender?.id || '',
            message: selectedDonation.message,
            txHash: selectedDonation.tx_hash,
            createdAt: selectedDonation.created_at,
          }}
        />
      )}
    </div>
  );
}

// Sub-component for list
function DonationList({ 
  donations, 
  isLoading, 
  type,
  onItemClick
}: { 
  donations: ReturnType<typeof useDonationHistory>['data'];
  isLoading: boolean;
  type: 'sent' | 'received';
  onItemClick: (donation: DonationRecord) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!donations || donations.length === 0) {
    return (
      <div className="text-center py-12">
        <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">
          {type === 'sent' ? 'Bạn chưa tặng quà cho ai' : 'Bạn chưa nhận được quà nào'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
      {donations.map((donation) => (
        <DonationHistoryItem 
          key={donation.id} 
          donation={donation} 
          type={type} 
          onClick={() => onItemClick(donation)}
        />
      ))}
    </div>
  );
}
