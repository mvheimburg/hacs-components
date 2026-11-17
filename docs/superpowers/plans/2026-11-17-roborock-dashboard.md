# Roborock Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Implementation status (2026-11-17):** Initial capability-bounded version committed locally, with 44 backend / 14 card / 9 panel tests passing and target 2026.11.1 hassfest valid. Full LocalRock parity and Saros hardware validation remain incomplete. All physical map writes require exact model/firmware/operation profiles; none ship initially. See [verification and decisions](../../roborock-validation.nb.md).

**Goal:** Deliver an independently installable Roborock companion integration and Lovelace dashboard using the official HA integration, initially verified against HA 2026.11.1 and the Saros 20 Sonic's available capabilities.

**Architecture:** The official integration owns all robot connections and standard entities. A narrowly isolated adapter exposes missing data and typed operations from its existing runtime. The companion owns a configuration panel; the card uses public HA services and companion APIs for everyday tasks.

**Tech Stack:** Python 3.14, HA Core 2026.11.1 and its python-roborock 7.12.0; TypeScript, Lit, Rollup, Vitest/Playwright. Reuse established workspace conventions and package-contained history assets.

**Spec:** `docs/superpowers/specs/2026-11-17-roborock-dashboard-design.md`

## Global Constraints

- Owner remotes: `https://github.com/mvheimburg/roborock-companion.git` and `https://github.com/mvheimburg/lovelace-roborock.git`; both inspected as empty.
- Updated owner decision: use standard upstream local_roborock_server behind the official HA integration. Do not fork it, create another robot client or duplicate the vacuum state machine.
- The owner permits a custom companion for missing functionality and prefers local commands wherever the official integration supports them.
- Do not infer traffic routing from a local socket: commands can fall back to MQTT and map acquisition uses MQTT against the configured backend. Distinguish the original Roborock cloud from a custom server and verify offline behavior on hardware.
- Standard public HA entity services take precedence over companion commands; never store copied Roborock credentials.
- Reuse parsed map data; never enable whole-map writes without complete preservation and authoritative readback.
- Configuration belongs to integration Configure/panel; the card editor owns bindings and appearance.
- Save and Cancel operate on drafts; Save never implicitly starts cleaning. Partial robot saves are reported honestly.
- Support English/Bokmål, locale aliases/live changes, regional formatting and preserved custom names/IDs.
- Support default/Bubble, mobile, keyboard, light/dark themes, pending states and unavailable-data guards.
- Use separate component commits and umbrella gitlinks, self-contained packages, matching icons and rebuilt distributions.
- No push, remote initial commit, tag, release or deployment is authorized by this plan.
- Hardware command tests require a reachable HA instance and authorization for the specific device operations; local fixture tests are not proof of hardware support.

## Review Focus

- Official entry reload between snapshot and Save must invalidate handles and reject the stale operation (Tasks 1–2).
- A second vacuum in the same account must never receive the selected robot's commands or private geometry (Tasks 1–2).
- Map crop/rotation or unknown restriction data must prevent drawing coordinates from affecting another position or deleting restrictions (Tasks 3–4).
- A successful HA response, robot retry acknowledgement or partial save must not be displayed as confirmed success (Tasks 2, 4, 6–7).
- A locale/device change during an outstanding request must not apply an older response to the new card or rename stored values (Tasks 5–7).

## Files and cross-component contracts

Backend root: `roborock-companion/`. The integration lives in
`custom_components/roborock_companion/`, with `adapter.py` (official runtime),
`models.py` (JSON DTOs), `capabilities.py`, `operations.py`, `map_geometry.py`,
`config_flow.py`, `websocket.py`, `panel.py`, translations and service schemas.
Backend tests live in `tests/`; panel sources/build/tests in `frontend/`.

Card root: `lovelace-roborock/`. Use `src/card.ts`, `src/editor.ts`,
`src/api.ts`, `src/types.ts`, `src/i18n.ts`, `src/map-view.ts`,
`src/entity-bindings.ts`, shared presentation primitives/styles, tests and a
dummy-data demo. Track `dist/lovelace-roborock.js`.

Each repo has its own README, CHANGELOG, LICENSE, CI/release configuration,
HACS metadata, version files, DESIGN.md where UI exists, and distributable icon.
Do not import runtime modules from a sibling repository. Keep real copies of
the versioned contract and bundled shared history code in each package.

Contract version 1 uses these websocket messages:

- `roborock_companion/list`: readable bound vacuum entities and supported adapter state.
- `roborock_companion/snapshot`: `{entity_id, sections?}` returns `SnapshotV1`.
- `roborock_companion/subscribe`: `{entity_id}` emits revised snapshots; teardown removes listeners.
- `roborock_companion/execute`: `{entity_id, operation, params, expected_revision, request_id}` returns `OperationResultV1`.

