-- Create rate limiting table
CREATE TABLE public.rate_limit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_rate_limit_logs_lookup ON public.rate_limit_logs (identifier, endpoint, created_at);

-- Create index for cleanup
CREATE INDEX idx_rate_limit_logs_cleanup ON public.rate_limit_logs (created_at);

-- Enable RLS (but allow service role to manage)
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- No policies needed - only accessed via service role from edge functions

-- Create rate limiting check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer DEFAULT 100,
  p_window_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_window_start timestamp with time zone;
  v_result jsonb;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  -- Count requests in the current window
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_logs
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND created_at > v_window_start;
  
  -- Check if limit exceeded
  IF v_count >= p_max_requests THEN
    v_result := jsonb_build_object(
      'allowed', false,
      'current_count', v_count,
      'max_requests', p_max_requests,
      'retry_after', p_window_seconds
    );
  ELSE
    -- Log this request
    INSERT INTO public.rate_limit_logs (identifier, endpoint)
    VALUES (p_identifier, p_endpoint);
    
    v_result := jsonb_build_object(
      'allowed', true,
      'current_count', v_count + 1,
      'max_requests', p_max_requests,
      'remaining', p_max_requests - v_count - 1
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- Create cleanup function for old rate limit logs
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  -- Delete logs older than 1 hour
  DELETE FROM public.rate_limit_logs
  WHERE created_at < now() - interval '1 hour';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Comment on table
COMMENT ON TABLE public.rate_limit_logs IS 'Tracks API requests for rate limiting. Entries older than 1 hour are periodically cleaned up.';