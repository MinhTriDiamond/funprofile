import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Gift, Tag } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePersistedTab } from "@/hooks/usePersistedTab";
import FinancialTab from "./FinancialTab";
import { DonationHistoryAdminTab } from "./DonationHistoryAdminTab";
import ExternalWalletLabelsTab from "./ExternalWalletLabelsTab";

const FinanceDonationsTab = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = usePersistedTab('admin-finance-tab', 'financial', ['financial', 'donations', 'wallet-labels'] as const);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-3 h-auto">
        <TabsTrigger value="financial" className="gap-2 py-2">
          <DollarSign className="w-4 h-4" />
          <span className="hidden sm:inline">{t('adminFinancial')}</span>
        </TabsTrigger>
        <TabsTrigger value="donations" className="gap-2 py-2">
          <Gift className="w-4 h-4" />
          <span className="hidden sm:inline">{t('adminDonations')}</span>
        </TabsTrigger>
        <TabsTrigger value="wallet-labels" className="gap-2 py-2">
          <Tag className="w-4 h-4" />
          <span className="hidden sm:inline">{t('adminWalletLabels')}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="financial">
        <FinancialTab />
      </TabsContent>
      <TabsContent value="donations">
        <DonationHistoryAdminTab />
      </TabsContent>
      <TabsContent value="wallet-labels">
        <ExternalWalletLabelsTab />
      </TabsContent>
    </Tabs>
  );
};

export default FinanceDonationsTab;
