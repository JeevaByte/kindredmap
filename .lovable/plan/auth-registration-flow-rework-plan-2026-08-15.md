# Auth + Registration Flow Rework — Plan

## A. Current architecture (confirmed from the code)

- Frontend: TanStack Start (file routes in `src/routes`), React Query, Tailwind. No server functions exist yet — all data access is browser-side through the generated backend client with RLS.
- Auth provider: the built-in Lovable Cloud auth (Supabase-based), used entirely client-side from `src/routes/onboarding.tsx`.
- Login mechanism today: `signInWithOtp({ email })` / `signInWithOtp({ phone, channel: "sms" })` plus `verifyOtp(...)`. So the code already requests a **numeric 6-digit code**, and a full 6-box code entry UI (`src/components/OtpInput.tsx`) already exists, with a 45s resend cooldown and expired/invalid-code messaging.
- The magic-link behaviour users see is **not a code problem**: the auth email still renders the default *Magic Link* email template, which prints a URL instead of `{{ .Token }}`. This is a configuration change, not a rewrite.
- Session model: session persisted by the auth client in the browser; `src/routes/__root.tsx` has a single `onAuthStateChange` listener that invalidates router + query cache.
- Route guard: `src/routes/_authenticated/route.tsx` (`ssr: false`) requires a user **and** `isProfileComplete(profile)`, otherwise redirects to `/onboarding`. This is the thing that makes onboarding a hard wall before Home.
- Routes: `/` (public landing, redirects signed-in users to `/map`), `/onboarding` (7-step wizard incl. auth step), `/_authenticated/map` (Home today), `/network`, `/profile`.
- Database: `profiles` (id → auth user, name, avatar_url, area, building_what/for/so, building_line, linkedin_url, phone, onboarded, founder_stage, bio, is_seed) and `connections` (pairwise, pending/confirmed, type, note, photo_url, meet_date, fun_fact) with RLS: profiles readable by any authenticated member, writable only by owner; connections restricted to participants, plus an update-guard trigger. A `handle_new_user` trigger creates the profile row on signup. Storage bucket `meetmap` is private with owner/participant policies.
- Authorization today is RLS-only. There is no backend check of "registration complete" anywhere.

## B. Current user flow

```text
/  landing
 ↓ "I'm in the Circle"
/onboarding
 Level 1 Email or Mobile → send code → 6-digit code → verify (session created)
 Level 2 Name
 Level 3 Avatar (upload or emoji preset)
 Level 4 Mad-lib: building WHAT / for WHO / so they can X
 Level 5 Area (searchable Chennai locality select)
 Level 6 LinkedIn URL
 Level 7 Phone (optional)
 ↓ Finish → writes profile, onboarded = true
/map (Home)   ← guard bounces back to /onboarding unless profile complete
```

## C. Problems with the current flow

1. Auth is buried inside the wizard, so authentication and profile-building are one indivisible blob.
2. Home is unreachable until all 7 levels are done — a 7-screen wall before any value is shown.
3. Completion is inferred by a frontend helper (`isProfileComplete`) checking 7 fields; `profiles.onboarded` exists but is not authoritative and LinkedIn is effectively mandatory despite being labelled optional.
4. No backend enforcement: any client can write a partial profile and read the member directory, because RLS only checks identity, never registration state.
5. Mobile is two unrelated things: an auth channel (verified) and an optional profile text field (unverified) — no link between them.
6. `/onboarding` is both the login screen and the wizard, so signed-out users and half-registered users share one route and one set of edge cases.

## D. Proposed architecture

Split three concerns that are currently fused:

1. **Authentication** — a dedicated public `/auth` route: email → 6-digit code → session. Mobile stays available as an alternative channel on the same screen.
2. **Registration state** — a single authoritative column on `profiles`, `registration_status`, as a Postgres enum (`incomplete` → `complete`), maintained by the database, not the client.
3. **Registration content** — a short "Complete your details" surface reached *from Home*, not before it. Home renders in a limited, read-only mode until registration completes.

The 7 levels become **one screen with grouped fields** (name, photo, the mad-lib line, area) plus optional LinkedIn/phone/bio — reusing the existing components rather than rewriting them.

## E. Proposed user flow

```text
User
 ↓
/auth  email (or mobile)
 ↓
6-digit OTP
 ↓
Authenticated (session)
 ↓
/map  Home — always reachable
 ↓
Registration status check (from profiles.registration_status)
 ↓ incomplete
Complete personal details (single screen / sheet)
 ↓
registration_status = complete  (set by DB rule, not the client)
 ↓
Normal application access (log meets, confirm, network, profiles)
```

## F. Mobile number strategy (recommendation)

