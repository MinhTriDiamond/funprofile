
CREATE OR REPLACE FUNCTION public.get_member_reward_breakdown()
RETURNS TABLE(
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  total_earned numeric,
  total_claimed numeric,
  remaining numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    (
      COALESCE(p.pending_reward, 0) +
      COALESCE(p.approved_reward, 0) +
      COALESCE(rc_sum.claimed, 0)
    )::NUMERIC AS total_earned,
    COALESCE(rc_sum.claimed, 0)::NUMERIC AS total_claimed,
    (
      COALESCE(p.pending_reward, 0) +
      COALESCE(p.approved_reward, 0)
    )::NUMERIC AS remaining
  FROM profiles p
  LEFT JOIN (
    SELECT rc.user_id AS uid, SUM(rc.amount) AS claimed
    FROM reward_claims rc
    GROUP BY rc.user_id
  ) rc_sum ON rc_sum.uid = p.id
  WHERE p.is_banned = false
    AND (
      COALESCE(p.pending_reward, 0) +
      COALESCE(p.approved_reward, 0) +
      COALESCE(rc_sum.claimed, 0)
    ) > 0
  ORDER BY (
    COALESCE(p.pending_reward, 0) +
    COALESCE(p.approved_reward, 0) +
    COALESCE(rc_sum.claimed, 0)
  ) DESC;
END;
$function$;
