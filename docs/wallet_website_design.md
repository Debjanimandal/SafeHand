# wallet_website_design.md
## Proofly Wallet Website Design System
### Minimal monochrome, premium dark UI, dashboard-first wallet website

This document defines the visual and interaction design for the Proofly wallet website.

It is the design reference for the public website, wallet dashboard, sign-in flow, proof pages, transaction pages, media signing pages, marketplace pages, and AI-agent control pages.

This file should be used together with `website_design.md` if that file already exists in the project. This document focuses specifically on the wallet website surface.

---

# 1. Design goal

Build a website that feels:
- premium,
- quiet,
- dense but breathable,
- technical but elegant,
- monochrome,
- dark,
- trustworthy,
- handmade.

The website should feel like a high-end wallet product, not a startup landing page.

---

# 2. Visual identity

## Primary palette
- Background: near-black
- Surface: deep charcoal
- Elevated surface: slightly lighter charcoal
- Border: subtle gray
- Text: off-white
- Secondary text: muted gray
- Accent: monochrome white, silver, and restrained grayscale only

## Color rule
No colorful UI accents in the core product.

The product should rely on:
- contrast,
- spacing,
- blur,
- shadow,
- typography,
- motion,
- structure.

---

# 3. Design principles

## 3.1 Clarity over decoration
Every screen should answer:
- Where am I?
- What state is my wallet in?
- What can I do next?
- What is safe?
- What needs approval?

## 3.2 Monochrome hierarchy
Use value contrast instead of hue contrast:
- bright text for primary actions,
- muted text for secondary content,
- subtle borders for separation,
- sharper contrast for critical prompts.

## 3.3 Density with breathing room
Wallet dashboards contain a lot of information, but they must not feel crowded.

Use:
- generous padding,
- structured grid,
- grouped cards,
- limited vertical noise,
- strong spacing rhythm.

## 3.4 Motion with restraint
Motion should feel premium, not playful.

Use motion to:
- soften transitions,
- reveal state changes,
- confirm actions,
- guide attention,
- make popups feel alive.

## 3.5 Trust-first layout
Security and state should be visible before visuals.

Show:
- address,
- network,
- verification status,
- policy status,
- recent signatures,
- recent transactions,
- proof history.

---

# 4. Recommended frontend stack

## Core
- Next.js App Router
- React
- TypeScript

## Design system
- Tailwind CSS
- shadcn/ui
- Radix UI primitives under shadcn
- Lucide React icons

## Motion
- Motion for React for component transitions and hover effects
- GSAP for hero story sections and scroll-driven sequences

## Data visualization
- Recharts for charts and activity graphs

## Utilities
- clsx
- tailwind-merge
- class-variance-authority
- zod
- date-fns

## Optional helpers
- next-themes for dark mode persistence
- sonner or shadcn toast patterns for notifications

---

# 5. Why these libraries

shadcn/ui is designed as a customizable component foundation, not a closed component library. It works with Tailwind and is built to be extended into your own system. Its dark mode and theming docs also map well to token-driven monochrome design. citeturn901022search10turn901022search13turn901022search4turn901022search16

Motion for React is a production-grade animation library for React, with layout animations, gesture support, and smooth hover/scroll interactions. Motion also supports JavaScript and Vue, but for Proofly the website stack should stay React-first to match Next.js. citeturn901022search11turn901022search17turn901022search8turn901022search14

GSAP provides fast, responsive animations and ScrollTrigger for scroll-based storytelling and timelines. That makes it ideal for the hero section, feature explainer, and transition-heavy product story blocks. citeturn901022search9turn901022search2turn901022search15turn901022search18

Recharts is a React chart library for clean dashboard graphs and activity visualizations. citeturn901022search3

---

# 6. Layout system

## Base grid
- 12-column desktop grid
- 4-column or 2-column tablet grid
- single-column mobile stack

## Global spacing
- outer page padding: 24–40px desktop, 16–20px mobile
- card padding: 20–28px
- internal section gap: 16–24px
- page section gap: 48–80px
- micro gap: 8px
- component gap: 12–16px

