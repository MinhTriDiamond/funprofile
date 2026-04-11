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
  hasSocialLinks: boolean;
  accountAgeDays: number;
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
  hasSocialLinks,
  accountAgeDays,
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
        hasSocialLinks={hasSocialLinks}
        accountAgeDays={accountAgeDays}
        onClaimClick={onClaimClick}
        onConnectClick={onConnectClick}
      />
    </div>
  );
}
