import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserMinus, UserCheck, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Friend {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  friendship_id: string;
}

interface FriendsListProps {
  userId: string;
}

export const FriendsList = ({ userId }: FriendsListProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<Friend[]>([]);
  const [suggestions, setSuggestions] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
    fetchSentRequests();
    fetchSuggestions();
    
    // Set up realtime subscription for friendships
    const channel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships'
        },
        () => {
          // Refetch all data when friendships change
          fetchFriends();
          fetchPendingRequests();
          fetchSentRequests();
          fetchSuggestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchFriends = async () => {
    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (error) {
      // Error fetching friends - silent fail
      setLoading(false);
      return;
    }

    if (!data) {
      setFriends([]);
      setLoading(false);
      return;
    }

    // Get all unique user IDs (excluding current user)
    const userIds = data.map(f => 
      f.user_id === userId ? f.friend_id : f.user_id
    );

    // Fetch all profiles in one query
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);

    if (profilesError) {
      // Error fetching profiles - silent fail
      setLoading(false);
      return;
    }

    // Map profiles to friends with friendship_id
    const friendsList: Friend[] = data.map(friendship => {
      const friendId = friendship.user_id === userId ? friendship.friend_id : friendship.user_id;
      const profile = profilesData?.find(p => p.id === friendId);
      
      return {
        id: profile?.id || friendId,
        username: profile?.username || "Unknown",
        full_name: profile?.full_name || "",
        avatar_url: profile?.avatar_url || "",
        friendship_id: friendship.id
      };
    }).filter(f => f.username !== "Unknown");

    setFriends(friendsList);
    setLoading(false);
  };

  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "pending")
      .eq("friend_id", userId);

    if (error) {
      // Error fetching pending requests - silent fail
      return;
    }

    if (!data || data.length === 0) {
      setPendingRequests([]);
      return;
    }

    // Get sender profiles
    const userIds = data.map(f => f.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);

    if (profilesError) {
      // Error fetching profiles - silent fail
      return;
    }

    const requests: Friend[] = data.map(friendship => {
      const profile = profilesData?.find(p => p.id === friendship.user_id);
      return {
        id: profile?.id || friendship.user_id,
        username: profile?.username || "Unknown",
        full_name: profile?.full_name || "",
        avatar_url: profile?.avatar_url || "",
        friendship_id: friendship.id
      };
    }).filter(f => f.username !== "Unknown");

    setPendingRequests(requests);
  };

  const fetchSentRequests = async () => {
    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "pending")
      .eq("user_id", userId);

    if (error) {
      // Error fetching sent requests - silent fail
      return;
    }

    if (!data || data.length === 0) {
      setSentRequests([]);
      return;
    }

    // Get recipient profiles
    const friendIds = data.map(f => f.friend_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", friendIds);

    if (profilesError) {
      // Error fetching profiles - silent fail
      return;
    }

    const requests: Friend[] = data.map(friendship => {
      const profile = profilesData?.find(p => p.id === friendship.friend_id);
      return {
        id: profile?.id || friendship.friend_id,
        username: profile?.username || "Unknown",
        full_name: profile?.full_name || "",
        avatar_url: profile?.avatar_url || "",
        friendship_id: friendship.id
      };
    }).filter(f => f.username !== "Unknown");

    setSentRequests(requests);
  };

  const handleUnfriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast.error("Failed to remove friend");
    } else {
      toast.success("Friend removed");
      fetchFriends();
    }
  };

  const handleAccept = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);

    if (error) {
      toast.error("Failed to accept friend request");
    } else {
      toast.success("Friend request accepted!");
      fetchFriends();
      fetchPendingRequests();
    }
  };

  const handleReject = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast.error("Failed to reject friend request");
    } else {
      toast.success("Friend request rejected");
      fetchPendingRequests();
    }
  };

  const handleCancelRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast.error("Failed to cancel request");
    } else {
      toast.success("Friend request cancelled");
      fetchSentRequests();
    }
  };

  const fetchSuggestions = async () => {
    // Get all user IDs that have any friendship relation with current user
    const { data: existingRelations } = await supabase
      .from("friendships")
      .select("user_id, friend_id")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    const excludedUserIds = new Set([userId]);
    existingRelations?.forEach(rel => {
      excludedUserIds.add(rel.user_id);
      excludedUserIds.add(rel.friend_id);
    });

    // Fetch users who are not friends or have no pending requests
    const { data: profilesData, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .not("id", "in", `(${Array.from(excludedUserIds).join(',')})`)
      .limit(10);

    if (error) {
      // Error fetching suggestions - silent fail
      return;
    }

    const suggestionsList: Friend[] = (profilesData || []).map(profile => ({
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name || "",
      avatar_url: profile.avatar_url || "",
      friendship_id: ""
    }));

    setSuggestions(suggestionsList);
  };

  const handleSendRequest = async (targetUserId: string) => {
    const { error } = await supabase
      .from("friendships")
      .insert({
        user_id: userId,
        friend_id: targetUserId,
        status: "pending"
      });

    if (error) {
      toast.error("Failed to send friend request");
    } else {
      toast.success("Friend request sent!");
      fetchSuggestions();
      fetchSentRequests();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Friends</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="friends">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            <ScrollArea className="h-[400px]">
              {friends.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No friends yet</p>
              ) : (
                <div className="space-y-4">
                  {friends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => navigate(`/profile?userId=${friend.id}`)}
                      >
                        <Avatar>
                          <AvatarImage src={friend.avatar_url} />
                          <AvatarFallback>{friend.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{friend.username}</p>
                          <p className="text-sm text-muted-foreground">{friend.full_name}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnfriend(friend.friendship_id)}
                        className="text-primary hover:bg-primary hover:text-white group"
                      >
                        <UserMinus className="w-4 h-4 text-gold group-hover:text-white" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests">
            <ScrollArea className="h-[400px]">
              {pendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => navigate(`/profile?userId=${request.id}`)}
                      >
                        <Avatar>
                          <AvatarImage src={request.avatar_url} />
                          <AvatarFallback>{request.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.username}</p>
                          <p className="text-sm text-muted-foreground">{request.full_name}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(request.friendship_id)}
                          className="text-primary hover:bg-primary hover:text-white group bg-background border border-input"
                        >
                          <UserCheck className="w-4 h-4 text-gold group-hover:text-white" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(request.friendship_id)}
                          className="text-primary hover:bg-primary hover:text-white group"
                        >
                          <X className="w-4 h-4 text-gold group-hover:text-white" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sent">
            <ScrollArea className="h-[400px]">
              {sentRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No sent requests</p>
              ) : (
                <div className="space-y-4">
                  {sentRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => navigate(`/profile?userId=${request.id}`)}
                      >
                        <Avatar>
                          <AvatarImage src={request.avatar_url} />
                          <AvatarFallback>{request.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.username}</p>
                          <p className="text-sm text-muted-foreground">{request.full_name}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelRequest(request.friendship_id)}
                        className="text-primary hover:bg-primary hover:text-white group"
                      >
                        <X className="w-4 h-4 text-gold group-hover:text-white" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="suggestions">
            <ScrollArea className="h-[400px]">
              {suggestions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No suggestions available</p>
              ) : (
                <div className="space-y-4">
                  {suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => navigate(`/profile?userId=${suggestion.id}`)}
                      >
                        <Avatar>
                          <AvatarImage src={suggestion.avatar_url} />
                          <AvatarFallback>{suggestion.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{suggestion.username}</p>
                          <p className="text-sm text-muted-foreground">{suggestion.full_name}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendRequest(suggestion.id)}
                        className="text-primary hover:bg-primary hover:text-white group bg-background border border-input"
                      >
                        <UserPlus className="w-4 h-4 text-gold group-hover:text-white" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
