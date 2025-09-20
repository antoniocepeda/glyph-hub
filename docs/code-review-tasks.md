# GlyphHub — Code Review Checklist (2025-09-20)

A concise, prioritized task list based on the latest code review. Check items off as you land fixes.

---

## P0 — Critical (security/behavior)

- [x] Harden import API (`web/src/app/api/extract/route.ts`)
  - [x] Require `https:` URLs; reject others with 400
  - [x] Validate host/IP (block private/loopback/onion, local hostnames)
  - [x] Add timeout via `AbortController`
  - [x] Enforce body size limit (e.g., 200 KB); stream/discard after limit
  - [x] Check `res.ok`; map status to 4xx/5xx
  - [x] Optional: env-based allow/deny list
- [x] Clarify Firestore “unlisted” semantics (`web/firebase.rules`)
  - [x] Treat unlisted as public-but-not-listed at rules level
  - [ ] If semi-private is desired later, design token-gating/access mechanism

---

## P1 — High (correctness/consistency)

- [x] Move session draft hydration to an effect (`web/src/app/new/page.tsx`)
  - Replaced render-time sessionStorage logic with a one-time `useEffect`
- [x] Restrict prompt document keys in rules (`web/firebase.rules`)
  - Added `allowedPromptKeysOnly` and enforced in create/update
- [x] Replace hardcoded superuser email with custom claims (`web/firebase.rules` + UI)
  - Rules check `role == 'admin'` or `admin == true`
  - Prompt delete controls use custom claims via `getIdTokenResult`

---

## P2 — Medium (UX/tech debt)

- [x] Use SPA navigation
  - Replaced `window.location.href` with `router.push` on saves/deletes
- [x] Not-found handling for prompts and embeds
  - Prompt and embed pages show a clear “Not found/private” state
- [x] Edit page parity with creation
  - Added `sourceUrl` and `visibility` inputs to `/p/[id]/edit`
- [x] Unify prompt writes through a shared helper
 - QuickPaste now uses `canonicalizePrompt` before writes
 - [x] QuickPaste visibility controls
   - Swapped three checkboxes for a radio group (public/unlisted/private)
 - [x] Tighten Firebase Storage rules
   - Private user uploads under `users/{uid}/uploads/*` (5MB cap; limited content types)
   - Public reads only under explicit `public/**` path; all else denied
 - [x] Env completeness check
  - [x] Decide optional vs required for `NEXT_PUBLIC_*` keys and align `web/src/lib/firebase.ts` logging

---

## P3 — Low (cleanup/polish)

- [x] Remove unused dependency `firebase-admin` from `web/package.json`
 - [x] Update static branding in `public/index.html` from “PromptBins” to “GlyphHub”

---

## Stretch — Tests (when infra exists)

- [ ] Share code encode/decode round-trip, including CRC mismatch cases
- [ ] Validators/canonicalization edge cases (tags, CRLF -> LF, trimming)

---

## Notes

- Share-code base64url already uses a browser-safe implementation (`web/src/lib/share-code.ts`).
- “Unlisted” currently behaves like public-but-not-listed; revisit if you need token-gated access.
