
-- Bước 1: Tính content_hash cho tất cả bài cũ chưa có hash
UPDATE posts
SET content_hash = MD5(
  LOWER(TRIM(REGEXP_REPLACE(content, '\s+', ' ', 'g')))
)
WHERE content_hash IS NULL
  AND content IS NOT NULL
  AND TRIM(content) != '';

-- Bước 2: Đánh dấu is_reward_eligible = false cho bài trùng (chỉ trong cùng 1 user)
-- Bài đầu tiên (created_at nhỏ nhất) giữ nguyên, các bài sau chuyển false
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, content_hash
      ORDER BY created_at ASC
    ) AS rn
  FROM posts
  WHERE content_hash IS NOT NULL
)
UPDATE posts
SET is_reward_eligible = false
FROM ranked
WHERE posts.id = ranked.id
  AND ranked.rn > 1
  AND posts.is_reward_eligible IS DISTINCT FROM false;
