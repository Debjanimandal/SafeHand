# wallet_extension_design.md
## Proofly Wallet Extension Design System
### Monochrome popup UI, approval flows, smart contract confirmations, and private wallet interaction design

This document defines the visual and interaction design for the Proofly browser wallet extension.

It should be used together with `wallet_extension.md` and the website design file.

The extension design must feel like the same product as the wallet website, but more compact, more private, and more approval-focused.

---

# 1. Design goal

The extension should feel:
- secure,
- private,
- sharp,
- minimal,
- high-trust,
- compact,
- black-first,
- monochrome,
- premium,
- deliberate.

The extension is not a marketing page.
It is a decision surface.

Every screen should make approval easier to understand, but harder to confuse.

---

# 2. Core visual identity

## Primary palette
- Background: near-black
- Popup surface: deep charcoal
- Secondary surface: darker gray
- Border: faint gray
- Text: off-white
- Muted text: soft gray
- Positive state: monochrome bright confirmation only
- Warning state: restrained high-contrast neutral warning
- Error state: deep red used sparingly and only when necessary

## No-color policy
Do not use bright color accents in the normal wallet UI.

The wallet extension should stay monochrome so the user focuses on:
- safety,
- action content,
- approval context,
- trust boundaries.

---

# 3. Design principles

## 3.1 Security first
The popup must always explain what is happening.

## 3.2 Minimal visual load
Keep the interface small, calm, and legible.

## 3.3 One decision at a time
Do not show too many actions at once.

## 3.4 Trust through clarity
Every signature or transaction approval must be readable in plain language.

## 3.5 Compact but premium
The extension should feel like a polished security tool, not a browser add-on.

---

# 4. Recommended extension UI stack

## Core
- React
- TypeScript
- Vite or a browser extension build pipeline

## Design system
- Tailwind CSS
- shadcn/ui patterns adapted to popup scale
- Radix primitives where needed
- Lucide React icons

## Motion
- Motion for React for small micro-animations
- GSAP only if needed for onboarding or intro sequences, not for all popups

## Optional utilities
- clsx
- tailwind-merge
- class-variance-authority
- zod

The extension should stay lighter than the website.

---

# 5. Extension layout system

## Popup dimensions
Design for a compact popup first.

Common layout:
- narrow width
- stacked vertical structure
- fixed action bar at the bottom
- scrollable detail body

## Main spacing
- compact padding,
- small but breathing component gaps,
- clear hierarchy,
- no visual clutter.

## Shape language
- rounded cards,
- soft corners,
- subtle outlines,
- strong separation between summary and approval zone.

---

# 6. Extension screens

## 6.1 Locked screen
Shows:
- logo,
- unlock input,
- password field,
- recovery access,
- minimal help text.

## 6.2 Unlocked home
Shows:
- wallet address,
- active chain,
- human proof state,
- policy state,
- recent activity,
- quick actions.

## 6.3 Connect request
Shows:
- website domain,
- account being requested,
- trust note,
- approve / reject.

## 6.4 Sign-in request
Shows:
- challenge text,
- requesting website,
- wallet address,
- approve / reject.

## 6.5 Signature request
Shows:
- exact message content,
- origin website,
- purpose if available,
- approve / reject.

## 6.6 Transaction request
Shows:
- method,
- target contract,
- value,
- token,
- chain,
- estimated gas,
- safety summary,
- approve / reject.

## 6.7 Proof request
Shows:
- proof provider,
- action name,
- scope,
- what gets revealed,
- what stays private,
- start / cancel.

## 6.8 Policy request
Shows:
- agent name,
- spend limit,
- duration,
- contract allowlist,
- approve / reject.

## 6.9 Media signing request
Shows:
- file name,
- file hash,
- signer address,
- proof status,
- approve / reject.

---

# 7. Popup hierarchy

Every popup should follow this structure:

1. Title
2. Source
3. Action summary
4. Detailed review
5. Trust state
6. Primary confirm button
7. Secondary reject button

This pattern keeps the popup stable across all request types.

---

# 8. Popup design rules

## Buttons
- one primary button,
- one secondary button,
- no clutter.

## Inputs
- only when necessary,
- always clearly labeled,
- never visually noisy.

