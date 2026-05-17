-- Atomically create a group with the calling user as admin AND add a list of
-- additional member user_ids. Used by the "Create group from selected friends"
-- flow on the Friends page.

create or replace function public.create_group_with_members(
  p_name text,
  p_type text,
  p_currency text,
  p_member_ids uuid[]
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
  v_member uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

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

  if p_member_ids is not null then
    foreach v_member in array p_member_ids loop
      if v_member <> v_uid then
        insert into public.group_members (group_id, user_id, role)
        values (v_group_id, v_member, 'member')
        on conflict (group_id, user_id) do nothing;
      end if;
    end loop;
  end if;

  return v_group_id;
end;
$$;

grant execute on function public.create_group_with_members(text, text, text, uuid[])
  to authenticated;
