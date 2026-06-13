# OpenFS Design Guidelines

The design goal is **quiet craft** — Linear-level polish. The interface should feel
precise, calm, and almost invisible: identity comes from rhythm, spacing, and
typographic discipline, not from decoration. If a styling choice draws attention to
itself, it's probably wrong. shadcn/ui provides the component mechanics; these rules
keep 20+ screens coherent.

The rules in one line each:

1. **One accent.** Restrained blue (`--primary`) for primary actions, selection, and
   focus. Everything else is neutral gray and semantic state colors.
2. **Tabular numbers everywhere a number can change.** `tabular-nums`, not a mono font.
3. **Hierarchy from weight and size, never from uppercase/letterspacing/display fonts.**
4. **Hairlines and quiet fills.** Borders are subtle; active states are `bg-muted`,
   not colored.

---

## 0. What makes it read as "Linear"

The look is the easy half; the *behaviour* is what people recognize. In priority order:

1. **Speed is the aesthetic.** Frequent interactions are instant. Hover fills appear
   with **no** transition-in (fade only on exit: `transition-colors duration-150
   hover:duration-0`); navigation and keyboard-triggered actions never animate.
   Animation is reserved for things that appear over the page (popovers, dialogs,
   toasts) and stays ≤ 200ms, ease-out.
2. **Keyboard-first.** Every row, readout, and control is Tab-reachable with a
   visible ring; Enter/Space activates. A mouse is optional, never required.
3. **Density with rhythm.** Compact rows (32–40px), one spacing scale, everything on
   the grid. Whitespace separates; borders only where spacing can't.
4. **Monochrome surfaces, meaningful color.** One neutral ramp for surfaces and
   text. Chromatic color appears only as the accent or as state — and state color
   follows *meaning*, not arithmetic sign (3 fewer open invoices is a negative
   delta but good news → green).
5. **Two sizes, two weights** carry almost all hierarchy: 13–14px medium for
   primary text, same size muted for secondary. Titles are barely larger.
6. **Shadows only on floating layers.** Flat surfaces get hairlines; popovers and
   menus get soft layered shadows. Nothing on the page plane "lifts".
7. **Edges are honest.** Bars in charts sit flat on their baseline (round only the
   top), nested radii step down, empty states exist and are quiet (icon + one
   muted line, no illustration).

## 1. Tokens (`src/index.css`)

Cool near-neutral grays (a whisper of blue, chroma ≤ 0.008), ink text, one blue.
Never hard-code colors in components — extend the token set.

| Token | Role |
| --- | --- |
| `--background` / `--card` | near-white page / white surface |
| `--foreground` | ink (blue-black, very low chroma) |
| `--primary` | the single accent blue — buttons, selection, links, focus |
| `--muted` / `--accent` | quiet fills for hovers and active states |
| `--border` / `--input` | hairlines |
| `--chart-1/2` | full-strength blue / receded light blue (peak vs rest) |
| `--radius` | 0.625rem |

Dark mode mirrors the same hues on near-black surfaces; always define both `:root`
and `.dark`, and pair colored text with `dark:` variants
(`text-green-700 dark:text-green-400`).

Semantic colors carry meaning only — green = positive/paid, red = negative/debt,
amber = in-progress — and appear as **dots and text**, not filled pills.

## 2. Typography

- **Inter Variable** (`font-sans`) for everything. Negative tracking on larger
  sizes via the existing `typography-*` presets.
- **IBM Plex Mono** (`font-mono`) ONLY for true identifiers: Steuernummer,
  USt-IdNr, DATEV numbers, Kunden-/Vertragsnummern. Never for dates, times,
  phone numbers, money, or counts — those get `tabular-nums`.
- Scale: page/section titles `text-[15px] font-semibold tracking-[-0.01em]`;
  bar/panel titles `text-sm font-medium`; body `text-sm`; micro-labels
  `text-[11px] font-medium text-muted-foreground` (normal case);
  table data `text-sm`, secondary columns `text-muted-foreground`.
- No uppercase labels, no letterspaced headings, no condensed/display faces.
- `text-wrap: balance` on headings, `text-pretty` on description paragraphs.

## 3. Craft details (apply always)

- `tabular-nums` on every dynamic number — counters, stats, times, money, %.
- Concentric radii: outer = inner + padding. The body surface is `rounded-lg`;
  nested cards step down (`rounded-md`, `rounded-sm`).
- Transitions: specific properties only (`transition-colors`,
  `transition-transform`) — never `transition: all`. 150–300ms,
  `--ease-snappy`/`--ease-drawer`.
- Press feedback: buttons scale `0.97` (built into the Button component).
- Entrances: one orchestrated reveal per page — `animate-enter` or `stagger-in`
  on the content column; list swaps use `animate-agenda-row/-fade`. Everything
  respects `prefers-reduced-motion`.
- Hit areas ≥ 40px for standalone small controls (extend with pseudo-elements,
  don't enlarge visuals).
- Status indicators: `size-1.5 rounded-full` colored dot + plain text in an
  outline badge (`gap-1.5 font-normal`).
- Read-only/system-assigned values: `bg-muted/40` box with hairline border.
- Focus: rely on the token ring (`focus-visible:ring-*`) — never remove it.

## 4. Page archetypes

Every page is one of three shapes. Copy the existing example, don't invent.

**Form page** (`Profil.tsx`, `NeueSchueler.tsx`) — one bordered surface, no nested
cards. Sections via shared `FormSection` (quiet `text-[15px]` title + muted
description, hairline `border-t` separators) and `FormSectionIndex` (sticky rail,
`lg:` up; active item = `bg-muted` pill). Content column `max-w-[1080px]`,
`stagger-in`. Actions (Speichern/Verwerfen) live in the top bar's `end` slot.

**Table page** (`Theorie.tsx`) — filters (compact search, selects, reset) in the
top bar's `end`; optional title + live `tabular-nums` counter on the left. Body
card is the table only. Entity rows navigate (cursor-pointer, `tabIndex={0}`,
Enter/Space); action cells `stopPropagation()`. Secondary columns muted; status
as dot + text.

**Dashboard** (`Dashboard.tsx`) — compact stat readouts in the top bar center:
`text-[11px]` muted label over `text-sm font-semibold tabular-nums` value,
hairline-divided, click-through (value tints primary on hover). Panels use plain
`text-sm font-medium` titles. Charts: blue with the peak bar at full strength
(`--chart-1`) and the rest receded (`--chart-2`).

Shared chrome on every page: `PageHeader` top bar (h-11, never grows — hide
overflow responsively rather than wrapping), body in the rounded bordered
surface, `bg-sidebar` gutter between.

## 5. Don'ts

- No decorative marks: no colored dashes, no icon-in-tinted-square chips, no
  numbered section headers.
- No uppercase + letterspacing as a style device.
- No mono font outside identifiers.
- No pastel-filled status pills, no per-section accent colors, no purple, no
  gradients.
- No second accent color. If something needs emphasis, use weight, size, or
  position.
- Don't add borders where a hairline `divide-*` or spacing does the job.

## 6. Rollout status

Done: theme tokens, Inter + craft pass, `/profil`, `/` (Dashboard), `/theorie`,
`/neue-schueler`, `/fahrschule` (panel cards + readout stat band), `/fahrzeuge`,
shared `FormSection` and `Panel` (panel chrome + `Readout` unit).
Pending: Kalendar, Fahrschueler(+Detail), Buchhaltung (mono only for
Belegnummern; money is `tabular-nums`), Fahrlehrer, Statistik,
remaining list pages — each follows its archetype.