- **Do not require both.** Keep the user's chosen channel as their login identity: email OTP is the default, SMS OTP is the alternative on the same screen (both already implemented in code).
- **Collect mobile during registration, optional, unverified** for now. Verified SMS requires an external SMS provider configured on the auth project (Twilio/Vonage/MessageBird) with its own account, sender ID/DLT registration for India, and **per-message cost**. Until that provider is configured, the mobile login toggle will fail at send time.
- If you want a verified mobile on an email-signed-in account later, the correct primitive is `updateUser({ phone })` + `verifyOtp({ type: "phone_change" })`, which attaches the number to the *same* identity instead of creating a second account. That is the only safe way to have one account with both.
- **Duplicate prevention:** identity uniqueness lives in the auth system (one user per verified email, one per verified phone). The risk is a user signing in by email once and by phone later — that creates two accounts. Mitigation: make one channel canonical (email) and treat mobile only as a profile attribute until phone-linking is implemented; additionally add a unique index on normalized `profiles.phone` so two profiles can't claim the same number.
- **Mobile change:** editing the profile phone is a plain profile update. If verified phone-as-login is later enabled, a change must go through `phone_change` OTP; never rewrite the phone silently.

## G. Database changes (to run only after approval)

1. `CREATE TYPE public.registration_status AS ENUM ('incomplete','complete');`
2. `ALTER TABLE public.profiles ADD COLUMN registration_status public.registration_status NOT NULL DEFAULT 'incomplete';`
3. Backfill: set `complete` for every existing row that satisfies today's rule (name, avatar, all three mad-lib parts, area present). LinkedIn deliberately dropped from the requirement — it is optional.
4. A `BEFORE INSERT OR UPDATE` trigger on `profiles` that derives `registration_status` from the required fields, so the client cannot set it directly.
5. Keep `onboarded` as a deprecated column (no drop) and keep it in sync from the same trigger for one release, so nothing that still reads it breaks.
6. Add a helper `public.is_registered(uuid)` (SECURITY DEFINER, stable) so RLS policies can gate writes on registration state.
7. RLS tightening: `connections` INSERT/UPDATE policies gain `AND public.is_registered(auth.uid())`. Profile reads stay open to authenticated members. Optional: restrict directory reads to registered users — decision needed (see P).
8. Indexes: unique index on `lower(btrim(phone))` where phone is not null; index on `registration_status` if we filter the directory by it.
9. No table drops, no FK changes, no destructive data migration.

## H. Authentication configuration changes

- Auth email template (**Magic Link** template) must be edited to send the code, e.g. body `Your Meet Map code is {{ .Token }}` with `{{ .ConfirmationURL }}` removed. This is the actual fix for "it sends a magic link". I'll point you to it in the backend UI; I can't edit templates from code.
- Keep signups enabled, keep email confirmation as-is, keep auto-confirm **off**, no anonymous sign-ins.
- Enable leaked-password protection is irrelevant (no passwords).
- Phone sign-in stays disabled until you decide to pay for an SMS provider; the UI toggle should be hidden while it's off rather than failing at send.

## I. Routing changes

| Route | Change |
| --- | --- |
| `/auth` | **ADD** — public, `ssr: false`: email/mobile → OTP → redirect to `/map`. Extracted from onboarding Level 1. |
| `/onboarding` | **REPLACE** — becomes `/_authenticated/register`: single-screen personal details, reachable only when signed in, never a wall in front of `/auth`. |
| `/_authenticated/route.tsx` | **MODIFY** — drop the `isProfileComplete` redirect; require only a session, redirect to `/auth`. |
| `/_authenticated/map` | **MODIFY** — Home renders for everyone signed in; shows a "Complete your details" banner + limited mode when `registration_status = 'incomplete'`. |
| `/` | **MODIFY** — CTA points to `/auth`; signed-in users still bounce to `/map`. |
| `/network`, `/profile` | **KEEP** structurally; `/network` gets an incomplete-registration prompt. |

## J. Security controls

- OTP generation, hashing, expiry, and single-use are handled by the auth provider — we never generate, store, or log codes. Keep it that way; no `console.log` of code values.
- Retry/brute-force and send-rate limits are provider-side; keep the 45s client resend cooldown as UX, not as the control. If you hit `over_email_send_rate_limit`, we raise the hourly auth-email limit deliberately rather than looping retries.
- Account enumeration: keep generic messaging ("we sent a code to …") and never reveal whether an address exists.
- Session: provider-managed tokens in the browser; sign-out must cancel in-flight queries, clear the query cache, sign out, then navigate with `replace`.
- Authorization: registration gating enforced in the database (RLS + `is_registered`), so typing a URL or calling the API directly cannot bypass it. Frontend gating is UX only.
- Personal data: phone/email are not exposed to other members beyond what profile policies already allow; storage stays private with signed URLs.

## K. Existing-user migration

- Distinguishing new vs existing is purely the backfilled `registration_status`. Anyone whose profile already has name + avatar + mad-lib + area is marked `complete` by the migration and lands straight on Home with full access — no re-onboarding, no data loss.
- Users who stopped mid-wizard keep every field they entered; they land on Home, see the prompt, and the details screen is pre-filled from their existing row.
- Nothing is deleted: `onboarded`, `building_line`, `linkedin_url`, `phone`, `is_seed` all stay.

