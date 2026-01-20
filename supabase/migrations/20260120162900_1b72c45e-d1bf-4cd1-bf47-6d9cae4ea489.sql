-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('free', 'starter', 'pro');

-- Create enum for billing period
CREATE TYPE public.billing_period AS ENUM ('monthly', 'yearly');

-- Create enum for surveyor badge status
CREATE TYPE public.badge_status AS ENUM ('active', 'suspended', 'expired');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan subscription_plan NOT NULL DEFAULT 'free',
    billing_period billing_period,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    surveys_limit INTEGER NOT NULL DEFAULT 5,
    responses_limit INTEGER NOT NULL DEFAULT 500,
    surveyors_limit INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Create surveyor_badges table
CREATE TABLE public.surveyor_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    surveyor_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'surveyor',
    organization TEXT,
    project TEXT,
    covered_zone TEXT,
    phone TEXT,
    photo_url TEXT,
    status badge_status NOT NULL DEFAULT 'active',
    qr_code_data TEXT,
    barcode_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, surveyor_id)
);

-- Enable RLS on surveyor_badges
ALTER TABLE public.surveyor_badges ENABLE ROW LEVEL SECURITY;

-- RLS policies for surveyor_badges
CREATE POLICY "Users can view their own badges"
ON public.surveyor_badges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create badges"
ON public.surveyor_badges FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own badges"
ON public.surveyor_badges FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own badges"
ON public.surveyor_badges FOR DELETE
USING (auth.uid() = user_id);

-- Create form_signatures table for immutable signatures
CREATE TABLE public.form_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
    surveyor_id TEXT NOT NULL,
    badge_id UUID NOT NULL REFERENCES surveyor_badges(id),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    gps_latitude DOUBLE PRECISION,
    gps_longitude DOUBLE PRECISION,
    device_id TEXT,
    signature_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(response_id)
);

-- Enable RLS on form_signatures
ALTER TABLE public.form_signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies for form_signatures (read-only after creation)
CREATE POLICY "Survey owners can view signatures"
ON public.form_signatures FOR SELECT
USING (EXISTS (
    SELECT 1 FROM surveys
    WHERE surveys.id = form_signatures.survey_id
    AND surveys.user_id = auth.uid()
));

CREATE POLICY "Users can insert signatures"
ON public.form_signatures FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add surveyor validation fields to survey_responses
ALTER TABLE public.survey_responses 
ADD COLUMN surveyor_id TEXT,
ADD COLUMN surveyor_validated BOOLEAN DEFAULT false,
ADD COLUMN badge_id UUID REFERENCES surveyor_badges(id);

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_surveyor_badges_updated_at
BEFORE UPDATE ON public.surveyor_badges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.surveyor_badges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;