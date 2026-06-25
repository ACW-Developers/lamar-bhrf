
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('administrator', 'bhp', 'bht', 'bhpp');
CREATE TYPE public.resident_status AS ENUM ('active', 'discharged', 'on_leave', 'pending_admission');
CREATE TYPE public.admission_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
CREATE TYPE public.approval_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected');
CREATE TYPE public.incident_status AS ENUM ('reported', 'investigating', 'resolved', 'closed');
CREATE TYPE public.incident_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  avatar_url TEXT,
  on_duty BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'administrator')
$$;

-- ============ PROFILES POLICIES ============
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ USER ROLES POLICIES ============
CREATE POLICY "Staff view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ AUTO PROFILE + ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'bhpp');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ RESIDENTS ============
CREATE TABLE public.residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn TEXT UNIQUE NOT NULL DEFAULT ('LR-' || lpad((floor(random()*1000000))::text, 6, '0')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  primary_diagnosis TEXT,
  substance_history TEXT,
  status resident_status NOT NULL DEFAULT 'pending_admission',
  admission_date DATE,
  discharge_date DATE,
  assigned_bhp UUID REFERENCES public.profiles(id),
  assigned_bht UUID REFERENCES public.profiles(id),
  room_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.residents TO authenticated;
GRANT ALL ON public.residents TO service_role;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view residents" ON public.residents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create residents" ON public.residents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update residents" ON public.residents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete residents" ON public.residents FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER touch_residents BEFORE UPDATE ON public.residents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ ADMISSIONS ============
CREATE TABLE public.admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  intake_date DATE NOT NULL DEFAULT CURRENT_DATE,
  referral_source TEXT,
  presenting_problem TEXT,
  insurance_info TEXT,
  status admission_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admissions TO authenticated;
GRANT ALL ON public.admissions TO service_role;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view admissions" ON public.admissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create admissions" ON public.admissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update admissions" ON public.admissions FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER touch_admissions BEFORE UPDATE ON public.admissions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ ASSESSMENTS ============
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  findings TEXT,
  risk_level TEXT,
  recommendations TEXT,
  status approval_status NOT NULL DEFAULT 'draft',
  signed_by UUID REFERENCES public.profiles(id),
  signed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view assessments" ON public.assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "BHP create assessments" ON public.assessments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'bhp') OR public.is_admin(auth.uid()));
CREATE POLICY "BHP update assessments" ON public.assessments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'bhp') OR public.is_admin(auth.uid()));
CREATE TRIGGER touch_assessments BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ TREATMENT PLANS ============
CREATE TABLE public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  review_date DATE,
  problem_summary TEXT,
  status approval_status NOT NULL DEFAULT 'draft',
  assigned_to UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_plans TO authenticated;
GRANT ALL ON public.treatment_plans TO service_role;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view plans" ON public.treatment_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "BHP manage plans" ON public.treatment_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'bhp') OR public.is_admin(auth.uid())) WITH CHECK (public.has_role(auth.uid(), 'bhp') OR public.is_admin(auth.uid()));
CREATE TRIGGER touch_plans BEFORE UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.treatment_plan_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id UUID NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  objective TEXT,
  intervention TEXT,
  target_date DATE,
  progress_percent INT DEFAULT 0,
  achieved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_plan_goals TO authenticated;
GRANT ALL ON public.treatment_plan_goals TO service_role;
ALTER TABLE public.treatment_plan_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view goals" ON public.treatment_plan_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "BHP manage goals" ON public.treatment_plan_goals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'bhp') OR public.is_admin(auth.uid())) WITH CHECK (public.has_role(auth.uid(), 'bhp') OR public.is_admin(auth.uid()));

-- ============ PROGRESS NOTES ============
CREATE TABLE public.progress_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id),
  author_role app_role,
  signed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_notes TO authenticated;
GRANT ALL ON public.progress_notes TO service_role;
ALTER TABLE public.progress_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view notes" ON public.progress_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create notes" ON public.progress_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Author updates own notes" ON public.progress_notes FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.is_admin(auth.uid()));

