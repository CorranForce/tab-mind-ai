-- Create extension waitlist table
CREATE TABLE public.extension_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.extension_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for non-logged-in users too)
CREATE POLICY "Anyone can join waitlist"
ON public.extension_waitlist
FOR INSERT
WITH CHECK (true);

-- Users can view their own waitlist entry
CREATE POLICY "Users can view their own waitlist entry"
ON public.extension_waitlist
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create index on email for faster lookups
CREATE INDEX idx_extension_waitlist_email ON public.extension_waitlist(email);