## Shape language
- large rounded corners for shells and main cards
- smaller rounding for controls and chips
- almost square geometry for data tables

## Border language
- thin borders
- low-opacity borders
- no heavy outlines unless in focus or danger states

---

# 7. Typography

## Tone
Modern technical luxury.

## Suggested hierarchy
- H1: large, bold, tight tracking
- H2: medium-large, confident
- H3: section heading
- Body: readable, not oversized
- Metadata: small, muted, uppercase or semi-uppercase if needed

## Typography rules
- Avoid too many font weights.
- Prefer one display font and one clean UI font, or a single excellent sans-serif family.
- Keep line length controlled.
- Use monospace only for addresses, hashes, chain IDs, and raw values.

---

# 8. Dark mode styling rules

The site should be dark by default.

Use:
- black background,
- elevated charcoal panels,
- soft shadow,
- subtle gradients only,
- minimal glow.

The shadcn theming model uses tokens like `background`, `foreground`, `border`, and dark overrides through `.dark`, which suits this monochrome system well. citeturn901022search4turn901022search0

---

# 9. Page-by-page design

## 9.1 Home page
Purpose:
- explain the wallet,
- show the product value,
- guide install and connect flow.

Structure:
- hero headline,
- one sharp value statement,
- wallet preview,
- three trust pillars,
- CTA row,
- minimal scroll story.

Motion:
- fade-in hero,
- slight parallax on wallet card,
- GSAP scroll reveal for sections.

---

## 9.2 Wallet dashboard
Purpose:
- show the current wallet state.

Must show:
- wallet address,
- copy button,
- active chain,
- verification state,
- policy state,
- recent activity,
- recent transaction graph,
- proof history.

Layout:
- left side main identity card,
- right side state cards,
- lower section for tables and graphs.

---

## 9.3 Sign-in page
Purpose:
- authenticate with wallet.

Must show:
- sign-in intent,
- challenge message,
- wallet account,
- signature prompt status,
- authentication status.

The user should always know exactly what is being signed.

---

## 9.4 Verify Human page
Purpose:
- launch proof-of-human flow.

Must show:
- verification status,
- proof provider,
- action scope,
- timestamp,
- retry state,
- sync state.

Visual approach:
- one central trust card,
- a calm verified badge,
- strict CTA hierarchy.

---

## 9.5 Marketplace page
Purpose:
- show human-gated tasks.

Must show:
- locked / unlocked status,
- proof requirement,
- task category,
- payout or reward,
- submission history.

Use a tiled card layout with a strong locked-state style.

---

## 9.6 Transaction page
Purpose:
- preview and confirm chain actions.

Must show:
- contract,
- method,
- amount,
- gas,
- network,
- recipient,
- risk warning,
- final approve/reject actions.

Use one large confirmation card and one compact detail stack.

---

## 9.7 AI agent page
Purpose:
- control delegated permissions.

Must show:
- policy summary,
- spend cap,
- expiry,
- contract allowlist,
- active usage,
- approval history.

Use clear meters and a conservative control layout.

---

## 9.8 Media signing page
Purpose:
- hash and sign files or voice content.

Must show:
- filename,
- hash,
- signature,
- proof linkage,
- stored state,
- verification result.

Use a split layout with upload area and hash preview area.

---

## 9.9 Activity page
Purpose:
- give trust visibility.

Must show:
- proofs,
- signatures,
- transactions,
- policy changes,
- sync events.

Use a table plus compact timeline cards.

---

# 10. Animation direction

## Micro motion
Use Motion for React for:
- hover lift,
- button press,
- panel enter,
- state transitions,
- layout changes,
- chip fades.

Motion supports smooth layout animations with a single `layout` prop and shared element transitions with `layoutId`, which fits wallet dashboards very well. citeturn901022search17turn901022search8turn901022search5

## Story motion
Use GSAP for:
- hero intro,
- section reveal,
- scroll-linked trust story,
- feature sequence,
- dashboard showcase.

GSAP’s timeline and ScrollTrigger tools are ideal for controlled premium storytelling sequences. citeturn901022search15turn901022search6turn901022search12turn901022search2

