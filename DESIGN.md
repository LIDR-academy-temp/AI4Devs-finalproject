---
name: Warm Utilitarian Care
colors:
  background: '#F8FAFC'
  foreground: '#0F172A'
  card: '#FFFFFF'
  card-foreground: '#0F172A'
  popover: '#FFFFFF'
  popover-foreground: '#0F172A'
  primary: '#0D5F4D'
  primary-hover: '#094437'
  primary-foreground: '#FFFFFF'
  secondary: '#EFF6FF'
  secondary-foreground: '#1E3A8A'
  tertiary: '#C2410C'
  tertiary-foreground: '#FFFFFF'
  muted: '#F1F5F9'
  muted-foreground: '#334155'
  accent: '#ECFDF5'
  accent-foreground: '#065F46'
  destructive: '#991B1B'
  destructive-surface: '#FEF2F2'
  destructive-border: '#FCA5A5'
  border: '#CBD5E1'
  input: '#64748B'
  ring: '#0D5F4D'
  status-pending-bg: '#F8FAFC'
  status-pending-text: '#334155'
  status-pending-border: '#94A3B8'
  status-reserved-bg: '#FFF7ED'
  status-reserved-text: '#9A3412'
  status-reserved-border: '#FDBA74'
  status-purchased-bg: '#EFF6FF'
  status-purchased-text: '#1E40AF'
  status-purchased-border: '#93C5FD'
  status-shipped-bg: '#ECFDF5'
  status-shipped-text: '#065F46'
  status-shipped-border: '#6EE7B7'
  status-unavailable-bg: '#FEF2F2'
  status-unavailable-text: '#991B1B'
  status-unavailable-border: '#FCA5A5'
  whatsapp: '#15803D'
  whatsapp-hover: '#166534'
  whatsapp-foreground: '#FFFFFF'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

# Design system: Warm Utilitarian Care

**Assisted Shopping Platform: ComproParaTi** · **Version:** 1.4 · **Date:** November 15, 2026

Part of the project documentation ([readme](readme.md)). This document owns the visual design: tokens, components, and layout. Behavior, screens, and interface text are defined in [UX design](docs/02-UX-DESIGN.md) and the [PRD](docs/01-PRD.md); where they differ from this document or from the Stitch screens, they take precedence.

