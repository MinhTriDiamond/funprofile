import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { createWalletClient, http, parseUnits, encodeFunctionData, createPublicClient } from 'https://esm.sh/viem@2.38.6';
import { privateKeyToAccount } from 'https://esm.sh/viem@2.38.6/accounts';
import { bsc } from 'https://esm.sh/viem@2.38.6/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// CAMLY Token config - 3 decimals
const CAMLY_CONTRACT = '0x0910320181889feFDE0BB1Ca63962b0A8882e413';
const CAMLY_DECIMALS = 3;
const MINIMUM_CLAIM = 200000; // Tối thiểu 200.000 CAMLY
const DAILY_CLAIM_CAP = 500000; // Giới hạn 500.000 CAMLY/ngày

// ERC20 Transfer ABI
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Token không hợp lệ' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Initialize Supabase client with user token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Verify JWT and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('JWT verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Phiên đăng nhập hết hạn' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Claim request from user: ${userId}`);

    // 4. Parse request body
    const { wallet_address, amount } = await req.json();
    
    if (!wallet_address || !amount) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'Thiếu thông tin ví hoặc số lượng' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const claimAmount = Number(amount);
    if (isNaN(claimAmount) || claimAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'Số lượng không hợp lệ' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'Địa chỉ ví không hợp lệ' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Check rate limit (1 claim per minute per user)
    const { data: rateLimit } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: `claim_reward:${userId}`,
      p_limit: 1,
      p_window_ms: 60000,
    });

    if (rateLimit && !rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate Limited', 
          message: `Vui lòng chờ ${Math.ceil((60000 - (Date.now() % 60000)) / 1000)} giây` 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Check user profile and reward_status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('reward_status, username, full_name, avatar_url, cover_url, public_wallet_address')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Not Found', message: 'Không tìm thấy hồ sơ người dùng' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7b. Check profile completeness (avatar + wallet)
    if (!profile.avatar_url) {
      return new Response(
        JSON.stringify({ error: 'Incomplete Profile', message: 'Vui lòng cập nhật ảnh đại diện trong trang cá nhân trước khi claim' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.public_wallet_address || !/^0x[a-fA-F0-9]{40}$/.test(profile.public_wallet_address)) {
      return new Response(
        JSON.stringify({ error: 'Incomplete Profile', message: 'Vui lòng cập nhật địa chỉ ví trong trang cá nhân trước khi claim', missing: ['wallet'] }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7c. Check cover photo
    if (!profile.cover_url) {
      return new Response(
        JSON.stringify({ error: 'Incomplete Profile', message: 'Vui lòng cập nhật ảnh bìa trong trang cá nhân trước khi claim. Vào trang cá nhân → nhấn vào ảnh bìa để cập nhật!', missing: ['cover_url'] }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7d. Check at least 1 post today
    const postTodayStart = new Date();
    postTodayStart.setUTCHours(0, 0, 0, 0);
    const { count: todayPostCount } = await supabaseAdmin
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', postTodayStart.toISOString());

    if (!todayPostCount || todayPostCount === 0) {
      return new Response(
        JSON.stringify({ error: 'Activity Required', message: 'Bạn cần đăng ít nhất 1 bài viết hôm nay để được claim. Hãy chia sẻ một bài viết trên trang chủ của bạn!', missing: ['today_post'] }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7e. Check full name validity (auto hold unclear names like wallet_xxx)
    const fullName = (profile.full_name || '').trim();
    const username = profile.username || '';
    const isWalletUsername = /^wallet_[a-z0-9]+$/i.test(username);
    const isNameValid = fullName.length >= 4
      && !/^\d+$/.test(fullName)
      && /[a-zA-ZÀ-ỹ]/.test(fullName);

    if (!isNameValid) {
      const holdNote = 'Tên hiển thị không rõ ràng hoặc chưa cập nhật họ tên đầy đủ. Vui lòng cập nhật tên thật.';
      console.warn(`Unclear name for user ${userId}: full_name="${profile.full_name}", username="${username}"`);

      await supabaseAdmin.from('profiles').update({
        reward_status: 'on_hold',
        admin_notes: holdNote,
      }).eq('id', userId);

      await supabaseAdmin.from('pplp_fraud_signals').insert({
        actor_id: userId,
        signal_type: 'UNCLEAR_NAME',
        severity: 2,
        details: { full_name: profile.full_name, username },
        source: 'claim-reward',
      });

      return new Response(JSON.stringify({
        error: 'Incomplete Profile',
        message: 'Tên hiển thị chưa rõ ràng. Vui lòng cập nhật họ tên đầy đủ (tối thiểu 4 ký tự, có chữ cái) trong trang cá nhân. Tài khoản đã được chuyển sang chờ Admin duyệt.',
        missing: ['full_name'],
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 7f. Auto fraud detection
    const fraudReasons: string[] = [];

    // Check shared device
    const { data: userDevices } = await supabaseAdmin
      .from('pplp_device_registry')
      .select('device_hash')
      .eq('user_id', userId);

    if (userDevices && userDevices.length > 0) {
      for (const dev of userDevices) {
        const { count } = await supabaseAdmin
          .from('pplp_device_registry')
          .select('user_id', { count: 'exact', head: true })
          .eq('device_hash', dev.device_hash)
          .neq('user_id', userId);
        if (count && count > 0) {
          fraudReasons.push('Phát hiện nhiều tài khoản trên cùng 1 thiết bị');
          break;
        }
      }
    }

    // Check duplicate avatar
    if (profile.avatar_url) {
      const { count: avatarDups } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('avatar_url', profile.avatar_url)
        .neq('id', userId);
      if (avatarDups && avatarDups > 0) {
        fraudReasons.push('Ảnh đại diện trùng với tài khoản khác');
      }
    }

    // Check duplicate wallet
    if (profile.public_wallet_address) {
      const { count: walletDups } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('public_wallet_address', profile.public_wallet_address)
        .neq('id', userId);
      if (walletDups && walletDups > 0) {
        fraudReasons.push('Địa chỉ ví trùng với tài khoản khác');
      }
    }

    // Check duplicate posts today
    const { data: userPosts } = await supabaseAdmin
      .from('posts')
      .select('content')
      .eq('user_id', userId)
      .gte('created_at', postTodayStart.toISOString())
      .not('content', 'is', null)
      .limit(10);

    if (userPosts && userPosts.length > 0) {
      for (const post of userPosts) {
        if (!post.content || post.content.trim().length < 20) continue;
        const { count: dupPosts } = await supabaseAdmin
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('content', post.content)
          .neq('user_id', userId)
          .gte('created_at', postTodayStart.toISOString());
        if (dupPosts && dupPosts > 0) {
          fraudReasons.push('Bài viết trong ngày trùng nội dung với tài khoản khác');
          break;
        }
      }
    }

    // If fraud detected -> hold + return 403
    if (fraudReasons.length > 0) {
      const holdNote = fraudReasons.join('; ');
      console.warn(`Fraud detected for user ${userId}: ${holdNote}`);

      await supabaseAdmin.from('profiles').update({
        reward_status: 'on_hold',
        admin_notes: holdNote,
      }).eq('id', userId);

      await supabaseAdmin.from('pplp_fraud_signals').insert({
        actor_id: userId,
        signal_type: 'AUTO_HOLD',
        severity: 3,
        details: { reasons: fraudReasons },
        source: 'claim-reward',
      });

      return new Response(JSON.stringify({
        error: 'Account Held',
        message: `Tài khoản tạm dừng rút tiền do: ${holdNote}. Vui lòng liên hệ Admin để được xem xét.`,
        reasons: fraudReasons,
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const blockedStatuses = ['on_hold', 'rejected'];
    if (blockedStatuses.includes(profile.reward_status)) {
      const statusMessages: Record<string, string> = {
        on_hold: 'Phần thưởng đang bị treo. Vui lòng liên hệ Admin.',
        rejected: 'Phần thưởng đã bị từ chối. Vui lòng liên hệ Admin.',
      };
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden', 
          message: statusMessages[profile.reward_status] || 'Phần thưởng chưa được duyệt' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Calculate claimable amount using RPC function
    const { data: rewardsData, error: rewardsError } = await supabase.rpc('get_user_rewards_v2', {
      limit_count: 10000,
    });

    if (rewardsError) {
      console.error('Rewards RPC error:', rewardsError);
      return new Response(
        JSON.stringify({ error: 'Internal Error', message: 'Lỗi tính toán phần thưởng' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userReward = rewardsData?.find((r: any) => r.id === userId);
    const totalReward = Number(userReward?.total_reward) || 0;

    // Get already claimed amount
    const { data: claims } = await supabase
      .from('reward_claims')
      .select('amount')
      .eq('user_id', userId);

    const claimedAmount = claims?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
    const claimableAmount = Math.max(0, totalReward - claimedAmount);

    // Calculate daily claimed amount (UTC day)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { data: todayClaims } = await supabaseAdmin
      .from('reward_claims')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString());

    const todayClaimed = todayClaims?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
    const dailyRemaining = Math.max(0, DAILY_CLAIM_CAP - todayClaimed);

    console.log(`User ${userId}: total=${totalReward}, claimed=${claimedAmount}, claimable=${claimableAmount}, requested=${claimAmount}, todayClaimed=${todayClaimed}, dailyRemaining=${dailyRemaining}`);

    // 9. Validate claim amount
    if (claimAmount < MINIMUM_CLAIM) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Cần tối thiểu 200.000 CAMLY để claim. Hãy tiếp tục hoạt động để tích lũy thêm!' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (dailyRemaining <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Daily Limit', 
          message: 'Bạn đã claim tối đa 500.000 CAMLY hôm nay, vui lòng quay lại ngày mai',
          daily_claimed: todayClaimed,
          daily_remaining: 0,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auto-cap to daily remaining
    const effectiveAmount = Math.min(claimAmount, claimableAmount, dailyRemaining);

    if (effectiveAmount <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: `Không đủ số dư hoặc đã hết giới hạn hôm nay`,
          daily_claimed: todayClaimed,
          daily_remaining: dailyRemaining,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (effectiveAmount > claimableAmount) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: `Số tiền vượt quá số dư khả dụng (${claimableAmount.toLocaleString()} CAMLY)` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 10. Get Treasury wallet credentials
    const treasuryAddress = Deno.env.get('TREASURY_WALLET_ADDRESS')?.trim();
    const treasuryPrivateKey = Deno.env.get('TREASURY_PRIVATE_KEY')?.trim();

    if (!treasuryAddress || !treasuryPrivateKey) {
      console.error('Treasury wallet not configured');
      return new Response(
        JSON.stringify({ error: 'Server Error', message: 'Hệ thống chưa được cấu hình đầy đủ' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 11. Create viem clients
    let pk = treasuryPrivateKey;
    if (!pk.startsWith('0x')) {
      pk = '0x' + pk;
    }
    const account = privateKeyToAccount(pk as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain: bsc,
      transport: http('https://bsc-dataseed1.binance.org'),
    });

    const walletClient = createWalletClient({
      account,
      chain: bsc,
      transport: http('https://bsc-dataseed1.binance.org'),
    });

    // 12. Check Treasury CAMLY balance
    const treasuryBalance = await publicClient.readContract({
      address: CAMLY_CONTRACT as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [treasuryAddress as `0x${string}`],
    });

    const requiredAmount = parseUnits(effectiveAmount.toString(), CAMLY_DECIMALS);
    
    if (treasuryBalance < requiredAmount) {
      console.error(`Treasury insufficient: has ${treasuryBalance}, needs ${requiredAmount}`);
      return new Response(
        JSON.stringify({ 
          error: 'Service Unavailable', 
          message: 'Treasury không đủ token, vui lòng liên hệ Admin' 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 13. Send CAMLY transfer transaction
    console.log(`Sending ${effectiveAmount} CAMLY to ${wallet_address}...`);
    
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [wallet_address as `0x${string}`, requiredAmount],
    });

    const txHash = await walletClient.sendTransaction({
      to: CAMLY_CONTRACT as `0x${string}`,
      data,
      chain: bsc,
    });

    console.log(`Transaction sent: ${txHash}`);

    // 14. Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000,
    });

    if (receipt.status !== 'success') {
      console.error('Transaction failed:', receipt);
      return new Response(
        JSON.stringify({ error: 'Transaction Failed', message: 'Giao dịch blockchain thất bại' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    // 15. Record in reward_claims table
    const { error: claimInsertError } = await supabaseAdmin
      .from('reward_claims')
      .insert({
        user_id: userId,
        amount: effectiveAmount,
        wallet_address: wallet_address.toLowerCase(),
      });

    if (claimInsertError) {
      console.error('Failed to insert reward_claims:', claimInsertError);
    }

    // 16. Record in transactions table
    const { error: txInsertError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        tx_hash: txHash,
        from_address: treasuryAddress.toLowerCase(),
        to_address: wallet_address.toLowerCase(),
        amount: effectiveAmount.toString(),
        token_symbol: 'CAMLY',
        token_address: CAMLY_CONTRACT.toLowerCase(),
        chain_id: 56,
        status: 'confirmed',
      });

    if (txInsertError) {
      console.error('Failed to insert transaction:', txInsertError);
    }

    // 16b. Record in donations table for history visibility
    const TREASURY_SENDER_ID = '9e702a6f-4035-4f30-9c04-f2e21419b37a';
    const { error: donationInsertError } = await supabaseAdmin
      .from('donations')
      .insert({
        sender_id: TREASURY_SENDER_ID,
        recipient_id: userId,
        amount: effectiveAmount.toString(),
        token_symbol: 'CAMLY',
        token_address: CAMLY_CONTRACT.toLowerCase(),
        chain_id: 56,
        tx_hash: txHash,
        status: 'confirmed',
        block_number: Number(receipt.blockNumber),
        message: `Claim ${effectiveAmount.toLocaleString()} CAMLY từ phần thưởng`,
        light_score_earned: 0,
        confirmed_at: new Date().toISOString(),
        metadata: { type: 'claim_reward' },
      });

    if (donationInsertError) {
      console.error('Failed to insert donation record:', donationInsertError);
    }

    // 16c. Update reward_status to 'claimed'
    await supabaseAdmin.from('profiles').update({
      reward_status: 'claimed',
    }).eq('id', userId);

    // 17. Log to audit_logs
    await supabaseAdmin.from('audit_logs').insert({
      admin_id: userId,
      target_user_id: userId,
      action: 'CLAIM_REWARD',
      details: {
        amount: effectiveAmount,
        wallet_address,
        tx_hash: txHash,
        block_number: receipt.blockNumber?.toString(),
      },
      reason: `Claimed ${effectiveAmount.toLocaleString()} CAMLY to ${wallet_address}`,
    });

    // 17b. Create notification for the user
    const TREASURY_ACTOR_ID = '9e702a6f-4035-4f30-9c04-f2e21419b37a';
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      actor_id: TREASURY_ACTOR_ID,
      type: 'claim_reward',
    });

    const newDailyClaimed = todayClaimed + effectiveAmount;
    console.log(`Successfully claimed ${effectiveAmount} CAMLY for user ${userId}`);

    // 18. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        tx_hash: txHash,
        amount: effectiveAmount,
        wallet_address,
        block_number: receipt.blockNumber?.toString(),
        message: `Đã chuyển ${effectiveAmount.toLocaleString()} CAMLY thành công!`,
        bscscan_url: `https://bscscan.com/tx/${txHash}`,
        daily_claimed: newDailyClaimed,
        daily_remaining: Math.max(0, DAILY_CLAIM_CAP - newDailyClaimed),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Claim reward error:', error);
    
    // Handle specific blockchain errors
    if (error.message?.includes('insufficient funds')) {
      return new Response(
        JSON.stringify({ error: 'Service Unavailable', message: 'Treasury không đủ gas fee' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal Error', 
        message: error.message || 'Lỗi hệ thống, vui lòng thử lại sau' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
