# GlyphHub – Task List (derived from development.md)

A concise, actionable task list based on the PRD and roadmap in `docs/development.md`.

---

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


