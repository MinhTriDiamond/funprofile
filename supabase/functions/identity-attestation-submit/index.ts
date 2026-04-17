import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return new Response(JSON.stringify({ error: 'auth required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { from_did, to_did, attestation_type, weight = 0.5, evidence_ref } = await req.json();
    if (!from_did || !to_did || !attestation_type) {
      return new Response(JSON.stringify({ error: 'missing fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify from_did belongs to caller
    const { data: ownerDid } = await supabase.from('did_registry')
      .select('did_id').eq('owner_user_id', user.id).maybeSingle();
    if (!ownerDid || ownerDid.did_id !== from_did) {
      return new Response(JSON.stringify({ error: 'from_did mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data, error } = await supabase.from('attestation_log').insert({
      from_did, to_did, attestation_type,
      weight: Math.max(0, Math.min(1, Number(weight))),
      evidence_ref,
    }).select().single();
    if (error) throw error;

    await supabase.from('identity_events').insert({
      did_id: to_did, event_type: 'attestation_received',
      event_ref: data.id, tc_delta: 0.02, source: from_did,
      metadata: { attestation_type },
    });

    return new Response(JSON.stringify({ success: true, attestation: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
