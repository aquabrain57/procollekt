-- Create surveys table
CREATE TABLE public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create survey_fields table for storing form fields
CREATE TABLE public.survey_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'multiselect', 'date', 'location', 'photo', 'rating')),
  label TEXT NOT NULL,
  placeholder TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB,
  min_value INTEGER,
  max_value INTEGER,
  conditional_on JSONB,
  field_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create survey_responses table
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  location JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Surveys policies: creators can manage their surveys, all authenticated can view active surveys
CREATE POLICY "Users can view their own surveys" ON public.surveys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view active surveys" ON public.surveys
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create surveys" ON public.surveys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own surveys" ON public.surveys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own surveys" ON public.surveys
  FOR DELETE USING (auth.uid() = user_id);

-- Survey fields policies: accessible if survey is accessible
CREATE POLICY "Users can view fields of accessible surveys" ON public.survey_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.surveys 
      WHERE id = survey_id AND (user_id = auth.uid() OR status = 'active')
    )
  );

CREATE POLICY "Users can manage fields of their surveys" ON public.survey_fields
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update fields of their surveys" ON public.survey_fields
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete fields of their surveys" ON public.survey_fields
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND user_id = auth.uid())
  );

-- Survey responses policies
CREATE POLICY "Users can view their own responses" ON public.survey_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Survey owners can view all responses" ON public.survey_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can submit responses to active surveys" ON public.survey_responses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND status = 'active')
  );

CREATE POLICY "Users can update their own responses" ON public.survey_responses
  FOR UPDATE USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();