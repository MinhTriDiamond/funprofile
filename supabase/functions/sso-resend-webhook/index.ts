import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendWebhookBody {
  request_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const body: ResendWebhookBody = await req.json();
    const { request_id } = body;

    if (!request_id) {
      return new Response(
        JSON.stringify({ error: 'Missing request_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[sso-resend-webhook] Resending for request:', request_id);

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

    if (mergeRequest.status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Can only resend for completed requests' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const funProfileOrigin = Deno.env.get('FUN_PROFILE_ORIGIN') || 'https://fun-profile.lovable.app';
    let webhookSent = false;
    let emailSent = false;

    // Send webhook
    try {
      const { data: client } = await supabase
        .from('oauth_clients')
        .select('webhook_url, client_secret')
        .eq('platform_name', mergeRequest.source_platform)
        .single();

      if (client?.webhook_url) {
        // Get profile data
        let profileData = null;
        if (mergeRequest.target_user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, full_name, fun_id')
            .eq('id', mergeRequest.target_user_id)
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
          event: 'merge_completed',
          request_id: mergeRequest.id,
          email: mergeRequest.email,
          source_user_id: mergeRequest.source_user_id,
          fun_profile_id: mergeRequest.target_user_id,
          merge_type: mergeRequest.merge_type,
          platform_data_imported: Object.keys(mergeRequest.platform_data || {}).length > 0,
          timestamp: new Date().toISOString(),
          profile_data: profileData,
          resent: true
        };

        const payloadString = JSON.stringify(webhookPayload);
        
        // Create signature
        let signature = '';
        if (client.client_secret) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(client.client_secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );
          const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadString));
          signature = Array.from(new Uint8Array(sig))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }

        console.log('[sso-resend-webhook] Sending webhook to:', client.webhook_url);

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
          webhookSent = true;
          console.log('[sso-resend-webhook] Webhook sent successfully');
        } else {
          console.error('[sso-resend-webhook] Webhook failed:', response.status);
        }
      }
    } catch (webhookError) {
      console.error('[sso-resend-webhook] Webhook error:', webhookError);
    }

    // Send email based on merge_type
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        
        if (mergeRequest.merge_type === 'farm_only') {
          // Email cho farm_only user - vui vẻ, dễ thương
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
                    <p style="margin: 0; font-size: 14px; color: #888;">
                      🔑 Bạn có thể đăng nhập qua <strong>Fun Farm</strong> hoặc sử dụng tính năng <strong>"Quên mật khẩu"</strong> để đặt mật khẩu mới.
                    </p>
                  </div>
                  
                  <a href="${funProfileOrigin}/set-password" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                    🔐 Đặt Mật Khẩu Ngay
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
        
        emailSent = true;
        console.log('[sso-resend-webhook] Email sent to:', mergeRequest.email);
      }
    } catch (emailError) {
      console.error('[sso-resend-webhook] Email error:', emailError);
    }

    // Update webhook_sent status
    if (webhookSent) {
      await supabase
        .from('account_merge_requests')
        .update({
          webhook_sent: true,
          webhook_sent_at: new Date().toISOString()
        })
        .eq('id', request_id);
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      admin_id: user.id,
      action: 'RESEND_MERGE_WEBHOOK',
      target_user_id: mergeRequest.target_user_id,
      details: {
        request_id,
        webhook_sent: webhookSent,
        email_sent: emailSent
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        webhook_sent: webhookSent,
        email_sent: emailSent
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sso-resend-webhook] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
