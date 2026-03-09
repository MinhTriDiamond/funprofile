import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyMessage as ethersVerifyMessage } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Best-effort in-memory rate limiting (resets on cold start)
// Phase 2: migrate to DB-backed or Upstash Redis
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function verifySignature(message: string, signature: string, expectedAddress: string): boolean {
  try {
    const sigRegex = /^0x[a-fA-F0-9]{130}$/;
    if (!sigRegex.test(signature)) return false;
    const addressRegex = /^0x[a-fA-F0-9]{40}$/i;
    if (!addressRegex.test(expectedAddress)) return false;
    const recoveredAddress = ethersVerifyMessage(message, signature) as string | undefined;
    if (!recoveredAddress) return false;
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getSupabase() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { wallet_address, signature, message, action, nonce } = body;

    // ========== ACTION: CHECK (UX-only, no auth) ==========
    if (action === 'check') {
      if (!wallet_address) return jsonResponse({ success: false, error: 'wallet_address is required' }, 400);
      const normalizedAddr = wallet_address.toLowerCase();
      if (!checkRateLimit(`check:${normalizedAddr}`)) return jsonResponse({ success: false, error: 'Too many requests' }, 429);

      const sb = getSupabase();
      const { data: byExternal } = await sb.from('profiles').select('id').eq('external_wallet_address', normalizedAddr).maybeSingle();
      if (byExternal) return jsonResponse({ registered: true });

      const { data: byLegacy } = await sb.from('profiles').select('id').eq('wallet_address', normalizedAddr).maybeSingle();
      if (byLegacy) return jsonResponse({ registered: true });

      const { data: byPublic } = await sb.from('profiles').select('id').eq('public_wallet_address', normalizedAddr).maybeSingle();
      return jsonResponse({ registered: !!byPublic });
    }

    // ========== ACTION: CHALLENGE (generate nonce for signing) ==========
    if (action === 'challenge') {
      if (!wallet_address) return jsonResponse({ success: false, error: 'wallet_address is required' }, 400);
      const normalizedAddr = wallet_address.toLowerCase();
      if (!checkRateLimit(`challenge:${normalizedAddr}`)) return jsonResponse({ success: false, error: 'Too many requests' }, 429);

      const sb = getSupabase();

      // Global cleanup: delete all expired challenges (batch limit 100)
      await sb.from('wallet_challenges')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .limit(100);

      // Generate crypto nonce
      const nonceBytes = new Uint8Array(32);
      crypto.getRandomValues(nonceBytes);
      const challengeNonce = Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min TTL
      const challengeMessage = `Welcome to FUN Profile!\n\nSign this message to authenticate.\n\nWallet: ${normalizedAddr}\nNonce: ${challengeNonce}\nTimestamp: ${new Date().toISOString()}`;

      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || null;

      const { error: insertError } = await sb.from('wallet_challenges').insert({
        wallet_address: normalizedAddr,
        nonce: challengeNonce,
        message: challengeMessage,
        expires_at: expiresAt,
        ip_address: ipAddress,
      });

      if (insertError) {
        console.error('[WEB3-AUTH] Challenge insert error:', insertError);
        return jsonResponse({ success: false, error: 'Failed to create challenge' }, 500);
      }

      console.log(`[WEB3-AUTH] Challenge created for: ${normalizedAddr}`);
      return jsonResponse({ success: true, nonce: challengeNonce, message: challengeMessage, expires_at: expiresAt });
    }

    // ========== DEFAULT ACTION: LOGIN (signature verification) ==========
    if (!wallet_address || !signature || !message || !nonce) {
      return jsonResponse({ success: false, error: 'wallet_address, signature, message, and nonce are required' }, 400);
    }

    const normalizedAddress = wallet_address.toLowerCase();
    if (!checkRateLimit(`web3:${normalizedAddress}`)) {
      console.warn(`[WEB3-AUTH] Rate limit exceeded for: ${normalizedAddress}`);
      return jsonResponse({ success: false, error: 'Too many requests. Please wait before trying again.' }, 429);
    }

    console.log(`[WEB3-AUTH] Auth request for wallet: ${wallet_address}`);

    const supabase = getSupabase();

    // Step 1: Verify nonce from DB (single-use, not expired)
    const { data: challenge, error: challengeError } = await supabase
      .from('wallet_challenges')
      .select('*')
      .eq('nonce', nonce)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (challengeError || !challenge) {
      console.warn('[WEB3-AUTH] Invalid or expired nonce');
      return jsonResponse({ success: false, error: 'Invalid or expired nonce. Please request a new challenge.' }, 401);
    }

    // Mark nonce as used
    await supabase.from('wallet_challenges').update({ used_at: new Date().toISOString() }).eq('id', challenge.id);

    // Step 2: Verify signature cryptographically
    if (!verifySignature(message, signature, normalizedAddress)) {
      console.warn('[WEB3-AUTH] Signature verification failed');
      return jsonResponse({ success: false, error: 'Invalid signature' }, 401);
    }

    console.log('[WEB3-AUTH] Signature verified');

    // Step 3: Check blacklist
    const { data: blacklisted } = await supabase
      .from('blacklisted_wallets')
      .select('id, reason')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    if (blacklisted) {
      console.warn('[WEB3-AUTH] Wallet blacklisted:', blacklisted.reason);
      return jsonResponse({ success: false, error: 'This wallet has been blacklisted' }, 403);
    }

    // Step 4: Server re-lookup wallet (don't trust client 'check')
    let existingProfile = null;

    const { data: profileByExternal } = await supabase
      .from('profiles')
      .select('id, username, external_wallet_address, public_wallet_address')
      .eq('external_wallet_address', normalizedAddress)
      .maybeSingle();

    if (profileByExternal) {
      existingProfile = profileByExternal;
    } else {
      const { data: profileByLegacy } = await supabase
        .from('profiles')
        .select('id, username, wallet_address, external_wallet_address, public_wallet_address')
        .eq('wallet_address', normalizedAddress)
        .maybeSingle();

      if (profileByLegacy) {
        existingProfile = profileByLegacy;
        const legacyUpdate: Record<string, string> = {
          external_wallet_address: normalizedAddress,
          default_wallet_type: 'external',
        };
        if (!profileByLegacy.public_wallet_address) {
          legacyUpdate.public_wallet_address = normalizedAddress;
        }
        await supabase.from('profiles').update(legacyUpdate).eq('id', profileByLegacy.id);
        console.log('[WEB3-AUTH] Migrated legacy wallet to external_wallet_address');
      } else {
        const { data: profileByPublic } = await supabase
          .from('profiles')
          .select('id, username, external_wallet_address, public_wallet_address')
          .eq('public_wallet_address', normalizedAddress)
          .maybeSingle();

        if (profileByPublic) {
          existingProfile = profileByPublic;
          console.log('[WEB3-AUTH] Found user via public_wallet_address');
        }
      }
    }

    let userId: string;
    let isNewUser = false;
    let userEmail = '';

    if (existingProfile) {
      // ===== EXISTING USER LOGIN =====
      console.log('[WEB3-AUTH] Existing user found:', existingProfile.id);
      userId = existingProfile.id;
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      userEmail = userData?.user?.email || '';
    } else {
      // ===== WALLET-FIRST SIGNUP (new) =====
      console.log('[WEB3-AUTH] New wallet, creating wallet-first account:', normalizedAddress);
      isNewUser = true;

      // Internal placeholder email — technical compromise Phase 1 only
      // NOT a real email, NOT a login method, NOT shown to user
      const placeholderEmail = `wallet_${normalizedAddress}@internal.fun.local`;

      // Create auth user with system email
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: placeholderEmail,
        email_confirm: false,
        user_metadata: {
          signup_method: 'wallet',
          is_system_email: true,
          wallet_address: normalizedAddress,
        },
      });

      if (createError || !newAuthUser?.user) {
        console.error('[WEB3-AUTH] Failed to create auth user:', createError);
        return jsonResponse({ success: false, error: 'Failed to create account' }, 500);
      }

      userId = newAuthUser.user.id;
      userEmail = placeholderEmail;

      // Create profile: wallet-first defaults
      // IMPORTANT: only set external_wallet_address, NOT public_wallet_address (privacy)
      // login_wallet_address: the wallet used for initial sign-in/authentication
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        signup_method: 'wallet',
        reward_locked: true,
        account_status: 'limited',
        external_wallet_address: normalizedAddress,
        login_wallet_address: normalizedAddress,
        default_wallet_type: 'external',
      }, { onConflict: 'id' });

      if (profileError) {
        console.error('[WEB3-AUTH] Profile creation error:', profileError);
        // Auth user was created but profile failed — log but continue
      }

      // Audit log
      await supabase.from('account_activity_logs').insert({
        user_id: userId,
        action: 'wallet_signup_created',
        details: { wallet_address: normalizedAddress, signup_method: 'wallet' },
        ip_address: challenge.ip_address,
      }).then(() => {}).catch(() => {});

      console.log('[WEB3-AUTH] Wallet-first account created:', userId);
    }

    // Update last login
    await supabase.from('profiles').update({ last_login_platform: 'FUN Profile' }).eq('id', userId);

    // Generate magic link for session
    if (!userEmail) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      userEmail = userData?.user?.email || '';
    }

    if (!userEmail) {
      return jsonResponse({ success: false, error: 'User email not found' }, 500);
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });

    if (sessionError) {
      console.error('[WEB3-AUTH] Session generation failed:', sessionError);
      return jsonResponse({ success: false, error: 'Failed to create session' }, 500);
    }

    // Audit log for login
    if (!isNewUser) {
      await supabase.from('account_activity_logs').insert({
        user_id: userId,
        action: 'wallet_login_succeeded',
        details: { wallet_address: normalizedAddress },
        ip_address: challenge.ip_address,
      }).then(() => {}).catch(() => {});
    }

    console.log('[WEB3-AUTH] Auth successful for:', userId);

    return jsonResponse({
      success: true,
      message: isNewUser ? 'Account created and authenticated' : 'Authenticated successfully',
      user_id: userId,
      is_new_user: isNewUser,
      token_hash: sessionData?.properties?.hashed_token,
    });

  } catch (error) {
    console.error('[WEB3-AUTH] Error:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse({ success: false, error: errMsg }, 500);
  }
});