## Motion restraint
Avoid:
- exaggerated bounce,
- playful easing,
- noisy transitions,
- constant animation.

The product should feel calm and expensive.

---

# 11. Component library

Use shadcn components as the core building blocks:

- Button
- Card
- Badge
- Dialog
- Sheet
- Drawer
- Tabs
- Table
- Tooltip
- Dropdown Menu
- Command
- Input
- Label
- Separator
- Scroll Area
- Toast / Sonner pattern
- Progress
- Skeleton
- Accordion
- Popover

These fit the design language and are easy to customize into a monochrome wallet system. citeturn901022search10turn901022search13turn901022search16

---

# 12. Wallet-specific UI patterns

## Address display
- monospace,
- copy button,
- shortened format,
- hover expands full value.

## Chain chip
- small,
- high contrast,
- always visible.

## Verification badge
- subtle but clear,
- never overly colorful,
- use monochrome confirmation state.

## Action CTA
- large enough,
- single primary action per card,
- secondary actions visually quieter.

## Signature request modal
- centered,
- dimmed backdrop,
- contract summary,
- request reason,
- approve / reject split.

## Transaction preview drawer
- bottom drawer or sheet,
- scrollable details,
- final confirmation fixed at bottom.

---

# 13. Dashboard graphs

Use graphs sparingly and only where they help trust and activity clarity.

Recommended charts:
- daily transactions,
- proof events over time,
- policy usage over time,
- wallet activity trend.

Prefer:
- simple line charts,
- compact bar charts,
- no loud gradients,
- no flashy chart skins.

Recharts is a good fit for this type of React dashboard visualization. citeturn901022search3

---

# 14. Responsive behavior

## Desktop
- full dashboard grid,
- side panels,
- persistent state cards,
- large tables.

## Tablet
- compressed sidebars,
- stacked cards,
- collapsible sections.

## Mobile
- single-column layout,
- bottom sheet for approvals,
- sticky primary action,
- compact cards.

The website should remain fully usable on mobile without collapsing trust-critical controls.

---

# 15. AI agents for design implementation

Use internal AI agents to keep design consistent.

## Suggested agents
- Design system agent: keeps tokens and spacing consistent.
- Motion agent: writes animation rules.
- Component agent: turns sections into reusable UI blocks.
- Copy agent: keeps text short and premium.
- QA agent: checks contrast, hierarchy, and spacing.
- Accessibility agent: checks keyboard, focus, and motion reduction.
- Dashboard agent: shapes graphs and activity views.
- Wallet popup agent: handles approval modal UX.

These are workflow roles, not runtime product features.

---

# 16. Accessibility rules

- strong contrast on dark background,
- visible focus states,
- keyboard navigable popups,
- readable error states,
- reduced motion support,
- no important meaning conveyed by color alone,
- clear labels for all sensitive actions.

---

# 17. Recommended installs

For the website:
- `next`
- `react`
- `typescript`
- `tailwindcss`
- `shadcn/ui`
- `lucide-react`
- `motion`
- `gsap`
- `recharts`
- `zod`
- `clsx`
- `tailwind-merge`
- `class-variance-authority`
- `date-fns`

Optional:
- `next-themes`
- `sonner`
- `zustand` for local UI state

---

# 18. Design tokens

Use tokens rather than hardcoded colors.

## Suggested tokens
- `background`
- `foreground`
- `card`
- `card-foreground`
- `muted`
- `muted-foreground`
- `border`
- `input`
- `ring`
- `accent`
- `destructive`

These should be mapped to black and monochrome values only.

---

# 19. Interaction principles

- Every click must feel deliberate.
- Every approval must feel important.
- Every dashboard state must be easy to read in 2 seconds.
- Every popup must reduce friction without reducing clarity.
- Every transaction prompt must be visually unmistakable.
- Every success state should feel calm, not celebratory.

---

# 20. Final website design rule

The wallet website should look like a dark, premium, minimal control room.

It should never feel noisy, gamified, or colorful.

It should feel handcrafted, precise, and trusted.
