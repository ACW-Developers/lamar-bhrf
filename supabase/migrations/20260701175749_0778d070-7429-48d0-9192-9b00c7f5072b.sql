
-- Structured SOAP fields for progress notes
ALTER TABLE public.progress_notes
  ADD COLUMN IF NOT EXISTS soap jsonb,
  ADD COLUMN IF NOT EXISTS mood_rating smallint,
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS interventions text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS touch_progress_notes_updated_at ON public.progress_notes;
CREATE TRIGGER touch_progress_notes_updated_at
BEFORE UPDATE ON public.progress_notes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
