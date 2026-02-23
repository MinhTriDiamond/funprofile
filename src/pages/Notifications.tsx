import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Heart, MessageCircle, Share2, Gift, UserPlus, UserX, UserCheck, Filter, Check, CheckCheck, Shield, Radio, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PullToRefreshContainer } from "@/components/common/PullToRefreshContainer";

type NotificationFilter = "all" | "reactions" | "comments" | "shares" | "friends" | "donations" | "system";

interface NotificationWithActor {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  post_id: string | null;
  metadata: Record<string, any> | null;
  actor: {
    id: string;
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
}

const Notifications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        navigate("/auth");
      }
    };
    getUser();
  }, [navigate]);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications-page", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          type,
          read,
          created_at,
          post_id,
          metadata,
          actor:profiles!notifications_actor_id_fkey(id, username, avatar_url, full_name)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as unknown as NotificationWithActor[];
    },
    enabled: !!userId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications-page", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const filterNotifications = (notifs: NotificationWithActor[]) => {
    switch (filter) {
      case "reactions":
        return notifs.filter(n => 
          ["like", "love", "haha", "wow", "sad", "angry", "comment_like"].includes(n.type)
        );
      case "comments":
        return notifs.filter(n => n.type === "comment");
      case "shares":
        return notifs.filter(n => n.type === "share");
      case "friends":
        return notifs.filter(n => 
          ["friend_request", "friend_accepted", "friend_removed"].includes(n.type)
        );
      case "donations":
        return notifs.filter(n => 
          ["donation", "claim_reward"].includes(n.type)
        );
      case "system":
        return notifs.filter(n => 
          ["reward_approved", "reward_rejected", "account_banned", "system", "admin_shared_device", "admin_email_farm", "admin_blacklisted_ip", "admin_fraud_daily"].includes(n.type)
        );
      default:
        return notifs;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
      case "love":
      case "care":
      case "comment_like":
        return <Heart className="h-4 w-4 text-red-500 fill-red-500" />;
      case "haha":
      case "wow":
      case "sad":
      case "angry":
      case "pray":
        return <Heart className="h-4 w-4 text-yellow-500 fill-yellow-500" />;
      case "comment":
      case "comment_reply":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "share":
        return <Share2 className="h-4 w-4 text-green-500" />;
      case "donation":
        return <Gift className="h-4 w-4 text-green-500" />;
      case "friend_request":
      case "friend_accepted":
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      case "friend_removed":
        return <UserX className="h-4 w-4 text-destructive" />;
      case "reward_approved":
      case "reward_rejected":
      case "claim_reward":
        return <Wallet className="h-4 w-4 text-amber-500" />;
      case "account_banned":
        return <Shield className="h-4 w-4 text-destructive" />;
      case "admin_shared_device":
      case "admin_email_farm":
      case "admin_blacklisted_ip":
      case "admin_fraud_daily":
        return <Shield className="h-4 w-4 text-orange-500" />;
      case "live_started":
        return <Radio className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationText = (notification: NotificationWithActor) => {
    const actorName = notification.actor?.username || t('anonymous');
    const m = notification.metadata;
    
    switch (notification.type) {
      case "like":
        return `${actorName} đã thích bài viết của bạn`;
      case "love":
        return `${actorName} đã yêu thích bài viết của bạn`;
      case "care":
        return `${actorName} đã thương thương bài viết của bạn`;
      case "haha":
        return `${actorName} đã cười với bài viết của bạn`;
      case "wow":
        return `${actorName} đã ngạc nhiên với bài viết của bạn`;
      case "sad":
        return `${actorName} đã buồn với bài viết của bạn`;
      case "angry":
        return `${actorName} đã phẫn nộ với bài viết của bạn`;
      case "pray":
        return `${actorName} đã gửi lời biết ơn với bài viết của bạn`;
      case "comment":
        return `${actorName} đã bình luận về bài viết của bạn`;
      case "comment_like":
        return `${actorName} đã thích bình luận của bạn`;
      case "comment_reply":
        return `${actorName} đã trả lời bình luận của bạn`;
      case "share":
        return `${actorName} đã chia sẻ bài viết của bạn`;
      case "donation":
        return `${actorName} đã tặng quà cho bạn`;
      case "friend_request":
        return `${actorName} đã gửi lời mời kết bạn`;
      case "friend_accepted":
        return `${actorName} đã chấp nhận lời mời kết bạn`;
      case "friend_removed":
        return `${actorName} đã hủy kết bạn với bạn`;
      case "reward_approved":
        return "🎉 Chúc mừng! Phần thưởng của bạn đã được duyệt";
      case "reward_rejected":
        return "📋 Yêu cầu nhận thưởng cần được xem xét lại";
      case "claim_reward":
        return "FUN Profile Treasury đã chuyển phần thưởng CAMLY về ví của bạn";
      case "account_banned":
        return "⚠️ Tài khoản của bạn đã bị hạn chế";
      case "live_started":
        return `🔴 ${actorName} đang phát trực tiếp`;
      case "admin_shared_device": {
        const detail = m?.device_hash
          ? ` Thiết bị ${m.device_hash}... có ${m.user_count || '?'} tài khoản`
          : ' Phát hiện thiết bị dùng chung nhiều tài khoản';
        return `🔴 Cảnh báo:${detail}`;
      }
      case "admin_email_farm": {
        const detail = m?.email_base
          ? ` Cụm email "${m.email_base}" có ${m.count || '?'} tài khoản`
          : ' Phát hiện cụm email farm nghi ngờ';
        return `🔴 Cảnh báo:${detail}`;
      }
      case "admin_blacklisted_ip": {
        const detail = m?.ip_address
          ? ` Đăng nhập từ IP bị chặn ${m.ip_address}`
          : ' Đăng nhập từ IP bị chặn';
        return `🔴 Cảnh báo:${detail}`;
      }
      case "admin_fraud_daily": {
        const detail = m?.alerts_count
          ? ` ${m.alerts_count} cảnh báo`
          : ' Có hoạt động đáng ngờ cần xử lý';
        return `📊 Báo cáo gian lận:${detail}`;
      }
      default:
        return "Bạn có thông báo mới";
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);
    
    queryClient.invalidateQueries({ queryKey: ["notifications-page", userId] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    
    queryClient.invalidateQueries({ queryKey: ["notifications-page", userId] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleNotificationClick = async (notification: NotificationWithActor) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.type === 'donation') {
      navigate(`/profile/${notification.actor?.id}`);
    } else if (notification.type === 'claim_reward' || notification.type === 'reward_approved' || notification.type === 'reward_rejected') {
      navigate('/wallet');
    } else if (notification.type === 'live_started' && notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else if (["friend_request", "friend_accepted", "friend_removed"].includes(notification.type)) {
      navigate(`/profile/${notification.actor?.id}`);
    }
  };

  const filteredNotifications = filterNotifications(notifications);
  const unreadCount = notifications.filter(n => !n.read).length;

  const filterOptions = [
    { value: "all", label: "Tất cả", icon: Bell },
    { value: "reactions", label: "Reactions", icon: Heart },
    { value: "comments", label: "Bình luận", icon: MessageCircle },
    { value: "shares", label: "Chia sẻ", icon: Share2 },
    { value: "donations", label: "Tặng thưởng", icon: Gift },
    { value: "friends", label: "Bạn bè", icon: UserPlus },
    { value: "system", label: "Hệ thống", icon: Shield },
  ];

  const handlePullRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications-page", userId] });
  }, [queryClient, userId]);

  return (
    <div className="min-h-screen overflow-hidden pb-20 lg:pb-0">
      {/* Header */}
      <div className="fixed top-[3cm] left-0 right-0 z-40 bg-card/80 border-b border-border">
        <div className="flex items-center justify-between px-4 sm:px-[2cm] py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Thông báo</h1>
              {unreadCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="bg-green-500 text-white hover:bg-green-600 animate-pulse"
                >
                  {unreadCount}
                </Badge>
              )}
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-primary text-sm"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Đọc tất cả
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="px-2 pb-2 overflow-x-auto scrollbar-hide">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as NotificationFilter)}>
            <TabsList className="bg-muted/50 p-1 h-auto flex-nowrap w-max">
              {filterOptions.map((option) => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full whitespace-nowrap border-[0.5px] transition-all duration-300",
                    "border-transparent hover:border-[#C9A84C]/40",
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-[#C9A84C]"
                  )}
                >
                  <option.icon className="h-3 w-3 mr-1.5" />
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Notifications List */}
      <div data-app-scroll className="fixed inset-x-0 top-[calc(3cm+100px)] bottom-[72px] lg:bottom-0 overflow-y-auto">
        <PullToRefreshContainer onRefresh={handlePullRefresh}>
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {filter === "all" 
                    ? "Chưa có thông báo nào" 
                    : "Không có thông báo nào thuộc loại này"}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex items-start gap-3 p-4 cursor-pointer transition-all duration-300",
                    "hover:bg-muted/50 active:bg-muted",
                    !notification.read && "bg-primary/5 relative",
                    !notification.read && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-yellow-400 before:via-amber-500 before:to-yellow-400 before:animate-pulse"
                  )}
                >
                  {/* Avatar with Icon Badge */}
                  <div className="relative shrink-0">
                    <Avatar className={cn(
                      "h-12 w-12 ring-2",
                      !notification.read 
                        ? "ring-amber-400/50 shadow-lg shadow-amber-400/20" 
                        : "ring-transparent"
                    )}>
                      <AvatarImage src={notification.actor?.avatar_url || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                        {notification.actor?.username?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-md">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm leading-relaxed",
                      !notification.read ? "font-medium text-foreground" : "text-muted-foreground"
                    )}>
                      {getNotificationText(notification)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { 
                        addSuffix: true,
                        locale: vi 
                      })}
                    </p>
                  </div>

                  {/* Unread Indicator */}
                  {!notification.read && (
                    <div className="shrink-0 mt-1">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse shadow-lg shadow-green-400/50" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </PullToRefreshContainer>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default Notifications;
