---

# 📄 Product Requirements Document (PRD)

**Product Name:** GlyphHub (previously PromptBin)
**Domain:** glyphhub.com (alt: glyphub.com — TBD)
**Vision:** A lightweight, Pastebin-style platform designed specifically for storing, sharing, discovering, and remixing AI prompts.

---

## 1. Objectives

* Provide a **simple, frictionless way** for people to save and share AI prompts.
* Allow **multiple sharing methods**: short URLs and compact share codes.
* Enable **community discovery** through search, tags, collections, and profiles.
* Support **extensibility**: integrations with browsers, blogs, and AI apps.

---

## 2. Target Users

* **AI hobbyists** saving prompts for personal use.
* **Creators & educators** sharing prompt libraries with students/followers.
* **Teams** that collaborate on workflows and want shared collections.
* **Developers** embedding prompts into documentation or apps.

---

## 3. User Stories

* *As a user*, I want to **save a prompt** quickly so I don’t lose it.
* *As a user*, I want a **short URL** I can share with friends.
* *As a user*, I want a **magic code** I can paste anywhere so my friend can import the prompt.
* *As a user*, I want to **search and tag** prompts to find what I need.
* *As a user*, I want to **fork a prompt** to make my own version.
* *As a user*, I want to **group prompts into folders/collections** for organization.
* *As a user*, I want to **open a prompt in ChatGPT/Claude** with one click.
* *As a user*, I want to **save prompts directly from a webpage** with a browser button.
* *As a user*, I want to **embed prompts into my blog or Notion**.
* *As a user*, I want to **see popular prompts** (likes/copies).

---

## 4. Functional Requirements

### 4.1 Core Features

1. **Prompt Creation**

   * Input fields: `title`, `body`, `tags`, optional `source_url`.
   * Visibility: `public`, `unlisted`, `private`.
   * Generate checksum (hash) for deduplication.

2. **Prompt Sharing**

   * **Short URL** (`/p/abc123`).
   * **Share Code** (`PB1.<compressed JSON>.<crc>`).
   * One-click copy to clipboard.

3. **Prompt Viewing**

   * Display title, body, tags, source URL.
   * Copy buttons: “Copy Prompt”, “Copy JSON”.
   * Stats: views, copies.

---

### 4.2 Discovery & Collaboration

1. **Search & Tags**

   * Full-text search across `title`, `tags`.
   * Filter by visibility (`public`).
2. **Forking**

   * Duplicate another prompt with attribution (`fork_of`).
3. **Collections**

   * Group prompts into folders.
   * Share collections via URL.
4. **Profiles**

   * Public profile page listing user’s prompts.

---

### 4.3 Community & Engagement

1. **Likes / Favorites**

   * Increment counters for engagement.
2. **Trending / Popular**

   * Sort prompts by copies/likes/views.
3. **Metrics**

   * Show copy counts, version history.

---

### 4.4 Advanced Features

1. **Browser Extension**

   * Highlight text → “Save to PromptBin.”
   * Auto-prefill title (from page `<title>`).
   * Capture `source_url`.
   * Tags suggested by simple heuristics.
2. **Import from Link**

   * Paste Twitter/Reddit/GitHub link → auto-extract text.
   * Fallback to manual paste.
3. **Run Buttons**

   * “Try in ChatGPT” → opens ChatGPT with prompt prefilled.
   * Extendable for Claude, Cursor, etc.
4. **Variables**

   * Allow placeholders in prompts (e.g., `{{topic}}`).
   * Provide a UI to fill them before copying.
5. **Embeds**

   * Copy embed code (iframe/script) for blogs, Notion.
6. **Collections Sharing**

   * Share entire folders with one link.
7. **Collaboration**

   * Add collaborators (email invite).

---

### 4.5 Safety & Infrastructure

1. **Abuse Control**

   * Rate limit saves per user/IP.
   * Content moderation pipeline (basic word filters).
2. **Permissions**

   * Auth (Google/email).
   * Public vs. private vs. unlisted enforced at API level.
3. **Versioning**

   * Each edit creates new version.
   * Allow comparison (diffs).
4. **Deduplication**

   * Compare checksums.
   * Prompt users to fork instead of duplicating.

---

## 5. Technical Requirements

* **Frontend:** Next.js 15, React 19, Tailwind, shadcn/ui.
* **Backend:** Firebase Auth (Email/Password), Firestore, optional Cloud Functions.
* **IDs:** `nanoid` for URLs.
* **Compression:** `pako` for share codes.
* **Validation:** `zod`.
* **Browser Extension:** MV3, TS + Vite.

---

## 6. Non-Functional Requirements

* **Performance:** Prompt fetch < 200ms from cache.
* **Scalability:** Support 100k+ prompts without major cost spikes.
* **Reliability:** Share codes decode offline.
* **Security:** Firestore rules for visibility; sanitized inputs.

---

# 🗺 Development Roadmap (Sequential)

### Phase 1 – MVP Foundation

1. **Set up Firestore schema** (`prompts`, `users`, `collections`).
2. **Prompt creation** page (title, body, tags, visibility).
3. **Short URL** generation with nanoid.
4. **Share code** generation (encode/decode).
5. **Prompt view** page with copy buttons.
6. **Basic search** by title/tags.
7. **Authentication** (Email/Password).

---

### Phase 2 – Collaboration & Discovery

1. **Forking support** (`fork_of` field).
2. **Collections (folders)** with shareable links.
3. **Profiles** (public user pages).
4. **Likes & favorites** + counters.
5. **Metrics tracking** (views, copies, likes).
6. **Trending/popular prompts** listing.

---

### Phase 3 – Advanced User Experience

1. **Browser extension** (highlight + save).
2. **Import from link** (Twitter/Reddit/GitHub).
3. **Run buttons** (“Open in ChatGPT”).
4. **Variables system** (`{{placeholders}}`).
5. **Embeds for blogs/Notion**.
6. **Collections sharing** (share entire folders).
7. **Collaboration invites** (private sharing with team).

---

### Phase 4 – Infrastructure & Polish

1. **Rate limiting** & abuse filters.
2. **Versioning** (diff history).
3. **Deduplication** (checksum checks).
4. **Security hardening** (Firestore rules, moderation).
5. **Performance optimization** (CDN cache, prefetch).
6. **UI polish** (dark mode, responsive layouts).

---