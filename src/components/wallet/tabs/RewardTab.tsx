import { ClaimRewardsSection } from '../ClaimRewardsSection';

interface RewardTabProps {
  claimableReward: number;
  claimedAmount: number;
  dailyClaimed: number;
  rewardStats: any;
  camlyPrice: number | null;
  isConnected: boolean;
  rewardStatus: string;
  adminNotes?: string | null;
  isLoading: boolean;
  hasAvatar: boolean;
  hasCover: boolean;
  hasTodayPost: boolean;
  hasFullName: boolean;
  onClaimClick: () => void;
  onConnectClick: () => void;
}

export function RewardTab({
  claimableReward,
  claimedAmount,
  dailyClaimed,
  rewardStats,
  camlyPrice,
  isConnected,
  rewardStatus,
  adminNotes,
  isLoading,
  hasAvatar,
  hasCover,
  hasTodayPost,
  hasFullName,
  onClaimClick,
  onConnectClick,
}: RewardTabProps) {
  return (
    <div className="space-y-4">
      <ClaimRewardsSection
        claimableReward={claimableReward}
        claimedAmount={claimedAmount}
        dailyClaimed={dailyClaimed}
        rewardStats={rewardStats}
        camlyPrice={camlyPrice}
        isConnected={isConnected}
        rewardStatus={rewardStatus}
        adminNotes={adminNotes}
        isLoading={isLoading}
        hasAvatar={hasAvatar}
        hasCover={hasCover}
        hasTodayPost={hasTodayPost}
        hasFullName={hasFullName}
        onClaimClick={onClaimClick}
        onConnectClick={onConnectClick}
      />
    </div>
  );
}
