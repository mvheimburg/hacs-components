# Aegis Panel Card — approved design

Approved in conversation on 2026-09-17. Repository: `mvheimburg/lovelace-ajax`.
The supplied spec is the baseline; this document settles its open questions.

## Product
One frontend-only HACS Dashboard package with `custom:aegis-panel-card` and
`custom:aegis-device-card`, bundled as `dist/aegis-panel-card.js`. System card
summarizes the Ajax installation and groups physical devices, not entity lists.
Device card supports room popups and accepts an exact device ID or unique name.
Ambiguous names show a helpful selection error. No new integration or Python.

## Discovery and health
Use HA entity/device/area/label registries. Scope to the `aegis_ajax` entity
platform; never infer membership from entity suffixes alone. Resolve roles by
recognized Aegis label, then appropriate domain/device class, then suffix;
retain every matching entity when a device has multiple sensors of one role.
Use registry device names, including user names, and registry area names.
Unknown roles remain visible in Other details, with HA more-info access.
Disabled entities are excluded from readings and counted once with a link to
HA entity settings. Do not assume the spec's example count of four.

Smoke or heat on triggers alarm takeover showing every active detector, area,
and elapsed time. Health includes tamper, problem, offline (connectivity off or
an enabled entity unavailable), battery below configured threshold, bypass and
available firmware updates. Missing roles are omitted; unknown, missing states,
and unavailable are never clear/off. Online means positive connectivity evidence
and no unavailable readings; otherwise report connectivity unknown. Sort alarms,
then problems/tamper/bypass, offline, low battery, quiet (unknown still visible).
Low battery supports numeric sensor percentages and binary battery sensors.
Aegis bypass can mean tamper-only deactivation: show available
`deactivation_kinds` and never falsely describe every bypass as full exclusion.
Registry failures show a recoverable error, not a healthy empty system. React to
registry and HA state updates and clean up listeners when cards detach.

## UI and actions
Keep both card types and both default/Bubble presets. System card status shows
counts, online/offline/unknown and lowest known battery; rows show device/area,
alarm, battery, signal, tamper and bypass. Tap opens accessible device details.
Temperature is optional first-class information. Scope all actions to selected
Aegis devices and available bypass switches. `allow_bypass: false` by default;
opt-in reveals individual and bulk bypass/restore actions. All actions require
an explicit confirmation naming scope; cancel makes no call. Show pending and
service errors; do not assume successful service response changed device state.
Optional `alarm_entity` opens native HA alarm more-info, preserving PIN handling.
Never persist alarm PINs or invent supported arming modes.

Config common: `appearance: default | bubble`, `show_temperature: boolean`
(default true), `battery_warning: number` (default 20, range 0–100),
`allow_bypass: boolean` (default false), optional `title`.
Panel adds `group_by: area | device | none` (default area), optional
`alarm_entity`. Device card requires `device` (ID or exact unique name).
Visual editors expose the same options and preserve unrelated YAML keys.
English and Norwegian Bokmål UI copy selected from HA language. Bubble CSS uses
all shared variables named in the supplied spec; alarm/tamper remain distinct.
Use semantic controls, responsive layout, keyboard-accessible details and confirmation.

## Build and validation
TypeScript/Lit/Rollup, browser Vitest/Playwright following sibling conventions.
Committed deterministic bundle, npm ci/test/lint/typecheck/build. CI checks bundle
freshness and HACS plugin validation. Main release workflow uses package version
for tag and release asset; include README screenshot, license and installation,
configuration, discovery, disabled-entity and bypass documentation.
Tests cover actual model results and DOM/actions, registry lifecycle, failures,
unknown readings, scope exclusion, multiple sensors, thresholds and confirmation.
No live HA instance is available: disclose simulated HA browser verification.

## Alternatives and boundaries
Auto discovery is preferred to manual entity lists, which recreate the original
maintenance burden. Two cards share one data model instead of separate packages.
Native HA alarm controls avoid duplicating evolving PIN/capability rules.
No hub configuration, schedules, camera streams, or unrelated integrations.
Implementation is authorized; publishing to main remains a separate action.

## Upstream evidence
Read-only source snapshot `/tmp/aegis-panel-reference`, commit
`f4889453260d62fc2a95f57828c92ab30bcc71c0` from
https://github.com/bvis/aegis-hass. Domain, alarm panels, role labels and bypass
semantics verified against source rather than relying on example entity IDs.