`SnapshotV1` contains `api_version: 1`, `entity_id`, `revision`, `updated_at`,
`available`, connection facts, feature capabilities, map metadata/geometry,
typed settings and requested paginated history. Capabilities use explicit
`available | unsupported | unverified` status with stable reason codes. Missing
geometry has a reason and disables geometric actions; it is never synthesized.

`OperationResultV1` contains `request_id`,
`status: confirmed | pending | unconfirmed | failed`, `revision`, completed
steps, a stable error/reason code and optional backend detail. Robot errors
are not success. Version DTOs in `docs/api-v1.md` in both repos.

Read endpoints require HA read permission for the bound robot; ordinary device
actions require control permission. Persistent settings, schedules and map
mutation require admin plus access to that robot. The server validates both
permissions and binding on every request; frontend gating is additional UX.

### Task 1: Prove the shared-runtime adapter and integration lifecycle

**Files:** integration `__init__.py`, `const.py`, `adapter.py`, `models.py`,
`config_flow.py`, manifest/strings/translations; `tests/test_adapter.py`,
`tests/test_config_flow.py`, `tests/test_lifecycle.py`; repo test/CI scaffolding.

**Interfaces:** `RoborockAdapter(hass, vacuum_entity_id)` with `async_bind()`,
`async_close()`, `get_snapshot()`, `async_command(method, params)` and a generation
token. `async_close()` detaches companion listeners without closing the robot.
Resolve the current official coordinator by registry config-entry/device IDs.

- [ ] Write HA tests: choose the second of two robots and assert only its real command trait receives the request; reject non-Roborock entities, missing/removed entries and incompatible runtime shapes; cancel setup/options without persistence; preserve an existing entity ID under Bokmål.
- [ ] Run those tests and capture the expected failure before production implementation.
- [ ] Clone the empty remotes locally, use feature branches, and implement the adapter/setup with imports isolated to the adapter. Bind read-only to the official V1 `properties_api`; validate model/protocol rather than assuming that the owner's retail model always uses it. Declare actual component imports as dependencies; do not override library requirements.
- [ ] Prove unload/reload during an outstanding operation invalidates the generation and old callbacks; basic HA controls remain usable if advanced binding fails. Run the complete backend suite, Ruff and hassfest at HA 2026.11.1, requiring zero invalid integrations.
- [ ] Commit inside `roborock-companion` and record the tested HA/library versions and unresolved hardware evidence.

### Task 2: Add the authenticated API and operation coordinator

**Files:** backend `websocket.py`, `operations.py`, `capabilities.py`,
`services.yaml`, `docs/api-v1.md`; tests `test_websocket.py`, `test_operations.py`.

**Interfaces:** `async_execute(entity_id, operation, params, expected_revision,
request_id) -> OperationResultV1`; named operation descriptors define permission,
validation, command payload and readback. No client-supplied raw method names.

- [ ] Write failures for cross-device reads/writes, non-admin settings mutation, stale revision, expired adapter generation, duplicate request IDs, robot error/retry responses, unavailable controls and a multi-step save failing after its first mutation.
- [ ] Run the tests red, then implement exact version-1 API schemas, server authorization, bounded per-device queues/timeouts, request deduplication and operation results. Bound snapshot payloads; redact home maps and credentials from diagnostics/logging.
- [ ] Prefer public HA services for represented entities. Use the adapter's shared command trait only for gaps; refresh only affected traits. Do not infer successful transport from local-socket availability or retry non-idempotent commands blindly.
- [ ] Run the complete backend suite/Ruff and hassfest; verify ordinary HA actions still work without the companion and that disconnect/unload removes subscriptions.
- [ ] Commit API, tests and component-local contract documentation.

### Task 3: Read structured maps, settings and cleaning-session history

**Files:** backend `map_geometry.py`, `capabilities.py`, `models.py`,
`adapter.py`; tests `test_map_geometry.py`, `test_capabilities.py`, `test_history.py`.

**Interfaces:** `MapSnapshotV1` carries map ID/revision, known geometry and the
same transform as its displayed image, freshness, complete-preservation evidence
and a read-only reason when incomplete. Settings expose field types, stable enum
options and current authoritative values; history accepts a bounded page/cursor.

- [ ] Write failing tests for cropped/rotated maps with known robot coordinates, absent geometry, multiple maps with overlapping room IDs, unknown restriction blocks, stale images and malformed/history responses.
- [ ] Run red, then convert the existing library's parsed data without a competing parser. Keep map and room IDs qualified by the selected device and map. Serve images through authenticated HA access and avoid automatic map switching as a side effect of opening a screen.
- [ ] Discover actual supported traits/options; expose precise unverified/unsupported reasons. Read native timer/settings/history responses through the shared command trait, preserving unfamiliar schedule fields without silently rewriting them. Use library reference payloads and pinned LocalRock source as evidence, not destructive capability probes.
- [ ] Run all backend tests/Ruff. Confirm reads cause no robot mutations and map refreshes are deduplicated/rate-limited around the official coordinator.
- [ ] Commit the map/read API and its tested contract fixtures, all with generic dummy home data.

