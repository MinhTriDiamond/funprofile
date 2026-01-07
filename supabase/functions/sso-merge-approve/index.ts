import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveRequestBody {
  request_id: string;
  action: 'approve' | 'reject';
  admin_note?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: hasAdminRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ApproveRequestBody = await req.json();
    const { request_id, action, admin_note } = body;

    console.log('[sso-merge-approve] Admin action:', { request_id, action, admin_id: user.id });

    if (!request_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: request_id, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get merge request
    const { data: mergeRequest, error: fetchError } = await supabase
      .from('account_merge_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (fetchError || !mergeRequest) {
      return new Response(
        JSON.stringify({ error: 'Merge request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mergeRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Request already ${mergeRequest.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle REJECT action
    if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('account_merge_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_note: admin_note || null
        })
        .eq('id', request_id);

      if (updateError) {
        console.error('[sso-merge-approve] Error rejecting request:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to reject request' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[sso-merge-approve] Request rejected');
      
      // Send webhook to source platform
      await sendWebhook(supabase, mergeRequest, 'rejected', null);

      return new Response(
        JSON.stringify({
          success: true,
          action: 'rejected',
          request_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle APPROVE action
    let funProfileUserId = mergeRequest.target_user_id;
    let newUserCreated = false;

    // Case: farm_only - Create new user in Fun Profile
    if (mergeRequest.merge_type === 'farm_only') {
      console.log('[sso-merge-approve] Creating new user for farm_only merge');

      // Generate a random password (user will use SSO, not password)
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();

      // Create user in Supabase Auth
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: mergeRequest.email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          username: mergeRequest.source_username || mergeRequest.email.split('@')[0],
          full_name: mergeRequest.source_username || '',
          registered_from: mergeRequest.source_platform,
          migrated_from: mergeRequest.source_platform
        }
      });

      if (createUserError) {
        console.error('[sso-merge-approve] Error creating user:', createUserError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user: ' + createUserError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      funProfileUserId = newUser.user.id;
      newUserCreated = true;
      console.log('[sso-merge-approve] New user created:', funProfileUserId);

      // Wait a bit for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Import platform data to platform_user_data
    if (mergeRequest.platform_data && Object.keys(mergeRequest.platform_data).length > 0) {
      console.log('[sso-merge-approve] Importing platform data');

      // Get client_id for this platform
      const { data: oauthClient } = await supabase
        .from('oauth_clients')
        .select('client_id')
        .eq('platform_name', mergeRequest.source_platform)
        .single();

      if (oauthClient) {
        const { error: dataError } = await supabase
          .from('platform_user_data')
          .upsert({
            user_id: funProfileUserId,
            client_id: oauthClient.client_id,
            data: mergeRequest.platform_data,
            synced_at: new Date().toISOString(),
            last_sync_mode: 'merge'
          }, {
            onConflict: 'user_id,client_id'
          });

        if (dataError) {
          console.error('[sso-merge-approve] Error importing platform data:', dataError);
          // Non-fatal, continue
        }
      }
    }

    // Update merge request status
    const { error: updateError } = await supabase
      .from('account_merge_requests')
      .update({
        status: 'completed',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_note: admin_note || null,
        target_user_id: funProfileUserId
      })
      .eq('id', request_id);

    if (updateError) {
      console.error('[sso-merge-approve] Error updating request:', updateError);
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      admin_id: user.id,
      action: 'MERGE_USER_APPROVED',
      target_user_id: funProfileUserId,
      reason: admin_note,
      details: {
        request_id,
        merge_type: mergeRequest.merge_type,
        source_platform: mergeRequest.source_platform,
        new_user_created: newUserCreated
      }
    });

    console.log('[sso-merge-approve] Merge completed successfully');

    // Send webhook to source platform
    await sendWebhook(supabase, mergeRequest, 'completed', funProfileUserId);

    return new Response(
      JSON.stringify({
        success: true,
        action: 'approved',
        request_id,
        fun_profile_id: funProfileUserId,
        new_user_created: newUserCreated,
        merge_type: mergeRequest.merge_type
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sso-merge-approve] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Create HMAC-SHA256 signature for webhook payload
async function createWebhookSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper function to send webhook with signature verification
async function sendWebhook(
  supabase: any,
  mergeRequest: any,
  status: 'completed' | 'rejected',
  funProfileId: string | null
) {
  try {
    // Get webhook URL and client_secret from oauth_clients
    const { data: client } = await supabase
      .from('oauth_clients')
      .select('webhook_url, client_secret')
      .eq('platform_name', mergeRequest.source_platform)
      .single();

    if (!client?.webhook_url) {
      console.log('[sso-merge-approve] No webhook URL configured');
      return;
    }

    // Get profile data if merge completed
    let profileData = null;
    if (status === 'completed' && funProfileId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url, full_name, fun_id')
        .eq('id', funProfileId)
        .single();
      
      if (profile) {
        profileData = {
          username: profile.username,
          avatar_url: profile.avatar_url,
          full_name: profile.full_name,
          fun_id: profile.fun_id
        };
      }
    }

    const webhookPayload = {
      event: status === 'completed' ? 'merge_completed' : 'merge_rejected',
      request_id: mergeRequest.id,
      email: mergeRequest.email,
      source_user_id: mergeRequest.source_user_id,
      fun_profile_id: funProfileId,
      merge_type: mergeRequest.merge_type,
      platform_data_imported: status === 'completed' && Object.keys(mergeRequest.platform_data || {}).length > 0,
      timestamp: new Date().toISOString(),
      // Profile data for metadata sync
      profile_data: profileData
    };

    const payloadString = JSON.stringify(webhookPayload);
    
    // Create signature using client_secret
    const signature = client.client_secret 
      ? await createWebhookSignature(payloadString, client.client_secret)
      : '';

    console.log('[sso-merge-approve] Sending webhook to:', client.webhook_url);

    const response = await fetch(client.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Fun-Profile-Webhook': 'true',
        'X-Fun-Signature': signature
      },
      body: payloadString
    });

    if (response.ok) {
      // Update webhook_sent status
      await supabase
        .from('account_merge_requests')
        .update({
          webhook_sent: true,
          webhook_sent_at: new Date().toISOString()
        })
        .eq('id', mergeRequest.id);

      console.log('[sso-merge-approve] Webhook sent successfully with signature');
    } else {
      console.error('[sso-merge-approve] Webhook failed:', response.status);
    }
  } catch (error) {
    console.error('[sso-merge-approve] Webhook error:', error);
  }
}
