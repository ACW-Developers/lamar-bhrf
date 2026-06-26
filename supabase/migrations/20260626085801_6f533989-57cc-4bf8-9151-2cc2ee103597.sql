
-- Create admin user with fixed credentials and grant administrator role.
-- Also add admin-wide CRUD policies (delete + update) across clinical tables.

-- 1) Seed admin auth user (idempotent)
DO $$
DECLARE
  v_uid uuid;
  v_email text := 'admin@lamarbhrf.com';
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = v_email;
  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, crypt('0206White!', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name','Lamar Administrator'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      'email', v_uid::text, now(), now(), now());
  ELSE
    UPDATE auth.users SET encrypted_password = crypt('0206White!', gen_salt('bf')), email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now() WHERE id = v_uid;
  END IF;

  -- Ensure profile
  INSERT INTO public.profiles (id, full_name, email, title)
  VALUES (v_uid, 'Lamar Administrator', v_email, 'System Administrator')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

  -- Ensure administrator role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'administrator')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Remove default bhpp role assigned by signup trigger if present
  DELETE FROM public.user_roles WHERE user_id = v_uid AND role = 'bhpp';
END $$;

-- 2) Ensure handle_new_user trigger exists so future signups get profile + default role
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Grant administrators full CRUD across all clinical tables (delete + update where missing)
-- Admin override policies use is_admin(auth.uid())

-- Admissions
DROP POLICY IF EXISTS "Admins full access admissions" ON public.admissions;
CREATE POLICY "Admins full access admissions" ON public.admissions
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access assessments" ON public.assessments;
CREATE POLICY "Admins full access assessments" ON public.assessments
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access daily_observations" ON public.daily_observations;
CREATE POLICY "Admins full access daily_observations" ON public.daily_observations
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access group_sessions" ON public.group_sessions;
CREATE POLICY "Admins full access group_sessions" ON public.group_sessions
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access group_attendance" ON public.group_attendance;
CREATE POLICY "Admins full access group_attendance" ON public.group_attendance
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access incidents" ON public.incidents;
CREATE POLICY "Admins full access incidents" ON public.incidents
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access medication_logs" ON public.medication_logs;
CREATE POLICY "Admins full access medication_logs" ON public.medication_logs
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access progress_notes" ON public.progress_notes;
CREATE POLICY "Admins full access progress_notes" ON public.progress_notes
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access residents" ON public.residents;
CREATE POLICY "Admins full access residents" ON public.residents
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access supervision_logs" ON public.supervision_logs;
CREATE POLICY "Admins full access supervision_logs" ON public.supervision_logs
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access therapy_sessions" ON public.therapy_sessions;
CREATE POLICY "Admins full access therapy_sessions" ON public.therapy_sessions
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access transportation_logs" ON public.transportation_logs;
CREATE POLICY "Admins full access transportation_logs" ON public.transportation_logs
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access treatment_plans" ON public.treatment_plans;
CREATE POLICY "Admins full access treatment_plans" ON public.treatment_plans
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access treatment_plan_goals" ON public.treatment_plan_goals;
CREATE POLICY "Admins full access treatment_plan_goals" ON public.treatment_plan_goals
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Allow admins to remove role assignments (already covered by Admins manage roles ALL policy)
-- Add explicit DELETE policy on user_roles for clarity (no-op if redundant)
DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));
