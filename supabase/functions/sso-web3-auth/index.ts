import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyMessage as ethersVerifyMessage } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Best-effort in-memory rate limiting (resets on cold start)
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

/** Build the internal placeholder email for a wallet address */
function walletEmail(addr: string): string {
  return `wallet_${addr.toLowerCase()}@internal.fun.local`;
}

/** Find existing profile by wallet address across all wallet columns + email fallback */
async function findProfileByWallet(supabase: ReturnType<typeof getSupabase>, normalizedAddr: string) {
  // 1. external_wallet_address
  const { data: byExternal } = await supabase
    .from('profiles')
    .select('id, username, external_wallet_address, public_wallet_address, login_wallet_address')
    .eq('external_wallet_address', normalizedAddr)
    .maybeSingle();
  if (byExternal) return { profile: byExternal, source: 'external' };

  // 2. login_wallet_address
  const { data: byLogin } = await supabase
    .from('profiles')
    .select('id, username, external_wallet_address, public_wallet_address, login_wallet_address')
    .eq('login_wallet_address', normalizedAddr)
    .maybeSingle();
  if (byLogin) return { profile: byLogin, source: 'login' };

  // 3. Legacy wallet_address
  const { data: byLegacy } = await supabase
    .from('profiles')
    .select('id, username, wallet_address, external_wallet_address, public_wallet_address, login_wallet_address')
    .eq('wallet_address', normalizedAddr)
    .maybeSingle();
  if (byLegacy) return { profile: byLegacy, source: 'legacy' };

  // 4. public_wallet_address
  const { data: byPublic } = await supabase
    .from('profiles')
    .select('id, username, external_wallet_address, public_wallet_address, login_wallet_address')
    .eq('public_wallet_address', normalizedAddr)
    .maybeSingle();
  if (byPublic) return { profile: byPublic, source: 'public' };

  // 5. Fallback: check auth.users by placeholder email
  const placeholder = walletEmail(normalizedAddr);
  const { data: listData } = await supabase.auth.admin.listUsers({ filter: placeholder, page: 1, perPage: 1 });
  if (listData?.users?.length) {
    const authUser = listData.users[0];
    const { data: byId } = await supabase
      .from('profiles')
      .select('id, username, external_wallet_address, public_wallet_address, login_wallet_address')
      .eq('id', authUser.id)
      .maybeSingle();
    if (byId) return { profile: byId, source: 'email_fallback' };
  }

  return null;
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
      const result = await findProfileByWallet(sb, normalizedAddr);
      return jsonResponse({ registered: !!result });
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

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
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
    const lookupResult = await findProfileByWallet(supabase, normalizedAddress);

    let userId: string;
    let isNewUser = false;
    let userEmail = '';

    if (lookupResult) {
      // ===== EXISTING USER LOGIN =====
      const existingProfile = lookupResult.profile;
      console.log(`[WEB3-AUTH] Existing user found (via ${lookupResult.source}):`, existingProfile.id);
      userId = existingProfile.id;

      // Migrate legacy wallet if needed
      if (lookupResult.source === 'legacy') {
        const legacyUpdate: Record<string, string> = {
          external_wallet_address: normalizedAddress,
          default_wallet_type: 'external',
        };
        if (!existingProfile.public_wallet_address) {
          legacyUpdate.public_wallet_address = normalizedAddress;
        }
        if (!existingProfile.login_wallet_address) {
          legacyUpdate.login_wallet_address = normalizedAddress;
        }
        await supabase.from('profiles').update(legacyUpdate).eq('id', existingProfile.id);
        console.log('[WEB3-AUTH] Migrated legacy wallet to external_wallet_address');
      }

      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      userEmail = userData?.user?.email || '';
    } else {
      // ===== WALLET-FIRST SIGNUP (new) =====
      console.log('[WEB3-AUTH] New wallet, creating wallet-first account:', normalizedAddress);
      isNewUser = true;

      const placeholderEmail = walletEmail(normalizedAddress);

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

      // Wait for handle_new_user trigger to create profile row, then UPDATE it
      // The trigger fires on auth.users INSERT and creates a default profile
      const profileData = {
        signup_method: 'wallet',
        reward_locked: true,
        account_status: 'limited',
        external_wallet_address: normalizedAddress,
        login_wallet_address: normalizedAddress,
        default_wallet_type: 'external',
      };

      // First attempt
      await new Promise(r => setTimeout(r, 300));
      const { error: profileError } = await supabase.from('profiles')
        .update(profileData)
        .eq('id', userId);

      if (profileError) {
        console.warn('[WEB3-AUTH] Profile update attempt 1 failed, retrying...', profileError);
        // Retry after longer delay
        await new Promise(r => setTimeout(r, 700));
        const { error: retryError } = await supabase.from('profiles')
          .update(profileData)
          .eq('id', userId);

        if (retryError) {
          console.error('[WEB3-AUTH] Profile update failed after retry:', retryError);
          // Don't fail the whole signup — auth user exists, profile will need manual fix
        }
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
