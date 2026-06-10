# Login Debugging Guide

This document describes the full login/auth setup used by the app router, with exact file paths, expected behavior, and production-vs-local checks.

## Overview

The login flow uses:
- `app/login/page.tsx` for the login form
- `lib/supabase-client.ts` for the browser Supabase client
- `lib/supabase-server.ts` for server-side Supabase with cookie handling
- `lib/cookie-config.ts` for environment-aware cookie options
- `app/api/auth/logout/route.ts` for sign-out
- `app/api/auth/reset-password/route.ts` for password reset fallback cookie behavior

The main bug surface is cookie handling in production:
- production requires `secure: true`
- production requires `sameSite: none` for third-party auth cookies
- production requires the right `domain`/`path` and response `Set-Cookie` headers

## Environment setup

Expected env vars:
- `NEXT_PUBLIC_SITE_URL=https://www.isellish.com`
- `NODE_ENV=production`
- `NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`
- `SUPABASE_SECRET_KEY=...` or service role key for some admin actions

Local development uses HTTP and `NODE_ENV=development` by default.
Production uses HTTPS and `NODE_ENV=production`.

### Important production validation

If you want to reproduce the production bug locally, do NOT rely on plain `http://localhost:3000` because secure cookies will behave differently.

To debug production-like behavior locally:
1. Run over HTTPS or use a secure tunnel (`https://`) such as `ngrok`, `localtunnel`, or `vercel dev`.
2. Use `NODE_ENV=production`.
3. Use `NEXT_PUBLIC_SITE_URL` set to the actual production domain or the tunnel URL.
4. Confirm cookies are set with `SameSite=None; Secure`.

## Login flow step-by-step

### 1. Login form submit

File: `app/login/page.tsx`

The login page does:
- create a browser client using `createClientSideSupabase()`
- call `supabase.auth.signInWithPassword({ email, password })`
- wait 1 second for the session to settle
- navigate to `/seller`

Expected behavior:
- Supabase sends credentials to its auth endpoint
- browser receives auth cookies from Supabase
- `window.location.href = '/seller'` triggers a new request with cookies

### 2. Browser Supabase client

File: `lib/supabase-client.ts`

This creates the browser Supabase client:
- `createBrowserClient(supabaseUrl, supabasePublishableKey, { global: headers })`

Notes:
- `createBrowserClient` is responsible for managing auth cookies in the browser.
- It should use the browser's default cookie behavior for same-origin requests.
- If your deployment domain is cross-origin relative to Supabase, the cookie must be set with `SameSite=None` and `Secure`.

### 3. Cookie config

File: `lib/cookie-config.ts`

This is the shared cookie policy.

Expected values:
- `NODE_ENV=development`:
  - `sameSite: 'lax'`
  - `secure: false`
- `NODE_ENV=production`:
  - `sameSite: 'none'`
  - `secure: true`
  - `httpOnly: true`
  - `path: '/'`

If production is still setting `SameSite=lax`, then either:
- `NODE_ENV` is not actually `production` in the runtime environment
- the response is being built without the shared cookie config
- the browser is ignoring the cookie because it is not secure or lacks `SameSite=None`

### 4. Server-side Supabase auth cookie handling

File: `lib/supabase-server.ts`

This function is used by server components and API routes.
It reads request cookies via `cookies()` and sets updated cookies via `cookieStore.set(...)`.

Expected behavior:
- `getAll()` returns the incoming request cookies
- `setAll()` applies the shared `getCookieConfig()` values
- in production, cookies written by server-side refresh logic should also use `sameSite:none` and `secure:true`

If production is broken here, check:
- whether `cookies()` returns the expected Supabase cookies
- whether response cookie writes are actually emitted
- whether `SameSite` is being overwritten by a Supabase option

## Expected login debug path

### Primary path

1. `app/login/page.tsx`
   - user submits credentials
   - `createClientSideSupabase()` is called
   - `supabase.auth.signInWithPassword(...)` runs
2. `lib/supabase-client.ts`
   - builds browser client for Supabase auth
3. Supabase auth response
   - browser should receive `Set-Cookie` headers from Supabase
   - cookies should include session tokens
4. Browser redirects to `/seller`
5. `/seller` request reaches the app router
6. server-side routes/components use `lib/supabase-server.ts`
   - `createServerSideSupabase()` reads cookies via `cookies()`
   - auth state is validated

### Supporting cleanup path

- `app/api/auth/logout/route.ts` signs out using `createServerSideSupabase()` and redirects to `/login`
- `app/api/auth/reset-password/route.ts` performs password reset flow and may set cookies in SSR fallback

## Debug checklist

### Step 1: Confirm runtime environment

