
-- DISCHARGES
CREATE TABLE public.discharges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  planned_date date,
  actual_date date,
  discharge_type text,
  destination text,
  aftercare_plan text,
  follow_up_date date,
  follow_up_completed boolean NOT NULL DEFAULT false,
  follow_up_notes text,
  status text NOT NULL DEFAULT 'planned',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discharges TO authenticated;
GRANT ALL ON public.discharges TO service_role;
ALTER TABLE public.discharges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view discharges" ON public.discharges FOR SELECT TO authenticated USING (true);
CREATE POLICY "BHP manage discharges" ON public.discharges FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'bhp') OR is_admin(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'bhp') OR is_admin(auth.uid()));
CREATE TRIGGER discharges_updated BEFORE UPDATE ON public.discharges FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- FAMILY CONTACTS
CREATE TABLE public.family_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text,
  phone text,
  email text,
  is_emergency boolean NOT NULL DEFAULT false,
  can_visit boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_contacts TO authenticated;
GRANT ALL ON public.family_contacts TO service_role;
ALTER TABLE public.family_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view contacts" ON public.family_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage contacts" ON public.family_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER family_contacts_updated BEFORE UPDATE ON public.family_contacts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- VISITOR LOGS
CREATE TABLE public.visitor_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  visitor_name text NOT NULL,
  relationship text,
  check_in timestamptz NOT NULL DEFAULT now(),
  check_out timestamptz,
  notes text,
  logged_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitor_logs TO authenticated;
GRANT ALL ON public.visitor_logs TO service_role;
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view visitors" ON public.visitor_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage visitors" ON public.visitor_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- STAFF SHIFTS
CREATE TABLE public.staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  shift_role text,
  notes text,
  handoff_notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_shifts TO authenticated;
GRANT ALL ON public.staff_shifts TO service_role;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view shifts" ON public.staff_shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage own shift handoff" ON public.staff_shifts FOR UPDATE TO authenticated
  USING (staff_id = auth.uid() OR is_admin(auth.uid()))
  WITH CHECK (staff_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Admins manage shifts" ON public.staff_shifts FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Staff create own shift" ON public.staff_shifts FOR INSERT TO authenticated
  WITH CHECK (staff_id = auth.uid() OR is_admin(auth.uid()));
CREATE TRIGGER staff_shifts_updated BEFORE UPDATE ON public.staff_shifts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RESIDENT DOCUMENTS
CREATE TABLE public.resident_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resident_documents TO authenticated;
GRANT ALL ON public.resident_documents TO service_role;
ALTER TABLE public.resident_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view docs" ON public.resident_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff upload docs" ON public.resident_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Uploader update own docs" ON public.resident_documents FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR is_admin(auth.uid())) WITH CHECK (true);
CREATE POLICY "Admins delete docs" ON public.resident_documents FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit" ON public.audit_logs FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "System inserts audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Generic audit trigger
CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_rec_id uuid;
  v_changes jsonb;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_actor;
  IF TG_OP = 'DELETE' THEN
    v_rec_id := (row_to_json(OLD)->>'id')::uuid;
    v_changes := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    v_rec_id := (row_to_json(NEW)->>'id')::uuid;
    v_changes := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  ELSE
    v_rec_id := (row_to_json(NEW)->>'id')::uuid;
    v_changes := to_jsonb(NEW);
  END IF;
  INSERT INTO public.audit_logs (actor_id, actor_email, action, table_name, record_id, changes)
  VALUES (v_actor, v_email, TG_OP, TG_TABLE_NAME, v_rec_id, v_changes);
  RETURN COALESCE(NEW, OLD);
END $$;

-- Attach audit trigger to key tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'residents','admissions','assessments','treatment_plans','treatment_plan_goals',
    'progress_notes','daily_observations','medication_logs','group_sessions',
    'therapy_sessions','supervision_logs','incidents','transportation_logs',
    'discharges','family_contacts','visitor_logs','staff_shifts','resident_documents',
    'user_roles'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.write_audit_log()', t, t);
  END LOOP;
END $$;

-- Storage policies for resident-documents bucket (bucket created via tool)
CREATE POLICY "Staff read resident docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resident-documents');
CREATE POLICY "Staff upload resident docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resident-documents');
CREATE POLICY "Uploader update resident docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resident-documents' AND (owner = auth.uid() OR is_admin(auth.uid())));
CREATE POLICY "Admins delete resident docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resident-documents' AND is_admin(auth.uid()));
