# GlyphHub — Design Guide

## 0) Principles

* **Ancient × Tech**: dark, stone-like base; neon/cosmic accents.
* **Minimal & legible**: strong hierarchy, generous spacing, no visual noise.
* **Token-first**: everything driven by design tokens (colors, spacing, radius, shadows).
* **Accessible by default**: 4.5:1 text contrast, focus states, reduced motion support.

---

## 1) Brand & Tokens

### 1.1 Color Palette

* **Base**

  * `--gh-bg`: `#0D0D0F`
  * `--gh-bg-soft`: `#121217`
  * `--gh-surface`: `#15161B`
  * `--gh-border`: `#2A2C33`
* **Text**

  * `--gh-text`: `#F5F7FA`
  * `--gh-text-dim`: `#C7CBD3`
  * `--gh-text-muted`: `#9AA0AB`
* **Accents**

  * `--gh-cyan`: `#00F0FF`  (primary)
  * `--gh-violet`: `#A259FF` (secondary)
  * `--gh-gold`: `#E6B450`   (highlight)
* **Status**

  * `--gh-success`: `#2ECC71`
  * `--gh-warning`: `#F1C40F`
  * `--gh-danger`:  `#E74C3C`

**Usage**

* Primary actions & links: cyan
* Selection/active glows: violet
* Rare highlights (badges, “featured”): gold
* Surfaces: bg → bg-soft → surface for depth

### 1.2 Typography

* **Display/Headings**: *Rajdhani* (700/600) or *Orbitron* (700). Geometric, tech.
* **Body/UI**: *Inter* (400/500/600).
* **Tracking**: Slightly increased on display titles (+2%).
* **Case**: Sentence case everywhere; ALL CAPS for tiny overlines only.

**Type scale**

* Display XL: 48/56, -1 tracking
* H1: 36/44
* H2: 28/36
* H3: 22/30
* Body L: 18/28
* Body: 16/26
* Small: 14/22
* Micro: 12/18 (labels only)

### 1.3 Sizing & Spacing

* **8-pt grid** (4 sub-grid for tight UI).
* Spacing tokens: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
* **Containers**: `max-w-[1200px]` center, side gutters `24px` mobile → `40px` desktop.

### 1.4 Radius & Shadows

* Radius: `--gh-r-sm: 8px`, `--gh-r-md: 12px`, `--gh-r-lg: 16px`, `--gh-r-xl: 24px`.
* Shadows (subtle, layered):

  * `--gh-shadow-1`: `0 1px 2px rgba(0,0,0,.5)`
  * `--gh-shadow-2`: `0 8px 24px rgba(0,0,0,.45)`
  * **Neon outline (on hover/active)**: ring with cyan/violet at 35% opacity.

### 1.5 Motion

* Durations: `150ms` (micro), `250ms` (ui), `400ms` (entrance).
* Easing: `cubic-bezier(.22,.61,.36,1)` (standard), `ease-out` for hovers.
* **Reduced motion**: respect `prefers-reduced-motion`, disable large parallax/glows.

---

## 2) Tailwind Setup (snippet)

```ts
// tailwind.config.ts
import { fontFamily } from 'tailwindcss/defaultTheme'

export default {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        gh: {
          bg: '#0D0D0F',
          bgsoft: '#121217',
          surface: '#15161B',
          border: '#2A2C33',
          text: '#F5F7FA',
          textdim: '#C7CBD3',
          textmuted: '#9AA0AB',
          cyan: '#00F0FF',
          violet: '#A259FF',
          gold: '#E6B450',
          success: '#2ECC71',
          warning: '#F1C40F',
          danger: '#E74C3C',
        },
      },
      borderRadius: {
        'gh-sm': '8px',
        'gh-md': '12px',
        'gh-lg': '16px',
        'gh-xl': '24px',
      },
      boxShadow: {
        'gh-1': '0 1px 2px rgba(0,0,0,.5)',
        'gh-2': '0 8px 24px rgba(0,0,0,.45)',
      },
      fontFamily: {
        display: ['Rajdhani', ...fontFamily.sans],
        sans: ['Inter', ...fontFamily.sans],
      },
    },
  },
  plugins: [],
}
```

Global CSS (neon ring utility):

```css
/* globals.css */
.neon-ring {
  box-shadow: 0 0 0 1px rgba(0,240,255,.35), 0 0 24px rgba(162,89,255,.25);
}
```

---

## 3) Components (specs & examples)

### 3.1 App Shell

* **Header**: left logo, middle search, right actions (New Prompt, Profile).
* **Footer**: slim, muted links + copyright.
* **Background**: `bg-gh-bg`, subtle texture (SVG noise at < 2% opacity).

```tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gh-bg text-gh-text">
      <header className="sticky top-0 z-40 border-b border-gh-border bg-gh-bg/80 backdrop-blur supports-[backdrop-filter]:bg-gh-bg/60">
        <div className="mx-auto max-w-[1200px] px-6 h-14 flex items-center gap-4">
          <Logo />
          <SearchBar className="flex-1" />
          <div className="flex items-center gap-2">
            <NewPromptButton />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-6 py-8">{children}</main>
      <footer className="border-t border-gh-border text-gh-textmuted">
        <div className="mx-auto max-w-[1200px] px-6 py-6 text-sm">© GlyphHub</div>
      </footer>
    </div>
  )
}
```

### 3.2 Buttons

* **Primary**: cyan background → darker on hover, focus ring cyan.
* **Secondary**: surface bg + cyan text.
* **Ghost**: transparent with cyan text; hover adds soft surface.

```tsx
export function Button({ variant = 'primary', ...props }) {
  const base = "inline-flex items-center gap-2 rounded-gh-md px-4 py-2 text-sm font-medium transition";
  const variants = {
    primary: "bg-gh-cyan text-black hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gh-cyan/60",
    secondary: "bg-gh-surface text-gh-text hover:bg-gh-bgsoft focus:ring-2 focus:ring-gh-cyan/40",
    ghost: "text-gh-cyan hover:bg-gh-bgsoft focus:ring-2 focus:ring-gh-cyan/30",
  };
  return <button className={`${base} ${variants[variant]}`} {...props} />;
}
```

**Do**

* Use icons (lucide-react) at 18px with `opacity-80`.
* Maintain min-tap size 40×40.

**Don’t**

* Use pure white text on pure cyan for long labels (accessibility).

### 3.3 Inputs & Search

* Filled, dark surface, 1px border.
* Focus: cyan ring; placeholder muted.

```tsx
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-gh-md bg-gh-surface border border-gh-border px-3 py-2 text-sm placeholder:text-gh-textmuted focus:outline-none focus:ring-2 focus:ring-gh-cyan/50"
      {...props}
    />
  )
}
```

### 3.4 Prompt Card (core object)

* **Visual**: “runic slab” card; subtle border; hover glow; copy actions visible on hover.
* **Meta**: tags (pills), counts (copies/likes), source URL icon if present.
* **Actions**: Copy Prompt, Share URL, Share Code, Fork.

```tsx
export function PromptCard({ prompt }) {
  return (
    <article className="group rounded-gh-lg bg-gh-surface border border-gh-border shadow-gh-1 hover:shadow-gh-2 transition relative">
      <div className="p-5">
        <h3 className="font-display text-xl mb-2">{prompt.title}</h3>
        <p className="text-gh-textdim text-sm line-clamp-3">{prompt.body}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {prompt.tags.map((t:string) => (
            <span key={t} className="text-xs px-2 py-1 rounded-full bg-gh-bgsoft border border-gh-border text-gh-textmuted">
              #{t}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4 text-gh-textmuted text-xs">
          <span>🔁 {prompt.copy_count}</span>
          <span>❤️ {prompt.like_count}</span>
          {prompt.source_url && <a href={prompt.source_url} target="_blank" className="underline hover:text-gh-cyan">source</a>}
        </div>
      </div>

      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition">
        <div className="flex gap-2">
          <IconButton label="Copy" />
          <IconButton label="URL" />
          <IconButton label="Code" />
          <IconButton label="Fork" />
        </div>
      </div>
    </article>
  )
}
```

### 3.5 Code/Glyph Presentation

* Use monospaced font (*JetBrains Mono* or *UI Mono*).
* Block style: surface bg, 12px radius, 16px padding, copy button top-right.

```tsx
export function CodeBlock({ children }) {
  return (
    <div className="relative rounded-gh-md bg-gh-bgsoft border border-gh-border p-4 font-mono text-sm">
      <CopyButton className="absolute top-2 right-2" text={String(children)} />
      <pre className="overflow-x-auto">{children}</pre>
    </div>
  )
}
```

### 3.6 Tabs (Raw / Split / JSON / Share Code)

* Tabs under the prompt title; active tab cyan underline.

```tsx
export function Tabs({ tabs, active, onChange }) {
  return (
    <nav className="flex gap-6 border-b border-gh-border">
      {tabs.map((t:string) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`py-3 text-sm ${active === t ? 'text-gh-cyan border-b-2 border-gh-cyan' : 'text-gh-textmuted hover:text-gh-text'}`}
        >
          {t}
        </button>
      ))}
    </nav>
  )
}
```

### 3.7 Toasts & Empty States

