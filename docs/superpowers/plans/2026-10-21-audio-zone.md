# Audio Zone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an Audio Zone integration and an embedded dashboard configuration card.

**Architecture:** One HA config entry and runtime coordinator per zone. Structured
flows and an admin websocket API share validation and persistence. The card edits
draft configuration and never owns playback automation.

**Tech Stack:** Python/Home Assistant, pytest-homeassistant-custom-component,
TypeScript, Lit, Rollup, Vitest and Playwright, following sibling packages.

**Spec:** `docs/superpowers/specs/2026-10-21-audio-zone-design.md`

## Owner's Implementation Amendment

During implementation the owner requested native zone-server volume ramps and
an extension specification for `git@gitlab.com:mvh-home/osdweb.git`. This replaces
the planned HA ramp executor, manual-ramp interruption and ramp setting controls
below. The integration now delegates native startup through optional
`startup_entity` (button, with mute feedback) and does not send number ramp steps.
Volume start/target/duration settings belong to osdweb. Its existing ramp behavior
was verified from source; the missing gentle-start/MQTT extension is specified in
`audio-zone/docs/osdweb-gentle-start.md` and is not implemented in that repository.
The owner supplied both GitHub repositories during implementation. Local initial
component commits are necessary for valid gitlinks under the workspace's explicit
component-commit instruction; no remote push or release is authorized.

## Completion Record

- [x] Configuration validator, structured setup/options and admin read/save API.
- [x] Playback arbitration, separate inactivity timers, confirmed output commands
  and native-startup delegation; no HA volume ramper.
- [x] Embedded draft configuration card, visual editor, English/Bokmål and
  default/Bubble styling.
- [x] Server extension specification grounded in inspected osdweb code; osdweb
  implementation intentionally remains outside this task.
- [x] Independent packages, matching icons, READMEs, CI/release workflows and
  tracked frontend distribution, connected to the supplied remotes as submodules.
- [x] Independent review and regression fixes; 37 HA tests, 19 Chromium tests,
  lint/typecheck/format/build, strict UI audit and hassfest (0 invalid).
- [x] HACS add-all registry verifies all 22 component submodules.
- [ ] Live HA native picker and physical amplifier verification: requires the
  owner's running installation; standalone tests do not claim this coverage.
- [ ] Remote publication and metadata changes: not authorized; metadata commands
  are provided in `audio-zone/docs/repository-setup.md`.

The task details below retain the original test-first plan for reference. Native
server ownership above supersedes its former HA-ramp steps.

## Global Constraints

- Independently distributable `audio-zone` and `lovelace-audio-zone`, initially 0.1.0.
- Home Assistant 2026.9 or newer; no runtime imports across sibling repositories.
- One config entry/device per named zone; fixed English entity key `audio`.
- English/Bokmål, language aliases, regional formatting and live language changes.
- Drafts with explicit Save/Cancel; saving must not issue device commands.
- Defaults: mute 120 seconds, power off 900 seconds, stabilization 2 seconds,
  ramp 3 seconds; ramp disabled until a valid start volume is configured.
- Last listening target or fixed target; native number min/max/step.
- Admin-only configuration API; revision checks reject stale saves.
- No publishing or pushing; preserve unrelated work and do not invent remotes.
- Implement inline in the current session; no subagents or unsolicited commits.

## Review Focus

- Delayed service echoes must not be mistaken for manual changes during ramps.
- New playback during a pending service confirmation cancels the obsolete sequence.
- Saving while playing does not accidentally restart activation through a reload.
- Missing controls and unavailable number/select metadata must not enable unsafe actions.
- A second editor must retain its draft when a stale revision is rejected.

## File Structure and Interfaces

Backend under `audio-zone/custom_components/audio_zone/`:

- `const.py`: domain, defaults, phase names and platform declarations.
- `config.py`: `validate_zone(hass, data, *, entry_id=None) -> dict`;
  `async_save_zone(hass, entry, data, revision) -> dict` validates, checks revision
  and persists. Configuration includes `players: list[{entity_id, input}]`,
  optional `power_entity`, `mute_entity`, `volume_entity`, `input_entity`,
  `default_input`, `mute_delay`, `power_off_delay`, `stabilization_delay`,
  `ramp_enabled`, `start_volume`, `target_mode`, `target_volume`, `ramp_duration`.
- `config_flow.py`: named entry setup and menu-driven draft options flow.
- `coordinator.py`: `AudioZoneCoordinator(hass, entry)`;
  `async_start(*, activate_existing: bool)`, `async_shutdown()`, phase,
  active player, error and listener subscription. Owns arbitration and timers.
- `output.py`: serialized cancellable preparation/ramp and confirmation logic.
- `__init__.py`: entry lifecycle, websocket registration and runtime storage.
- `sensor.py`: phase sensor, device identity and stable suggested object ID.
- `websocket.py`: `audio_zone/config/get` accepts `entry_id` and returns
  `{entry_id, revision, config}`; `audio_zone/config/save` accepts the same fields
  and returns the saved snapshot. Stable error codes cover stale revision,
  invalid configuration, permission failure and missing entries.
- `strings.json`, `translations/{en,nb}.json`, `manifest.json`, `brand/*.png`.

Frontend under `lovelace-audio-zone/src/`:

