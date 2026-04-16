# User/Profile Next Steps for Supabase auth.users Integration

## Objective

Use Supabase `auth.users` as the only identity source and keep local tables for application data only.

## Current gap (from schema)

`User` still contains local-auth fields:
- `passwordHash`
- `emailVerified`
- `email`

With Supabase Auth, these should not exist in your app database at all.

## Target data model

1. Keep `users.id` as UUID that equals Supabase `auth.users.id` (`sub` claim).
2. Keep `profiles.user_id` linked to local `users.id`.
3. Remove local auth-identity fields from `users`:
   - `passwordHash`
   - `emailVerified`
   - `email`
4. Keep identity/account email state only in Supabase `auth.users`.

## API rules to enforce

1. Never accept `userId` for user-owned writes from request body.
2. Resolve authenticated user from JWT only (`request.user.sub`).
3. Make profile endpoints user-centric:
   - `GET /profile/me`
   - `POST /profile/me`
   - `PATCH /profile/me`
4. Keep email verification decision from Supabase claims only (already implemented in guard).

## Why remove id-based profile routes even with guards

`@UseGuards(SupabaseAuthGuard, EmailVerifiedGuard)` confirms authentication and verification, but it does not enforce ownership boundaries by itself.

If endpoints stay as `findOne(:id)` / `patch(:id)` / `delete(:id)`, any authenticated user can attempt another user's profile id unless each handler/service performs explicit ownership checks.

Using `/profile/me` removes this entire class of mistakes and keeps ownership tied to JWT `sub` by design.

## Migration plan (safe order)

### Phase 1: Backend behavior first (no schema break)

1. Update Profile controller/service to scope all operations to authenticated user id (`sub`).
2. Replace id-based endpoints for normal-user flow (`findAll`, `findOne(:id)`, `patch(:id)`, `delete(:id)`) with `/me` endpoints.
3. Ensure DTOs do not accept/require `userId` from client.

### Phase 2: Data alignment

1. Ensure each active Supabase user has matching `users.id` row.
2. Backfill missing local users keyed by Supabase UUID.
3. Verify every `profiles.user_id` points to an existing local `users.id`.

### Phase 3: Schema cleanup

1. Create Prisma migration to drop:
   - `users.password_hash`
   - `users.email_verified`
   - `users.email`
2. Drop `refresh_tokens` table in this same feature.
3. Regenerate Prisma client and run app tests.

## Suggested task breakdown

1. `feat(profile): scope profile endpoints to authenticated user`
2. `refactor(profile): replace id-based routes with /me routes`
3. `chore(db): drop local auth columns and refresh_tokens`
4. `test(api): add e2e coverage for profile ownership and verification`

## Done criteria

- Profile operations are bound to JWT user (`sub`) only.
- Client cannot read/write another user's profile by id.
- Local auth fields are removed from app DB (`passwordHash`, `emailVerified`, `email`).
- `refresh_tokens` table is removed from app DB.
- E2E covers:
  - verified user can create/read/update own profile
  - unverified user receives 403 on protected profile routes
  - cross-user profile access is rejected
