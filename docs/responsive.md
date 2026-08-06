# Responsive & Mobile Layout

This is the contract for how the ACMI Pricing frontend behaves across screen sizes. It is an adaptation of the asset-app's responsive contract (`asset-app/docs/responsive.md`) to this codebase's idioms: Tailwind v4 (CSS-based config in `globals.css`, no `tailwind.config.ts`), CSS-variable theming (`--ink`, `--line`, `.av-*` component classes), route-based navigation, and hand-rolled dialogs.

## The one rule

**The base experience must work at 393 px (iPhone 16 Pro) and survive 360 px (small Android).** Breakpoints add complexity upward. Desktop (`lg`+, ≥1024 px) must stay pixel-identical to the pre-mobile layout.

## Breakpoint ladder

Tailwind defaults, min-width based. Two cutovers matter:

| Split | Where | What changes |
|-------|-------|--------------|
| **Content split** | `md` (768 px) | Below: phone presentation — list tables render as record cards, dialogs present as bottom sheets, form controls are touch-sized (≥16 px font, ≥44 px height), matrices pan behind a sticky label column. At `md`+: tables are tables, dialogs are centered, desktop densities. |
| **Chrome split** | `lg` (1024 px) | Below: mobile shell — bottom tab bar + "More" sheet, no sidebar, user block in the TopBar. At `lg`+: sidebar visible, bottom bar gone. iPad portrait (768 px) deliberately gets the mobile shell. |

The app also has desktop-first `max-width` media queries in `globals.css` (≤1024 and ≤640 blocks) collapsing the fixed multi-column grids (KPI rows, deck grid, verdict strip, waterfall). New work should follow the same pattern: desktop layout intact, collapse downward in those blocks.

## The shell

- `src/app/layout.tsx` exports `viewport` with `viewportFit: "cover"` — **required** for `env(safe-area-inset-*)` to be non-zero; without it the bottom tab bar sits under the iPhone home indicator. Never set `maximumScale` or `userScalable: false` (pinch-zoom must stay enabled).
- `src/app/(dashboard)/layout.tsx` is an `h-dvh overflow-hidden` flex shell; **only `<main>` scrolls**. Use `dvh`/`svh` — never `100vh`/`h-screen` — anywhere a full-viewport height is needed (100vh misjudges the iOS Safari URL bar).
- The `BottomTabBar` (`src/components/navigation/BottomTabBar.tsx`) is an **in-flow** sibling below `<main>`, not `position: fixed` — main's scroll content ends above the bar instead of hiding behind it. Its safe-area padding comes from `.safe-pb`.

## Shared primitives — use these, don't hand-roll

| Primitive | Where | Behavior |
|-----------|-------|----------|
| `useIsMobile()` | `src/lib/hooks/useIsMobile.ts` | `true` below `md` (767 px matchMedia via `useSyncExternalStore` — the server snapshot is `false`, so SSR'd pages hydrate cleanly and swap to the mobile branch right after mount). |
| `<MobileSheet>` | `src/components/ui/MobileSheet.tsx` | The dialog shell. Below `md`: bottom sheet with drag handle, swipe-down-to-dismiss, slide-up animation (skipped under `prefers-reduced-motion`), 85dvh cap, safe-area padding. At `md`+: the app's standard centered dialog. Props: `footer` (pinned action row — submit buttons reach the form via HTML `form="…"`), `closeOnScrim={false}` for forms, `escapeCloses={false}` to keep a custom Escape handler, `fullScreen` for workspace-sized content, `desktopClassName`/`desktopStyle` for non-default desktop sizing. All five app dialogs render through it. |
| Record cards | pattern (see `QuoteList`, `AircraftTable`, `UserTable`) | List tables render a card stack below `md` via `useIsMobile`: primary field 16–18 px semibold, secondary fields 13 px muted, whole card (or its top area) tappable, actions in their own ≥44 px row. |
| `.av-tbl-sticky` | `globals.css` | Wide numeric matrices (P&L months, cost breakdown, EPR, crew/costs sections): keep the `overflow-x-auto` wrapper, add `av-tbl-sticky` + a `min-w-[…]` to the table — the first column stays pinned while value columns pan. Gated below `lg`; desktop untouched. |
| `.touch-manip`, `.safe-pb`, `.av-sheet-up` | `globals.css` | Tap-delay removal, safe-area bottom padding, sheet slide-up animation. |

`PnlTable` implements its own sticky label column (`sticky left-0` inline) with a slimmer `min-w-[180px]` label column below `md`.

## Touch & input checklist

- Touch targets ≥ 44 × 44 px. The `@media (max-width: 767px)` block in `globals.css` already enforces ≥16 px font / ≥44 px height on `.av-input`, `.av-nf`, `.av-field`, `.av-btn`, `.av-seg`, `.av-ac-tab`, `.av-addgrp` and enlarges slider thumbs — **anything smaller triggers iOS auto-zoom on focus**.
- Never force a sub-16px font on an input at mobile widths: utilities like `!text-[13px]` beat the CSS floor, so scope them to desktop (`md:!text-[13px]`).
- Numeric inputs: `inputMode="decimal"` (see `EditableCell`) so the right keyboard appears.
- Hover styling on raw CSS goes behind `@media (hover: hover)` — touch devices fire `:hover` on tap. Tailwind v4's `hover:` variant is already gated.
- `touch-action: manipulation` (`.touch-manip` or Tailwind `touch-manipulation`) on tappable elements.
- `prefers-reduced-motion`: sheet/drawer animations reduce to none (`.av-sheet-up` handles this).

## Test matrix

Check at **360 / 393 / 430 / 768 / 1024 px**, portrait and landscape. Hard invariants:

- **Zero horizontal page scroll at 360 px on any route** (inner `overflow-x-auto` regions scroll; the page never does).
- Desktop ≥1024 px pixel-identical to the pre-mobile layout.
- Dialogs are bottom sheets below 768 px, centered above.
- Bottom bar clears the home indicator (device emulation with a notch).
- No input zoom on focus at phone widths (all focusable inputs ≥16 px).
