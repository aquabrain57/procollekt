-- Ajouter les nouveaux champs pour les badges enquêteurs
ALTER TABLE public.surveyor_badges
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS supervisor_id text,
ADD COLUMN IF NOT EXISTS supervisor_name text,
ADD COLUMN IF NOT EXISTS organization_email text,
ADD COLUMN IF NOT EXISTS organization_phone text,
ADD COLUMN IF NOT EXISTS organization_address text,
ADD COLUMN IF NOT EXISTS last_location jsonb,
ADD COLUMN IF NOT EXISTS last_location_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS forms_submitted integer DEFAULT 0;

-- Créer la table pour tracker les positions des enquêteurs en temps réel
CREATE TABLE IF NOT EXISTS public.surveyor_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_id uuid NOT NULL REFERENCES public.surveyor_badges(id) ON DELETE CASCADE,
  surveyor_id text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on surveyor_locations
ALTER TABLE public.surveyor_locations ENABLE ROW LEVEL SECURITY;

-- Policies for surveyor_locations
CREATE POLICY "Badge owners can view locations"
ON public.surveyor_locations
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM surveyor_badges 
  WHERE surveyor_badges.id = surveyor_locations.badge_id 
  AND surveyor_badges.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can insert locations"
ON public.surveyor_locations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for surveyor_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.surveyor_locations;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_surveyor_locations_badge_id ON public.surveyor_locations(badge_id);
CREATE INDEX IF NOT EXISTS idx_surveyor_locations_recorded_at ON public.surveyor_locations(recorded_at DESC);