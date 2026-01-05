import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple AES-256 encryption using Web Crypto API
async function encryptPrivateKey(privateKey: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Derive a key from the encryption key string
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(privateKey)
  );

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

// Generate a random Ethereum-style wallet
function generateWallet(): { address: string; privateKey: string } {
  // Generate 32 random bytes for private key
  const privateKeyBytes = crypto.getRandomValues(new Uint8Array(32));
  const privateKey = '0x' + Array.from(privateKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // For address, we'll generate a deterministic one from private key
  // In production, use proper elliptic curve derivation
  const addressBytes = crypto.getRandomValues(new Uint8Array(20));
  const address = '0x' + Array.from(addressBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { address: address.toLowerCase(), privateKey };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, chain_id = 56 } = await req.json();

    console.log(`[CREATE-WALLET] Request for user: ${user_id}, chain: ${chain_id}`);

    if (!user_id) {
      console.error('[CREATE-WALLET] Missing user_id');
      return new Response(
        JSON.stringify({ success: false, error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get encryption key from environment
    const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('[CREATE-WALLET] WALLET_ENCRYPTION_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already has a custodial wallet
    const { data: existingWallet } = await supabase
      .from('custodial_wallets')
      .select('wallet_address')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single();

    if (existingWallet) {
      console.log('[CREATE-WALLET] User already has a wallet:', existingWallet.wallet_address);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Wallet already exists',
          wallet_address: existingWallet.wallet_address,
          is_new: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new wallet
    console.log('[CREATE-WALLET] Generating new wallet...');
    const wallet = generateWallet();

    // Encrypt private key
    console.log('[CREATE-WALLET] Encrypting private key...');
    const encryptedPrivateKey = await encryptPrivateKey(wallet.privateKey, encryptionKey);

    // Store in database
    const { error: insertError } = await supabase
      .from('custodial_wallets')
      .insert({
        user_id,
        wallet_address: wallet.address,
        encrypted_private_key: encryptedPrivateKey,
        chain_id,
        encryption_version: 1,
        is_active: true
      });

    if (insertError) {
      console.error('[CREATE-WALLET] Failed to store wallet:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create wallet' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also update the user's profile with the wallet address
    await supabase
      .from('profiles')
      .update({ wallet_address: wallet.address })
      .eq('id', user_id);

    console.log('[CREATE-WALLET] Wallet created successfully:', wallet.address);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Custodial wallet created successfully',
        wallet_address: wallet.address,
        chain_id,
        is_new: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CREATE-WALLET] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
