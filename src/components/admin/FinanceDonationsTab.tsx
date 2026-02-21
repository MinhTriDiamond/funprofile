import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Gift } from "lucide-react";
import FinancialTab from "./FinancialTab";
import { DonationHistoryAdminTab } from "./DonationHistoryAdminTab";

const FinanceDonationsTab = () => {
  return (
    <Tabs defaultValue="financial" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 h-auto">
        <TabsTrigger value="financial" className="gap-2 py-2">
          <DollarSign className="w-4 h-4" />
          <span className="hidden sm:inline">Tài chính</span>
        </TabsTrigger>
        <TabsTrigger value="donations" className="gap-2 py-2">
          <Gift className="w-4 h-4" />
          <span className="hidden sm:inline">Donations</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="financial">
        <FinancialTab />
      </TabsContent>
      <TabsContent value="donations">
        <DonationHistoryAdminTab />
      </TabsContent>
    </Tabs>
  );
};

export default FinanceDonationsTab;
