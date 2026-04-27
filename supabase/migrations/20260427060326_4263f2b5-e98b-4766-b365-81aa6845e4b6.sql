-- Create or update the staff@gymli.com user with the provided password
DO $$
DECLARE
  staff_uid uuid;
  hashed_password text;
BEGIN
  -- Hash the password using bcrypt (crypt with gen_salt 'bf')
  hashed_password := crypt('Kmc@130606', gen_salt('bf'));

  SELECT id INTO staff_uid FROM auth.users WHERE email = 'staff@gymli.com' LIMIT 1;

  IF staff_uid IS NULL THEN
    -- Create new confirmed user
    staff_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      staff_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'staff@gymli.com',
      hashed_password,
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Staff Gymli"}'::jsonb,
      false,
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      staff_uid,
      jsonb_build_object('sub', staff_uid::text, 'email', 'staff@gymli.com', 'email_verified', true),
      'email',
      staff_uid::text,
      now(),
      now(),
      now()
    );
  ELSE
    -- Update existing user password and ensure email is confirmed
    UPDATE auth.users
    SET encrypted_password = hashed_password,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = staff_uid;
  END IF;

  -- Ensure permissions are in place (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (staff_uid, 'super_admin')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.staff_members (user_id, role, full_name, active)
  VALUES (staff_uid, 'owner', 'Staff Gymli', true)
  ON CONFLICT DO NOTHING;
END $$;