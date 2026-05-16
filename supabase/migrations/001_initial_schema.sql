-- Splitkar initial schema
-- Run this in Supabase SQL editor (paste the whole file).

-- =========================================================================
-- TABLES
-- =========================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  default_currency text not null default 'INR',
  created_at timestamptz not null default now()
);

do $$ begin
  create type group_type as enum ('trip', 'home', 'couple', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type split_type as enum ('equal', 'exact', 'percentage', 'shares');
exception when duplicate_object then null; end $$;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type group_type not null default 'other',
  avatar_url text,
  default_currency text not null default 'INR',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  paid_by uuid not null references public.profiles(id),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'INR',
  description text not null,
  category text,
  expense_date date not null default current_date,
  split_type split_type not null default 'equal',
  receipt_url text,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists expenses_group_idx on public.expenses(group_id, expense_date desc);

create table if not exists public.expense_shares (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  share_cents bigint not null,
  primary key (expense_id, user_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  from_user uuid not null references public.profiles(id),
  to_user uuid not null references public.profiles(id),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'INR',
  note text,
  paid_at date not null default current_date,
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);

create index if not exists payments_group_idx on public.payments(group_id, paid_at desc);

create table if not exists public.group_invites (
  token text primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

create index if not exists group_invites_group_idx on public.group_invites(group_id);

-- =========================================================================
-- TRIGGERS
-- =========================================================================

-- Auto-create profile when a user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- SECURITY DEFINER HELPERS (avoid RLS recursion)
-- =========================================================================

create or replace function public.is_group_member(g_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = g_id and user_id = auth.uid()
  );
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

alter table public.profiles        enable row level security;
alter table public.groups          enable row level security;
alter table public.group_members   enable row level security;
alter table public.expenses        enable row level security;
alter table public.expense_shares  enable row level security;
alter table public.payments        enable row level security;
alter table public.group_invites   enable row level security;

-- profiles: anyone authenticated can read (needed to look up friends by email),
-- only the owner can update.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- groups: members can read; creator inserts; members can update.
drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups
  for select to authenticated using (public.is_group_member(id));

drop policy if exists "groups_insert" on public.groups;
create policy "groups_insert" on public.groups
  for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "groups_update_member" on public.groups;
create policy "groups_update_member" on public.groups
  for update to authenticated using (public.is_group_member(id));

drop policy if exists "groups_delete_creator" on public.groups;
create policy "groups_delete_creator" on public.groups
  for delete to authenticated using (auth.uid() = created_by);

-- group_members
drop policy if exists "members_select" on public.group_members;
create policy "members_select" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));

-- Inserts allowed if: you're adding yourself to a group you just created,
-- OR you're an existing member adding someone else.
drop policy if exists "members_insert" on public.group_members;
create policy "members_insert" on public.group_members
  for insert to authenticated with check (
    user_id = auth.uid() or public.is_group_member(group_id)
  );

drop policy if exists "members_delete" on public.group_members;
create policy "members_delete" on public.group_members
  for delete to authenticated using (
    user_id = auth.uid() or public.is_group_member(group_id)
  );

-- expenses
drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses
  for insert to authenticated with check (
    public.is_group_member(group_id) and created_by = auth.uid()
  );

drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses
  for update to authenticated using (public.is_group_member(group_id));

drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses
  for delete to authenticated using (public.is_group_member(group_id));

-- expense_shares: visible / writable if you can see the parent expense.
drop policy if exists "shares_select" on public.expense_shares;
create policy "shares_select" on public.expense_shares
  for select to authenticated using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

drop policy if exists "shares_insert" on public.expense_shares;
create policy "shares_insert" on public.expense_shares
  for insert to authenticated with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

drop policy if exists "shares_delete" on public.expense_shares;
create policy "shares_delete" on public.expense_shares
  for delete to authenticated using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

-- payments
drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select to authenticated using (
    (group_id is not null and public.is_group_member(group_id))
    or from_user = auth.uid()
    or to_user = auth.uid()
  );

drop policy if exists "payments_insert" on public.payments;
create policy "payments_insert" on public.payments
  for insert to authenticated with check (
    (from_user = auth.uid() or to_user = auth.uid())
    and (group_id is null or public.is_group_member(group_id))
  );

drop policy if exists "payments_delete" on public.payments;
create policy "payments_delete" on public.payments
  for delete to authenticated using (
    from_user = auth.uid() or to_user = auth.uid()
  );

-- group_invites: only members can list/create/revoke invites for their group.
-- Non-members never read directly — they hit the security-definer RPCs below.
drop policy if exists "invites_select_member" on public.group_invites;
create policy "invites_select_member" on public.group_invites
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "invites_insert_member" on public.group_invites;
create policy "invites_insert_member" on public.group_invites
  for insert to authenticated with check (
    public.is_group_member(group_id) and created_by = auth.uid()
  );

drop policy if exists "invites_update_member" on public.group_invites;
create policy "invites_update_member" on public.group_invites
  for update to authenticated using (public.is_group_member(group_id));

-- =========================================================================
-- INVITE RPCs (security definer — let non-members read/accept by token only)
-- =========================================================================

-- Peek at an invite (group name + member count) so the /invite page can render
-- before the user has joined. Returns null if token is invalid/expired/revoked.
create or replace function public.preview_group_invite(invite_token text)
returns table (group_id uuid, group_name text, group_type text, member_count int)
language sql
security definer
stable
set search_path = public
as $$
  select g.id, g.name, g.type::text,
    (select count(*)::int from public.group_members where group_members.group_id = g.id)
  from public.group_invites i
  join public.groups g on g.id = i.group_id
  where i.token = invite_token
    and i.revoked_at is null
    and (i.expires_at is null or i.expires_at > now());
$$;

grant execute on function public.preview_group_invite(text) to authenticated, anon;

-- Accept the invite as the calling user. Adds them to group_members if not
-- already a member. Returns the group_id on success, raises on bad token.
create or replace function public.accept_group_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select group_id into v_group_id
  from public.group_invites
  where token = invite_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if v_group_id is null then
    raise exception 'invite is invalid, revoked, or expired';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_uid, 'member')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

grant execute on function public.accept_group_invite(text) to authenticated;
