-- Drop the existing check constraint on field_type
ALTER TABLE public.survey_fields DROP CONSTRAINT IF EXISTS survey_fields_field_type_check;

-- Add updated check constraint including surveyor_id type
ALTER TABLE public.survey_fields ADD CONSTRAINT survey_fields_field_type_check 
CHECK (field_type IN (
  'text', 'textarea', 'email', 'phone', 'number', 'decimal', 
  'select', 'multiselect', 'date', 'time', 'datetime', 
  'location', 'point', 'photo', 'audio', 'video', 
  'rating', 'note', 'barcode', 'consent', 'file', 
  'range', 'ranking', 'calculate', 'hidden', 
  'matrix', 'line', 'area', 'signature', 'surveyor_id'
));