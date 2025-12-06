import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { FriendsList } from '@/components/friends/FriendsList';
import { Skeleton } from '@/components/ui/skeleton';

const Friends = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }
      
      setCurrentUserId(session.user.id);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary">
        <Navbar />
        <main className="pt-24 pb-8">
          <div className="container max-w-4xl mx-auto px-4">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <Navbar />
      <main className="pt-24 pb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-card p-6 rounded-xl shadow-sm border">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-foreground">Friends</h1>
            <FriendsList userId={currentUserId} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Friends;
