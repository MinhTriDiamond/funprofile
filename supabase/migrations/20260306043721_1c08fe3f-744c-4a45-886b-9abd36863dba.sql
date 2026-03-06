
CREATE OR REPLACE FUNCTION public.get_member_reward_breakdown()
RETURNS TABLE(
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_banned boolean,
  total_earned numeric,
  total_claimed numeric,
  remaining numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.username::text,
    p.full_name::text,
    p.avatar_url::text,
    COALESCE(p.is_banned, false) AS is_banned,
    COALESCE(p.total_rewards, 0)::numeric AS total_earned,
    COALESCE(rc_sum.claimed, 0)::numeric AS total_claimed,
    (COALESCE(p.total_rewards, 0) - COALESCE(rc_sum.claimed, 0))::numeric AS remaining
  FROM profiles p
  LEFT JOIN (
    SELECT rc.user_id AS uid, SUM(rc.amount) AS claimed
    FROM reward_claims rc
    GROUP BY rc.user_id
  ) rc_sum ON rc_sum.uid = p.id
  ORDER BY COALESCE(p.total_rewards, 0) DESC;
END;
$$;
