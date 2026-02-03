-- Add a public SELECT policy for surveyor_badges so shared forms can lookup badge info
-- This allows anyone to search for active badges by ID/name (required for form surveyor_id field)
-- Only active badges are exposed - suspended/expired remain hidden

CREATE POLICY "Anyone can read active surveyor badges for form validation"
ON public.surveyor_badges
FOR SELECT
USING (status = 'active');