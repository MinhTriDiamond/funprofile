import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Users, AlertTriangle, Ban, FileText, Smartphone } from "lucide-react";

interface UserData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  is_banned: boolean;
  pending_reward: number;
  bio?: string | null;
}

interface WalletAbuseTabProps {
  users: UserData[];
  adminId: string;
  onRefresh: () => void;
}

interface DeviceGroup {
  device_hash: string;
  users: { user_id: string; username: string }[];
}

const WalletAbuseTab = ({ users, adminId, onRefresh }: WalletAbuseTabProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);

  // Fetch shared devices on mount
  useEffect(() => {
    const fetchDeviceGroups = async () => {
      const { data, error } = await supabase
        .from('pplp_device_registry')
        .select('device_hash, user_id');

      if (error || !data) return;

      const groups: Record<string, string[]> = {};
      data.forEach((d: any) => {
        if (!groups[d.device_hash]) groups[d.device_hash] = [];
        if (!groups[d.device_hash].includes(d.user_id)) {
          groups[d.device_hash].push(d.user_id);
        }
      });

      const shared = Object.entries(groups)
        .filter(([_, uids]) => uids.length > 1)
        .map(([hash, uids]) => ({
          device_hash: hash,
          users: uids.map(uid => {
            const u = users.find(u => u.id === uid);
            return { user_id: uid, username: u?.username || uid.slice(0, 8) };
          })
        }));

      setDeviceGroups(shared);
    };
    fetchDeviceGroups();
  }, [users]);

  // Detect shared wallets
  const sharedWallets = useMemo(() => {
    const walletGroups: Record<string, UserData[]> = {};
    users.forEach(user => {
      if (user.wallet_address && !user.is_banned) {
        const wallet = user.wallet_address.toLowerCase();
        if (!walletGroups[wallet]) walletGroups[wallet] = [];
        walletGroups[wallet].push(user);
      }
    });
    return Object.entries(walletGroups)
      .filter(([_, userList]) => userList.length > 1)
      .map(([wallet, userList]) => ({
        wallet_address: wallet,
        users: userList,
        total_pending: userList.reduce((sum, u) => sum + u.pending_reward, 0)
      }))
      .sort((a, b) => b.total_pending - a.total_pending);
  }, [users]);

  // Detect duplicate bios
  const sharedBios = useMemo(() => {
    const bioGroups: Record<string, UserData[]> = {};
    users.forEach(user => {
      if (user.bio && !user.is_banned) {
        const normalized = user.bio.toLowerCase().trim().replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '');
        if (normalized.length > 10) {
          if (!bioGroups[normalized]) bioGroups[normalized] = [];
          bioGroups[normalized].push(user);
        }
      }
    });
    return Object.entries(bioGroups)
      .filter(([_, userList]) => userList.length > 1)
      .map(([_, userList]) => ({
        bio_preview: userList[0].bio!.slice(0, 60) + '...',
        users: userList,
        total_pending: userList.reduce((sum, u) => sum + u.pending_reward, 0)
      }))
      .sort((a, b) => b.total_pending - a.total_pending);
  }, [users]);

  // Detect fake names
  const isFakeName = (name: string | null): boolean => {
    if (!name) return true;
    const trimmed = name.trim();
    if (trimmed.length < 3) return true;
    if (/^\d+$/.test(trimmed)) return true;
    if (/^[a-z]{1,4}\d{5,}$/i.test(trimmed)) return true;
    if (/^(test|user|admin|guest|demo|abc|xyz)\d*$/i.test(trimmed)) return true;
    return false;
  };

  const fakeNameUsers = useMemo(() => {
    return users.filter(u => !u.is_banned && isFakeName(u.full_name)).sort((a, b) => b.pending_reward - a.pending_reward);
  }, [users]);

  // Missing profile users
  const missingProfileUsers = useMemo(() => {
    return users.filter(u => !u.is_banned && !u.full_name && !u.avatar_url && u.pending_reward > 0).sort((a, b) => b.pending_reward - a.pending_reward);
  }, [users]);

  const handleBanUser = async (user: UserData) => {
    setLoading(user.id);
    try {
      const { error } = await supabase.rpc('ban_user_permanently', {
        p_admin_id: adminId,
        p_user_id: user.id,
        p_reason: 'Lạm dụng ví/profile'
      });
      if (error) throw error;
      toast.success(`Đã cấm ${user.username}`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi cấm user");
    } finally {
      setLoading(null);
    }
  };

  const handleBanWalletGroup = async (walletGroup: { wallet_address: string; users: UserData[] }) => {
    setLoading(walletGroup.wallet_address);
    try {
      for (const user of walletGroup.users) {
        await supabase.rpc('ban_user_permanently', {
          p_admin_id: adminId,
          p_user_id: user.id,
          p_reason: `Ví dùng chung: ${walletGroup.wallet_address}`
        });
      }
      toast.success(`Đã cấm ${walletGroup.users.length} tài khoản dùng chung ví`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi cấm nhóm");
    } finally {
      setLoading(null);
    }
  };

  const handleBanBioGroup = async (bioGroup: { users: UserData[] }) => {
    setLoading('bio-group');
    try {
      for (const user of bioGroup.users) {
        await supabase.rpc('ban_user_permanently', {
          p_admin_id: adminId,
          p_user_id: user.id,
          p_reason: 'Bio trùng - nghi ngờ multi-account'
        });
      }
      toast.success(`Đã cấm ${bioGroup.users.length} tài khoản trùng bio`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi cấm nhóm");
    } finally {
      setLoading(null);
    }
  };

  const formatNumber = (num: number) => num.toLocaleString('vi-VN');
  const truncateAddress = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-purple-500" />
          Phát hiện lạm dụng
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="shared">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="shared" className="gap-1 text-xs sm:text-sm">
              <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ví chung</span> ({sharedWallets.length})
            </TabsTrigger>
            <TabsTrigger value="bio" className="gap-1 text-xs sm:text-sm">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Bio trùng</span> ({sharedBios.length})
            </TabsTrigger>
            <TabsTrigger value="fake" className="gap-1 text-xs sm:text-sm">
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Tên ảo</span> ({fakeNameUsers.length})
            </TabsTrigger>
            <TabsTrigger value="missing" className="gap-1 text-xs sm:text-sm">
              <Ban className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Thiếu</span> ({missingProfileUsers.length})
            </TabsTrigger>
            <TabsTrigger value="device" className="gap-1 text-xs sm:text-sm">
              <Smartphone className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Thiết bị</span> ({deviceGroups.length})
            </TabsTrigger>
          </TabsList>

          {/* Shared Wallets */}
          <TabsContent value="shared" className="max-h-[500px] overflow-y-auto space-y-4">
            {sharedWallets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Không phát hiện ví dùng chung</p>
            ) : (
              sharedWallets.map((group, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm">{truncateAddress(group.wallet_address)}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.users.length} tài khoản • Tổng pending: {formatNumber(group.total_pending)} CAMLY
                      </p>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => handleBanWalletGroup(group)} disabled={loading === group.wallet_address}>
                      <Ban className="w-4 h-4 mr-1" /> Cấm tất cả
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    {group.users.map(user => (
                      <div key={user.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback>{user.username[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{formatNumber(user.pending_reward)} CAMLY</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Shared Bios */}
          <TabsContent value="bio" className="max-h-[500px] overflow-y-auto space-y-4">
            {sharedBios.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Không phát hiện bio trùng</p>
            ) : (
              sharedBios.map((group, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm italic text-muted-foreground">"{group.bio_preview}"</p>
                      <p className="text-xs text-muted-foreground">
                        {group.users.length} tài khoản • Tổng pending: {formatNumber(group.total_pending)} CAMLY
                      </p>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => handleBanBioGroup(group)} disabled={loading === 'bio-group'}>
                      <Ban className="w-4 h-4 mr-1" /> Cấm tất cả
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    {group.users.map(user => (
                      <div key={user.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback>{user.username[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.full_name || '(trống)'} • {formatNumber(user.pending_reward)} CAMLY</p>
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => handleBanUser(user)} disabled={loading === user.id}>
                          <Ban className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Fake Names */}
          <TabsContent value="fake" className="max-h-[500px] overflow-y-auto space-y-3">
            {fakeNameUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Không phát hiện tên ảo</p>
            ) : (
              fakeNameUsers.map(user => (
                <div key={user.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar_url || ""} />
                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{user.username}</p>
                    <p className="text-xs text-muted-foreground">Tên: {user.full_name || "(trống)"} • Pending: {formatNumber(user.pending_reward)}</p>
                  </div>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Tên nghi ngờ</Badge>
                  <Button size="sm" variant="destructive" onClick={() => handleBanUser(user)} disabled={loading === user.id}>
                    <Ban className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          {/* Missing Profile */}
          <TabsContent value="missing" className="max-h-[500px] overflow-y-auto space-y-3">
            {missingProfileUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Không có profile thiếu thông tin</p>
            ) : (
              missingProfileUsers.map(user => (
                <div key={user.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{user.username}</p>
                    <p className="text-xs text-muted-foreground">Pending: {formatNumber(user.pending_reward)} CAMLY</p>
                  </div>
                  <Badge variant="outline" className="bg-red-100 text-red-700">Thiếu thông tin</Badge>
                  <Button size="sm" variant="destructive" onClick={() => handleBanUser(user)} disabled={loading === user.id}>
                    <Ban className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          {/* Shared Devices */}
          <TabsContent value="device" className="max-h-[500px] overflow-y-auto space-y-4">
            {deviceGroups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Không phát hiện thiết bị dùng chung</p>
            ) : (
              deviceGroups.map((group, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div>
                    <p className="font-mono text-sm">Device: {group.device_hash.slice(0, 16)}...</p>
                    <p className="text-xs text-muted-foreground">{group.users.length} tài khoản</p>
                  </div>
                  <div className="grid gap-2">
                    {group.users.map(u => {
                      const userData = users.find(usr => usr.id === u.user_id);
                      return (
                        <div key={u.user_id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={userData?.avatar_url || ""} />
                            <AvatarFallback>{u.username[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{u.username}</p>
                            <p className="text-xs text-muted-foreground">{formatNumber(userData?.pending_reward || 0)} CAMLY</p>
                          </div>
                          {userData && (
                            <Button size="sm" variant="destructive" onClick={() => handleBanUser(userData)} disabled={loading === userData.id}>
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WalletAbuseTab;
