import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Soul elements with descriptions
const SOUL_ELEMENTS = {
  'Kim': { color: '#FFD700', trait: 'Quyết đoán, mạnh mẽ' },
  'Mộc': { color: '#228B22', trait: 'Sáng tạo, phát triển' },
  'Thủy': { color: '#1E90FF', trait: 'Linh hoạt, thông minh' },
  'Hỏa': { color: '#FF4500', trait: 'Nhiệt huyết, đam mê' },
  'Thổ': { color: '#8B4513', trait: 'Ổn định, đáng tin cậy' }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, soul_name } = await req.json();

    console.log(`[MINT-SOUL-NFT] Request for user: ${user_id}`);

    if (!user_id) {
      console.error('[MINT-SOUL-NFT] Missing user_id');
      return new Response(
        JSON.stringify({ success: false, error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile and existing soul NFT
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, fun_id, wallet_address')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      console.error('[MINT-SOUL-NFT] User not found:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has a wallet
    if (!profile.wallet_address) {
      console.error('[MINT-SOUL-NFT] User has no wallet address');
      return new Response(
        JSON.stringify({ success: false, error: 'User must have a wallet to mint Soul NFT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing soul NFT record
    const { data: soulNft, error: soulError } = await supabase
      .from('soul_nfts')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (soulError && soulError.code !== 'PGRST116') {
      console.error('[MINT-SOUL-NFT] Error fetching soul NFT:', soulError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch soul data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already minted
    if (soulNft?.is_minted) {
      console.log('[MINT-SOUL-NFT] Soul NFT already minted');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Soul NFT already minted',
          soul_nft: {
            token_id: soulNft.token_id,
            soul_name: soulNft.soul_name,
            soul_element: soulNft.soul_element,
            soul_level: soulNft.soul_level,
            contract_address: soulNft.contract_address,
            metadata_uri: soulNft.metadata_uri
          },
          is_new: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate token ID (timestamp + random)
    const tokenId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Determine soul name (use provided or generate from FUN-ID)
    const finalSoulName = soul_name || profile.fun_id || profile.username;
    
    // Get soul element (should already be set by trigger, but fallback)
    const soulElement = soulNft?.soul_element || Object.keys(SOUL_ELEMENTS)[Math.floor(Math.random() * 5)];
    const elementData = SOUL_ELEMENTS[soulElement as keyof typeof SOUL_ELEMENTS];

    // Generate metadata URI (in production, upload to IPFS)
    const metadata = {
      name: `Soul of ${finalSoulName}`,
      description: `FUN Identity Soul NFT - ${soulElement}: ${elementData.trait}`,
      image: `https://fun.rich/soul/${profile.fun_id}.png`, // Placeholder
      attributes: [
        { trait_type: 'FUN-ID', value: profile.fun_id },
        { trait_type: 'Element', value: soulElement },
        { trait_type: 'Element Color', value: elementData.color },
        { trait_type: 'Element Trait', value: elementData.trait },
        { trait_type: 'Soul Level', value: soulNft?.soul_level || 1 },
        { trait_type: 'Experience Points', value: soulNft?.experience_points || 0 }
      ],
      external_url: `https://fun.rich/${profile.fun_id}`
    };

    // In production, upload metadata to IPFS here
    const metadataUri = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;

    // For now, simulate minting (in production, interact with smart contract)
    const contractAddress = '0x0000000000000000000000000000000000000000'; // Placeholder

    console.log('[MINT-SOUL-NFT] Minting soul NFT with token ID:', tokenId);

    // Update soul NFT record
    if (soulNft) {
      const { error: updateError } = await supabase
        .from('soul_nfts')
        .update({
          token_id: tokenId,
          soul_name: finalSoulName,
          contract_address: contractAddress,
          metadata_uri: metadataUri,
          is_minted: true,
          minted_at: new Date().toISOString()
        })
        .eq('id', soulNft.id);

      if (updateError) {
        console.error('[MINT-SOUL-NFT] Failed to update soul NFT:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to mint soul NFT' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new soul NFT record
      const { error: insertError } = await supabase
        .from('soul_nfts')
        .insert({
          user_id,
          token_id: tokenId,
          soul_name: finalSoulName,
          soul_element: soulElement,
          contract_address: contractAddress,
          metadata_uri: metadataUri,
          is_minted: true,
          minted_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('[MINT-SOUL-NFT] Failed to create soul NFT:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to mint soul NFT' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[MINT-SOUL-NFT] Soul NFT minted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Soul NFT minted successfully',
        soul_nft: {
          token_id: tokenId,
          soul_name: finalSoulName,
          soul_element: soulElement,
          soul_level: soulNft?.soul_level || 1,
          experience_points: soulNft?.experience_points || 0,
          contract_address: contractAddress,
          metadata_uri: metadataUri,
          element_trait: elementData.trait,
          element_color: elementData.color
        },
        is_new: true,
        profile_url: `https://fun.rich/${profile.fun_id}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[MINT-SOUL-NFT] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
