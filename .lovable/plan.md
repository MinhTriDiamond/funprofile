

## Ban Cum 1 + Cum 2: 10 tai khoan farm

### Buoc 1: Ban 10 tai khoan
UPDATE profiles SET
  is_banned = true,
  banned_at = now(),
  ban_reason = 'Farm account - Cluster IP 116.97.108.120 Thanh Hoa + Email farm bach*@gmail.com',
  pending_reward = 0,
  approved_reward = 0,
  reward_status = 'banned'
WHERE id IN (
  'a0bc299f-b643-4982-8fa6-74013ebb5c99',  -- vuthuhoai
  'd8f90da1-8827-43a2-b6b0-7f3b21727299',  -- minh_pham
  '46ce29b3-b207-4214-8970-8d7dd00045ca',  -- thuthuy
  '22fd4e91-8d32-4f36-be3e-0220918f2437',  -- van_le
  '82420698-09d9-4f18-bfba-4b808aea9b4b',  -- le_hue
  '5d7b26df-6a4c-4cee-8112-eb5a0849e215',  -- man_tran
  '24847b56-a0ae-4b2c-9c1c-164917cd2f8f',  -- nhungtran
  'e5622d72-e3c1-4a84-9299-0abc4e38ca90',  -- angelkhanhvy
  'dc998585-d038-4216-8058-13308ef5d78b',  -- nguyendao
  'b1468334-b226-4b33-be91-c9f363fdb8f3'   -- vuthinhu
);

### Buoc 2: Blacklist 10 vi
INSERT INTO blacklisted_wallets (wallet_address, reason, is_permanent, user_id)
VALUES for all 10 wallets with reason 'Farm account cluster - Thanh Hoa IP + email farm'.

### Buoc 3: Reject mint requests
UPDATE pplp_mint_requests SET status = 'rejected', error_message = 'User banned - farm account'
WHERE user_id IN (...10 IDs...) AND status IN ('pending', 'pending_sig', 'signing');

### Ket qua
- 10 tai khoan bi cam vinh vien
- 10 vi bi blacklist
- Cac user nay se bien mat khoi bang xep hang (da loc boi is_banned = false trong RPC)

