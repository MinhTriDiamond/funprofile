
CREATE TABLE public.live_co_hosts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_live_co_hosts_active ON live_co_hosts(session_id, user_id) WHERE status IN ('pending', 'accepted');

ALTER TABLE live_co_hosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view co-hosts" ON live_co_hosts FOR SELECT USING (true);

CREATE POLICY "Host can invite" ON live_co_hosts FOR INSERT
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "User can update own status" ON live_co_hosts FOR UPDATE
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_co_hosts;
