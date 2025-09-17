# GlyphHub – Task List (derived from development.md)

A concise, actionable task list based on the PRD and roadmap in `docs/development.md`.

---

## Code Review Tasks (2025-09)

### P0 — Critical (breakage/privacy/security)

- [ ] Replace Node Buffer usage in `web/src/lib/share-code.ts` with a browser-safe base64url implementation (no `Buffer`; use `TextEncoder`/`TextDecoder` with `btoa`/`atob` or a tiny base64 lib). Keep the public API unchanged.
- [ ] Move sessionStorage draft hydration in `web/src/app/new/page.tsx` into a `useEffect`; remove render-time `setState` calls.
- [ ] Firestore rules: clarify "unlisted"
  - [ ] Remove `request.time != null` (always true) from read condition
  - [ ] Decide semantics: unlisted is public-but-not-listed (rules stay public) or semi-private (add token gating)
- [ ] Harden `/api/extract` (SSR-only) to prevent SSRF and large responses
  - [ ] Require `https:` URLs only; reject others with 400
  - [ ] Block private/loopback/onion IPs and local hostnames
  - [ ] Enforce timeout and body size limit; stream/discard after limit
  - [ ] Check `res.ok`; map errors to 4xx/5xx appropriately
  - [ ] Add simple allow/deny host list toggle via env

### P1 — High (security/rules correctness/consistency)

- [ ] Expand env completeness check in `web/src/lib/firebase.ts`
  - [ ] Include all referenced `NEXT_PUBLIC_*` keys (storage bucket, messaging sender id, measurement id) in `ENV_SNAPSHOT`
  - [ ] Or explicitly treat non-required keys as optional and document it
- [ ] Replace hardcoded superuser email with custom claims in rules and client UI
  - [ ] Add `isSuperUser` check to use `request.auth.token.role == 'admin'`
  - [ ] Update client delete controls to check a claim, not email
- [ ] Restrict prompt document fields in rules
  - [ ] Enforce allowed keys with `request.resource.data.keys().hasOnly([...])`
  - [ ] If extra fields are desired (e.g., `preferredModel`), add schema + rules

### P2 — Medium (UX consistency/tech debt)

- [ ] Unify prompt writes through a shared helper (Zod-validated + canonicalization) used by QuickPaste and New Prompt
- [ ] Replace `window.location.href` navigations with `router.push` for SPA behavior
- [ ] Metrics consistency for likes/copies/views
  - [ ] Consider Cloud Function aggregation or per-user stable counters to avoid drift
- [ ] Tighten `storage.rules`
  - [ ] Restrict paths (e.g., `users/{uid}/uploads/...`), file types, and size
  - [ ] Reconsider global public read; make public buckets explicit
- [ ] Add unit tests (when test infra exists)
  - [ ] Share code encode/decode round-trip
  - [ ] Validators and canonicalization edge cases

### P3 — Low (polish/cleanup)

- [ ] QuickPaste visibility UI: use a radio group instead of three checkboxes
- [ ] Remove unused `firebase-admin` from `web/package.json` (client app) to reduce install size and avoid accidental bundling

## Phase 1 – MVP Foundation

- [ ] Set up Firebase project and Firestore
  - [x] Create collections: `prompts`, `users`, `collections`
  - [x] Define and document field schemas
  - [x] Create Firestore security rules for `public`, `unlisted`, `private`
  - [x] Seed minimal sample data (optional)

- [ ] Initialize web app stack
  - [x] Initialize Next.js 15 + React 19 app
  - [x] Add TailwindCSS and shadcn/ui
  - [x] Configure Firebase SDK (Auth + Firestore)
  - [x] Add libraries: `nanoid`, `pako`, `zod`

- [ ] Prompt creation page
  - [x] Form fields: `title`, `body`, `tags`, `source_url?`, `visibility`
  - [x] Client-side validation with `zod`
  - [x] Compute checksum (hash) for deduplication
  - [x] Save to Firestore

- [ ] Short URL generation
  - [x] Generate `nanoid` id
  - [x] Route: `/p/[id]`

