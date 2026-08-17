# Nora Design System

## Mission

Nora is an operational system for central kitchens. Its interface should help users notice exceptions, make decisions, and complete work with minimal interpretation. It is not a marketing site and should not explain obvious screen purpose back to the user.

The visual baseline combines Apple HIG clarity with Vercel-style restraint: strong hierarchy, neutral surfaces, one interactive accent, explicit states, generous hit targets, and predictable keyboard behavior.

## Product principles

1. **Show work, not slogans.** Page headers contain a title and relevant actions. Do not add a subtitle that restates the page name, navigation label, or generic workflow.
2. **Put context next to the data it qualifies.** Order numbers, dates, factories, filters, and calculation rules belong in metadata rows, section headers, or cards—not in promotional page copy.
3. **One dominant action per scope.** A page, card, or modal should have at most one filled primary action. Secondary actions remain neutral.
4. **Color communicates state.** Blue is the interaction color. Green, amber, and red are reserved for status and risk. Purple is permitted only for AI/forecast data.
5. **Dense when scanning, spacious when deciding.** Tables and operational lists can be compact; forms, dialogs, and MES controls need larger spacing and touch targets.

## Foundations

All shared values are defined as semantic CSS custom properties in `src/app/globals.css`. Components must consume semantic variables rather than introduce new raw hex values.

### Adoption status

- Shared tokens, application shells, page headers, cards, buttons, links, badges, progress, fields, and dialogs follow this document.
- Existing raw values in ordinary feature pages are migration debt: do not copy them into new UI; replace them with semantic variables when touching that area.
- Raw palettes inside the documented visualization exceptions may remain local when they encode domain layers, chart series, or spatial state.

### Typography

- UI font: system sans stack with SF Pro and PingFang SC priority.
- Weights: 400 for body, 500 for controls and labels, 600 for headings and key values. Avoid 700+.
- Page title: 28px / 1.2 / 600, negative tracking.
- Section title: 14–16px / 1.4 / 600.
- Body: 14px / 1.5 / 400.
- Supporting label: 12px / 1.4 / 400 or 500.
- Operational numbers use tabular figures.

### Color roles

- `--canvas`: app background.
- `--surface`, `--surface-subtle`, `--surface-muted`: elevation hierarchy.
- `--text-primary`, `--text-secondary`, `--text-tertiary`: text hierarchy.
- `--stroke`, `--stroke-subtle`: control and section boundaries.
- `--interactive`, `--interactive-hover`, `--interactive-soft`: links, focus, and primary actions.
- Status variables are limited to small badges, indicators, progress bars, and alerts.

### Spacing, shape, and elevation

- Base spacing unit: 4px. Prefer 8, 12, 16, 20, 24, 32.
- Controls: 10px radius; cards: 14px radius; nested surfaces: 8–12px.
- Desktop control height: 40px. Mobile touch target: at least 44px.
- Cards use one neutral one-pixel border without ambient shadow. Raised shadows are reserved for menus, dialogs, and other overlay surfaces.
- Pills are reserved for status, filters, and compact categories.

## Component contracts

### Page header

- Contains one `h1`, optional operational metadata, and actions.
- Do not add descriptive copy such as “统一维护…”, “查看…进度”, or “从…到…的统一视图”.
- Metadata must be factual and scannable: document number, date, factory, owner, or current state.

### Detail header

- Detail pages use one continuous header region: back navigation, document identifier, status, factual metadata, and actions.
- Status belongs beside the document identifier. Do not repeat it in a detached row below the header.
- Keep metadata to one compact line where possible; move delivery, contact, and other operational details into their owning section.

### Cards and sections

- Use a card only when grouping changes meaning or interaction scope.
- Section descriptions are allowed only for calculation rules, time range, data provenance, or instructions the user cannot infer from controls.
- Avoid nesting visually identical cards.

### Buttons and links

- Use links for navigation and buttons for actions.
- All interactive controls expose hover, focus-visible, active, and disabled states.
- Labels use verbs and do not repeat surrounding titles.
- Actions that open another step use an ellipsis only when follow-up input is required.

### Forms

- Every input has a programmatically associated label or accessible name.
- Do not disable submit before the user can discover validation errors.
- Announce async success and errors with `role="status"` or `aria-live`.
- Mobile inputs use at least 16px text to avoid browser zoom.

### Status

- Badges state a fact: “生产中”, “待审核”, “缺料”.
- Never use status color as decoration.
- Pair color with text or an icon; color alone is insufficient.

## Responsive behavior

- Desktop prioritizes scan density and aligned columns.
- Tablet reduces side content and preserves the primary work surface.
- Mobile uses cards or compact rows instead of clipped desktop tables.
- Horizontal scrolling is reserved for timelines, maps, diagrams, and compact metric strips where partial next-item visibility signals more content.
- MES controls remain reachable with one hand and use a minimum 44px target.

## Accessibility and interaction

- Target WCAG 2.2 AA.
- Every flow is keyboard-operable.
- Focus-visible uses a high-contrast double ring.
- Dialogs trap and restore focus.
- Respect browser zoom and `prefers-reduced-motion`.
- Avoid surprise navigation, dead controls, and destructive actions without confirmation or undo.

## Exceptions

- Digital twin, CAD, and MRP canvases may use specialized dark palettes and denser micro-labels.
- MES may use larger controls and stronger state colors for distance and safety.
- Showroom scenes are narrative presentation surfaces and may use editorial copy; operational application rules do not apply to them.

## Review checklist

- Is every visible sentence necessary for a decision or task?
- Does each page have one clear title and one primary action?
- Are raw colors confined to visualization-specific code?
- Are touch targets at least 44px on mobile?
- Can the flow be completed with a keyboard?
- Are loading, empty, error, disabled, and success states defined where applicable?
- Does the mobile layout preserve all decision-critical information without page-level horizontal overflow?
