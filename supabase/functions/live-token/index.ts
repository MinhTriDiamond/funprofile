import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function getEnv(primary: string, ...fallbacks: string[]): string | undefined {
  const val = Deno.env.get(primary)
  if (val) return val
  for (const fb of fallbacks) {
    const v = Deno.env.get(fb)
    if (v) return v
  }
  return undefined
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const userId = user.id

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
      .select('id, channel_name, agora_channel, status, host_user_id')
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

    const channel = session.agora_channel || session.channel_name

    // Try Worker for token
    const workerUrl = getEnv('LIVE_AGORA_WORKER_URL', 'AGORA_WORKER_URL', 'VITE_AGORA_WORKER_URL')
    const workerApiKey = getEnv('LIVE_AGORA_WORKER_API_KEY', 'AGORA_WORKER_API_KEY', 'VITE_AGORA_WORKER_API_KEY')

    const numericUid = uuidToNumericUid(userId)

    if (workerUrl && workerApiKey) {
      const workerResp = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': workerApiKey,
        },
        body: JSON.stringify({
          channelName: channel,
          uid: numericUid,
          role: role === 'host' ? 'publisher' : 'subscriber',
        }),
      })

      if (!workerResp.ok) {
        const errText = await workerResp.text()
        console.error('Agora worker error:', workerResp.status, errText)
      }

      if (workerResp.ok) {
        const workerData = await workerResp.json()
        return new Response(JSON.stringify({
          token: workerData.token,
          channel,
          uid: String(numericUid),
          appId: workerData.app_id || workerData.appId,
          expiresAt: workerData.expires_at || Math.floor(Date.now() / 1000) + 86400,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    return new Response(JSON.stringify({ error: 'Token generation failed' }), { status: 500, headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