- **Target:** web application, mobile first from 360px, with a responsive desktop layout that reuses the same components.
- **Foundation:** a custom shadcn/ui theme on Tailwind CSS ([Architecture §1.6](docs/03-ARCHITECTURE.md#16-dependencies)). The tokens in the front matter map to the theme's CSS variables.

## Brand & Style

This design system delivers a reassuring, human-centric assisted shopping experience built for older adults, cross-border family shoppers, and users with low digital literacy. Trust is established not through decorative flair, but through legibility, generous touch targets, immediate status comprehension, and interactions that never leave a user feeling trapped or confused.

The visual style is **Warm Modern Utilitarianism**:
- **Radical Clarity**: Every control states what it does. Every button and interactive trigger pairs an icon with a text label; there are no icon-only controls, no fragile micro-gestures, and no floating form labels that vanish or shrink when tapped.
- **Supportive Tactility**: Interactive controls are 48px to 56px tall, with friendly rounded corners and borders that clearly separate interactive regions.
- **Multimodal Feedback**: Visual cues never rely on color alone. Statuses, state changes, and warnings combine color with an icon and plain-language text.
- **Calm Resilience**: Undo patterns and one-tap bridges to WhatsApp protect users from costly mistakes.

### Content Constraints
- Show only what the PRD defines; [PRD §5](docs/01-PRD.md#5-scope) and [§18](docs/01-PRD.md#18-future-features) list what is out of scope. Do not add prices, payments, stock levels, delivery-time estimates, package tracking, a group wall, or in-app chat. There is no urgency field; urgency goes in notes (FR-13).
- Never promise a notification the product does not send. Members get a daily summary email (BR-31); buyers are told about changes on WhatsApp by a person (FR-35).
- A person (recipient) has only a name, detail rows, and notes (FR-09). Do not add photos, ages, or relationships.
- Never show rule or requirement IDs (such as `BR-15`) in the interface.
- Dates follow the user's language (Spanish: "18 de octubre de 2026" or 18/10/2026). Do not hard-code country names or destinations.
- All interface text comes from the translation files, using the strings in [UX §2.10](docs/02-UX-DESIGN.md#210-spanish-interface-strings).

## Colors

All text meets WCAG 2.1 AA ([UX §2.8](docs/02-UX-DESIGN.md#28-accessibility-language-and-responsive-behavior)): at least 4.5:1 for text and 3:1 for the borders of form controls.

### Core Roles
- **Primary (`#0D5F4D`)**: Deep spruce emerald. Primary buttons, active navigation, checked controls, and focus rings. Hover and active: `#094437`.
- **Secondary (`#EFF6FF` surface, `#1E3A8A` text)**: Information callouts and secondary highlights.
- **Tertiary (`#C2410C`)**: Warm terracotta, used sparingly for attention states such as the "Actualizado" tag.
- **Accent (`#ECFDF5` surface, `#065F46` text)**: Confirmation and reassurance notices.
- **Destructive (`#991B1B` text and icons, `#FEF2F2` surface, `#FCA5A5` border)**: Delete and remove actions, and field errors.
- **Neutrals**: Canvas `#F8FAFC`, cards `#FFFFFF`, muted surfaces `#F1F5F9`, primary text `#0F172A`, secondary text `#334155`.
- **Borders**: Cards and dividers use `#CBD5E1`. Inputs, checkboxes, and radio buttons use `#64748B`, so their edges reach 3:1 against white.

### Status Color Pairing Rules
Each status from BR-22 has one style, used everywhere: an icon, the label from [UX §2.5](docs/02-UX-DESIGN.md#25-item-statuses-and-actions), and its colors.
- **Pending (Pendiente)**: `#F8FAFC` base, `#334155` text, `#94A3B8` border, empty circle `○`.
- **Reserved (Reservado)**: `#FFF7ED` base, `#9A3412` text, `#FDBA74` border, half-filled circle `◐`.
- **Purchased (Comprado)**: `#EFF6FF` base, `#1E40AF` text, `#93C5FD` border, solid circle `●`.
- **Shipped (Enviado)**: `#ECFDF5` base, `#065F46` text, `#6EE7B7` border, truck or package icon.
- **Unavailable (No disponible)**: `#FEF2F2` base, `#991B1B` text, `#FCA5A5` border, warning triangle `⚠`.

### WhatsApp Action Color
WhatsApp buttons use `#15803D` with white text (5.0:1), hover `#166534`. The brighter brand greens fail the contrast minimum with white text.

## Typography

**Plus Jakarta Sans** is used for headlines, body copy, and controls, loaded with `next/font`.

- **Text floor**: All text is at least `16px`, including helper text, character counters, and status chips ([UX §2.1](docs/02-UX-DESIGN.md#21-design-principles)). Paragraphs and list descriptions use `17px` (`body-lg`) to `18px` (`body-xl`).
- **Headings**: Weights `600` and `700`; `headline-xl-mobile` replaces `headline-xl` below 768px.
- **Persistent Labels**: Form labels use `label-lg` (`16px`, semibold), always visible above the field. Required fields are marked with `*`.

## Layout & Spacing

The layout is **mobile first**, built for 360px to 390px viewports. Desktop uses the same components and screen layouts; only the navigation and the Lists screen change.

### Touch and Interaction Targets
- **48px Minimum Rule**: Every clickable element, including buttons, filter chips, list rows, bottom bar items, checkboxes, and quantity steppers, has a tap area of at least `48px × 48px`. Primary buttons are `52px` to `56px` tall.
- **Separation**: Adjacent interactive controls are at least `8px` apart.

### Responsive Layout Model
- **Mobile (< 768px)**:
  - One scrolling column with a `16px` page margin.
  - Bottom navigation bar, at least `64px` tall, with icon and text tabs (see [Navigation](#navigation)).
  - Bottom sheets for short tasks, such as Mark as shipped and the buyer note.
  - On Lists, the **+ Agregar** floating button sits `16px` above the bottom bar.
- **Tablet & Desktop (≥ 768px)**:
  - The bottom bar becomes a left sidebar (`260px` to `280px`) with the same tabs.
  - Other screens keep the mobile column, centered, up to `640px` wide.
  - From `1024px`, Lists and the item page show the list (`380px` to `420px`) and the selected item page side by side, in a content area up to `1120px` wide. From `768px` to `1023px`, they keep the centered column.
  - Page margins grow to `32px` and column gutters to `24px`.

## Navigation

Which tabs appear, and when, is defined in [UX §2.2](docs/02-UX-DESIGN.md#22-navigation). The header has the group selector on the left and **Actualizar** (↻) and the user's avatar on the right. Tabs pair an icon with text. Tab labels stay at `16px` and are never cut off, so the bottom bar grows to fit them. Each tab is as wide as its label's longest word plus `6px` on each side, so labels in neighboring tabs are at least `12px` apart, plus an equal share of the space left, and at least `48px`. From `360px`, with up to five tabs, a label takes at most two lines and no word breaks; on a narrower screen, a word breaks only when the longest words don't fit the bar together.

## Elevation & Depth

Hierarchy relies on **tonal layering and borders** instead of heavy shadows.

### Elevation Levels
- **Level 0 (Canvas)**: `#F8FAFC`.
- **Level 1 (Cards)**: `#FFFFFF` with a `1.5px` `#CBD5E1` border and a soft shadow (`0 2px 4px rgba(15, 23, 42, 0.04)`).
- **Level 2 (Floating controls and headers)**: the floating **+ Agregar** button, the fixed header, and sticky action bars. Shadow: `0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.06)`.
- **Level 3 (Sheets and dialogs)**: shadow `0 12px 32px rgba(15, 23, 42, 0.16)` over a `rgba(15, 23, 42, 0.5)` backdrop.

### Border Hierarchy
- Resting cards use `1.5px` `#CBD5E1`.
- Active selections and highlighted cards use a `2px` `#0D5F4D` border.

## Shapes

One radius scale is used on every screen size:
- **sm (`6px`)**: Small tags and indicator pips.
- **md (`8px`)**: Inputs, selects, checkboxes, radio tiles, and nested rows.
- **lg (`12px`)**: Buttons and cards.
- **xl (`16px`)**: Top-level containers, bottom sheets (top corners), and dialogs.
- **full (`9999px`)**: Status chips, filter chips, avatars, and the floating **+ Agregar** button.

## Components

Components are shadcn/ui components in `src/components/ui`, styled with these tokens. Icons come from `lucide-react`; the Material Symbols names in the Stitch code are only hints. `lucide-react` has no WhatsApp logo, so WhatsApp buttons use a message icon with the text "Escribir por WhatsApp".

### Focus
Every interactive element shows a visible focus ring on keyboard focus: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.

### Buttons
- **Size**: At least `48px` tall (`52px` for primary actions), `20px` horizontal padding, `16px` semibold text, icon plus text.
- **Primary**: `#0D5F4D` fill, white text; hover `#094437`.
- **Secondary**: `#FFFFFF` surface, `2px` `#CBD5E1` border, `#0F172A` text; hover `#F1F5F9`.
- **WhatsApp**: `#15803D` fill, white text, message icon, text "Escribir por WhatsApp"; at least `52px` tall.
- **Destructive**: `#FEF2F2` surface, `#991B1B` text, `1.5px` `#FCA5A5` border. Signing out is not a destructive action and uses the secondary style.

### Status Chips
- **Shape**: `rounded-full`, at least `32px` tall, padding `6px 14px`.
- **Content**: The status icon and label in `16px` semibold, using the tokens in [Status Color Pairing Rules](#status-color-pairing-rules).
- Chips that only show a status are not interactive. Filter chips are buttons and follow the 48px rule.

### Input Fields & Selectors
- **Size**: At least `50px` tall, padding `14px 16px`, text `16px` to `17px` (which also prevents zoom on iOS Safari).
- **Labels**: Always visible above the field in `label-lg`, with optional help text below. Character counters appear only near a field's limit (BR-32, [UX §2.7](docs/02-UX-DESIGN.md#27-empty-states-loading-and-errors)).
- **Borders**: Resting `1.5px` `#64748B`; focus `2px` `#0D5F4D`; error `2px` `#991B1B` with a warning icon and a plain-language message under the field.
- **Dates**: native date picker, displayed in the user's language format.

### Checkboxes & Radio Controls
- **Size**: `24px × 24px` box inside a row or tile at least `48px` tall; tapping the label toggles it.
- **Style**: Unchecked: white with a `2px` `#64748B` border. Checked: `#0D5F4D` fill with a white check mark.

### Cards & List Rows
- **Card**: `#FFFFFF`, `1.5px` `#CBD5E1` border, `12px` radius, `16px` to `20px` padding.
- **Item Card**: Item name in `headline-md` or `body-xl`, "Para {persona}", quantity, and the status chip at the top right. Actions such as Edit and Delete live on the item page, not on the card.
- **List Rows**: Whole row tappable, at least `48px` tall, with a chevron (`›`) when it opens a page.
- **Updated Tag**: An item edited after it was reserved shows an "Actualizado" tag in tertiary (`#C2410C`) to its buyer until they open it.

### Collapsible Groups & Sheets
- **Collapsible Section Header**: Full-width bar at least `52px` tall with a disclosure arrow, title, and count (for example `▸ Enviados (8)`).
- **Bottom Sheets**: `16px` top corners, a `36px × 5px` `#94A3B8` handle, a close button, and the confirm button fixed at the bottom. On desktop they open as centered dialogs.
- **Sheet Focus**: When a sheet opens, at every screen size, keyboard focus goes to its close button. Below 768px, a sheet never moves first focus to a text field, because the on-screen keyboard would cover the sheet. First focus is never on a destructive action.

## Using the Stitch Screens

The folders in [design/stitch/](design/stitch/) are screens exported from Google Stitch. They show the look and layout of each screen and the components in use. They are a **visual reference only**:

- Do not copy their HTML or scripts. They load Tailwind, fonts, and icons from CDNs, hotlink placeholder photos, and contain demo controls ("Estado simulado", "Simular vacío"). Rebuild each screen with shadcn/ui components and these tokens.
- Their embedded Tailwind configuration uses outdated color and radius values; the front matter of this document is the only source of tokens.
- Their text is a draft. Use the translation files and [UX §2.10](docs/02-UX-DESIGN.md#210-spanish-interface-strings).
- Behavior, fields, and states follow [UX §2.4](docs/02-UX-DESIGN.md#24-key-screens) to [§2.7](docs/02-UX-DESIGN.md#27-empty-states-loading-and-errors) and the PRD. When a screen shows something they don't define, leave it out.

| # | Screen ([UX §2.3](docs/02-UX-DESIGN.md#23-screens)) | Folder | Differences to ignore |
|---|---|---|---|
| 1 | Welcome | `01-welcome` | The script's text still includes a terms sentence and a help line; neither is shown. |
| 2 | One last step | `02-one-last-step` | "Verificada" badge, back arrow, the promise of WhatsApp notices, and the "Al continuar, crearemos tu primer grupo…" notice. The unchecked checkbox must look empty. |
| 3 | Invitation | `03-invitation` | None. The tabs show the states: active, signed out, already a member, and no longer valid. |
| 4 | Lists | `04-lists` | The header button reads "Avisar al comprador". |
| 5 | Add or edit item | `05-item-form` | Price, stock, and "Datos autocompletados" in the link preview (BR-21 shows image, title, and store only); the banner at the top; the notification box; the WhatsApp link. Labels and the Save button follow UX §2.4. |
| 6 | Item page | `06-item-page` | None. The "Estado simulado" switcher shows the variants for each status and role. |
| 7 | People (list) | `07-person-list` | None. |
| 7 | People (person page) | `07-person-detail` | The notes limit is 1,000 characters, not 300 (BR-32). Suggested details are Ropa, Calzado, and Alergias. The rule ID shown in the delete section. |
| 8 | Group | `08-group` | The "Propietaria" tag overflows its row. |
| 9 | To buy | `09-to-buy` | The relationship tag ("Hijo"). |
| 10 | My purchases | `10-my-purchases` | The relationship in "(Nieto)"; quantities with units ("1 par", "1 frasco"). |
| 11 | Mark as shipped | `11-mark-as-shipped` | The screenshot renders in a fallback serif font. |
| 12 | Profile | `12-profile` | The "img" placeholder and the "Conectada" badge in the header; the group row is truncated. |

Screens and states with no Stitch design, such as the address form, the "No lo pude comprar" sheet, and the empty, loading, and error states, are built from UX §2.4 and §2.7 with these components.

[design/screens.md](design/screens.md) maps each screen and state to its route, components, Stitch folder, and design ticket, and says how far the built screen is from its Stitch screen.
