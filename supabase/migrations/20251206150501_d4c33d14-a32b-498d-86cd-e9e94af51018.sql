-- Create tab_activity table for storing user tab usage data
CREATE TABLE public.tab_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  favicon_url TEXT,
  domain TEXT,
  visit_count INTEGER DEFAULT 1,
  last_visited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  first_visited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, url)
);

-- Create indexes for efficient queries
CREATE INDEX idx_tab_activity_user_id ON public.tab_activity(user_id);
CREATE INDEX idx_tab_activity_last_visited ON public.tab_activity(last_visited_at DESC);
CREATE INDEX idx_tab_activity_domain ON public.tab_activity(domain);

-- Enable RLS
ALTER TABLE public.tab_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own tab data
CREATE POLICY "Users can view their own tab activity"
  ON public.tab_activity
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tab activity"
  ON public.tab_activity
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tab activity"
  ON public.tab_activity
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tab activity"
  ON public.tab_activity
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_tab_activity_updated_at
  BEFORE UPDATE ON public.tab_activity
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();