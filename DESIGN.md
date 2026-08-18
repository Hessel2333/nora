# Nora Design System

## Mission

Nora is an operational system for central kitchens. Its interface should help users notice exceptions, make decisions, and complete work with minimal interpretation. It is not a marketing site and should not explain obvious screen purpose back to the user.

The visual baseline combines Apple HIG clarity with Vercel-style restraint: strong hierarchy, neutral surfaces, one interactive accent, explicit states, generous hit targets, and predictable keyboard behavior.

## Authority and interpretation

- Product requirements, data correctness, safety, and accessibility take precedence over visual preference.
- For UI decisions, this document and the shared components listed below are the source of truth. Existing feature-page styles are not precedent when they conflict with these rules.
- Reuse an existing pattern before introducing a new component, token, radius, shadow, or interaction model.
- `MUST` and `DO NOT` are requirements. `SHOULD` describes the default and needs a concrete product reason to override. `MAY` identifies an allowed option.
- When a requirement is ambiguous, preserve the existing information architecture and make the smallest consistent change.

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

### Canonical implementation map

| Concern | Source | Use |
| --- | --- | --- |
| Semantic tokens and global behavior | `src/app/globals.css` | Color roles, radii, focus, motion, canvas, and shared utilities |
| General UI components | `src/components/ui.tsx` | `Button`, `ButtonLink`, `Card`, `Badge`, `Progress`, `IconBox`, `MetricCard`, `PageHeader`, `DetailHeader`, `SectionTitle`, `Modal`, and `Field` |
| Business document components | `src/components/document-ui.tsx` | `DocumentFormLayout`, `DocumentSection`, `DocumentActionBar`, `DocumentSummary`, `DocumentLineEditor`, and `DocumentEventTimeline` |
| Application navigation and content frame | `src/components/app-shell.tsx` | Desktop sidebar, mobile drawer, top bar, content width, and page padding |
| MES and portal shells | `src/components/mes-shell.tsx`, `src/components/portal-shell.tsx` | Role-specific navigation and layout behavior |

Do not duplicate these components inside a feature. Extend a shared component when the behavior is broadly reusable; keep domain-only composition in the feature module.

### Typography

- UI font: system sans stack with SF Pro and PingFang SC priority.
- Weights: 400 for body, 500 for controls and labels, 600 for headings and key values. Avoid 700+.
- Page title: 28px / 1.2 / 600, negative tracking.
- Section title: 14–16px / 1.4 / 600.
- Body: 14px / 1.5 / 400.
- Supporting label: 12px / 1.4 / 400 or 500.
- Operational numbers use tabular figures.

### Chinese UI copy and data formatting

- End-user interface copy uses Simplified Chinese. Code identifiers and internal comments may remain English.
- Use short operational language. Remove promotional, implementation-facing, placeholder, and self-evident explanatory text.
- Page and section titles use nouns. Buttons use concise verb phrases such as “保存”, “提交审核”, and “开始生产”.
- Status labels state facts such as “待审核”, “生产中”, and “已完成”; do not turn them into instructions.
- Use `YYYY-MM-DD HH:mm` for date and time, `¥62,840` for currency, and a space between a quantity and its unit: `1,200 份`.
- Preserve business identifiers without visual truncation when they are needed for search, confirmation, printing, or audit.
- Use the same term for the same entity across navigation, headings, fields, and status messages. Do not alternate between synonyms such as “工单” and “任务单” without a domain distinction.
- Error messages explain what failed and what the user can do next. Avoid raw exception text, API names, or implementation details.

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
- Headers remain directly on the page canvas and are not wrapped in a decorative card. Use alignment and spacing—not an extra border—to establish hierarchy.
- Back navigation is a link with a sufficient hit target, not a permanently filled pill. Page-level actions align with the title block and use standard button variants.

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

## Standard page composition

### Dashboard

1. `PageHeader` with one title and only current-page actions.
2. A compact metric grid using `MetricCard`.
3. Operational sections ordered by urgency and decision value.
4. Every chart or progress graphic must preserve its intended aspect ratio and expose the same value in text.

Dashboard cards must not contain slogans or repeat the page purpose. Related metrics use the same data source and calculation definition.

### List page

1. `PageHeader` with the primary create or import action.
2. Search, filters, saved views, and bulk actions in one toolbar scope.
3. A table on desktop and compact rows or cards on mobile when columns would clip.
4. Loading, empty, error, and pagination states within the same content region.

Do not place every filter in its own card. Keep row actions predictable and avoid hiding the only primary action in an overflow menu.

### Detail or document page

1. `DetailHeader` containing back navigation, identifier, status, factual metadata, and actions.
2. Primary document content in the main column.
3. Customer, delivery, progress, audit, or summary information in a 320px side column at `xl` when useful.
4. `DocumentSection` for meaningful business groupings and `DocumentSummary` for totals.
5. `DocumentEventTimeline` only when history is relevant to the task or audit trail.

### Create or edit page

1. Use `DocumentFormLayout` for document-like forms.
2. Group fields by business meaning, not by database model.
3. Use `DocumentLineEditor` for editable line items and keep calculated values read-only.
4. Place validation next to the affected control and provide a page-level summary only when errors span multiple sections.
5. Use `DocumentActionBar` for the primary save or submit action. Preserve entered data when validation fails.

## Responsive behavior

- Nora uses Tailwind's default breakpoints: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, and `2xl` 1536px.
- Desktop prioritizes scan density and aligned columns.
- Tablet reduces side content and preserves the primary work surface.
- Mobile uses cards or compact rows instead of clipped desktop tables.
- Below `lg`, the application sidebar becomes a drawer and the primary content uses the full viewport width.
- Document detail pages become a two-column layout at `xl`; before that, secondary content follows the main content in a single column.
- Desktop tables may switch to mobile rows below `md` when horizontal compression would obscure decision-critical fields.
- Shared page content uses the application shell's maximum width of 1680px and responsive padding; feature pages should not add a competing page-width container.
- Horizontal scrolling is reserved for timelines, maps, diagrams, and compact metric strips where partial next-item visibility signals more content.
- MES controls remain reachable with one hand and use a minimum 44px target.

## UI states

- **Loading:** use a skeleton or progress treatment that preserves the final layout footprint. Avoid replacing an entire page with a centered spinner.
- **Empty:** state what is missing and provide one relevant next action when the user can resolve it. Do not add decorative copy that does not help complete a task.
- **Error:** keep recoverable context visible, explain the failed operation, and offer retry or correction where applicable.
- **Success:** confirm the completed action near its scope or with an announced toast/status message; do not leave permanent success banners after routine actions.
- **Disabled:** use only when an action is genuinely unavailable. Prefer enabled submission with discoverable validation over unexplained disabled buttons.
- **No permission:** explain that access is restricted without exposing protected data, and provide the appropriate navigation or contact path.
- **Stale or refreshing data:** retain the last valid result, indicate refresh activity subtly, and avoid resetting filters or scroll position.

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
- Does the page reuse the canonical shared components instead of recreating local variants?
- Are Chinese terminology, dates, currency, quantities, and units formatted consistently?
- Are desktop, tablet, mobile, loading, empty, error, and success states accounted for?
- Do charts, rings, icons, and other fixed-shape graphics explicitly prevent one-axis flex or grid compression?