- Verify `NODE_ENV` in production is actually `production`.
- Verify `NEXT_PUBLIC_SITE_URL` matches the deployed URL exactly.
- Verify the browser is using HTTPS.

### Step 2: Inspect login network request

In browser devtools, check the request from `supabase.auth.signInWithPassword(...)`.

What to verify:
- Response includes `Set-Cookie` headers.
- Cookies in the response have:
  - `SameSite=None`
  - `Secure`
  - `Path=/`
  - `HttpOnly` where expected
- No `SameSite=Lax` on auth tokens in production.

### Step 3: Inspect browser cookie storage

After login, open `Application > Cookies` and verify the auth cookies exist.

Expected cookies:
- `sb-access-token`
- `sb-refresh-token`
- `sb-provider-token` (optional)
- any `sb-...` tokens created by Supabase

If the cookies are missing in production:
- the response never set them
- or the browser rejected them because of `Secure`/`SameSite`/domain mismatch

### Step 4: Confirm next request has cookies

On the redirect to `/seller`, verify the request headers include `Cookie:` with the Supabase tokens.

If not:
- the cookies were not stored
- or they were stored on the wrong domain/path

### Step 5: Confirm server-side cookie reading

If the browser sends cookies but auth still fails, check `lib/supabase-server.ts`:
- ensure `cookies()` returns the cookies
- ensure `setAll()` is not overwriting `sameSite` incorrectly
- ensure `getCookieConfig()` is used for production cookies

### Step 6: Confirm production cookie policy

The file `lib/cookie-config.ts` should return:
```ts
{
  path: '/',
  sameSite: 'none',
  secure: true,
  httpOnly: true,
  maxAge: 3 * 24 * 60 * 60,
}
```
for `NODE_ENV=production`.

### Step 7: Reproduce locally in production mode

To compare local vs production, do this locally:

- Start the app with `NODE_ENV=production`
- Use HTTPS if possible
- Use the production domain or a secure tunnel URL in `NEXT_PUBLIC_SITE_URL`

This is the closest way to reproduce the deployment bug.

## Expected login flow details

File path: `app/login/page.tsx`

```tsx
const supabase = createClientSideSupabase();
const { error: authError } = await supabase.auth.signInWithPassword({
  email: data.email,
  password: data.password,
});
```

If this succeeds, the browser should receive cookies.
Then the page navigates to `/seller`:

```tsx
window.location.href = '/seller';
```

That new request must include the auth cookies.

## Expected cookie handling details

File path: `lib/supabase-server.ts`

```ts
const cookieConfig = getCookieConfig();

return createServerClient(..., {
  cookies: {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, {
          ...options,
          ...cookieConfig,
          path: cookieConfig.path,
        });
      });
    },
  },
});
```

This ensures cookie writes use the shared policy.

## Specific files to inspect

- `app/login/page.tsx`
- `lib/supabase-client.ts`
- `lib/supabase-server.ts`
- `lib/cookie-config.ts`
- `app/api/auth/reset-password/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/ref/[code]/route.ts` (referral cookie path)

## Recommended debug console logs

Add logging at the following files to trace the login and cookie flow.

- `app/login/page.tsx`
  - log submit start and auth success/failure
  - example: `console.log('[LOGIN] submit', { email: data.email })`
  - example: `console.error('[LOGIN] auth error', error)`

- `lib/supabase-client.ts`
  - log auth state changes and token refresh events
  - example: `console.log('[SUPABASE-CLIENT] auth state changed', { event, hasSession: !!session, userId: session?.user?.id })`

- `lib/supabase-server.ts`
  - log when `createServerSideSupabase()` is called
  - log each cookie written by `setAll()` and the effective cookie options
  - example: `console.log('[SUPABASE-SERVER] setAll cookie', { name, options })`

These logs make it easier to compare the deployed runtime behavior with localhost.

## Common production pitfalls

1. `NODE_ENV` is actually not `production` in the deployed runtime.
2. The app is served over HTTP but the cookie requires `Secure`.
3. `NEXT_PUBLIC_SITE_URL` does not match the real host.
4. Browser rejects cookies because `SameSite=None` is missing.
5. The cookie response is being emitted by Supabase but later overwritten by server-side middleware.
6. Local development works because `secure=false` and `sameSite=lax`, but production fails because the cookie policy changes.

## Final advice

- Compare the response `Set-Cookie` headers in local dev vs deployment.
- Confirm the actual runtime `NODE_ENV` and `NEXT_PUBLIC_SITE_URL` on the deployed host.
- Reproduce with HTTPS locally if possible.
- Use the file path list above to match each logical step to actual code.

If you want, I can also add a second document with a minimal reproducer checklist and exact browser devtools commands to capture the broken cookie response in production.