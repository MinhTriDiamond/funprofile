
-- Re-enable rate limit trigger after backfill
ALTER TABLE posts ENABLE TRIGGER enforce_post_rate_limit;
