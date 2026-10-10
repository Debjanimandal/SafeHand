# MASTER_DESIGN.md
## Proofly Master Design System (Final Authority)

This document is the single source of truth for:
- visual design
- interaction patterns
- UI architecture
- component system
- motion system
- asset strategy
- consistency rules

Everything MUST follow this file.

---

# 1. DESIGN PHILOSOPHY

Proofly design = **Silent Power**

It must feel:
- premium
- controlled
- intentional
- minimal
- secure
- non-noisy
- handcrafted

NO:
- gradients everywhere
- colorful UI
- flashy animations
- clutter
- startup-looking UI

YES:
- black-first
- monochrome depth
- spatial hierarchy
- motion as feedback
- data clarity

---

# 2. CORE VISUAL SYSTEM

## COLORS

Primary:
- #000000 (true black)
- #0A0A0A (base background)
- #111111 (card background)
- #1A1A1A (elevated surface)

Text:
- #FFFFFF (primary)
- #B3B3B3 (secondary)
- #666666 (muted)

Borders:
- rgba(255,255,255,0.08)

NO COLOR ACCENTS except:
- success → subtle white glow
- error → deep red (#7A1A1A minimal use)

---

## SPACING SYSTEM (STRICT)

8px grid system

Spacing scale:
- 4px
- 8px
- 12px
- 16px
- 24px
- 32px
- 48px
- 64px

RULE:
Never break spacing scale.

---

## TYPOGRAPHY

Primary font:
- Inter / Geist / SF Pro

Secondary:
- Mono (for hashes, addresses)

Rules:
- No more than 3 font weights
- Tight headings
- Medium body text
- Small metadata

---

# 3. COMPONENT SYSTEM (MANDATORY)

Use:

- shadcn/ui (base)
- Radix primitives
- Tailwind CSS

Core Components:
- Button
- Card
- Badge
- Dialog
- Sheet
- Tabs
- Table
- Tooltip
- Dropdown
- Input
- Toast
- Progress
- Skeleton

RULE:
All components must be overridden to match monochrome design.

---

# 4. MOTION SYSTEM

Libraries:
- Motion (React)
- GSAP (only for storytelling sections)

## Motion Types

Micro:
- hover lift (scale 1.01)
- opacity fade
- subtle translateY

Macro:
- page transitions
- layout transitions
- modal transitions

Scroll:
- GSAP ScrollTrigger only for landing

RULE:
No bouncing, no elastic effects.

---

# 5. LAYOUT SYSTEM

## GRID

Desktop:
- 12 column

Tablet:
- 6 column

Mobile:
- 1 column

## CONTAINERS

Max width:
- 1200px

Padding:
- 24px desktop
- 16px mobile

---

# 6. WEBSITE DESIGN RULES

The website is:
- expressive
- structured
- storytelling enabled

Pages:
- Landing
- Dashboard
- Verify
- Marketplace
- Agent Control
- Activity

RULE:
Website can be slightly expressive, but still monochrome.

---

# 7. EXTENSION DESIGN RULES

The extension is:
- strict
- compact
- security-first

Must:
- show intent clearly
- show origin
- show action

Never:
- hide data
- compress critical info

---

# 8. POPUP DESIGN SYSTEM

Every popup MUST follow:

1. Title
2. Source
3. Action summary
4. Details
5. Risk state
6. Approve / Reject

Buttons:
- Primary (solid white)
- Secondary (outline)

---

# 9. DATA VISUALIZATION

Library:
- Recharts

Rules:
- No colorful graphs
- Use white lines
- Low opacity fills
- Minimal gridlines

Charts:
- Activity
- Transactions
- Proof events

---

# 10. ICON SYSTEM

Library:
- Lucide React

Rules:
- stroke icons only
- no filled icons
- consistent size (16 / 20 / 24)

---

# 11. ASSET SYSTEM

Assets required:

- logo (monochrome)
- wallet illustration (optional)
- empty states
- loading skeletons

NO stock images.

---

# 12. INTERACTION RULES

Every action must:
- show feedback
- show loading
- show result

States:
- idle
- loading
- success
- error
- pending

---

# 13. ACCESSIBILITY

- keyboard navigation
- visible focus states
- sufficient contrast
- reduced motion mode

---

# 14. PERFORMANCE RULES

- lazy load heavy sections
- avoid large animations
- minimize re-renders
- optimize bundle size

---

# 15. REQUIRED LIBRARIES

Install:

frontend:
- next
- react
- typescript
- tailwindcss
- shadcn/ui
- lucide-react
- motion
- gsap
- recharts
- zod
- clsx
- tailwind-merge

state:
- zustand

backend:
- supabase-js

---

# 16. DESIGN QA CHECKLIST

Before shipping ANY screen:

- [ ] spacing consistent
- [ ] typography consistent
- [ ] no random colors
- [ ] no broken hierarchy
- [ ] popups readable
- [ ] actions clear
- [ ] motion subtle
- [ ] responsive working

---

# 17. FINAL RULE

If a design feels:
- loud
- colorful
- cluttered
- trendy

→ DELETE IT

Proofly must feel:
**silent, powerful, precise**
