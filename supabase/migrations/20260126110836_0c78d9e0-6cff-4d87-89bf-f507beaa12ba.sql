-- Create storage bucket for badge photos
INSERT INTO storage.buckets (id, name, public) VALUES ('badge-photos', 'badge-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for badge photos
CREATE POLICY "Anyone can view badge photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'badge-photos');

CREATE POLICY "Authenticated users can upload badge photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'badge-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their badge photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'badge-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their badge photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'badge-photos' AND auth.uid()::text = (storage.foldername(name))[1]);