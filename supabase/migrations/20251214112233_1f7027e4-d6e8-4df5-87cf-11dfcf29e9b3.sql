-- Add server-side username validation for profiles table

-- 1. Add CHECK constraint for username length
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS username_length;

ALTER TABLE public.profiles 
ADD CONSTRAINT username_length CHECK (
  length(username) >= 3 AND 
  length(username) <= 30
);

-- 2. Create function to check reserved usernames
CREATE OR REPLACE FUNCTION public.check_reserved_username()
RETURNS TRIGGER AS $$
DECLARE
  reserved_names TEXT[] := ARRAY['admin', 'administrator', 'system', 'root', 'moderator', 'mod', 'support', 'help', 'lovable', 'supabase', 'null', 'undefined', 'api', 'www', 'mail', 'email', 'test', 'demo'];
BEGIN
  -- Check if username is in reserved list (case-insensitive)
  IF lower(NEW.username) = ANY(reserved_names) THEN
    RAISE EXCEPTION 'Username "%" is reserved and cannot be used', NEW.username;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create trigger to enforce reserved username check on INSERT and UPDATE
DROP TRIGGER IF EXISTS check_reserved_username_trigger ON public.profiles;

CREATE TRIGGER check_reserved_username_trigger
BEFORE INSERT OR UPDATE OF username ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_reserved_username();