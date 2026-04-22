# Frontend Auth Completion Instructions

This is the minimum frontend work required to complete the Supabase auth feature.

## 1) Setup Supabase client

1. Install `@supabase/supabase-js`.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to frontend env.
3. Create a reusable browser client helper (for example in `src/lib/supabase.ts`).

## 2) Add required auth routes

Create routes/pages for:
1. `/auth/login`
2. `/auth/signup`
3. `/auth/callback`
4. `/auth/email-unverified`

Expected behavior:
1. Login: email/password sign-in.
2. Signup: create account, show "check your email" message.
3. Callback: resolve session then route verified users to app, unverified users to `/auth/email-unverified`.
4. Email-unverified page: explain requirement and provide resend/continue actions.

## 3) Route protection rules

For every protected page:
1. No session -> redirect to `/auth/login`.
2. Session exists but email unverified -> redirect to `/auth/email-unverified`.
3. Verified session -> allow access.

## 4) API call integration

When calling protected backend routes:
1. Read Supabase access token from current session.
2. Send header `Authorization: Bearer <access_token>`.
3. Centralize this in one API helper so all protected calls are consistent.

## 5) Profile flow completion

After verified login:
1. Call profile endpoint for current user (`/profile/me`).
2. If no profile data, route to profile onboarding form.
3. Allow editing at least:
   - github username
   - resume file URL (or placeholder field until upload is implemented)

## 6) Error handling required

1. 401 from API -> sign out and redirect to login.
2. 403 with verification requirement -> redirect to `/auth/email-unverified`.
3. Session expiration -> refresh session and retry once.

## Definition of done

Frontend auth is done when:
1. Login/signup/callback/email-unverified routes work end-to-end.
2. Protected routes enforce auth + email verification.
3. Protected API requests always include bearer token.
4. User can complete verified login and create/update own profile successfully.