### Task 4: Implement verified advanced settings and map operations

**Files:** backend `operations.py`, focused operation modules as needed,
`capabilities.py`; tests `test_settings.py`, `test_map_operations.py`,
`test_schedules.py`, `test_remote_control.py`.

**Interfaces:** allowlisted operations cover supported room settings/order,
SmartPlan, room split/merge/names/floor material, map restrictions/carpets/
thresholds, mapping/floors/backups, native timers and bounded manual driving.
Map/setting DTOs from Task 3 are the read/validation authority.

- [ ] Write meaningful payload tests for native settings and timer CRUD, whole-map preservation, wrong-map rejection, unknown restrictions, duplicate Save, rejected split, partial edit-session failure and expired manual-movement requests. Assert no cleaning starts when saving configuration.
- [ ] Run red. Implement descriptors using documented/library command shapes and model-confirmed capability evidence. Preserve native timer timezone/unknown entries; do not add a scheduler. Separate robot room naming from HA area/display names.
- [ ] Require current map/activity/revision before each map mutation, preserve all restrictions or block Save, and close edit sessions in cleanup without claiming rollback. Confirm real readback or report unconfirmed. Map deletion/restore have explicit, separate confirmation; starting mapping never implicitly deletes another map.
- [ ] Verify bounded remote movement and stop-on-release/blur/unload logic with frontend hooks planned in Task 7. If the shared API lacks a safe required primitive, mark the feature as a documented blocker rather than substituting direct transport. Run the full backend suite/Ruff and hassfest.
- [ ] Commit feature code, capability evidence and an honest matrix separating fixture validation from Saros hardware verification.

### Task 5: Build the Lovelace card and visual editor

**Files:** card package/tooling, `src/card.ts`, `src/editor.ts`, `src/api.ts`,
`src/types.ts`, `src/i18n.ts`, `src/entity-bindings.ts`, styles, DESIGN.md,
UX-CONTRACT.md, `premium-ui.json`, tests/demo, bundled history asset, README.

**Interfaces:** `custom:roborock-card` uses config `{type, entity, title?,
appearance?: default | bubble, show_map?, show_maintenance?}`. `setConfig` and
`hass` updates follow HA conventions. Optional entity overrides belong to the
editor. Standard use requires only the official integration.

- [ ] Write browser tests for English/Bokmål, no/nn/nb_NO, live language changes, preserved custom names, regional numbers, unavailable readings, failed actions restoring authoritative values, duplicate clicks and a device change during a request. Assert actual public HA action payloads.
- [ ] Run red. Implement typed shared localization, registry-based entity discovery/overrides, standard controls, attention states, capability-based companion sections and the persistent 44px Configure cog. Add full structured visual editor; static picker metadata may remain English and is documented.
- [ ] Establish DESIGN.md and UX contracts from maintained sibling cards: HA typography/theme variables, map as the main visual, restrained room chips, default/Bubble, no decorative marketing layout. Document canonical owners for dialogs, async state, translations and recorder history. Include no fictitious power switch.
- [ ] Implement sensor history with the package-contained existing history library, 6h/24h/7d, related units, legend links, gaps and keyboard inspection. Verify mobile/light/dark/Bubble and no-companion behavior in the browser.
- [ ] Run all card tests, lint, typecheck, format, build and premium UI audit; commit sources, real-copy history dependencies, lockfile and tracked distribution.

### Task 6: Build the companion's HA configuration panel

**Files:** backend `panel.py`/websocket integration, `frontend/src/panel.ts`,
typed API/localization/components/styles, frontend build/tests, integration
bundled panel distribution; backend `tests/test_panel.py`.

**Interfaces:** `roborock-companion-panel` is served by the integration and opens
for a selected bound robot. Configure setup remains usable without the card.
Use version-1 snapshots, subscribe and execute; no direct robot/server requests.

- [ ] Write failing panel tests for permissions, empty/no-selection state, loading/error recovery, stale revisions, Save/Cancel, unsaved navigation, server rejection preserving draft and partial Save displaying completed steps. Test localized labels and long room names at mobile width.
- [ ] Run red. Register authenticated static assets and sidebar panel with correct manifest dependencies and cleanup. Implement structured robot/dock/room settings, floor management, native schedule forms with explicit robot timezone and bounded cleaning-session history pages.
- [ ] Add shared confirmation/focus behavior, draft validation and operation feedback. Keep configuration Save separate from physical-action buttons. Browser storage never becomes the settings authority; no secrets or private map data enter persisted URL/query state.
- [ ] Test the flow through HA-compatible panel `hass` updates and actual websocket schema fixtures. Run full backend/panel tests, lint, typecheck, build, hassfest and UI audit; rebuild tracked panel assets.
- [ ] Commit integration panel and setup documentation.

