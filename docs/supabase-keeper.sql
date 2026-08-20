-- ===========================================================================
-- THE KEEPER'S SUPABASE SETUP
--
-- Run this ONCE, whole, in the Supabase dashboard: SQL Editor -> New query ->
-- paste -> Run. It is safe to run again; every statement is idempotent.
--
-- WHAT THIS DOES
--   1. keeper_admins   who is allowed to open the panel
--   2. keeper_secrets  the GitHub token the panel commits with
--   3. Row Level Security so the public anon key cannot read either one
--
-- WHY POINT 3 IS THE WHOLE THING
--
-- The site is a static export, so NEXT_PUBLIC_SUPABASE_ANON_KEY is compiled
-- into JavaScript that anyone can read — and this repository is public
-- besides. That is normal and expected: Supabase's anon key is designed to be
-- published. It is NOT the security boundary. These policies are.
--
-- Without them, the anon key alone would read the GitHub token out of the
-- database, which would be strictly worse than the token-in-localStorage
-- arrangement this replaces. Do not skip to the end.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. WHO MAY OPEN THE PANEL
-- ---------------------------------------------------------------------------
create table if not exists public.keeper_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.keeper_admins enable row level security;


-- ---------------------------------------------------------------------------
-- 2. WHAT THE PANEL NEEDS TO DO ITS JOB
--
-- One row, id = 'github_token'. The panel reads it after sign-in and holds it
-- in memory only — it is never written to browser storage.
-- ---------------------------------------------------------------------------
create table if not exists public.keeper_secrets (
  id         text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.keeper_secrets enable row level security;


-- ---------------------------------------------------------------------------
-- 3. THE POLICIES
--
-- The admin check is a SECURITY DEFINER function rather than a subquery
-- written inline into the policy, and that is load-bearing rather than tidy:
-- a policy on keeper_secrets that selects from keeper_admins would have the
-- admins table's OWN row security applied to that subquery, which recurses.
-- The function runs as its owner, so it reads the table once, cleanly.
--
-- `set search_path = public` is not decoration either — a SECURITY DEFINER
-- function without a pinned search_path can be pointed at an attacker's
-- schema. It is the standard hardening for this pattern.
-- ---------------------------------------------------------------------------
create or replace function public.is_keeper_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.keeper_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_keeper_admin() from public, anon;
grant execute on function public.is_keeper_admin() to authenticated;

-- Admins may read the secret. Nobody may write it from the browser: rotating
-- the token is a deliberate act done here, in the dashboard, not something the
-- panel can be talked into doing.
drop policy if exists "keeper admins read secrets" on public.keeper_secrets;
create policy "keeper admins read secrets"
  on public.keeper_secrets
  for select
  to authenticated
  using (public.is_keeper_admin());

-- An admin may confirm their own membership, and see nobody else's.
drop policy if exists "keeper admins read own row" on public.keeper_admins;
create policy "keeper admins read own row"
  on public.keeper_admins
  for select
  to authenticated
  using (user_id = auth.uid());


-- ===========================================================================
-- NOW DO THESE THREE THINGS BY HAND
-- ===========================================================================
--
-- (a) CREATE THE OWNER'S ACCOUNT
--     Dashboard -> Authentication -> Users -> "Add user" -> "Create new user".
--     Enter the email and a password, and TICK "Auto Confirm User".
--
--     Create it here rather than by signing up through the site: it sends no
--     confirmation email, and it means the panel needs no sign-up screen at
--     all. There is exactly one way in, and it is one you opened deliberately.
--
-- (b) TURN OFF PUBLIC SIGN-UPS
--     Dashboard -> Authentication -> Sign In / Providers -> Email ->
--     disable "Allow new users to sign up".
--
--     Without this, anyone who reads the anon key out of the published
--     JavaScript can create themselves an account. They still could not read
--     the token — the policies above see to that — but there is no reason to
--     let strangers hold accounts on your project.
--
-- (c) FILL IN THE TWO ROWS BELOW and run them.
--
-- ===========================================================================

-- Make that user an admin.
--
-- No email to type in: when the project has exactly ONE account, this finds
-- it. The count guard is the safety — if a second account ever exists, this
-- does nothing rather than quietly handing admin to whoever else signed up.
-- (Which is also why step (b), disabling sign-ups, comes before this.)
insert into public.keeper_admins (user_id, email)
select id, email from auth.users
where (select count(*) from auth.users) = 1
on conflict (user_id) do nothing;

-- If the guard above matched nothing because you have more than one account,
-- name the right one explicitly instead:
--
--   insert into public.keeper_admins (user_id, email)
--   select id, email from auth.users where email = 'you@example.com'
--   on conflict (user_id) do nothing;

-- Store the GitHub token the panel commits with. This is the same
-- fine-grained token the old sign-in screen asked you to paste: it needs
-- Contents: Read and write on pureweightofficial/pw, and nothing else.
insert into public.keeper_secrets (id, value)
values ('github_token', 'REPLACE_WITH_GITHUB_PAT')
on conflict (id) do update
  set value = excluded.value,
      updated_at = now();


-- ---------------------------------------------------------------------------
-- DID IT TAKE? Run this last; it should print one row reading 1 / 1 / t.
--
--   admins  = 1  you are in keeper_admins
--   secrets = 1  the GitHub token is stored
--   rls_on  = t  row security is enabled on the secrets table
--
-- If admins is 0 the guard above found more than one account — use the
-- explicit form. If rls_on is f, STOP: the token is readable by anyone.
select
  (select count(*) from public.keeper_admins)  as admins,
  (select count(*) from public.keeper_secrets) as secrets,
  (select relrowsecurity from pg_class
    where oid = 'public.keeper_secrets'::regclass) as rls_on;


-- ---------------------------------------------------------------------------
-- CHECKING IT PROPERLY
--
-- Run this as an ordinary signed-in user (the SQL editor runs as the owner and
-- bypasses RLS, so it will always succeed here — it proves nothing). The real
-- test is opening /keeper and signing in.
--
--   select * from public.keeper_secrets;
--
-- Expected in the browser: exactly one row for an admin, zero rows for any
-- other signed-in account, and a permission error for an anonymous one.
--
-- ROTATING THE TOKEN LATER: re-run the keeper_secrets insert above with the
-- new value. Nothing in the site needs redeploying; the panel picks it up on
-- the next sign-in.
-- ---------------------------------------------------------------------------
