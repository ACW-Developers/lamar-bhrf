
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS intake_form jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS intake_data jsonb NOT NULL DEFAULT '{}'::jsonb;
