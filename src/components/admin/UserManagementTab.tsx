import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Ghost, Trash2, Share2 } from "lucide-react";
import UserReviewTab from "./UserReviewTab";
import GhostCleanupTab from "./GhostCleanupTab";
import QuickDeleteTab from "./QuickDeleteTab";
import SocialLinksTab from "./SocialLinksTab";
import type { AdminUserData } from "@/hooks/useAdminUsers";

interface UserManagementTabProps {
  users: AdminUserData[];
  adminId: string;
  onRefresh: () => void;
}

const UserManagementTab = ({ users, adminId, onRefresh }: UserManagementTabProps) => {
  return (
    <Tabs defaultValue="review" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4 h-auto">
        <TabsTrigger value="review" className="gap-2 py-2">
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Rà soát</span>
        </TabsTrigger>
        <TabsTrigger value="ghost" className="gap-2 py-2">
          <Ghost className="w-4 h-4" />
          <span className="hidden sm:inline">User ảo</span>
        </TabsTrigger>
        <TabsTrigger value="delete" className="gap-2 py-2">
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Xóa nhanh</span>
        </TabsTrigger>
        <TabsTrigger value="social" className="gap-2 py-2">
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Social Links</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="review">
        <UserReviewTab users={users} adminId={adminId} onRefresh={onRefresh} />
      </TabsContent>
      <TabsContent value="ghost">
        <GhostCleanupTab adminId={adminId} onNavigate={() => {}} />
      </TabsContent>
      <TabsContent value="delete">
        <QuickDeleteTab users={users} adminId={adminId} onRefresh={onRefresh} />
      </TabsContent>
      <TabsContent value="social">
        <SocialLinksTab />
      </TabsContent>
    </Tabs>
  );
};

export default UserManagementTab;
