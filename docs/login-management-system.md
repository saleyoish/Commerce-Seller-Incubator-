# Login & Authentication Management System

> Live Commerce Platform — complete reference for how authentication, sessions, roles, and access control work end-to-end.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Supabase Client Architecture](#2-supabase-client-architecture)
3. [Session Storage & Cookie Handling](#3-session-storage--cookie-handling)
4. [User Roles](#4-user-roles)
5. [Signup Flow](#5-signup-flow)
6. [Admin Approval Flow](#6-admin-approval-flow)
7. [Login Flow](#7-login-flow)
8. [Route Protection & Auth Guards](#8-route-protection--auth-guards)
9. [Password Reset Flow](#9-password-reset-flow)
10. [Logout](#10-logout)
11. [Account Management (Server Actions)](#11-account-management-server-actions)
12. [Admin Management](#12-admin-management)
13. [Database Schema — Auth Tables](#13-database-schema--auth-tables)
14. [Email Notifications](#14-email-notifications)
15. [Environment Variables](#15-environment-variables)
16. [Known Gaps & Issues](#16-known-gaps--issues)

---

## 1. Overview

The platform uses **Supabase Auth** as its sole authentication provider. There is no NextAuth, Clerk, Passport, or custom JWT implementation.

Sessions are **cookie-based** — Supabase's `@supabase/ssr` package automatically handles token storage in HTTP cookies and refreshes them transparently. No middleware file (`middleware.ts`) exists; all route protection is implemented inside layout Server Components or a client-side `AuthWrapper` component.

There are three user roles — **Admin**, **Seller**, and unauthenticated/public. Roles are determined by the presence of a row in the `admins` or `sellers` Postgres table, not by JWT claims.

### High-Level Auth Flow

```
Public user
  └─► /signup (waitlist form)
        └─► POST /api/waitlist-signup
              ├── Creates auth user (email auto-confirmed, password admin-generated)
              ├── Creates sellers row (approval_status = 'pending')
              └── Sends "pending approval" email to seller

Admin approves via /admin/waitlist
  └─► POST /api/admin/approve-seller
        ├── Generates new password
        ├── Updates auth user password
        └── Emails credentials to seller

Seller receives email → visits /login
  └─► signInWithPassword()
        ├── Checks approval_status (client-side gate)
        └─► Redirects to /seller dashboard

Admin logs in → Redirects to /admin dashboard
```

---

## 2. Supabase Client Architecture

Three separate Supabase client instances are used throughout the codebase, each serving a distinct purpose:

| Client | File | Key Used | Where Used |
|--------|------|----------|-----------|
| **Browser client** | `lib/supabase-client.ts` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client Components, login page, password reset page |
| **Server client** | `lib/supabase-server.ts` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Server Components, API routes (respects RLS) |
| **Admin client** | `lib/supabase-admin.ts` | `SUPABASE_SECRET_KEY` (service role) | Admin API routes only — bypasses all RLS |

### Browser Client (`lib/supabase-client.ts`)

Created via `createBrowserClient` from `@supabase/ssr`. Reads and writes cookies through `document.cookie` directly. Sets `Secure` and `SameSite=Lax` flags in production. Listens to `onAuthStateChange` to catch stale refresh tokens and auto-signs out the user with a redirect to `/login?error=session_expired`.

```ts
export const createClientSideSupabase = () =>
  createBrowserClient(supabaseUrl, supabasePublishableKey, { cookies: { ... } });
```

### Server Client (`lib/supabase-server.ts`)

Created via `createServerClient` from `@supabase/ssr`. Reads and writes cookies through Next.js's `cookies()` store (available in Server Components and API routes). Sets `Secure` in production, `SameSite=lax`. Also exports a middleware variant (`createServerSideSupabaseForMiddleware`) where cookie set/remove are no-ops (currently unused because there is no `middleware.ts`).

```ts
export const createServerSideSupabase = async () => {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabasePublishableKey, { cookies: { ... } });
};
```

### Admin Client (`lib/supabase-admin.ts`)

Created via `createClient` from `@supabase/supabase-js` using the service role key. Session persistence and token auto-refresh are both disabled (`autoRefreshToken: false, persistSession: false`). This client can call `supabase.auth.admin.*` methods and bypasses Postgres Row Level Security entirely.

```ts
export const createAdminSupabase = () =>
  createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
```

---

## 3. Session Storage & Cookie Handling

Supabase stores the auth session as HTTP cookies (named `sb-<project-ref>-auth-token` by default). The cookies contain the JWT access token and a refresh token.

- **Token expiry**: Supabase access tokens expire every hour; the client auto-refreshes them using the refresh token.
- **Production flags**: `Secure` is set in production environments; `SameSite=Lax` is always set.
- **Stale token handling**: The browser client's `onAuthStateChange` listener detects `refresh_token_not_found` or `Invalid Refresh Token` errors and automatically signs the user out, then redirects to `/login?error=session_expired`.

Sessions are validated server-side using `supabase.auth.getUser()` (not `getSession()`, which only reads the local cookie without verifying with the server).

---

## 4. User Roles

Roles are not encoded in JWT claims. They are determined at runtime by querying two Postgres tables.

### Admin

- Has a row in the `admins` table (`user_id` matches `auth.uid()`).
- Full access to all data via RLS admin policies.
- Can access both `/admin` and `/seller` dashboards.

### Seller

- Has a row in the `sellers` table (`user_id` matches `auth.uid()`).
- Can only access their own data via RLS.
- Must have `approval_status = 'approved'` to log in (enforced client-side at login; RLS enforces data isolation regardless).

### Role Checking Utilities (`lib/auth.ts`)

Two helper functions make HTTP calls to the check APIs:

```ts
// Returns true/false
checkIsAdmin(): Promise<boolean>
  → GET /api/auth/check-admin

// Returns full status object
checkUserStatus(): Promise<{ isSeller, isAdmin, seller, user }>
  → GET /api/auth/check-user
```

---

## 5. Signup Flow

**Entry point**: `/signup` page (client component) → `POST /api/waitlist-signup`

The signup page is a waitlist application form, not a traditional self-service registration. Users cannot set their own password.

### Step-by-Step

1. User fills out the waitlist form: name, email, phone, what they sell, live experience, and consent.
2. Optionally captures a referral code from the URL `?ref=CODE` query param or from a `referral_code` cookie.
3. The form submits to `POST /api/waitlist-signup`.

**Inside `/api/waitlist-signup`:**

4. Validates required fields.
5. Checks for duplicate email in both `auth.users` and `waitlist` tables.
6. **Admin client** generates a 12-character random password via `generatePassword()` in `lib/gmail.ts`.
7. Creates auth user via `supabase.auth.admin.createUser({ email, password, email_confirm: true })`. Email is auto-confirmed — no email verification step.
8. If the auth user already exists (re-submission), regenerates and updates their password instead.
9. Inserts a row into the `waitlist` table with `status: 'pending'`.
10. Inserts a row into the `sellers` table with `approval_status: 'pending'` and `stripe_onboarding_status: 'pending'`.
11. If a referral code was present, looks up the referrer in `sellers.referral_code` and creates a `referrals` row.
12. Sends a "your account is pending approval" email to the seller via Gmail/Nodemailer (no credentials included yet).
13. Sends a new-seller notification email to all admins in the `admins` table.

**Note**: There is also a `/api/auth/signup` route, but the signup page does not call it. That route is unused.

### Password Generation

```ts
// lib/gmail.ts
export const generatePassword = (length = 12): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  // ... random selection
};
```

---

## 6. Admin Approval Flow

**Trigger**: Admin visits `/admin/waitlist`, reviews pending sellers, and clicks Approve or Reject.

**Endpoint**: `POST /api/admin/approve-seller`

### Approval Steps

1. Verifies the caller has an active session and a row in the `admins` table.
2. Fetches the seller record by `sellerId`.
3. Updates `sellers.approval_status` to `'approved'` (or `'rejected'`).
4. **On approval only**:
   - Generates a new password via `generatePassword()`.
   - Updates the seller's Supabase auth password: `adminSupabase.auth.admin.updateUserById(user_id, { password })`.
   - Sends an approval email to the seller via Gmail containing their email address and the new password.
   - Checks the `referrals` table for any referral tied to this seller and sends a referral bonus notification email to the referrer.

The seller can now log in using the credentials from the approval email.

---

## 7. Login Flow

**Page**: `/login` (client component)

Validation is handled client-side using `react-hook-form` + `zod`:
```ts
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

### Step-by-Step

1. User submits email and password.
2. Calls `supabase.auth.signInWithPassword({ email, password })` using the browser client.
3. On Supabase auth error → displays the error message.
4. On success, queries the `admins` table client-side: `SELECT id FROM admins WHERE email = ?`.
5. **If admin**: skips approval check, redirects to `/admin`.
6. **If not admin**: queries `sellers` table: `SELECT approval_status FROM sellers WHERE email = ?`.
   - If `approval_status !== 'approved'` → throws "You are not approved yet" error, which signs the auth session out implicitly (the user stays on the login page).
   - If approved → redirects to `/seller`.

> **Important**: The approval check at step 6 is client-side JavaScript only. An attacker who can manually set cookies won't be blocked by this check. The real data security is enforced by Postgres RLS which only exposes seller data to the authenticated `user_id` owner.

---

## 8. Route Protection & Auth Guards

There is no `middleware.ts` in this project. Protection runs inside layout components.

### Admin Dashboard — `app/admin/layout.tsx` (Server Component)

```ts
const supabase = await createServerSideSupabase();
const { data: { user } } = await supabase.auth.getUser();

if (!user) redirect('/login?redirect=/admin');

const { data: admin } = await supabase
  .from('admins').select('id').eq('user_id', user.id).single();

if (!admin) redirect('/dashboard'); // Non-admins sent to seller dashboard
```

### Seller Dashboard — `app/seller/layout.tsx` (Server Component + Client Wrapper)

The seller layout uses a **client-side** `AuthWrapper` component:

```ts
// components/seller/AuthWrapper.tsx
useEffect(() => {
  const supabase = createClientSideSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) router.push('/login?redirect=/seller');
}, []);
```

### Old Seller Dashboard — `app/dashboard/layout.tsx` (Server Component)

```ts
// Server-side check
if (!user) redirect('/login?redirect=/dashboard');
// Also checks admin status to show "Switch to Admin" button
```

### API Routes

API routes that require admin access manually verify inside the handler:
```ts
const { data: admin } = await supabase.from('admins').select('id').eq('user_id', user.id).single();
if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
```

---

## 9. Password Reset Flow

### Step 1 — Request Reset

**Page**: `/forgot-password`

User enters their email and submits the form, which calls `POST /api/auth/reset-password` with:
```json
{ "email": "user@example.com", "redirectTo": "https://yourdomain.com/reset-password" }
```

**Inside `/api/auth/reset-password`:**

- If `SUPABASE_SECRET_KEY` is set (preferred): uses the admin client to call `auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })`. This bypasses Supabase's email rate limits.
- Falls back to SSR client `supabase.auth.resetPasswordForEmail(email, { redirectTo })` if the service key is missing (subject to rate limits).
- The generated magic link is sent via **Resend** (`lib/resend.ts`), not Supabase's built-in email system. This requires `RESEND_API_KEY` to be configured.

The link expires in 1 hour.

### Step 2 — Set New Password

**Page**: `/reset-password`

1. On mount, reads `access_token`, `refresh_token`, and `type` from the URL hash fragment (`#access_token=...`).
2. Verifies `type === 'recovery'`.
3. Calls `supabase.auth.setSession({ access_token, refresh_token })` to establish a temporary auth session.
4. User enters and confirms their new password (minimum 6 characters).
5. Calls `supabase.auth.updateUser({ password: newPassword })`.
6. Calls `supabase.auth.signOut()` to clear the recovery session.
7. Redirects to `/login` after 2 seconds.

---

## 10. Logout

Two separate logout mechanisms exist:

### Via Route Handler — `app/logout/route.ts`

Used by the seller dashboard (`/dashboard`) layout via a `<Link href="/logout">` button.

```ts
export async function GET() {
  const supabase = await createServerSideSupabase();
  await supabase.auth.signOut();
  redirect('/login');
}
```

### Via API Route — `app/api/auth/logout/route.ts`

Used by the admin layout via `<form action="/api/auth/logout" method="POST">`.

```ts
export async function POST() {
  const supabase = createClientSideSupabase(); // ⚠ uses browser client in a route handler
  await supabase.auth.signOut();
  return NextResponse.redirect('/login?loggedOut=true');
}
```

> **Note**: Using the browser client (`createClientSideSupabase`) inside a Route Handler is unconventional and may not reliably clear the server-side session cookie. The `app/logout/route.ts` approach using the server client is the correct pattern.

---

## 11. Account Management (Server Actions)

Defined in `app/actions.ts` as Next.js Server Actions (`"use server"`).

### `updateAccountAction(data)`

Updates the authenticated user's account details:

| Field | Supabase Call | Notes |
|-------|--------------|-------|
| `name` | `auth.updateUser({ data: { full_name } })` | Stored in user metadata |
| `email` | `auth.updateUser({ email })` | Triggers Supabase email confirmation |
| `newPassword` | `auth.updateUser({ password })` | `currentPassword` field is accepted but NOT verified server-side |
| `phone` | `sellers` table UPDATE | Not in auth, only in sellers row |

Also invalidates the `/dashboard/settings` page cache via `revalidatePath`.

### `deleteAccountAction()`

1. Gets current user via server Supabase.
2. Creates an inline admin client using `SUPABASE_SERVICE_ROLE_KEY` (note: this is a **different** env variable name than `SUPABASE_SECRET_KEY` used everywhere else).
3. Calls `auth.admin.deleteUser(user.id)`.
4. Signs the user out.

> The `sellers` row is not explicitly deleted here — it is removed by the `ON DELETE CASCADE` on `sellers.user_id → auth.users.id`.

---

## 12. Admin Management

### Creating an Admin — `POST /api/admin/create-admin`

Protected by a secret header: `x-admin-secret: <ADMIN_CREATE_SECRET>` (env variable).

1. Creates an auth user if one does not already exist for the given email.
2. Inserts a row into the `admins` table.
3. If the user was already an admin, returns an idempotent success.

### Deleting a Seller — `POST /api/admin/delete-seller`

Verifies admin status, then performs a cascading deletion in order:

1. `stream_sessions` where `seller_id = ?`
2. `products` where `seller_id = ?`
3. `platform_connections` where `seller_id = ?`
4. `tiktok_shop_connections` where `seller_id = ?`
5. `referrals` where `referrer_id = seller.user_id`
6. `sales` where `seller_id = ?`
7. `sellers` where `id = ?`
8. `auth.admin.deleteUser(seller.user_id)` — removes the auth account

---

## 13. Database Schema — Auth Tables

From `schemas/m1-schema.sql`:

### `admins`

```sql
CREATE TABLE admins (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS Policy**: Users can only `SELECT` their own row (`auth.uid() = user_id`). No INSERT/UPDATE/DELETE via RLS — admin rows are only created by the `/api/admin/create-admin` route using the service role client.

### `sellers`

```sql
CREATE TABLE sellers (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email                   TEXT NOT NULL,
  phone                   TEXT NOT NULL,
  stripe_account_id       TEXT,
  stripe_onboarding_status TEXT DEFAULT 'pending',  -- pending | active | rejected
  approval_status         TEXT DEFAULT 'pending',   -- pending | approved | rejected
  stream_embed_url        TEXT,
  schedule_text           TEXT,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS Policies**:
- Sellers can `SELECT`, `INSERT`, and `UPDATE` their own row.
- Admins have full `ALL` access via: `EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())`.

### Helper Function

```sql
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = user_uuid);
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 14. Email Notifications

Two email services are used for different purposes:

### Gmail via Nodemailer (`lib/gmail.ts`)

Used for transactional seller emails. Configured with a Gmail App Password.

| Trigger | Template | Recipient |
|---------|----------|-----------|
| Waitlist signup | "Account created, pending approval" | Seller |
| Waitlist signup | "New seller registration, approval required" | All admins |
| Admin approves seller | "Account approved — login credentials" (includes password) | Seller |
| Admin approves seller (with referral) | "Your referral was approved, bonus earned" | Referrer seller |

### Resend (`lib/resend.ts`)

Used for password reset emails.

| Trigger | Template |
|---------|----------|
| `/api/auth/reset-password` | Password reset link |

---

## 15. Environment Variables

All auth-relevant variables from `.env.example`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...   # Safe for client — anon key
SUPABASE_SECRET_KEY=eyJ...                    # Service role key — server only, never expose

# Email — password reset
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com

# Email — seller notifications
GMAIL_USER=youremail@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx        # 16-character Google App Password

# Site URL (used in reset link redirectTo)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Admin bootstrapping
ADMIN_CREATE_SECRET=your-secret-key           # Header value for /api/admin/create-admin
ADMIN_EMAIL=admin@example.com
```

> **Security note**: `lib/gmail.ts` currently has fallback hardcoded credentials as defaults. These should be removed and the env variables made mandatory.

---

## 16. Known Gaps & Issues

| Issue | Location | Impact |
|-------|----------|--------|
| No `middleware.ts` | Project root | All route protection runs in layout components or client-side. Direct API calls from non-browser clients can reach unprotected routes. RLS is the last line of defense. |
| Approval check is client-side only | `app/login/page.tsx` | An authenticated but unapproved seller could potentially access seller routes if the auth guard in the layout doesn't re-check `approval_status`. |
| `updateAccountAction` does not verify `currentPassword` | `app/actions.ts` | Any authenticated seller can change their password without confirming the current one. |
| `deleteAccountAction` uses `SUPABASE_SERVICE_ROLE_KEY` | `app/actions.ts` | All other admin clients use `SUPABASE_SECRET_KEY`. If only `SUPABASE_SECRET_KEY` is set, account deletion will fail silently. |
| Logout uses browser client in a Route Handler | `app/api/auth/logout/route.ts` | May not reliably clear the server-side session cookie. Use `createServerSideSupabase` instead. |
| `/api/auth/signup` route is unused | `app/api/auth/signup/route.ts` | Dead code — actual signup goes through `/api/waitlist-signup`. |
| Gmail credentials have hardcoded fallbacks | `lib/gmail.ts` | If env vars are missing, the hardcoded credentials are used silently. |