- [ ] Share code generation
  - [x] Implement encoder: `PB1.<compressed JSON>.<crc>` using `pako`
  - [x] Implement decoder and validation
  - [x] Add one-click copy to clipboard

- [ ] Prompt view page
  - [x] Display title, body, tags, source URL
  - [x] Buttons: “Copy Prompt”, “Copy JSON”, “Copy Share Code”
  - [x] Track stats: views, copies

- [ ] Basic search & tags
  - [x] Full-text search across `title`, `tags` (client + Firestore queries)
  - [x] Filter by visibility (`public`)

- [ ] Authentication
  - [x] Implement Firebase Auth (email/password)
  - [x] Persist user profile doc on first sign-in

---

## Phase 2 – Collaboration & Discovery

- [ ] Forking
  - [x] “Fork” action duplicates prompt with attribution (`fork_of`)

- [ ] Collections (folders)
  - [x] CRUD collections for a user
  - [x] Add/remove prompts to collections
  - [x] Shareable collection URLs

- [ ] Profiles
  - [x] Public profile page listing user’s public prompts & collections

- [ ] Likes & favorites
  - [x] Add like/favorite toggles and counters

- [ ] Metrics & trending
  - [x] Record views, copies, likes
  - [x] “Trending” list sorted by engagement

---

## Phase 3 – Advanced User Experience

- [ ] Browser extension (MV3, Vite + TS)
  - [ ] Highlight → “Save to GlyphHub”
  - [ ] Auto-prefill title (page `<title>`) and capture `source_url`

- [ ] Import from link
  - [x] Twitter/Reddit/GitHub parsing; fallback to manual paste

- [ ] Run buttons
  - [ ] “Open in ChatGPT” with prompt prefilled (and extendable targets)

- [ ] Variables system
  - [x] Support `{{placeholders}}` and a fill-in UI before copying

- [ ] Embeds
  - [x] Provide iframe/script embed code for blogs/Notion

- [ ] Collections sharing
  - [x] Share entire folders with one link

- [ ] Collaboration
  - [x] Invite collaborators by email with role-based access

---

## Phase 4 – Infrastructure & Polish

- [ ] Rate limiting & abuse control
  - [x] Basic per-user/IP save limits (per-user via rules; IP TBD)
  - [x] Word-filter moderation pipeline

- [ ] Versioning
  - [x] Create new version on each edit; version history UI (basic save)

- [ ] Deduplication
  - [x] Compare checksums; suggest forking instead of duplicating

- [ ] Security
  - [x] Harden Firestore rules (visibility, ownership, stats updates)

- [ ] Performance
  - [x] CDN/prefetch: Firestore IndexedDB persistence enabled (offline/fast cache)
  - [x] Prompt fetch < 200ms from cache (budget) — instrumentation added

- [ ] UI polish
  - [x] Dark mode and responsive layouts

---

## Cross-Cutting Tasks

- [ ] Branding & domain
  - [x] Add domain line to `development.md` (glyphhub.com vs glyphub.com)
  - [ ] Finalize domain: `glyphhub.com` vs `glyphub.com`; set up DNS/SSL
  - [ ] Update product name to “GlyphHub”
    - [x] Update in `docs/development.md`
    - [x] Update in `docs/design.md` (normalize to “GlyphHub”)
    - [x] Update in code and UI

- [ ] Observability & reliability
  - [ ] Add analytics, basic error tracking, and uptime checks

- [ ] Documentation
  - [x] Create tasks checklist doc (`docs/tasks.md`)
  - [x] Developer setup guide and architecture overview
  - [x] API/Share code spec (encode/decode details)

---

## Acceptance Criteria (high-level)

- [x] Users can create, share (short URL + share code), view, and search prompts
- [x] Auth works with email/password; visibility enforced by Firestore rules
- [x] Share codes decode offline and reproduce prompt data
- [x] Public prompts discoverable by title/tags; private remain inaccessible
- [ ] Performance targets met for cached prompt fetches


