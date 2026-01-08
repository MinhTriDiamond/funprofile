import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

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
    let temporaryPassword = '';
    if (mergeRequest.merge_type === 'farm_only') {
      console.log('[sso-merge-approve] Creating new user for farm_only merge');

      // Generate a simple 6-character password (excluding confusing chars like O, 0, I, l, 1)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      const randomValues = new Uint8Array(6);
      crypto.getRandomValues(randomValues);
      temporaryPassword = Array.from(randomValues)
        .map(v => chars[v % chars.length])
        .join('');

      // Create user in Supabase Auth
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: mergeRequest.email,
        password: temporaryPassword,
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

    // Send notification email to user
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      const funProfileOrigin = Deno.env.get('FUN_PROFILE_ORIGIN') || 'https://fun-profile.lovable.app';
      
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        
        if (mergeRequest.merge_type === 'farm_only' && temporaryPassword) {
          // Email cho farm_only user - vui vẻ, dễ thương với password
          await resend.emails.send({
            from: 'FUN Profile <noreply@fun.rich>',
            to: [mergeRequest.email],
            subject: '🎉 Chào mừng bạn đến với FUN Profile!',
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px;">
                <div style="background: white; border-radius: 16px; padding: 40px; text-align: center;">
                  <div style="font-size: 60px; margin-bottom: 20px;">🥳✨</div>
                  
                  <h1 style="color: #333; font-size: 28px; margin-bottom: 10px;">
                    Wowww! Xin chào ${mergeRequest.source_username || 'bạn'}!
                  </h1>
                  
                  <p style="font-size: 18px; color: #666; line-height: 1.6; margin-bottom: 30px;">
                    Bạn vừa được cấp tài khoản <strong style="color: #764ba2;">FUN ID</strong> rồi đó! 🎊
                  </p>
                  
                  <div style="background: #f8f9ff; border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: left;">
                    <p style="margin: 0 0 15px 0; font-size: 16px;">
                      📧 <strong>Email đăng nhập:</strong><br/>
                      <span style="color: #764ba2; font-size: 18px;">${mergeRequest.email}</span>
                    </p>
                    <p style="margin: 0 0 15px 0; font-size: 16px;">
                      🔑 <strong>Mật khẩu tạm thời:</strong><br/>
                      <span style="background: #764ba2; color: white; padding: 8px 16px; border-radius: 8px; font-family: monospace; font-size: 20px; letter-spacing: 2px;">${temporaryPassword}</span>
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #e74c3c;">
                      ⚠️ Đừng quên đổi mật khẩu ngay để bảo vệ tài khoản nhé!
                    </p>
                  </div>
                  
                  <a href="${funProfileOrigin}/set-password" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                    🔐 Đổi Mật Khẩu Ngay
                  </a>
                  
                  <p style="font-size: 16px; color: #888; margin-top: 30px; line-height: 1.6;">
                    Chúc bạn có những trải nghiệm tuyệt vời! 🌈💖
                  </p>
                  
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                  
                  <p style="color: #aaa; font-size: 14px; margin: 0;">
                    Với tất cả yêu thương,<br/>
                    <strong style="color: #764ba2;">FUN Profile Team</strong> 💖
                  </p>
                </div>
              </div>
            `
          });
        } else {
          // Email cho both_exist user
          await resend.emails.send({
            from: 'FUN Profile <noreply@fun.rich>',
            to: [mergeRequest.email],
            subject: '✅ Tài khoản đã được liên kết thành công với FUN Profile!',
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 20px;">
                <div style="background: white; border-radius: 16px; padding: 40px; text-align: center;">
                  <div style="font-size: 60px; margin-bottom: 20px;">🎉✨</div>
                  
                  <h1 style="color: #333; font-size: 28px; margin-bottom: 10px;">
                    Xin chào ${mergeRequest.source_username || 'bạn'}!
                  </h1>
                  
                  <p style="font-size: 18px; color: #666; line-height: 1.6; margin-bottom: 30px;">
                    Tài khoản <strong style="color: #11998e;">${mergeRequest.source_platform}</strong> của bạn đã được liên kết thành công với FUN Profile!
                  </p>
                  
                  <div style="background: #f0fff4; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                    <p style="margin: 0; font-size: 16px; color: #333;">
                      📧 Bạn có thể đăng nhập vào FUN Profile bằng email:<br/>
                      <strong style="color: #11998e; font-size: 18px;">${mergeRequest.email}</strong>
                    </p>
                  </div>
                  
                  <a href="${funProfileOrigin}" style="display: inline-block; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);">
                    🚀 Truy cập FUN Profile
                  </a>
                  
                  ${admin_note ? `<p style="font-size: 14px; color: #888; margin-top: 20px;"><em>💬 Ghi chú từ Admin: ${admin_note}</em></p>` : ''}
                  
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
                  
                  <p style="color: #aaa; font-size: 14px; margin: 0;">
                    Trân trọng,<br/>
                    <strong style="color: #11998e;">FUN Profile Team</strong> 💚
                  </p>
                </div>
              </div>
            `
          });
        }
        console.log('[sso-merge-approve] Notification email sent to:', mergeRequest.email);
      }
    } catch (emailError) {
      console.error('[sso-merge-approve] Failed to send email:', emailError);
      // Non-fatal, continue
    }

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
