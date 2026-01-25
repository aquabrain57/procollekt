-- Allow survey owners to delete responses from their surveys
CREATE POLICY "Survey owners can delete responses" 
ON public.survey_responses 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM surveys 
  WHERE surveys.id = survey_responses.survey_id 
  AND surveys.user_id = auth.uid()
));