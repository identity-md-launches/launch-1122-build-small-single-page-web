# Swap Lab design

## Overview

Swap Lab helps Ethereum token holders explore the effect of pool depth on a single example swap. Its visual character is a quiet workbench: warm paper, dark green controls, large outcome numbers, and a compact annotated chart. The visitor can enter an amount, compare depths, and read a short explanation without leaving the page.

The page composition is specific to this module: a masthead and short introduction, a two-part simulator, an optional comparison, three explanatory notes, an expandable model description, and the required visible build note. The implementation is plain React and CSS, without a component framework. `web/src/main.tsx` owns the patterns; `web/src/styles.css` is the design source of truth. Calculation logic is separate in `web/src/math.ts`.

## Colors

Colors use sRGB hex primitives and semantic CSS custom properties at the top of `web/src/styles.css`. The final site deliberately has one light theme; forced-color preferences use system colors rather than a second palette.

| Semantic token | Value / primitive | Implemented role |
| --- | --- | --- |
| `--bg-page` | `--neutral-50`, `#f6f6f0` | Warm page background |
| `--bg-surface` | `--neutral-0`, `#ffffff` | Results, fields, comparison |
| `--bg-subtle` | `--neutral-25`, `#fafaf6` | Input side and comparison cards |
| `--bg-muted` | `--neutral-100`, `#eeeee6` | Neutral insight and hover fills |
| `--text-primary` | `--neutral-900`, `#252c25` | Main text and output |
| `--text-secondary` | `--neutral-600`, `#63695e` | Descriptions, labels and supporting values |
| `--border-subtle` | `--neutral-200`, `#dddfd4` | Structural separators and decorative borders |
| `--border-control` | `--neutral-500`, `#757b6e` | Input and radio-card boundaries |
| `--accent-solid`, `--accent-text` | `--green-900`, `#243e30` | Comparison button, selected controls, icon motif |
| `--accent-soft` | `--green-100`, `#e7efdf` | Selected preset backgrounds |
| `--accent-bright` | `--lime-200`, `#e2f5a1` | Text against the dark primary action |
| `--chart-stroke` | `--green-700`, `#476b35` | Data curve and the display accent |
| `--chart-fill` | `--green-100`, `#e7efdf` | Area under the curve |
| `--chart-dot` | `--green-900`, `#243e30` | Current swap marker |
| `--focus-ring` | `--green-900`, `#243e30` | Two-pixel focus perimeter, offset 4px |
| `--warning-bg`, `--warning-text` | `#f9ead8`, `#854716` | Insight when impact is at least 5%; text and arrow change too |
| `--error-text` | `--red-800`, `#9b352d` | Invalid input text and border |

`--green-300` (`#d3e7b3`) is used for the token half of the decorative reserve bar. That equal-width bar represents the two sides at their initial equal value, not equal token counts. Numerical reserves remain visible beside it.

The measured text pairs are recorded in `artifacts/browser-results.json`: primary text on page 13.21:1; muted text on page 5.21:1; muted text on white 5.66:1; muted text on the selected pool 4.80:1; lime text on the action 9.86:1. These are checks of those rendered pairs, not a blanket compliance certification.

## Typography

`--font-body` is `Arial, Helvetica, sans-serif`; `--font-mono` is `SFMono-Regular, Consolas, Liberation Mono, monospace`. There are no font downloads or font asset dependencies. Exact installed fallback faces can differ by platform. `font-synthesis: none` avoids invented bold/italic faces; 500/600 requests are resolved to the nearest available system weight. No claim is made that a variable font or intermediate weight was loaded.

Named role sizes are caption `.75rem`, small `.8125rem`, UI `.875rem`, body `1rem`, and title `1.375rem`. Body descriptions use 1.5–1.7 line height. Long model descriptions stop at 78 characters, learning paragraphs at 40 characters on desktop / 64 on mobile, and the footer at 66 characters.

The display heading uses `clamp(2.75rem, 5.1vw, 4rem)`, weight 500, line height 1.03 and letter spacing `-.055em`; its mobile rule uses `clamp(2.8rem, 7.5vw, 4rem)`. The outcome uses `clamp(2.25rem, 4vw, 3.15rem)`, with mobile sizes 44px and 38px. Inputs remain 30px. Smaller 9–11px metadata is reserved for compact chart captions, pool quantities and technical badges; interactive labels and explanatory copy use the larger role scale. Axis labels are 11px HTML text and no longer shrink with the SVG.

Headings use balanced wrapping, descriptions use pretty wrapping, and changing numbers use tabular figures. Uppercase presentation is CSS on natural-case section text. The numbered section headings intentionally use a compact eyebrow treatment; content headings and results have separate visual roles.

## Layout

The shared content edge is `min(1080px, calc(100% - 80px))`, centered. The page is in normal document flow, with no sticky panel or parent-frame resizing. The simulator grid uses `.91fr 1.4fr`, leaving more space for the outcome and chart. Input and output DOM order matches the stacked mobile reading order.