-- ============ DAILY OBSERVATIONS ============
CREATE TABLE public.daily_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  observation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT,
  behavior TEXT,
  participation TEXT,
  wellness_check BOOLEAN DEFAULT false,
  adl_support TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_observations TO authenticated;
GRANT ALL ON public.daily_observations TO service_role;
ALTER TABLE public.daily_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view obs" ON public.daily_observations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create obs" ON public.daily_observations FOR INSERT TO authenticated WITH CHECK (true);

-- ============ MEDICATION LOGS ============
CREATE TABLE public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  scheduled_time TIMESTAMPTZ,
  administered_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  refusal_reason TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_logs TO authenticated;
GRANT ALL ON public.medication_logs TO service_role;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view meds" ON public.medication_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage meds" ON public.medication_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ GROUP SESSIONS ============
CREATE TABLE public.group_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  session_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  facilitator_id UUID REFERENCES public.profiles(id),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_sessions TO authenticated;
GRANT ALL ON public.group_sessions TO service_role;
ALTER TABLE public.group_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view groups" ON public.group_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage groups" ON public.group_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.group_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_session_id UUID NOT NULL REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  attended BOOLEAN DEFAULT true,
  participation_level TEXT,
  notes TEXT,
  UNIQUE (group_session_id, resident_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_attendance TO authenticated;
GRANT ALL ON public.group_attendance TO service_role;
ALTER TABLE public.group_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view attendance" ON public.group_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage attendance" ON public.group_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ THERAPY SESSIONS ============
CREATE TABLE public.therapy_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES public.profiles(id),
  session_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes INT DEFAULT 60,
  objectives_addressed TEXT,
  clinical_notes TEXT,
  recommendations TEXT,
  follow_up_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.therapy_sessions TO authenticated;
GRANT ALL ON public.therapy_sessions TO service_role;
ALTER TABLE public.therapy_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view therapy" ON public.therapy_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "BHP manage therapy" ON public.therapy_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'bhp') OR public.is_admin(auth.uid())) WITH CHECK (public.has_role(auth.uid(), 'bhp') OR public.is_admin(auth.uid()));

-- ============ SUPERVISION ============
CREATE TABLE public.supervision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID REFERENCES public.profiles(id),
  supervisee_id UUID REFERENCES public.profiles(id),
  session_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  topics_discussed TEXT,
  feedback TEXT,
  action_items TEXT,
  signed_off_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervision_logs TO authenticated;
GRANT ALL ON public.supervision_logs TO service_role;
ALTER TABLE public.supervision_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view supervision" ON public.supervision_logs FOR SELECT TO authenticated USING (supervisor_id = auth.uid() OR supervisee_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'bhp'));
CREATE POLICY "BHP create supervision" ON public.supervision_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'bhp') OR public.is_admin(auth.uid()));
CREATE POLICY "Supervisor update logs" ON public.supervision_logs FOR UPDATE TO authenticated USING (supervisor_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============ INCIDENTS ============
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  incident_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  incident_type TEXT NOT NULL,
  severity incident_severity NOT NULL DEFAULT 'low',
  description TEXT NOT NULL,
  actions_taken TEXT,
  status incident_status NOT NULL DEFAULT 'reported',
  reported_by UUID REFERENCES public.profiles(id),
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view incidents" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update incidents" ON public.incidents FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER touch_incidents BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ TRANSPORTATION ============
CREATE TABLE public.transportation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  appointment_type TEXT,
  destination TEXT,
  driver_id UUID REFERENCES public.profiles(id),
  vehicle TEXT,
  departure_time TIMESTAMPTZ,
  return_time TIMESTAMPTZ,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transportation_logs TO authenticated;
GRANT ALL ON public.transportation_logs TO service_role;
ALTER TABLE public.transportation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view transport" ON public.transportation_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage transport" ON public.transportation_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
