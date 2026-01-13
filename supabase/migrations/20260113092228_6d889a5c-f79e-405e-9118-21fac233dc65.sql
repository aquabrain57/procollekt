-- Create storage bucket for survey cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('survey-covers', 'survey-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for users to upload cover images
CREATE POLICY "Users can upload survey covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'survey-covers' AND auth.uid() IS NOT NULL);

-- Create policy to view public cover images
CREATE POLICY "Public can view survey covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'survey-covers');

-- Allow users to update their covers
CREATE POLICY "Users can update survey covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'survey-covers' AND auth.uid() IS NOT NULL);

-- Allow users to delete their covers
CREATE POLICY "Users can delete survey covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'survey-covers' AND auth.uid() IS NOT NULL);