### Task 7: Add geometric interaction and advanced control presentation

**Files:** card `src/map-view.ts`, companion `frontend/src/map-editor.ts`,
package-contained map/interaction helpers, browser tests and dummy demo fixtures.

**Interfaces:** geometric controls consume `MapSnapshotV1` exclusively and send
robot coordinates through the verified transform. Draft edits produce typed
operations from Task 4 and preserve their base revision/map/device.

- [ ] Write failing browser tests for zoom/pan/crop coordinate conversion, room selection across floors, redraw while a draft is dirty, unmodeled restriction data, keyboard/non-drag alternatives, touch target selection and unavailable/stale data.
- [ ] Run red. Add map rooms/path/selection, zone/go-to interactions, and supported editing tools for split/merge, walls/zones, carpets/thresholds and floor material. Show capability reasons beside unavailable tools rather than presenting inert buttons as implemented functionality.
- [ ] Add per-run cleaning choices, supported order/SmartPlan, mapping/backup controls, and bounded manual drive with pointer-cancel/release/blur/visibility/disconnect cleanup. Do not sequence rooms or automations in the browser.
- [ ] Verify visual consistency with sibling cards, map confirmation summaries, modal focus return, reduced motion, screen resize/200% zoom and actual version-1 payloads. Run complete frontend suites/lint/typecheck/build/UI audits and backend geometry tests.
- [ ] Commit both affected component repositories separately, including rebuilt distributions and updated capability documentation.

### Task 8: Package, review and register both components

**Files:** both READMEs, changelogs, licenses, icons, CI/HACS/release files;
umbrella `.gitmodules`, `README.md`, `scripts/hacs-add-all.js`, gitlinks and plan.

**Interfaces:** integration/card version `0.1.0` initially, compatible with each
other's API v1 and tested HA/library versions. Only verified feature claims enter
README/support tables. HACS `integration` and `plugin` categories remain distinct.

- [ ] Test clean independent installs/builds without sibling source directories. Verify API contract fixtures agree, startup/unload combinations, standard-card-only operation and no competing connections. Run all required package checks, hassfest and UI audits.
- [ ] Add matching recognizable icon copies, generic demo/screenshots and installation/setup docs explaining official integration dependence, local/cloud limits, capability gates and setup via Configure. Document hardware-validation gaps explicitly.
- [ ] Perform an independent full-change review of backend permissions/lifecycle, map preservation and rendered actions; fix concrete findings and rerun affected checks. Do not substitute source inspection for live Saros validation.
- [ ] Initialize local component histories on feature branches, add existing local repos as umbrella submodules using the supplied remote URLs, update HACS lists/README and run `python3 scripts/check-hacs-list.py` plus `git diff --check`. Commit components first and umbrella pointers last. Unpushed initial commits must be identified as local-only; no release/tag is created.
- [ ] Record exact commits/test results and incomplete hardware evidence; stop at publication only if publication is requested separately. Provide ready-to-run metadata commands below because `gh auth status` currently reports no authenticated host.

## GitHub metadata commands

The connected GitHub read tools confirm both descriptions and topics are empty.
The local CLI is not authenticated. These can be run after authentication;
metadata changes do not publish component code:

```bash
gh repo edit mvheimburg/roborock-companion --description "Advanced Roborock configuration, map tools and controls through Home Assistant's official Roborock integration." --add-topic home-assistant --add-topic homeassistant --add-topic hacs --add-topic hacs-integration --add-topic roborock --add-topic robot-vacuum
gh repo edit mvheimburg/lovelace-roborock --description "Roborock dashboard with maps, room cleaning and dock controls for Home Assistant Lovelace." --add-topic home-assistant --add-topic homeassistant --add-topic hacs --add-topic hacs-dashboard --add-topic lovelace --add-topic lovelace-card --add-topic lovelace-custom-card --add-topic roborock --add-topic robot-vacuum
```

## Plan self-review

Tasks 1–2 own setup, transport reuse, permissions and lifecycle; Tasks 3–4 own
feature/data correctness and device safety; Tasks 5–7 own all card/editor/panel
and localization/history behavior; Task 8 owns independent distribution and
umbrella integration. All five Review Focus cases have specific test owners.
The design's explicit exclusions remain exclusions. Unknown hardware support
is an evidence gap, not permission to ship guessed destructive commands.
