import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Users, AlertTriangle, Ban, FileText, Smartphone, CheckCircle, Trash2, Globe, Monitor } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface UserData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  is_banned: boolean;
  pending_reward: number;
  approved_reward?: number;
  reward_status?: string;
  created_at?: string;
  bio?: string | null;
}

interface WalletAbuseTabProps {
  users: UserData[];
  adminId: string;
  onRefresh: () => void;
}

interface IpInfo {
  ip_address: string;
  user_agent: string | null;
  created_at: string;
}

interface DeviceGroup {
  device_hash: string;
  users: { user_id: string; username: string }[];
  totalCamly: number;
}

const WalletAbuseTab = ({ users, adminId, onRefresh }: WalletAbuseTabProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);
  const [ipMap, setIpMap] = useState<Record<string, IpInfo>>({});

  // Fetch shared devices + IP logs on mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch device groups
      const { data: deviceData } = await supabase
        .from('pplp_device_registry')
        .select('device_hash, user_id');

      if (deviceData) {
        const groups: Record<string, string[]> = {};
        deviceData.forEach((d: any) => {
          if (!groups[d.device_hash]) groups[d.device_hash] = [];
          if (!groups[d.device_hash].includes(d.user_id)) {
            groups[d.device_hash].push(d.user_id);
          }
        });

        const shared = Object.entries(groups)
          .filter(([_, uids]) => uids.length > 1)
          .map(([hash, uids]) => {
            const groupUsers = uids.map(uid => {
              const u = users.find(u => u.id === uid);
              return { user_id: uid, username: u?.username || uid.slice(0, 8) };
            });
            const totalCamly = uids.reduce((sum, uid) => {
              const u = users.find(u => u.id === uid);
              return sum + (u?.pending_reward || 0) + (u?.approved_reward || 0);
            }, 0);
            return { device_hash: hash, users: groupUsers, totalCamly };
          })
          .sort((a, b) => b.totalCamly - a.totalCamly);

        setDeviceGroups(shared);

        // Fetch IP logs for all users in shared device groups
        const allUserIds = shared.flatMap(g => g.users.map(u => u.user_id));
        if (allUserIds.length > 0) {
          const { data: ipData } = await supabase
            .from('login_ip_logs')
            .select('user_id, ip_address, user_agent, created_at')
            .in('user_id', allUserIds)
            .order('created_at', { ascending: false });

          if (ipData) {
            const map: Record<string, IpInfo> = {};
            ipData.forEach((log: any) => {
              if (!map[log.user_id]) {
                map[log.user_id] = {
                  ip_address: log.ip_address,
                  user_agent: log.user_agent,
                  created_at: log.created_at,
                };
              }
            });
            setIpMap(map);
          }
        }
      }
    };
    fetchData();
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

  const handlePermanentDelete = async (user: UserData) => {
    if (!confirm(`⚠️ Xóa vĩnh viễn ${user.username}?\nHành động này không thể hoàn tác!`)) return;
    setLoading(`delete-${user.id}`);
    try {
      const { error: banError } = await supabase.rpc('ban_user_permanently', {
        p_admin_id: adminId,
        p_user_id: user.id,
        p_reason: 'Xóa vĩnh viễn - lạm dụng đa tài khoản'
      });
      if (banError) throw banError;

      await supabase.from('profiles').update({
        pending_reward: 0,
        approved_reward: 0,
        reward_status: 'banned'
      }).eq('id', user.id);

      await supabase.from('audit_logs').insert({
        admin_id: adminId,
        target_user_id: user.id,
        action: 'permanent_delete',
        reason: 'Xóa vĩnh viễn - lạm dụng đa tài khoản'
      });

      toast.success(`Đã xóa vĩnh viễn ${user.username}`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi xóa user");
    } finally {
      setLoading(null);
    }
  };

  const handleReapprove = async (user: UserData) => {
    setLoading(`reapprove-${user.id}`);
    try {
      const { error } = await supabase.from('profiles').update({
        reward_status: 'approved'
      }).eq('id', user.id);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        admin_id: adminId,
        target_user_id: user.id,
        action: 'reapprove_reward',
        reason: 'Admin duyệt lại từ tab Lạm dụng'
      });

      toast.success(`Đã duyệt lại ${user.username}`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi duyệt lại");
    } finally {
      setLoading(null);
    }
  };

  const handleReapproveGroup = async (group: DeviceGroup) => {
    setLoading(`reapprove-group-${group.device_hash}`);
    try {
      for (const u of group.users) {
        await supabase.from('profiles').update({ reward_status: 'approved' }).eq('id', u.user_id);
        await supabase.from('audit_logs').insert({
          admin_id: adminId,
          target_user_id: u.user_id,
          action: 'reapprove_reward',
          reason: 'Admin duyệt lại nhóm thiết bị từ tab Lạm dụng'
        });
      }
      toast.success(`Đã duyệt lại ${group.users.length} tài khoản`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi duyệt lại nhóm");
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

  const handleBanDeviceGroup = async (group: DeviceGroup) => {
    if (!confirm(`⚠️ Cấm tất cả ${group.users.length} tài khoản trong nhóm thiết bị này?`)) return;
    setLoading(`ban-group-${group.device_hash}`);
    try {
      for (const u of group.users) {
        const userData = users.find(usr => usr.id === u.user_id);
        if (userData) {
          await supabase.rpc('ban_user_permanently', {
            p_admin_id: adminId,
            p_user_id: u.user_id,
            p_reason: `Thiết bị dùng chung: ${group.device_hash.slice(0, 16)}`
          });
        }
      }
      toast.success(`Đã cấm ${group.users.length} tài khoản`);
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

  const parseUserAgent = (ua: string | null): string => {
    if (!ua) return 'Không rõ';
    const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|Samsung)/i)?.[1] || '';
    const os = ua.match(/(Android|iPhone|iPad|Windows|Mac|Linux)/i)?.[1] || '';
    return `${browser}/${os}`.replace(/^\/|\/$/g, '') || ua.slice(0, 30);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'on_hold':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">⏸️ Tạm ngưng</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">✅ Đã duyệt</Badge>;
      case 'banned':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">🚫 Bị cấm</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">⏳ Chờ duyệt</Badge>;
    }
  };

  const getAccountAge = (createdAt?: string) => {
    if (!createdAt) return '';
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: false, locale: vi });
    } catch {
      return '';
    }
  };

  // Enhanced user card for device tab
  const DeviceUserCard = ({ userId, username }: { userId: string; username: string }) => {
    const userData = users.find(u => u.id === userId);
    const ipInfo = ipMap[userId];
    if (!userData) return null;

    return (
      <div className="border rounded-lg p-3 bg-card space-y-2">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={userData.avatar_url || ""} />
            <AvatarFallback>{username[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{username}</p>
              {getStatusBadge(userData.reward_status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {userData.full_name || '(chưa có tên)'}
            </p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-[52px]">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Globe className="w-3 h-3" />
            <span>IP: {ipInfo?.ip_address || 'Chưa có'}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Monitor className="w-3 h-3" />
            <span>{parseUserAgent(ipInfo?.user_agent || null)}</span>
          </div>
          <div>
            <span className="text-amber-600 font-medium">{formatNumber(userData.pending_reward)} pending</span>
          </div>
          <div>
            <span className="text-green-600 font-medium">{formatNumber(userData.approved_reward || 0)} approved</span>
          </div>
          {userData.created_at && (
            <div className="col-span-2 text-muted-foreground">
              📅 Tạo: {new Date(userData.created_at).toLocaleDateString('vi-VN')} ({getAccountAge(userData.created_at)})
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-end pt-1">
          {userData.reward_status === 'on_hold' && (
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-300 hover:bg-green-50 text-xs"
              onClick={() => handleReapprove(userData)}
              disabled={loading === `reapprove-${userData.id}`}
            >
              <CheckCircle className="w-3 h-3 mr-1" /> Duyệt lại
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            className="text-xs"
            onClick={() => handlePermanentDelete(userData)}
            disabled={loading === `delete-${userData.id}` || loading === userData.id}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Xóa vĩnh viễn
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-purple-500" />
          Phát hiện lạm dụng
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="device">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="device" className="gap-1 text-xs sm:text-sm">
              <Smartphone className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Thiết bị</span> ({deviceGroups.length})
            </TabsTrigger>
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
          </TabsList>

          {/* Shared Devices - Enhanced */}
          <TabsContent value="device" className="max-h-[600px] overflow-y-auto space-y-4">
            {deviceGroups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Không phát hiện thiết bị dùng chung</p>
            ) : (
              deviceGroups.map((group, idx) => (
                <div key={idx} className="border-2 border-orange-200 rounded-xl p-4 space-y-3 bg-orange-50/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm font-bold">🖥️ Device: {group.device_hash.slice(0, 16)}...</p>
                      <p className="text-sm text-muted-foreground">
                        {group.users.length} tài khoản • <span className="text-red-600 font-semibold">Tổng CAMLY nhóm: {formatNumber(group.totalCamly)}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50 text-xs"
                        onClick={() => handleReapproveGroup(group)}
                        disabled={loading === `reapprove-group-${group.device_hash}`}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Duyệt lại tất cả
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs"
                        onClick={() => handleBanDeviceGroup(group)}
                        disabled={loading === `ban-group-${group.device_hash}`}
                      >
                        <Ban className="w-3 h-3 mr-1" /> Cấm tất cả
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {group.users.map(u => (
                      <DeviceUserCard key={u.user_id} userId={u.user_id} username={u.username} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

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
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WalletAbuseTab;
