import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FriendsList } from '@/components/friends/FriendsList';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Users, UserCheck, Gift, Settings, ChevronLeft, MoreHorizontal } from 'lucide-react';
import { LazyImage } from '@/components/ui/LazyImage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Friends = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }
      
      setCurrentUserId(session.user.id);
      fetchFriendRequests(session.user.id);
      fetchSuggestions(session.user.id);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setCurrentUserId(session.user.id);
        setLoading(false);
      } else {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchFriendRequests = async (userId: string) => {
    const { data } = await supabase
      .from('friendships')
      .select(`
        *,
        profiles:user_id (id, username, avatar_url, full_name)
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');
    
    setFriendRequests(data || []);
  };

  const fetchSuggestions = async (userId: string) => {
    // Use public_profiles view to avoid exposing sensitive fields
    const { data } = await supabase
      .from('public_profiles')
      .select('id, username, avatar_url, full_name, bio')
      .neq('id', userId)
      .limit(10);
    
    setSuggestions(data || []);
  };

  const menuItems = [
    { icon: Users, label: 'Trang chủ', value: 'all' },
    { icon: UserPlus, label: 'Lời mời kết bạn', value: 'requests', badge: friendRequests.length },
    { icon: UserCheck, label: 'Gợi ý', value: 'suggestions' },
    { icon: Users, label: 'Tất cả bạn bè', value: 'friends' },
    { icon: Gift, label: 'Sinh nhật', value: 'birthdays' },
  ];

  // Reusable Friend Card Component for mobile-first design
  const FriendCard = ({ user, type }: { user: any; type: 'request' | 'suggestion' }) => (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border/50">
      {/* Square avatar on top */}
      <div className="aspect-square bg-muted relative">
        {user.avatar_url || user.profiles?.avatar_url ? (
          <LazyImage
            src={user.avatar_url || user.profiles?.avatar_url}
            alt={user.username || user.profiles?.username}
            className="w-full h-full object-cover"
            unloadOnExit
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted text-4xl font-semibold text-muted-foreground">
            {(user.username || user.profiles?.username)?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
      
      {/* Info & Actions */}
      <div className="p-3">
        <h3 
          className="font-semibold text-base truncate cursor-pointer hover:underline"
          onClick={() => navigate(`/profile/${user.id || user.profiles?.id}`)}
        >
          {user.full_name || user.profiles?.full_name || user.username || user.profiles?.username}
        </h3>
        <p className="text-xs text-muted-foreground mb-3 truncate">
          {type === 'request' ? '5 bạn chung' : '3 bạn chung'}
        </p>
        <div className="space-y-2">
          <Button 
            className="w-full h-9 text-sm"
            size="sm"
          >
            {type === 'request' ? 'Xác nhận' : (
              <>
                <UserPlus className="w-4 h-4 mr-1.5" />
                Thêm bạn
              </>
            )}
          </Button>
          <Button 
            variant="secondary" 
            className="w-full h-9 text-sm"
            size="sm"
          >
            Xóa
          </Button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <FacebookNavbar />
        <main className="pt-14 px-4">
          <div className="max-w-7xl mx-auto py-4">
            <Skeleton className="h-10 w-48 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FacebookNavbar />
      <main className="pt-14 pb-20 md:pb-6">
        <div className="flex">
          {/* Left Sidebar - Hidden on mobile, shown on lg+ */}
          <aside className={`
            fixed inset-y-0 left-0 z-40 w-[300px] lg:w-[360px] bg-card shadow-lg 
            transform transition-transform duration-300 ease-in-out
            lg:translate-x-0 lg:top-14 lg:h-[calc(100vh-56px)]
            ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
          `}>
            {/* Mobile close button */}
            <button 
              className="lg:hidden absolute top-4 right-4 p-2 rounded-full hover:bg-muted"
              onClick={() => setShowSidebar(false)}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="p-4 pt-14 lg:pt-4 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Bạn bè</h1>
                <button className="w-9 h-9 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80">
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setActiveTab(item.value);
                      setShowSidebar(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      activeTab === item.value 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
                      activeTab === item.value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium flex-1 text-left truncate">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Backdrop for mobile sidebar */}
          {showSidebar && (
            <div 
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}

          {/* Main Content */}
          <div className="flex-1 lg:ml-[360px] min-w-0">
            {/* Mobile Header */}
            <div className="lg:hidden sticky top-14 z-20 bg-card border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowSidebar(true)}
                    className="p-2 -ml-2 rounded-full hover:bg-muted"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                  <h1 className="text-lg font-bold truncate">
                    {menuItems.find(m => m.value === activeTab)?.label || 'Bạn bè'}
                  </h1>
                </div>
                <button className="p-2 rounded-full hover:bg-muted">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 lg:p-6">
              {/* Friend Requests Tab */}
              {activeTab === 'requests' && (
                <div>
                  <h2 className="text-xl font-bold mb-4 hidden lg:block">Lời mời kết bạn</h2>
                  {friendRequests.length === 0 ? (
                    <div className="bg-card rounded-xl shadow-sm p-8 text-center">
                      <UserPlus className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">Không có lời mời kết bạn nào</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {friendRequests.map((request) => (
                        <FriendCard key={request.id} user={request} type="request" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Suggestions Tab */}
              {activeTab === 'suggestions' && (
                <div>
                  <h2 className="text-xl font-bold mb-4 hidden lg:block">Những người bạn có thể biết</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {suggestions.map((user) => (
                      <FriendCard key={user.id} user={user} type="suggestion" />
                    ))}
                  </div>
                </div>
              )}

              {/* All Friends Tab */}
              {activeTab === 'friends' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold hidden lg:block">Tất cả bạn bè</h2>
                    <div className="relative flex-1 lg:max-w-xs lg:ml-auto">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        placeholder="Tìm kiếm bạn bè" 
                        className="pl-10 bg-muted border-0 h-10" 
                      />
                    </div>
                  </div>
                  <div className="bg-card rounded-xl shadow-sm">
                    <FriendsList userId={currentUserId} />
                  </div>
                </div>
              )}

              {/* Home/All Tab */}
              {activeTab === 'all' && (
                <div className="space-y-8">
                  {/* Friend Requests Section */}
                  {friendRequests.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg lg:text-xl font-bold">Lời mời kết bạn</h2>
                        <button 
                          onClick={() => setActiveTab('requests')}
                          className="text-primary text-sm font-medium hover:underline"
                        >
                          Xem tất cả
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {friendRequests.slice(0, 4).map((request) => (
                          <FriendCard key={request.id} user={request} type="request" />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Suggestions Section */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg lg:text-xl font-bold">Những người bạn có thể biết</h2>
                      <button 
                        onClick={() => setActiveTab('suggestions')}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        Xem tất cả
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {suggestions.slice(0, 6).map((user) => (
                        <FriendCard key={user.id} user={user} type="suggestion" />
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* Birthdays Tab */}
              {activeTab === 'birthdays' && (
                <div>
                  <h2 className="text-xl font-bold mb-4 hidden lg:block">Sinh nhật</h2>
                  <div className="bg-card rounded-xl shadow-sm p-8 text-center">
                    <Gift className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Không có sinh nhật nào hôm nay</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default Friends;