* Toast: surface bg, cyan left bar `4px`, text white/dim.
* Empty: glyph outline + “Add your first prompt” CTA.

---

## 4) Iconography & Glyphs

* **Icon set**: `lucide-react` for system icons.
* **Custom glyphs**: SVG line icons (2px stroke) with slight chisel effect (bevel corners).
* Color: default `text-gh-textdim`; on hover `text-gh-cyan`.

---

## 5) States & Interactions

### 5.1 Hover/Active

* Hover: elevate shadow + neon-ring on cards and primary CTAs.
* Active/Pressed: reduce translate-y by 1px; dim to 92% opacity.

### 5.2 Focus

* **Always visible**: 2px cyan ring + 1px border darkening.

### 5.3 Loading

* Use **skeletons** for cards (rounded rectangles).
* Use **progress bar** (thin cyan line at top) for page loads.

### 5.4 Errors/Warnings

* Errors: danger text + inline hint; avoid modal walls.
* Copy failure: toast with retry.

---

## 6) Accessibility

* Text contrast ≥ 4.5:1 on dark bg (use `textdim` for secondary).
* Focus states on all interactive elements.
* Keyboard: tab order logical; `Esc` closes dialogs.
* Reduced motion support; avoid large glow animations.
* Labels & aria for buttons (Copy/URL/Code/Fork).

---

## 7) Page Layouts

### 7.1 Home / Feed

* **Hero**: concise, one-liner + CTA (“New Prompt”).
* **Filters**: tabs for All / Public / Mine / Collections; tag filters.
* **Grid**: responsive, 1→2→3 columns (`minmax(320px, 1fr)`).

### 7.2 Prompt Detail `/p/[id]`

* Title + meta row (owner, created, visibility).
* Tabs: Raw | Split | JSON | Share Code.
* Right rail (desktop): actions (Copy, URL, Code, Fork), Run buttons, Similar Prompts.

### 7.3 New/Edit Prompt

* Two-column on desktop: left textareas, right live preview.
* Variables helper: detect `{{variable}}` and render inputs.
* Validation inline w/ helper text.

### 7.4 Profile

* Banner minimal; avatar, display name, stats.
* Tabs: Prompts, Collections, Likes.

### 7.5 Collections

* Grid of prompt cards; header with “Share Collection” and “Add Prompt”.

---

## 8) Browser Extension (UI)

* **Popup**: same palette; 320px wide.
* Fields: title (prefilled from `<title>`), tags (chips), visibility (default private), source URL locked.
* Primary CTA: “Save to GlyphHub” (cyan button).
* Success toast: “Saved • Copy Link” inline.

---

## 9) Embeds

* Script embed produces a **compact card**:

  * Title, creator, Copy button, “Open in GlyphHub”.
  * Inline copy success feedback.
* Theme: auto dark; allow `data-accent="cyan|violet|gold"`.

---

## 10) Copy Rules & Microcopy

* **Primary CTA**: “New Prompt”
* Secondary: “Share URL”, “Share Code”, “Copy Prompt”, “Fork”
* Empty state: “Your library is empty. Save a prompt from anywhere on the web.”
* Errors: human + short → “Couldn’t save. Check your connection and try again.”

---

## 11) Do / Don’t

**Do**

* Keep max line length \~80–90ch for prompt body.
* Use gold sparingly (badges, special moments).
* Use transitions; keep them quick.

**Don’t**

* Overuse cyan glow; it’s a highlight, not a background.
* Use gradients behind long-form text.
* Center huge blocks of paragraph text.

---

## 12) Example: Prompt Card Variants

* **Public Card**: badge “Public” (outline, text-dim)
* **Unlisted**: small link icon
* **Private**: lock icon, muted gold outline on hover

Badges:

```html
<span class="text-xs px-2 py-0.5 rounded-full border border-gh-border text-gh-textmuted">Public</span>
```

---

## 13) Theming Hooks

* Support **brand switch** by swapping accent tokens:

  * Cyan primary (default), Violet secondary
  * Optional: `data-theme="violet"` → swap classes (`text-gh-violet`, ring violet)

---

## 14) Performance Notes

* Prefer CSS effects over heavy box-shadow glows.
* Preload display font; swap for body.
* Pre-render hero & nav; lazy load heavy panes (JSON viewer).

---

## 15) QA Checklist (UI)

* [ ] All buttons have focus rings and aria-labels
* [ ] Text contrast verified on dark bg
* [ ] Card hover glow contained (no layout shift)
* [ ] Copy to clipboard works on mobile + desktop
* [ ] Long tags wrap and remain readable
* [ ] Share code block scrolls horizontally, not vertically
* [ ] Reduced motion trims large effects

---