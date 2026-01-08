-- Extend allowed field types for survey_fields
ALTER TABLE public.survey_fields DROP CONSTRAINT IF EXISTS survey_fields_field_type_check;

ALTER TABLE public.survey_fields
ADD CONSTRAINT survey_fields_field_type_check
CHECK (
  field_type = ANY (
    ARRAY[
      'text',
      'textarea',
      'email',
      'phone',
      'number',
      'decimal',
      'select',
      'multiselect',
      'date',
      'time',
      'datetime',
      'location',
      'photo',
      'audio',
      'video',
      'rating',
      'note',
      'barcode',
      'consent',
      'file',
      'range',
      'ranking',
      'calculate',
      'hidden',
      'matrix',
      'line',
      'area',
      'signature'
    ]::text[]
  )
);