- `types.ts`: typed saved configuration, drafts and websocket messages.
- `localize.ts`: typed shared dictionaries, language and locale helpers.
- `audio-zone-config.ts`: embedded card with HA controls, drafts and API calls.
- `audio-zone-editor.ts`: zone selection, title and appearance only.
- `styles.ts`: HA theme styling, narrow layouts and Bubble variant.

Both repositories include metadata, README, changelog, license, independent
tests and CI/release workflows. Card includes `DESIGN.md` and tracked `dist/`.

### Task 1: Backend configuration and installation

- [ ] Read TDD, worktree and execution skills; inspect applicable instructions.
  Use a reversible workspace arrangement that preserves the existing submodules.
- [ ] Create failing `tests/test_config_flow.py` and `tests/test_config.py`:
  valid setup; optional controls; duplicate players; shared output collisions;
  range/step validation; invalid inputs; timeout order; options cancel/save.
- [ ] Run these tests and confirm missing implementation failures.
- [ ] Add backend package, metadata and `config.py`/`config_flow.py` interfaces.
  Use structured entity selectors and no JSON configuration editor.
- [ ] Implement one shared validation/persistence path; reject stale revisions
  before updating config-entry options. Save increments a persisted revision.
- [ ] Pass focused tests and test versions/config-entry lifecycle with HA.

### Task 2: Runtime and entity behavior

- [ ] Add failing `tests/test_coordinator.py` and `tests/test_output.py`:
  playback activation; pause mute at 120s and off at 900s; playback cancellation;
  last-started arbitration and handover; buffering behavior; startup tie-break.
- [ ] Add failure tests for unavailable controls, rejected service calls,
  10s confirmation timeout, unload during a ramp and playback during confirmation.
- [ ] Add volume tests for native steps, remembered/fixed targets, delayed echoes,
  manual interruption and no volume reset from player attribute-only updates.
- [ ] Confirm tests fail; implement coordinator and output executor with public
  HA service calls, bounded confirmations and cancellation after every await.
- [ ] Test saving while playing issues no output calls and does not reactivate
  through reload; next meaningful playback transition can activate normally.
- [ ] Add `tests/test_sensor.py` proving initial English key under Bokmål and
  preserved pre-registered entity ID; implement phase sensor and translations.
- [ ] Pass runtime, entity, flow and validation tests together.

### Task 3: Shared configuration API

- [ ] Add failing `tests/test_websocket.py` for admin access, missing entries,
  valid reads/saves, validation failures, stale revisions and no commands on save.
- [ ] Implement websocket contracts through shared backend validation; declare
  websocket dependencies and CONFIG_SCHEMA where required by hassfest.
- [ ] Confirm successful saves update coordinator configuration without treating
  unchanged playback as a new start. Pass API and lifecycle regression tests.

### Task 4: Embedded configuration card

- [ ] Read both frontend design skills and relevant resilience/form guidance.
  Record existing sibling conventions and new configuration behavior in DESIGN.md.
- [ ] Add failing browser tests for card selection, player/control entity selectors,
  per-player input overrides, optional controls, native volume ranges and delays.
- [ ] Add Save/Cancel tests with exact websocket payloads, duplicate-save prevention,
  stale revision preserving drafts, validation feedback and unavailable bindings.
- [ ] Implement typed Lit card and editor using the contracts above; show the
  integration setup link when no zone exists or the backend is unavailable.
- [ ] Test dirty-draft discard confirmation, keyboard operation and configuration
  navigation. Only backend admins may edit or save.
- [ ] Add localization tests for en, nb-NO, no, nn, malformed locale, language changes,
  custom names, decimal formatting and backend error details.
- [ ] Pass rendered tests, lint, typecheck and build; rebuild tracked distributions.

### Task 5: Branding, documentation and packaging

- [ ] Produce matching self-contained brand artwork using an appropriate visual
  asset workflow. Include real PNG copies at 256/512px in backend and card README.
- [ ] Add READMEs with setup, embedded card example, integration Configure path,
  timing/volume behavior, limitations, stable entity key and compatibility 0.1.0+.
- [ ] Add changelogs and independent CI/release workflows gated on required checks.
  Validate manifest/project and package/lock version consistency.
- [ ] Initialize independent local component repositories if needed. Determine
  actual remote availability before registering umbrella gitlinks; do not publish.
  Supply `gh repo edit` description/topics commands when authentication is absent.
- [ ] Update `.gitmodules` and `scripts/hacs-add-all.js` together only with valid
  component gitlinks/remotes; record any external setup blocker explicitly.

### Task 6: Verification and review

- [ ] Run complete backend tests and Ruff; run hassfest at the selected HA version
  and require `Invalid integrations: 0`.
- [ ] Run frontend tests, lint, typecheck, build, strict UI audit and design lint.
- [ ] Exercise success, error, loading, offline, stale-save and unavailable states
  in a real browser; compare with Time for School. Verify mobile, keyboard,
  light/dark, Bubble/default, English and Bokmål.
- [ ] Run `python3 scripts/check-hacs-list.py` after submodule registration.
- [ ] Review final diffs for cross-repository imports, personal data, unsafe service
  sequences, missing translations, pending tasks and generated-file drift.
- [ ] Report completed work, exact validation results and any remaining external
  repository setup. Do not claim installation or release without evidence.
