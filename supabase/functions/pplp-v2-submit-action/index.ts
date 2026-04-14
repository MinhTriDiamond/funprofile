import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_ACTION_CODES = ['INNER_WORK', 'CHANNELING', 'GIVING', 'SOCIAL_IMPACT', 'SERVICE', 'LEARNING'];
const HIGH_IMPACT_CODES = ['SOCIAL_IMPACT', 'SERVICE', 'GIVING'];
const VALID_SOURCE_PLATFORMS = ['zoom', 'facebook', 'youtube', 'telegram', 'internal', 'onchain', 'other'];
const MAX_ACTIONS_PER_DAY = 10;
const MAX_HIGH_IMPACT_ACTIONS_PER_DAY = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check banned
    const { data: profile } = await supabase
      .from('profiles').select('is_banned').eq('id', user.id).single();
    if (profile?.is_banned) {
      return new Response(JSON.stringify({ error: 'Tài khoản đã bị cấm.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse body
    const { action_type_code, title, description, source_url, source_platform, raw_metadata } = await req.json();

    // Validate action_type_code
    if (!action_type_code || !VALID_ACTION_CODES.includes(action_type_code)) {
      return new Response(JSON.stringify({ 
        error: `action_type_code phải là một trong: ${VALID_ACTION_CODES.join(', ')}` 
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'title phải có ít nhất 3 ký tự' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate source_platform if provided
    if (source_platform && !VALID_SOURCE_PLATFORMS.includes(source_platform)) {
      return new Response(JSON.stringify({ 
        error: `source_platform phải là một trong: ${VALID_SOURCE_PLATFORMS.join(', ')}` 
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // VN timezone UTC+7 day boundary
    const now = new Date();
    const vnOffset = 7 * 60 * 60 * 1000;
    const vnNow = new Date(now.getTime() + vnOffset);
    const vnStartOfDay = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()));
    const utcStartOfDay = new Date(vnStartOfDay.getTime() - vnOffset);

    // Velocity limit: max 10 actions/day total
    const { count: totalCount } = await supabase
      .from('pplp_v2_user_actions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', utcStartOfDay.toISOString());

    if ((totalCount ?? 0) >= MAX_ACTIONS_PER_DAY) {
      return new Response(JSON.stringify({ 
        error: `Bạn đã đạt giới hạn ${MAX_ACTIONS_PER_DAY} hành động/ngày. Hãy thử lại vào ngày mai!` 
      }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // NEW: High-impact velocity limit: max 3/day for SOCIAL_IMPACT, SERVICE, GIVING
    if (HIGH_IMPACT_CODES.includes(action_type_code)) {
      const { count: highImpactCount } = await supabase
        .from('pplp_v2_user_actions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('action_type_code', HIGH_IMPACT_CODES)
        .gte('created_at', utcStartOfDay.toISOString());

      if ((highImpactCount ?? 0) >= MAX_HIGH_IMPACT_ACTIONS_PER_DAY) {
        return new Response(JSON.stringify({ 
          error: `Bạn đã đạt giới hạn ${MAX_HIGH_IMPACT_ACTIONS_PER_DAY} hành động high-impact (Social Impact/Service/Giving) mỗi ngày.` 
        }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Insert action
    const { data: action, error: insertError } = await supabase
      .from('pplp_v2_user_actions')
      .insert({
        user_id: user.id,
        action_type_code,
        title: title.trim(),
        description: description?.trim() || null,
        source_url: source_url || null,
        source_platform: source_platform || null,
        raw_metadata: raw_metadata || {},
        status: 'proof_pending',
      })
      .select('id, status, created_at')
      .single();

    if (insertError) {
      console.error('[PPLP v2 Submit] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Không thể tạo hành động' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[PPLP v2 Submit] User ${user.id} created action ${action.id} (${action_type_code})`);

    return new Response(JSON.stringify({
      success: true,
      action_id: action.id,
      status: action.status,
      created_at: action.created_at,
      message: 'Hành động đã được ghi nhận. Vui lòng đính kèm bằng chứng.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[PPLP v2 Submit] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
