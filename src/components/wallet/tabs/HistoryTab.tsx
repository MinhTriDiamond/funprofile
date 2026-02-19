import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DonationHistoryTab } from '../DonationHistoryTab';

export function HistoryTab() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <DonationHistoryTab />
      <div className="flex justify-center pt-2 pb-4">
        <Button
          variant="outline"
          className="w-full max-w-md gap-2 border-yellow-400 bg-white text-blue-600 hover:bg-yellow-50 hover:text-blue-700"
          onClick={() => navigate('/donations')}
        >
          Xem Tất Cả Giao Dịch FUN Profile
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
