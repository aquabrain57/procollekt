-- Fix storage bucket security: restrict uploads to user-specific folders

-- Delete existing overly permissive policies
DROP POLICY IF EXISTS "Users can upload survey covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update survey covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete survey covers" ON storage.objects;

-- Create restrictive policies that validate ownership via user-specific folders
CREATE POLICY "Users can upload their own survey covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'survey-covers' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own survey covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'survey-covers' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own survey covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'survey-covers' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);