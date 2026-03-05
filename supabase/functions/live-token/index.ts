import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RtcTokenBuilder, RtcRole } from 'npm:agora-token'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function uuidToNumericUid(uuid: string): number {
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & 0x7FFFFFFF
  }
  return hash || 1
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      console.error('Auth error:', userErr?.message || 'No user')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const userId = user.id

    // Check banned status
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: banCheck } = await supabaseAdmin
      .from('profiles').select('is_banned').eq('id', userId).single()
    if (banCheck?.is_banned) {
      return new Response(JSON.stringify({ error: 'Tài khoản đã bị cấm vĩnh viễn.' }), { status: 403, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({}))
    const sessionId = body.session_id || body.sessionId
    const role = body.role || 'audience'

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'session_id required' }), { status: 400, headers: corsHeaders })
    }

    // Lookup live session
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('live_sessions')
      .select('id, channel_name, agora_channel, status, host_user_id, privacy')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionErr || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: corsHeaders })
    }

    if (session.status !== 'live' && session.status !== 'starting') {
      return new Response(JSON.stringify({ error: 'Session is not live' }), { status: 400, headers: corsHeaders })
    }

    if (role === 'host' && session.host_user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only host can get host token' }), { status: 403, headers: corsHeaders })
    }

    // Enforce friends-only privacy
    if (session.privacy === 'friends' && role !== 'host') {
      const { data: friendship } = await supabaseAdmin
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${userId},friend_id.eq.${session.host_user_id},status.eq.accepted),and(user_id.eq.${session.host_user_id},friend_id.eq.${userId},status.eq.accepted)`)
        .limit(1)

      if (!friendship || friendship.length === 0) {
        return new Response(JSON.stringify({ error: 'Phiên live này chỉ dành cho bạn bè' }), { status: 403, headers: corsHeaders })
      }
    }

    const channel = session.agora_channel || session.channel_name

    // Generate Agora token directly
    const appId = Deno.env.get('AGORA_APP_ID')
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE')

    if (!appId || !appCertificate) {
      return new Response(JSON.stringify({ error: 'Agora not configured' }), { status: 500, headers: corsHeaders })
    }

    const numericUid = uuidToNumericUid(userId)
    const agoraRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER
    const expirationInSeconds = 86400

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channel,
      numericUid,
      agoraRole,
      expirationInSeconds,
      expirationInSeconds
    )

    const currentTimestamp = Math.floor(Date.now() / 1000)
    return new Response(JSON.stringify({
      token,
      channel,
      uid: String(numericUid),
      appId,
      expiresAt: currentTimestamp + expirationInSeconds,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('live-token error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
