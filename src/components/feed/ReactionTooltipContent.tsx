import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';

interface ReactionTooltipContentProps {
  postId: string;
}

interface ReactorInfo {
  display_name: string | null;
  username: string;
}

export const ReactionTooltipContent = ({ postId }: ReactionTooltipContentProps) => {
  const [names, setNames] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      const { data, count } = await supabase
        .from('reactions')
        .select('profiles!reactions_user_id_fkey(display_name, username)', { count: 'exact' })
        .eq('post_id', postId)
        .limit(10);

      if (cancelled) return;
      const list = (data || []).map((r: any) => {
        const p = r.profiles;
        return p?.display_name || p?.username || 'User';
      });
      setNames(list);
      setTotal(count || list.length);
      setLoading(false);
    };
    fetch();
    return () => { cancelled = true; };
  }, [postId]);

  if (loading) return <span className="text-xs text-muted-foreground">...</span>;
  if (names.length === 0) return null;

  const shown = names.slice(0, 8);
  const remaining = total - shown.length;

  return (
    <div className="flex flex-col gap-0.5 text-xs max-w-[200px]">
      {shown.map((name, i) => (
        <span key={i} className="truncate">{name}</span>
      ))}
      {remaining > 0 && (
        <span className="text-muted-foreground">
          và {remaining} người khác
        </span>
      )}
    </div>
  );
};
