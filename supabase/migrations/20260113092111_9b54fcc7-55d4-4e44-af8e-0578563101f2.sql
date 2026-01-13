-- Add cover_image_url column to surveys table for illustrative images
ALTER TABLE public.surveys 
ADD COLUMN cover_image_url TEXT;