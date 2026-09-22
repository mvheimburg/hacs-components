# Light Group Card — approved design

## Purpose

Replace the household's Bubble lighting layout with an independently installable
Lovelace card in `mvheimburg/lovelace-light-group`. Preserve the screenshot's
floor/zone headings, room sections, named light pills and All off action while
matching the existing workspace cards. No Bubble Card dependency is required.

Approved by the user on 2026-09-22. The screenshot supplies presentation and
names, not actual entity IDs; installation examples must use explicit placeholders.

## Approach

Use one card per floor or zone, containing ordered room sections. Home Assistant's
dashboard arranges those cards into columns, and each card adapts its light grid
to its available width. This keeps the outdoor zone independently placeable.

Alternatives considered: a single whole-house card would require a second layout
system inside Lovelace; one card per room would repeat headers and make floor-wide
All off awkward. One card per zone best matches the supplied layout.

## Presentation and interaction

- Header: user-defined title and icon, All off, and a 44px round Configure cog.
- Room sections: optional icon and user-defined heading, then a responsive grid
  of compact light pills. Preserve configured ordering and custom names.
- Each pill: 44px icon toggle and name/details button. On lights use a tinted
  surface; off lights are neutral; unavailable lights have explicit status and
  disabled device actions. Do not convey state through color alone.
- The name/details button opens a card-styled lighting panel. Dimmable lights
  expose an accessible brightness slider; changes commit on release or keyboard
  change, not for every pointer movement. An explicit More controls button opens
  Home Assistant more-info for color, color temperature and device-specific options.
- Brightness is a controllable setting, not a sensor reading; it opens controls
  rather than a recorder history. No sensor entities are displayed in this version.
- All off targets only configured, available, currently on lights, deduplicated
  across sections. It never targets all lights in Home Assistant.
- Configure opens a styled help panel directing users to the dashboard's visual
  card editor. Bindings and appearance remain dashboard configuration, not a new
  integration or independently persisted browser settings.
- Support default and Bubble appearances, dark/light themes and the same six
  color schemes as sibling cards. Use HA/Bubble variables and visible keyboard
  focus. Dialogs support Escape, focus management and narrow screens.

## Configuration

Register `custom:light-group-card` and a visual editor. Configuration contains
`title`, `icon`, `appearance`, `color_scheme`, and ordered `sections`. Each section
contains a `name`, optional `icon`, and ordered `lights`; each light contains an
`entity` and optional `name` and `icon`. Accept only `light.*` entities, including
existing HA light groups. No backend group creation or automation is required.

The editor supports adding, removing and reordering sections/lights, with entity
selectors, text fields and appearance selectors. All fields are editable without
YAML. It uses Lovelace's config-changed contract; persistence belongs to HA's
dashboard Save/Cancel flow. Empty configuration renders a useful setup prompt.

## State and service behavior

Read `hass.states` on every update. Use public `light.turn_on` and `light.turn_off`
services with explicit entity IDs; brightness payloads use numeric
`brightness_pct`. Determine brightness support from the entity's supported color
modes. On/off-only lights do not show a slider.

Mark affected controls pending and block overlapping individual/bulk requests.
Keep rendered state authoritative: service success alone does not synthesize an
entity state. Await matching HA state updates with a bounded timeout and show a
localized message if confirmation never arrives. Rejected requests show a visible
error and restore the authoritative brightness. Disable actions during connection
loss or missing/unavailable entity data. Clear pending UI state when configuration
changes and ignore completions belonging to old configuration.

## Localization

Typed English/Bokmål dictionaries are shared by card and editor. Follow
`hass.language`, then `hass.locale.language`, normalize case/underscores, and map
`nb`, `no` and `nn` variants to Bokmål. Unsupported languages use English. Preserve
custom names and HA friendly names. Format brightness percentages with the user's
formatting locale/preferences; service payloads stay numeric. Static picker
metadata may remain English, documented in the README.

## Packaging and verification

Use sibling cards' Lit/TypeScript, Rollup and browser-test conventions, with all
source and supporting files contained in this component. Include a tracked
`dist/light-group-card.js`, HACS metadata, license, README, changelog, consistent
package/lock versions, CI and version-driven release workflow.

Browser tests cover toggles and exact bulk targets, brightness capability and
payloads, pending/timeout/failure behavior, unavailable/disconnected states,
configuration changes during requests, editor operations, both languages and
aliases, live language changes, custom names and regional formatting. Run tests,
lint, typecheck and build; inspect rendered desktop/mobile and dark/light previews.

Add the component as an umbrella submodule and to `scripts/hacs-add-all.js`, update
the umbrella README and run `python3 scripts/check-hacs-list.py`. Commit component
work before the umbrella gitlink. Publishing is outside the current authorization.

GitHub CLI is currently unauthenticated. When the component exists, use:

```sh
gh repo edit mvheimburg/lovelace-light-group --description "A Home Assistant dashboard card for grouped household lighting, with room sections, light controls and zone-wide all off." --add-topic home-assistant --add-topic homeassistant --add-topic hacs --add-topic hacs-dashboard --add-topic lovelace --add-topic lovelace-card --add-topic lovelace-custom-card --add-topic lighting
```
