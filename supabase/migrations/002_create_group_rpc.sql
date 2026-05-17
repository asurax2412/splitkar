-- Atomically create a group with the calling user as admin.
-- Runs as security definer so it sidesteps RLS for the multi-row insert,
-- but uses auth.uid() internally to identify the caller.

create or replace function public.create_group_with_admin(
  p_name text,
  p_type text,
  p_currency text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_group_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Self-heal: ensure the profile row exists before FK references hit it.
  select email,
         coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
    into v_email, v_name
    from auth.users
    where id = v_uid;

  insert into public.profiles (id, email, full_name)
  values (v_uid, v_email, v_name)
  on conflict (id) do nothing;

  insert into public.groups (name, type, default_currency, created_by)
  values (p_name, p_type::group_type, p_currency, v_uid)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_uid, 'admin');

  return v_group_id;
end;
$$;

grant execute on function public.create_group_with_admin(text, text, text)
  to authenticated;
