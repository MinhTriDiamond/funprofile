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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

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

    const body = await req.json()
    const session_id = body.session_id || body.sessionId

    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id required' }), { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: session } = await supabaseAdmin
      .from('live_sessions')
      .select('id, host_user_id, channel_name, agora_channel, recording_sid, recording_resource_id, recording_uid')
      .eq('id', session_id)
      .single()

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: corsHeaders })
    }
    if (session.host_user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Only host can stop recording' }), { status: 403, headers: corsHeaders })
    }

    if (!session.recording_sid || !session.recording_resource_id) {
      return new Response(JSON.stringify({ error: 'No active recording' }), { status: 400, headers: corsHeaders })
    }

    const channel = session.agora_channel || session.channel_name
    const workerUrl = getEnv('LIVE_AGORA_WORKER_URL', 'AGORA_WORKER_URL')
    const workerApiKey = getEnv('LIVE_AGORA_WORKER_API_KEY', 'AGORA_WORKER_API_KEY')

    if (!workerUrl || !workerApiKey) {
      return new Response(JSON.stringify({ error: 'Recording worker not configured' }), { status: 500, headers: corsHeaders })
    }

    const stopResp = await fetch(`${workerUrl}/recording/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': workerApiKey },
      body: JSON.stringify({
        channel_name: channel,
        uid: String(session.recording_uid),
        sid: session.recording_sid,
        resourceId: session.recording_resource_id,
      }),
    })

    const stopData = await stopResp.json()

    // Update session
    await supabaseAdmin.from('live_sessions').update({
      recording_status: 'stopped',
      recording_stopped_at: new Date().toISOString(),
      recording_files: stopData.serverResponse?.fileList || null,
    }).eq('id', session_id)

    // Update recording record
    await supabaseAdmin.from('live_recordings').update({
      status: 'stopped',
      stopped_at: new Date().toISOString(),
      file_list_json: stopData.serverResponse?.fileList || [],
      raw_response: stopData,
    }).eq('sid', session.recording_sid)

    return new Response(JSON.stringify({
      success: true,
      files: stopData.serverResponse?.fileList || [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