The declared spacing vocabulary is 4, 8, 12, 16, 24, 32 and 48px (`--space-1` through `--space-7`); component rules also use explicit fitted values. Small control gaps are 7–12px, grouped control sections are 24–28px apart, and major sections use 32–48px spacing. Reuse the existing `.section-top`, `.learning-grid`, `.comparison-grid` and panel patterns before adding another spacing scheme.

| Breakpoint | Actual behavior |
| --- | --- |
| Above `62rem` | 1080px maximum content width, two simulator columns, three learning/comparison columns |
| At `62rem` | 24px page side margins, smaller panel padding, footer can wrap |
| At `48rem` | Input/result panels stack; header caption hides; hero stacks; learning/comparison become one column; amount shortcuts have 44px minimum height |
| At `25rem` | 16px page side margins, 18px panel padding, smaller display values and metadata, secondary disclosure caption hides |
| Controls container at `15rem` | Pool cards stack and become horizontal rows; this prevents label collisions when root text is enlarged |

The chart is responsive SVG with separate HTML axis labels, a text description, a dotted marker line and a labeled legend. Its x-axis starts at 0 and ends at at least 10 ETH, expanding to the next 10 ETH for larger inputs. Its y-axis adapts to the selected pool; comparisons should therefore use the numeric results, not the visual slope across different scales. Sampling is denser near zero to retain the curve's shape for large inputs.

Rendered overflow checks passed at 320, 360, 400, 600, 768, 800 and 1200px. Screenshots at 320/360/1200px and 200% root text enlargement were inspected. Native browser zoom, physical devices and other browser engines were not checked.

## Elevation & Depth

Structure comes from tonal surfaces, whitespace and 1px borders. The simulator has the only subtle elevation: `0 3px 3px #252c2503, 0 12px 32px #252c2503`. There are no dialogs, overlays or floating action bars. Only the skip link needs an elevated layer (`z-index: 10`).

## Shapes

The radius tokens are 8px for shortcuts/actions/insights, 12px for fields and pool/comparison cards, and 20px for the main simulator and comparison shell. Small badges use 5px, icons use 8–11px, and dots are circular. Panel corners follow the shell: left corners on desktop, top corners when stacked. Only the decorative reserve strip clips overflow. Data, explanatory text and focus rings are not clipped to card boundaries.

## Components

These are internal React components or CSS patterns, not a published component library.

| Component / pattern | Source and use | States and behavior |
| --- | --- | --- |
| `Icon` | `main.tsx`; local `swap`, `arrow`, `reset`, `check`, `expand` paths | `currentColor`, 1.8px strokes, decorative ARIA; disclosure arrow rotates |
| `PoolGlyph` | `main.tsx`; three bars, `depth` prop 1–3 | Decorative; depth always also named in text |
| Amount field | `App`; `.amount-field`, `.amount-input` | Visible label with accessible ETH unit, decimal keyboard, editable text, inline range/format error, `aria-invalid`/`aria-describedby`; invalid input removes stale results |
| Amount shortcuts | `.amount-shortcuts` with native buttons in a named group | 0.1/1/5/10 ETH; `aria-pressed`, selected fill and border; 40px desktop / 44px mobile targets |
| Pool cards | Native fieldset, legend and radios; `.pool-option` | Label is the whole card; arrows change selection; selected fill, radio dot and border; focus surrounds the card |
| `ImpactChart` | `main.tsx`; `amount` and `pool` props | Real calculated curve, current marker, fixed-size labels, SVG title/description; no animated data transitions |
| Result and insight | `.main-result`, `.result-metrics`, `.insight` | Output, fee and impact; high-impact text cue at 5%; empty guidance on invalid input |
| Comparison | `.compare-button`, `.comparison-grid` | Single filled primary action; `aria-expanded` and `aria-controls`; full three-pool calculations; selected pool also has a text label |
| Model disclosure | Native `details`/`summary` | Keyboard/Enter behavior from the browser; formula text wraps; obvious chevron affordance |
| Status region | Stable `role="status"` paragraph in `App` | Polite updates delayed 450ms to avoid announcements on every keystroke; hidden visually, no account or network states |

Focus uses a 2px dark-green outline offset by 4px, changed to system `Highlight` in forced colors. Hover treatments only run when hover is available. Buttons have explicit 120ms color/background/transform transitions and `.96` pressed scale only when reduced motion is not requested. There are no entry animations, timers, autoplay or loading skeletons.

## Do's and Don'ts

- Keep the fictional-data label, separate fee definition, and local-only behavior visible when extending the simulator.
- Reuse semantic colors and the shared page edge. Keep one filled primary action in a section; use neutral shortcuts for secondary choices.
- Keep input/results in DOM order, native controls, and full keyboard paths. Preserve the nonvisual chart description and numerical alternatives.
- Use the existing role sizes for new controls. Do not put new critical copy in the compact metadata treatment or inside scaled SVG text.
- Show errors beside the input and hide misleading stale outputs. Do not silently clamp typed amounts or fetch real reserves.
- For another section, start with a named `section`, reuse `.section-top` or the learning layout, give it wrapping content and natural document flow, and test it at 320/360/1200px and enlarged text before shipping.

This document records the final source, not an approved external brand system. Review coverage and remaining verification limits are in `artifacts/validation.md`.
