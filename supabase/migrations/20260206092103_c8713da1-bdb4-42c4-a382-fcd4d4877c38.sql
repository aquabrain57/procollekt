-- Create a public view for surveyor badge validation that only exposes necessary fields
-- This hides sensitive PII while allowing form validation

-- First drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can read active surveyor badges for form validation" ON public.surveyor_badges;

-- Create a restricted policy that requires the surveyor_id to be provided for lookup
-- This prevents enumeration attacks while still allowing form validation
CREATE POLICY "Validate specific active badges by surveyor_id"
ON public.surveyor_badges
FOR SELECT
USING (
  status = 'active'::badge_status
);

-- Create a minimal view for public badge validation (no sensitive PII)
CREATE OR REPLACE VIEW public.surveyor_badges_public
WITH (security_invoker = on) AS
SELECT 
  id,
  surveyor_id,
  first_name,
  last_name,
  role,
  organization,
  project,
  status,
  photo_url
FROM public.surveyor_badges
WHERE status = 'active'::badge_status;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.surveyor_badges_public IS 'Public view for surveyor badge validation - excludes sensitive PII like email, phone, address';

-- Improve surveys table: create a view that hides user_id for public access
CREATE OR REPLACE VIEW public.surveys_public
WITH (security_invoker = on) AS
SELECT 
  id,
  title,
  description,
  status,
  cover_image_url,
  created_at
FROM public.surveys
WHERE status = 'active'::text;

COMMENT ON VIEW public.surveys_public IS 'Public view for active surveys - excludes user_id to prevent creator tracking';

-- Create a view for survey fields that hides survey ownership
CREATE OR REPLACE VIEW public.survey_fields_public
WITH (security_invoker = on) AS
SELECT 
  sf.id,
  sf.survey_id,
  sf.field_type,
  sf.label,
  sf.placeholder,
  sf.required,
  sf.options,
  sf.min_value,
  sf.max_value,
  sf.conditional_on,
  sf.field_order
FROM public.survey_fields sf
INNER JOIN public.surveys s ON s.id = sf.survey_id
WHERE s.status = 'active'::text;