
-- Temporarily disable rate limit trigger for backfill
ALTER TABLE posts DISABLE TRIGGER enforce_post_rate_limit;
