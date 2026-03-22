import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Eye } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import WalletAbuseTab from "./WalletAbuseTab";
import SurveillanceTab from "./SurveillanceTab";
import type { AdminUserData } from "@/hooks/useAdminUsers";

interface FraudTabProps {
  users: AdminUserData[];
  adminId: string;
  onRefresh: () => void;
}

const FraudTab = ({ users, adminId, onRefresh }: FraudTabProps) => {
  const { t } = useLanguage();

  return (
    <Tabs defaultValue="abuse" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 h-auto">
        <TabsTrigger value="abuse" className="gap-2 py-2">
          <Wallet className="w-4 h-4" />
          <span className="hidden sm:inline">{t('adminWalletAbuse')}</span>
        </TabsTrigger>
        <TabsTrigger value="surveillance" className="gap-2 py-2">
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">{t('adminSurveillance')}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="abuse">
        <WalletAbuseTab users={users} adminId={adminId} onRefresh={onRefresh} />
      </TabsContent>
      <TabsContent value="surveillance">
        <SurveillanceTab adminId={adminId} />
      </TabsContent>
    </Tabs>
  );
};

export default FraudTab;
