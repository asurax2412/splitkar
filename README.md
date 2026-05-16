# Splitkar

A free Splitwise-style web app to track shared expenses with friends, split bills four different ways, and settle up — without anyone arguing about who owes what.

**Live:** https://splitkar-brown.vercel.app

---

## Features

- Email + password sign-up (Supabase Auth)
- Create groups (Trip / Home / Couple / Other) and add members by email
- Add an expense with **equal**, **exact**, **percentage**, or **share-based** splits — live preview as you type
- Per-group and overall balance views (who owes whom)
- Record settlements between members ("you paid X ₹500 cash")
- Activity feed of all expenses and payments
- Friends view that surfaces every non-zero balance you have
- Mobile-friendly responsive layout, dark mode support

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Row Level Security | RLS policies in the DB |
| Hosting | Vercel (frontend) + Supabase (backend) |

Money is stored as integer paise (`amount_cents bigint`) so no floats touch the database. Splits are computed by [lib/splits.ts](lib/splits.ts) and distribute rounding remainders fairly so `sum(shares) === total` always holds.

---

## Project structure

```
app/
  (auth)/login, signup           public auth pages
  (app)/                         protected pages, gated by proxy.ts
    dashboard                    overall balance card
    groups, groups/new
    groups/[id]                  group detail with expenses + members
    groups/[id]/expenses/new     add expense, 4 split types
    groups/[id]/settle           record a payment
    friends, activity, account
  actions/                       server actions (mutations)
  auth/callback                  Supabase email-confirmation handler
components/                      UI components + nav + forms
lib/
  supabase/                      browser + server clients
  splits.ts                      split math (equal / exact / % / shares)
  balances.ts                    net balance + debt simplification
  money.ts                       paise <-> rupees helpers
  queries.ts, types.ts, utils.ts
proxy.ts                         route protection (Next 16 successor to middleware.ts)
supabase/migrations/             SQL schema + RLS policies
```

---

## Run locally

You need Node 20+ and a Supabase project.

### 1. Create a Supabase project

1. Sign up at https://supabase.com and create a new project.
2. SQL Editor → **New query** → paste the contents of [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) → **Run**.
3. Settings → **API Keys** → copy the `Project URL` and `Publishable key`.
4. (Dev convenience) Authentication → Sign In / Up → Email → turn **off** "Confirm email" so signups work without inbox roundtrip.

### 2. Configure env vars

```powershell
cp .env.local.example .env.local
# paste the two values from Supabase
```

### 3. Install and run

```powershell
npm install
npm run dev
```

Open http://localhost:3000.

---

## Deploy

The app deploys for free on Vercel.

1. Push to GitHub.
2. Import the repo at https://vercel.com/new — framework is auto-detected as Next.js.
3. Add the two env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) under Environment Variables.
4. Click Deploy.
5. In Supabase → Authentication → URL Configuration, set **Site URL** and add **Redirect URLs** for the Vercel URL (and `/auth/callback`). Without this, email-confirmation links won't work on the live site.

Every push to `main` triggers a fresh deploy.

---

## Inspecting data

While developing, the Supabase dashboard is the easiest way to look at the DB:

- **Table Editor** — point-and-click view of every row in `profiles`, `groups`, `expenses`, etc. Remember amounts are in paise (divide by 100 for rupees).
- **SQL Editor** — run ad-hoc queries. Example:

  ```sql
  select e.description, e.amount_cents / 100.0 as rupees,
         p.full_name as paid_by, e.expense_date
  from expenses e
  join profiles p on p.id = e.paid_by
  order by e.expense_date desc;
  ```

- **Direct connection** — use the Postgres connection string from Settings → Database with any client (DBeaver, TablePlus, psql).

---

## Database schema (short version)

- `profiles` — one row per signed-up user, auto-created from `auth.users` via trigger
- `groups` — id, name, type, default_currency, created_by
- `group_members` — many-to-many between users and groups
- `expenses` — paid_by, amount_cents, currency, split_type, expense_date, group_id (soft-deleted via `deleted_at`)
- `expense_shares` — per-user share for each expense, always sums to the parent amount
- `payments` — settle-up records between two users in a group

RLS enforces that you can only read/write rows in groups you're a member of. A `security definer` helper function (`is_group_member`) is used in policies to avoid recursive RLS evaluation.

---

## Known limitations / not built yet

- No receipt image upload (Supabase Storage bucket exists in the free tier — easy add)
- No realtime balance updates (would use Supabase realtime subscriptions)
- No push notifications
- No multi-currency conversion (group has one default currency)
- Debt simplification logic is implemented in [lib/balances.ts](lib/balances.ts) but no UI button yet
- No 1-on-1 (non-group) expenses

---

## License

MIT — feel free to fork and ship your own version.
