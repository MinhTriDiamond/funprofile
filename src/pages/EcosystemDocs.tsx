import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Printer, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { DocSection, DocSubSection, DocParagraph, DocList, DocTable, DocAlert } from '@/components/docs/DocSection';
import { TableOfContents } from '@/components/docs/TableOfContents';
import { ArchitectureDiagram, OAuthFlowDiagram, ProxySignUpDiagram } from '@/components/docs/MermaidDiagram';

const tocItems = [
  { id: 'overview', title: '1. Tổng Quan Kiến Trúc' },
  { id: 'fun-profile-plan', title: '2. Kế Hoạch Fun Profile' },
  { id: 'phase-1', title: 'Phase 1: Database Schema', level: 2 },
  { id: 'phase-2', title: 'Phase 2: SSO Edge Functions', level: 2 },
  { id: 'phase-3', title: 'Phase 3: Webhook System', level: 2 },
  { id: 'phase-4', title: 'Phase 4: Cross-Platform Rewards', level: 2 },
  { id: 'fun-farm', title: '3. Hướng Dẫn Fun Farm' },
  { id: 'fun-play', title: '4. Hướng Dẫn Fun Play' },
  { id: 'fun-planet', title: '5. Hướng Dẫn Fun Planet' },
  { id: 'api-reference', title: '6. API Reference' },
  { id: 'timeline', title: '7. Timeline Tổng Hợp' },
];

