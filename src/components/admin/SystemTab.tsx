import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, CloudUpload, GitMerge } from "lucide-react";
import BlockchainTab from "./BlockchainTab";
import MediaMigrationTab from "./MediaMigrationTab";
import { MergeRequestsTab } from "./MergeRequestsTab";

interface SystemTabProps {
  adminId: string;
}

const SystemTab = ({ adminId }: SystemTabProps) => {
  return (
    <Tabs defaultValue="blockchain" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3 h-auto">
        <TabsTrigger value="blockchain" className="gap-2 py-2">
          <Link2 className="w-4 h-4" />
          <span className="hidden sm:inline">Blockchain</span>
        </TabsTrigger>
        <TabsTrigger value="migration" className="gap-2 py-2">
          <CloudUpload className="w-4 h-4" />
          <span className="hidden sm:inline">Migration</span>
        </TabsTrigger>
        <TabsTrigger value="merge" className="gap-2 py-2">
          <GitMerge className="w-4 h-4" />
          <span className="hidden sm:inline">Merge User</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="blockchain">
        <BlockchainTab adminId={adminId} />
      </TabsContent>
      <TabsContent value="migration">
        <MediaMigrationTab />
      </TabsContent>
      <TabsContent value="merge">
        <MergeRequestsTab />
      </TabsContent>
    </Tabs>
  );
};

export default SystemTab;