## L. What happens to the 7-level flow

| Level | Writes | Verdict | Why |
| --- | --- | --- | --- |
| 1 Email/Mobile OTP | creates auth user + `profiles` row via trigger | **REPLACE** → moves to `/auth` | Mandatory business logic; only its location changes. |
| 2 Name | `profiles.name` | **KEEP** (merged into one screen) | Required for the directory. |
| 3 Avatar | `profiles.avatar_url`, storage upload | **KEEP** (merged) | Map/network render avatars. |
| 4 Mad-lib | `building_what/for/so`, `building_line` | **KEEP** (merged) | Core content of founder cards. |
| 5 Area | `profiles.area` | **KEEP** (merged) | Map islands are grouped by area. |
| 6 LinkedIn | `linkedin_url` | **MODIFY** → truly optional | Currently blocks completion despite the "optional" label. |
| 7 Phone | `profiles.phone` | **MODIFY** → optional, part of details screen | Not used by any feature yet. |

Nothing is dropped from the data model; the wizard *chrome* (7-step progress bar, level counter, per-step routing) is what gets removed.

## M. Files that would need modification

| File | Purpose | Expected change | Risk |
| --- | --- | --- | --- |
| `src/routes/auth.tsx` | new sign-in screen | ADD — OTP send/verify lifted from onboarding | Low |
| `src/routes/onboarding.tsx` | current wizard | REPLACE with `_authenticated/register.tsx` | Medium — must preserve prefill + upload logic |
| `src/routes/_authenticated/route.tsx` | route gate | MODIFY — session-only gate, redirect `/auth` | Medium — redirect loops if done wrong |
| `src/routes/_authenticated/map.tsx` | Home | MODIFY — registration banner + limited mode | Low |
| `src/routes/index.tsx` | landing | MODIFY — CTA → `/auth` | Low |
| `src/routes/_authenticated/network.tsx` | connections | MODIFY — prompt when incomplete | Low |
| `src/routes/_authenticated/profile.tsx` | edit profile | MODIFY — share field components with register | Medium |
| `src/lib/meetmap.ts` | helpers | MODIFY — `isProfileComplete` reads `registration_status`, LinkedIn no longer required | Medium — used in several places |
| `src/hooks/use-meetmap.ts` | data hooks | MODIFY — expose registration status | Low |
| `src/components/LogMeetSheet.tsx` | logging meets | MODIFY — block when incomplete | Low |
| migration SQL | schema | ADD enum, column, trigger, backfill, policies, indexes | Medium — needs review before running |
| Auth email template | delivery | CONFIG — code instead of link | Low, manual |

## N. Implementation sequence

1. Migration: enum, `registration_status`, derive-trigger, backfill, `is_registered`, indexes.
2. Update the auth email template to send `{{ .Token }}`; verify a real code arrives.
3. Add `/auth`; keep `/onboarding` working in parallel so nothing breaks mid-way.
4. Relax `_authenticated/route.tsx` to a session-only gate.
5. Add `_authenticated/register.tsx` (single-screen details) and repoint `/onboarding` at it.
6. Home: registration status check, banner, limited mode.
7. Gate write actions in the UI and in RLS (`is_registered` on `connections`).
8. Remove the wizard chrome and dead code; keep deprecated columns.
9. Verify existing-user paths, then run the test matrix.
10. Optional follow-up: verified mobile via `phone_change` OTP once an SMS provider is funded.

## O. Testing strategy

New user: email → code → Home in limited mode → complete details → full access. Existing complete user: login → Home, full access, no prompt. Partially onboarded user: prefilled details screen, no data loss. Wrong code, expired code, repeated resends (cooldown + provider rate limit), brute-force attempts rejected by provider. Duplicate email → same account; duplicate phone → unique-index rejection with a clear message. Direct URL to `/network` or `/register` while incomplete. Direct API/RLS attempt to insert a connection while incomplete → denied by policy. Session persistence across refresh, expiry, sign-out then sign-in again. Mobile number edit. Confirm map/network/fun-facts still render for existing data.

## P. Risks, assumptions, questions

**Confirmed:** the code already uses 6-digit OTP APIs and has a code-entry UI; the magic-link appearance comes from the email template. The `_authenticated` gate is what blocks Home. `profiles.onboarded` exists but isn't authoritative. There are no server functions yet, so all enforcement is RLS.

**Assumptions:** `/map` is "Home". Required-for-complete = name + avatar + mad-lib + area. "Limited access" means browsing the map/profiles but not logging or confirming meets. LinkedIn and phone become optional.

**Questions for you:**
1. Do you want to fund and configure an SMS provider now, or ship email-only OTP and keep mobile as an optional profile field?
2. Should an unregistered user see the real member map, or a blurred/placeholder version until they complete details?
3. Is my minimum field set right, or should DOB/address/last-name style fields be added (none exist in the schema today)?
4. Keep `/map` as Home, or introduce a distinct `/home`?
