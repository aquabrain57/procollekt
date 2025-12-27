-- Add size constraint to prevent oversized payloads in survey_responses
-- This limits the data column to 10MB maximum
ALTER TABLE public.survey_responses ADD CONSTRAINT data_size_limit 
  CHECK (pg_column_size(data) < 10485760);