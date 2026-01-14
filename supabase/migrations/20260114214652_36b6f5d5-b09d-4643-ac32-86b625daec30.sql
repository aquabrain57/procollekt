-- Enable realtime for survey_responses to support live dashboards
ALTER PUBLICATION supabase_realtime ADD TABLE public.survey_responses;

-- Enable realtime for surveys (status/title changes reflected live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.surveys;