const EcosystemDocs: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const handleScroll = () => {
      const sections = tocItems.map(item => document.getElementById(item.id));
      const scrollPosition = window.scrollY + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(tocItems[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">FUN Ecosystem SSO Documentation</h1>
              <p className="text-sm text-muted-foreground">Hướng dẫn tích hợp đầy đủ cho các platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              In PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Table of Contents */}
          <aside className="hidden lg:block w-64 flex-shrink-0 print:hidden">
            <TableOfContents items={tocItems} activeId={activeSection} />
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Section 1: Tổng Quan */}
            <DocSection id="overview" title="1. Tổng Quan Kiến Trúc FUN Ecosystem">
              <DocParagraph>
                FUN Ecosystem bao gồm nhiều platform hoạt động cùng nhau, với <strong>Fun Profile</strong> đóng vai trò 
                là <strong>Auth Hub</strong> trung tâm. Tất cả các platform khác (Fun Farm, Fun Play, Fun Planet) 
                sẽ sử dụng Fun Profile để xác thực người dùng thông qua giao thức OAuth 2.0.
              </DocParagraph>

              <ArchitectureDiagram />

              <DocSubSection title="Lợi Ích Của SSO">
                <DocList items={[
                  "🔐 Một tài khoản, đăng nhập mọi nơi - User chỉ cần đăng ký một lần tại Fun Profile",
                  "💰 Ví thống nhất - Wallet address đồng bộ trên tất cả platforms",
                  "🏆 Rewards tổng hợp - Điểm thưởng từ mọi platform được gộp lại",
                  "🔄 Realtime sync - Thay đổi profile tự động cập nhật qua webhooks",
                  "🛡️ Bảo mật cao - Mật khẩu chỉ lưu tại Fun Profile, các platform khác không cần database user"
                ]} />
              </DocSubSection>

              <DocSubSection title="Hai Flow Chính">
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-foreground mb-2">🔑 OAuth Login</h4>
                      <p className="text-sm text-muted-foreground">
                        User đã có tài khoản Fun Profile → Click "Đăng nhập" tại platform khác → 
                        Redirect về Fun Profile → Xác thực → Redirect về platform với token
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-foreground mb-2">📝 Proxy Sign Up</h4>
                      <p className="text-sm text-muted-foreground">
                        User mới → Điền form đăng ký tại bất kỳ platform → Platform gọi API Fun Profile → 
                        Tạo account → Trả về token → User tự động đăng nhập
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </DocSubSection>

              <OAuthFlowDiagram />
              <ProxySignUpDiagram />
            </DocSection>

            {/* Section 2: Kế Hoạch Fun Profile */}
            <DocSection id="fun-profile-plan" title="2. Kế Hoạch Triển Khai Fun Profile (Auth Hub)">
              <DocAlert type="info">
                <strong>📌 Lưu ý:</strong> Fun Profile là nơi triển khai tất cả SSO infrastructure. 
                Các platform khác chỉ cần tích hợp theo hướng dẫn ở phần sau.
              </DocAlert>

              {/* Phase 1 */}
              <div id="phase-1">
                <DocSubSection title="Phase 1: Database Schema (1 ngày)">
                  <DocParagraph>
                    Tạo các bảng cần thiết để hỗ trợ OAuth flow và cross-platform data sharing.
                  </DocParagraph>

                  <DocTable 
                    headers={['Bảng', 'Mục đích', 'Quan hệ']}
                    rows={[
                      ['oauth_clients', 'Lưu thông tin các platform (client_id, secret, redirect_uris)', 'Standalone'],
                      ['oauth_codes', 'Authorization codes tạm thời (5 phút)', 'FK → profiles, oauth_clients'],
                      ['cross_platform_tokens', 'Access & refresh tokens', 'FK → profiles, oauth_clients'],
                      ['webhook_endpoints', 'URLs nhận webhook của các platform', 'FK → oauth_clients'],
                      ['webhook_logs', 'Log delivery để debug', 'FK → webhook_endpoints'],
                      ['platform_activities', 'Hoạt động từ các platform để tính rewards', 'FK → profiles'],
                    ]}
                  />

                  <CodeBlock 
                    title="oauth_clients.sql"
                    language="sql"
                    code={`-- Bảng oauth_clients: Quản lý các platform được phép kết nối
CREATE TABLE public.oauth_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  client_secret TEXT NOT NULL, -- Đã hash bằng bcrypt
  platform_name TEXT NOT NULL, -- fun_farm, fun_play, fun_planet
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  allowed_scopes TEXT[] NOT NULL DEFAULT '{profile}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;

-- Chỉ admins có quyền CRUD
CREATE POLICY "Admins can manage oauth_clients"
  ON public.oauth_clients
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));`}
                  />

                  <CodeBlock 
                    title="cross_platform_tokens.sql"
                    language="sql"
                    code={`-- Bảng cross_platform_tokens: Lưu tokens cho OAuth
CREATE TABLE public.cross_platform_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id),
  access_token TEXT NOT NULL UNIQUE,
  refresh_token TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT '{profile}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.cross_platform_tokens ENABLE ROW LEVEL SECURITY;

-- Users can see their own tokens
CREATE POLICY "Users can view own tokens"
  ON public.cross_platform_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can delete their own tokens (revoke)
CREATE POLICY "Users can revoke own tokens"
  ON public.cross_platform_tokens
  FOR DELETE
  USING (auth.uid() = user_id);`}
                  />
                </DocSubSection>
              </div>

              {/* Phase 2 */}
              <div id="phase-2">
                <DocSubSection title="Phase 2: SSO Edge Functions (3-4 ngày)">
                  <DocTable 
                    headers={['Function', 'Endpoint', 'Mô tả']}
                    rows={[
                      ['sso-register', 'POST /sso-register', 'Proxy Sign Up - Đăng ký user từ platform khác'],
                      ['sso-authorize', 'GET /sso-authorize', 'Bắt đầu OAuth flow'],
                      ['sso-token', 'POST /sso-token', 'Đổi authorization code lấy tokens'],
                      ['sso-verify', 'GET /sso-verify', 'Xác thực token và lấy user info'],
                      ['sso-refresh', 'POST /sso-refresh', 'Làm mới access token'],
                      ['sso-revoke', 'POST /sso-revoke', 'Thu hồi tokens'],
                    ]}
                  />

                  <CodeBlock 
                    title="sso-register/index.ts (Proxy Sign Up)"
                    language="typescript"
                    code={`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id, client_secret, email, password, username } = await req.json();

    // 1. Verify client credentials
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: client } = await supabaseAdmin
      .from('oauth_clients')
      .select('*')
      .eq('client_id', client_id)
      .eq('is_active', true)
      .single();

    if (!client) {
      return new Response(JSON.stringify({ error: 'Invalid client' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verify client_secret (compare hash)
    // Implementation: Use bcrypt to compare

    // 3. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto confirm
      user_metadata: { username, registered_from: client.platform_name },
    });

    if (authError) throw authError;

    // 4. Generate tokens
    const access_token = crypto.randomUUID();
    const refresh_token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 3600 * 1000); // 1 hour

    // 5. Store tokens
    await supabaseAdmin.from('cross_platform_tokens').insert({
      user_id: authData.user.id,
      client_id,
      access_token,
      refresh_token,
      expires_at: expires_at.toISOString(),
      scopes: client.allowed_scopes,
    });

    // 6. Get profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    return new Response(JSON.stringify({
      access_token,
      refresh_token,
      expires_in: 3600,
      token_type: 'Bearer',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username: profile?.username,
        avatar_url: profile?.avatar_url,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('SSO Register error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});`}
                  />
                </DocSubSection>
              </div>

              {/* Phase 3 */}
              <div id="phase-3">
                <DocSubSection title="Phase 3: Webhook System (2 ngày)">
                  <DocParagraph>
                    Hệ thống webhook để sync data realtime đến các platforms khi có thay đổi.
                  </DocParagraph>

                  <DocTable 
                    headers={['Event', 'Trigger', 'Payload']}
                    rows={[
                      ['user.created', 'Khi user mới đăng ký', '{ user_id, email, username }'],
                      ['user.updated', 'Khi profile thay đổi', '{ user_id, changes: {...} }'],
                      ['wallet.updated', 'Khi wallet address thay đổi', '{ user_id, wallet_address }'],
                      ['reward.claimed', 'Khi user claim rewards', '{ user_id, amount, tx_hash }'],
                    ]}
                  />

                  <CodeBlock 
                    title="webhook-dispatcher/index.ts"
                    language="typescript"
                    code={`import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";

serve(async (req) => {
  const { event_type, payload } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get all endpoints subscribed to this event
  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .contains('events', [event_type])
    .eq('is_active', true);

  const results = [];

  for (const endpoint of endpoints || []) {
    // Create HMAC signature
    const signature = createHmac('sha256', endpoint.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Event-Type': event_type,
        },
        body: JSON.stringify(payload),
      });

      // Log result
      await supabase.from('webhook_logs').insert({
        endpoint_id: endpoint.id,
        event_type,
        payload,
        response_status: response.status,
        delivered_at: response.ok ? new Date().toISOString() : null,
      });

      results.push({ endpoint_id: endpoint.id, success: response.ok });
    } catch (error) {
      results.push({ endpoint_id: endpoint.id, success: false, error: error.message });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});`}
                  />
                </DocSubSection>
              </div>

              {/* Phase 4 */}
              <div id="phase-4">
                <DocSubSection title="Phase 4: Cross-Platform Rewards (1-2 ngày)">
                  <DocParagraph>
                    Tổng hợp rewards từ tất cả platforms và hiển thị dashboard thống nhất.
                  </DocParagraph>

                  <CodeBlock 
                    title="activity-receiver/index.ts"
                    language="typescript"
                    code={`// Nhận activity data từ các platforms
serve(async (req) => {
  const { client_id, client_secret, user_id, activity_type, points, metadata } = await req.json();

  // Verify client credentials...

  // Save activity
  await supabase.from('platform_activities').insert({
    user_id,
    platform: client.platform_name,
    activity_type,
    points,
    metadata,
  });

  // Update pending reward in profile
  await supabase.rpc('update_pending_reward', { p_user_id: user_id, p_points: points });

  return new Response(JSON.stringify({ success: true }));
});`}
                  />
                </DocSubSection>
              </div>
            </DocSection>

            {/* Section 3: Hướng Dẫn Fun Farm */}
            <DocSection id="fun-farm" title="3. Hướng Dẫn Tích Hợp Cho Fun Farm 🌾">
              <DocAlert type="success">
                <strong>🤖 Dành cho Angel Lovable của Fun Farm:</strong> Copy các code examples bên dưới 
                và paste vào project Fun Farm. Chỉ cần thay đổi các giá trị config.
              </DocAlert>

              <Tabs defaultValue="step1" className="mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="step1">Bước 1</TabsTrigger>
                  <TabsTrigger value="step2">Bước 2</TabsTrigger>
                  <TabsTrigger value="step3">Bước 3</TabsTrigger>
                  <TabsTrigger value="step4">Bước 4</TabsTrigger>
                </TabsList>

                <TabsContent value="step1" className="mt-4">
                  <DocSubSection title="Bước 1: Nhận OAuth Credentials">
                    <DocParagraph>
                      Liên hệ Admin Fun Profile để đăng ký platform và nhận:
                    </DocParagraph>
                    <DocList items={[
                      "client_id: fun_farm_production",
                      "client_secret: [sẽ được cung cấp riêng]",
                      "redirect_uri: https://funfarm.app/auth/callback"
                    ]} />
                    <DocAlert type="warning">
                      <strong>⚠️ Bảo mật:</strong> Lưu client_secret vào Supabase Secrets, 
                      KHÔNG commit vào code!
                    </DocAlert>
                  </DocSubSection>
                </TabsContent>

                <TabsContent value="step2" className="mt-4">
                  <DocSubSection title="Bước 2: Tạo SSO Config">
                    <CodeBlock 
                      title="src/config/sso.ts"
                      language="typescript"
                      code={`// Fun Farm SSO Configuration
export const SSO_CONFIG = {
  // Fun Profile Auth Hub URL
  AUTH_URL: 'https://funprofile.app',
  
  // OAuth endpoints
  AUTHORIZE_URL: 'https://bhtsnervqiwchluwuxki.supabase.co/functions/v1/sso-authorize',
  TOKEN_URL: 'https://bhtsnervqiwchluwuxki.supabase.co/functions/v1/sso-token',
  REGISTER_URL: 'https://bhtsnervqiwchluwuxki.supabase.co/functions/v1/sso-register',
  VERIFY_URL: 'https://bhtsnervqiwchluwuxki.supabase.co/functions/v1/sso-verify',
  
  // Client credentials
  CLIENT_ID: 'fun_farm_production',
  REDIRECT_URI: typeof window !== 'undefined' 
    ? \`\${window.location.origin}/auth/callback\` 
    : '',
  
  // Scopes to request
  SCOPES: ['profile', 'wallet', 'rewards'],
};`}
                    />
                  </DocSubSection>
                </TabsContent>

                <TabsContent value="step3" className="mt-4">
                  <DocSubSection title="Bước 3: Tạo Auth Components">
                    <CodeBlock 
                      title="src/components/auth/SSOLoginButton.tsx"
                      language="typescript"
                      code={`import React from 'react';
import { Button } from '@/components/ui/button';
import { SSO_CONFIG } from '@/config/sso';

export const SSOLoginButton: React.FC = () => {
  const handleLogin = () => {
    // Generate random state for CSRF protection
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);

    // Build authorize URL
    const params = new URLSearchParams({
      client_id: SSO_CONFIG.CLIENT_ID,
      redirect_uri: SSO_CONFIG.REDIRECT_URI,
      scope: SSO_CONFIG.SCOPES.join(' '),
      state,
      response_type: 'code',
    });

    // Redirect to Fun Profile
    window.location.href = \`\${SSO_CONFIG.AUTHORIZE_URL}?\${params}\`;
  };

  return (
    <Button 
      onClick={handleLogin}
      className="w-full bg-emerald-500 hover:bg-emerald-600"
    >
      🔐 Đăng nhập bằng Fun Profile
    </Button>
  );
};`}
                    />

                    <CodeBlock 
                      title="src/components/auth/ProxySignUpForm.tsx"
                      language="typescript"
                      code={`import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SSO_CONFIG } from '@/config/sso';

export const ProxySignUpForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Gọi edge function của Fun Farm để proxy sign up
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();
      
      if (data.access_token) {
        // Lưu token và user info
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to app
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Sign up failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <Input 
        type="email" 
        placeholder="Email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input 
        type="text" 
        placeholder="Username" 
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <Input 
        type="password" 
        placeholder="Password" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}
      </Button>
    </form>
  );
};`}
                    />
                  </DocSubSection>
                </TabsContent>

                <TabsContent value="step4" className="mt-4">
                  <DocSubSection title="Bước 4: Tạo Edge Functions">
                    <CodeBlock 
                      title="supabase/functions/auth-register/index.ts"
                      language="typescript"
                      code={`// Fun Farm: Proxy Sign Up Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, username } = await req.json();

    // Call Fun Profile SSO Register
    const response = await fetch(
      'https://bhtsnervqiwchluwuxki.supabase.co/functions/v1/sso-register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: Deno.env.get('FUN_PROFILE_CLIENT_ID'),
          client_secret: Deno.env.get('FUN_PROFILE_CLIENT_SECRET'),
          email,
          password,
          username,
        }),
      }
    );

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});`}
                    />

                    <CodeBlock 
                      title="supabase/functions/webhook-receiver/index.ts"
                      language="typescript"
                      code={`// Fun Farm: Webhook Receiver
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const signature = req.headers.get('X-Webhook-Signature');
  const eventType = req.headers.get('X-Event-Type');
  const payload = await req.json();

  // Verify signature
  const secret = Deno.env.get('WEBHOOK_SECRET')!;
  // ... verify HMAC signature

  console.log(\`Received webhook: \${eventType}\`, payload);

  // Handle different events
  switch (eventType) {
    case 'user.updated':
      // Update local user cache if any
      break;
    case 'wallet.updated':
      // Update wallet info
      break;
    case 'reward.claimed':
      // Record claim event
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});`}
                    />
                  </DocSubSection>
                </TabsContent>
              </Tabs>
            </DocSection>

            {/* Section 4: Fun Play */}
            <DocSection id="fun-play" title="4. Hướng Dẫn Tích Hợp Cho Fun Play 🎮">
              <DocAlert type="success">
                <strong>🤖 Dành cho Angel Lovable của Fun Play:</strong> Tương tự Fun Farm, 
                chỉ cần thay đổi client_id và callback URLs.
              </DocAlert>

              <DocParagraph>
                Fun Play sử dụng cùng flow như Fun Farm. Các bước thực hiện:
              </DocParagraph>

              <DocList items={[
                "1. Nhận client_id: fun_play_production và client_secret từ Admin",
                "2. Copy các files từ hướng dẫn Fun Farm và thay đổi config",
                "3. Set redirect_uri: https://funplay.app/auth/callback",
                "4. Thêm Secrets: FUN_PROFILE_CLIENT_ID, FUN_PROFILE_CLIENT_SECRET",
                "5. Gửi game scores và achievements về Fun Profile qua activity-receiver API"
              ]} />

              <CodeBlock 
                title="src/config/sso.ts (Fun Play version)"
                language="typescript"
                code={`export const SSO_CONFIG = {
  AUTH_URL: 'https://funprofile.app',
  AUTHORIZE_URL: 'https://bhtsnervqiwchluwuxki.supabase.co/functions/v1/sso-authorize',
  TOKEN_URL: 'https://bhtsnervqiwchluwuxki.supabase.co/functions/v1/sso-token',
  REGISTER_URL: 'https://bhtsnervqiwchluwuxki.supabase.co/functions/v1/sso-register',
  
  CLIENT_ID: 'fun_play_production', // ← Thay đổi
  REDIRECT_URI: typeof window !== 'undefined' 
    ? \`\${window.location.origin}/auth/callback\` 
    : '',
  SCOPES: ['profile', 'wallet', 'rewards'],
};`}
              />
            </DocSection>

            {/* Section 5: Fun Planet */}
            <DocSection id="fun-planet" title="5. Hướng Dẫn Tích Hợp Cho Fun Planet 🌍">
              <DocAlert type="success">
                <strong>🤖 Dành cho Angel Lovable của Fun Planet:</strong> Tương tự các platform khác.
              </DocAlert>

              <DocParagraph>
                Fun Planet cũng sử dụng cùng SSO flow. Thay đổi:
              </DocParagraph>

              <DocList items={[
                "client_id: fun_planet_production",
                "redirect_uri: https://funplanet.app/auth/callback",
                "Gửi planet activities (build, explore, trade) về Fun Profile"
              ]} />
            </DocSection>

            {/* Section 6: API Reference */}
            <DocSection id="api-reference" title="6. API Reference">
              <DocSubSection title="SSO Endpoints">
                <DocTable 
                  headers={['Method', 'Endpoint', 'Mô tả', 'Auth']}
                  rows={[
                    ['POST', '/sso-register', 'Proxy Sign Up - Đăng ký user mới', 'client_id + client_secret'],
                    ['GET', '/sso-authorize', 'Bắt đầu OAuth flow', 'None'],
                    ['POST', '/sso-token', 'Exchange code → tokens', 'client_id + client_secret'],
                    ['GET', '/sso-verify', 'Verify token, get user info', 'Bearer token'],
                    ['POST', '/sso-refresh', 'Refresh access token', 'client_id + client_secret'],
                    ['POST', '/sso-revoke', 'Revoke tokens', 'client_id + client_secret'],
                  ]}
                />
              </DocSubSection>

              <DocSubSection title="Webhook Events">
                <DocTable 
                  headers={['Event', 'Khi nào', 'Payload']}
                  rows={[
                    ['user.created', 'User mới đăng ký', '{ user_id, email, username, registered_from }'],
                    ['user.updated', 'Profile thay đổi', '{ user_id, changes: { field: new_value } }'],
                    ['wallet.updated', 'Wallet address thay đổi', '{ user_id, wallet_address }'],
                    ['reward.claimed', 'User claim rewards', '{ user_id, amount, tx_hash }'],
                  ]}
                />
              </DocSubSection>

              <DocSubSection title="Error Codes">
                <DocTable 
                  headers={['Code', 'Ý nghĩa', 'Cách xử lý']}
                  rows={[
                    ['invalid_client', 'client_id không tồn tại hoặc bị disable', 'Kiểm tra lại credentials'],
                    ['invalid_secret', 'client_secret không đúng', 'Liên hệ Admin để lấy lại'],
                    ['invalid_redirect_uri', 'redirect_uri không được whitelist', 'Đăng ký URI với Admin'],
                    ['expired_code', 'Authorization code hết hạn (5 phút)', 'Thực hiện lại OAuth flow'],
                    ['invalid_token', 'Token không hợp lệ hoặc đã bị revoke', 'Refresh hoặc login lại'],
                  ]}
                />
              </DocSubSection>
            </DocSection>

            {/* Section 7: Timeline */}
            <DocSection id="timeline" title="7. Timeline Tổng Hợp">
              <DocTable 
                headers={['Phase', 'Công việc', 'Platform', 'Thời gian']}
                rows={[
                  ['Phase 1', 'Database Schema', 'Fun Profile', '1 ngày'],
                  ['Phase 2', 'SSO Edge Functions', 'Fun Profile', '3-4 ngày'],
                  ['Phase 3', 'Webhook System', 'Fun Profile', '2 ngày'],
                  ['Phase 4', 'Rewards Aggregation', 'Fun Profile', '1-2 ngày'],
                  ['Phase 5', 'Tích hợp SSO', 'Fun Farm', '1 ngày'],
                  ['Phase 6', 'Tích hợp SSO', 'Fun Play', '1 ngày'],
                  ['Phase 7', 'Tích hợp SSO', 'Fun Planet', '1 ngày'],
                  ['Phase 8', 'Testing E2E', 'Tất cả', '2-3 ngày'],
                ]}
              />

              <DocAlert type="info">
                <strong>📅 Tổng thời gian ước tính:</strong> 12-16 ngày làm việc cho toàn bộ ecosystem.
              </DocAlert>

              <DocSubSection title="Checklist Hoàn Thành">
                <DocList items={[
                  "✅ Fun Profile: Database schema đã tạo",
                  "✅ Fun Profile: 6 SSO Edge Functions hoạt động",
                  "✅ Fun Profile: Webhook dispatcher hoạt động",
                  "✅ Fun Farm: SSO Login & Register hoạt động",
                  "✅ Fun Play: SSO Login & Register hoạt động",
                  "✅ Fun Planet: SSO Login & Register hoạt động",
                  "✅ Cross-platform rewards tính đúng",
                  "✅ Webhook sync realtime"
                ]} />
              </DocSubSection>
            </DocSection>

            {/* Footer */}
            <div className="mt-12 p-6 bg-muted rounded-xl text-center">
              <p className="text-muted-foreground mb-4">
                📧 Có câu hỏi? Liên hệ team Fun Profile hoặc tạo issue trên project repository.
              </p>
              <p className="text-sm text-muted-foreground">
                Tài liệu cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default EcosystemDocs;