## Text
- short,
- direct,
- precise,
- no marketing language inside approval windows.

## Security warnings
- subtle but visible,
- reserved for chain risk, contract risk, or policy mismatch.

---

# 9. Motion rules

Use motion sparingly.

## Good uses
- popup open,
- card expand,
- approval success,
- policy activation,
- chain switching,
- proof verified state.

## Bad uses
- constant motion,
- bounce-heavy transitions,
- flashy visual effects,
- decorative loops.

Motion should reinforce trust and polish, not distract.

Motion for React is well suited to these micro interactions, especially layout changes and hover states. citeturn901022search11turn901022search17turn901022search8

---

# 10. Smart contract confirmation UI

Contract popups are the most important extension surface.

They must display:
- contract name if known,
- contract address,
- method name,
- call summary,
- ETH or token value,
- chain id,
- expected gas,
- risk state,
- proof requirement state,
- policy requirement state.

The user should understand the transaction before approving.

The extension should never hide the target contract behind generic wording.

---

# 11. Chain switching UI

When the wallet needs chain switching:
- show current chain,
- show target chain,
- explain why,
- show if the current request depends on the change,
- require explicit approval.

Switching networks should feel controlled and safe.

---

# 12. Proof UI

The proof flow should feel like a trust ritual.

## Proof screen should show
- proof provider,
- requested action,
- nullifier scope,
- privacy statement,
- verification progress,
- final verified state.

Use a calm central card with minimal motion.

---

# 13. Policy UI

The AI leash screen should be extremely clear.

Show:
- agent name,
- spending cap,
- asset allowlist,
- contract allowlist,
- expiry,
- current usage,
- status.

Allow editing through small, precise forms.

Use meters and compact chips rather than large decorative elements.

---

# 14. Media UI

The media signing screen should show:
- file hash,
- media type,
- signer address,
- proof state,
- timestamp,
- result.

Include a clear hash preview area and a compact verification result block.

---

# 15. Extension dashboard states

The extension should display:
- locked,
- unlocked,
- connected site,
- human verified,
- policy active,
- proof pending,
- transaction pending,
- approval required,
- confirmed,
- rejected,
- error.

Each state must be immediately recognizable.

---

# 16. Accessibility rules

- large enough touch targets,
- clear focus outlines,
- keyboard-friendly navigation,
- readable text,
- sufficient contrast,
- reduced motion support,
- no color-only cues,
- no tiny critical text.

---

# 17. Component set

Adapt a compact subset of the same system used by the website.

Recommended components:
- Button
- Card
- Badge
- Dialog
- Drawer or Sheet
- Tabs
- Progress
- Toast
- Input
- Label
- Separator
- Scroll Area
- Tooltip
- Dropdown Menu
- Command palette patterns where helpful

These should all be tuned for a much smaller viewport than the website.

---

# 18. Recommended extension file structure

```text
apps/extension/
├── src/
│   ├── background/
│   ├── injected/
│   ├── content/
│   ├── popup/
│   │   ├── views/
│   │   ├── components/
│   │   └── state/
│   ├── options/
│   ├── wallet/
│   ├── zk/
│   ├── policy/
│   ├── chain/
│   ├── media/
│   ├── contracts/
│   ├── storage/
│   └── shared/
```

---

# 19. Design-to-code alignment

The extension and website should share:
- same color tokens,
- same typography logic,
- same button styles,
- same badge language,
- same spacing system,
- same icon set.

But the extension must be more compact and more security-focused.

---

# 20. Animation guidance for extension

Use:
- subtle fade,
- small scale transitions,
- layout shifts only when necessary,
- short easing,
- no decorative motion loops.

Use GSAP only for onboarding or non-critical intro scenes if needed. The popup UI itself should lean more on Motion for React for small, deterministic micro-interactions. GSAP remains better suited to timeline-driven story flows. citeturn901022search9turn901022search2turn901022search15turn901022search18

---

# 21. Final extension rule

The extension should feel like a monochrome vault.

It should not feel playful.
It should not feel noisy.
It should not feel like a browser add-on.

It should feel like a handcrafted security product with precise approvals and clean trust surfaces.
