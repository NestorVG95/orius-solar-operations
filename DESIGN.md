# Orius Solar Operations — Design Direction

<!-- impeccable:direction-contract -->
<!--
THESIS: This is a field operations workbench, not a generic SaaS dashboard; the first viewport shows a warranty being connected to its operational trail.
OWN-WORLD: Midnight pine surfaces, sunlit amber actions, oxidized-cyan status signals, hairline measurement rules, and compact field-record typography create a solar inspection log with modern control-room precision.
STORY: A reviewer sees what the system tracks, opens a warranty, and can create a synthetic record without pretending that the old provider connection is still live.
FIRST VIEWPORT: A narrow workbench rail anchors the left; the main stage opens with the promise, a live warranty certificate preview, and a concise activity strip. The primary action is visible in the stage, never hidden in a hero card.
FORM: Operate mode, replacement visual world; field log / instrumentation direction, chosen directly from the supplied brief because the old implementation is a full visual replacement and the project has no usable design system.
-->

## Visual world

The interface borrows from a solar technician's clipboard and an equipment room's instrument panel: midnight blue surfaces for outdoor glare control, warm amber for actions and document issuance, electric blue for connected/verified states, and red only for attention. It is intentionally not a stock purple SaaS dashboard or a glassmorphism panel collection.

## Tokens

- Background: `#081426`; raised surface: `#0E1D32`; elevated surface: `#142844`.
- Text: `#F1F6FF`; muted text: `#A9BAD0`; rule: `#294563`.
- Accent amber: `#FFC857`; accent blue: `#66C7FF`; danger: `#F47B6C`; success/verified: `#8FD8FF`.
- Display face: `Space Grotesk`; body face: `DM Sans`; data face: `IBM Plex Mono`.
- Radius: 14px for surfaces, 9px for controls, full pills only for statuses.
- Elevation uses one soft offset shadow; borders are not stacked with wide glows.

## Composition and behavior

- The app shell uses a 244px navigation rail on desktop and a compact top rail on small screens.
- Dense work areas use rules, tables, and timelines rather than nested cards.
- A single authored entrance exposes the workbench with a short clip-path/opacity reveal; reduced motion removes it.
- Tables become stacked records on mobile. Forms remain single-column and preserve visible labels.
- All primary controls have hover, focus, disabled, loading, success, and error states.

## Content rules

- Demo content is synthetic and visibly labeled.
- Never hard-code provider URLs, API tokens, Google Apps Script IDs, or customer data into UI code.
- Use operational verbs: Create warranty, Locate asset, Transfer tool, Review trail.

## Assets

The refreshed mark and an authored solar-array line illustration live in `portal/assets/`. Future photography prompts and replacement guidance live in `docs/IMAGE-PROMPTS.md`.
