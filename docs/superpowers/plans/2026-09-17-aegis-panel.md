# Aegis Panel Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete frontend-only Ajax device health panel and room card.

**Architecture:** Pure registry-to-device discovery and health functions underpin two Lit cards. A lifecycle-aware registry client feeds both; reusable detail/action components and visual editors share config and styles.

**Tech Stack:** TypeScript, Lit, Rollup, Vitest browser mode and Playwright Chromium.

**Spec:** docs/superpowers/specs/2026-09-17-aegis-panel-design.md

## Global Constraints
- Repository `mvheimburg/lovelace-ajax`; no Python integration.
- Custom elements `aegis-panel-card` and `aegis-device-card`; bundle `dist/aegis-panel-card.js`.
- Scope discovery to `aegis_ajax`; label > domain/device class > suffix; preserve multiple entities and unknown roles.
- Unknown/unavailable/missing must never render healthy clear/off; disabled readings omitted with counted notice.
- `allow_bypass: false` by default; every individual/bulk mutation requires confirmation and shows failures.
- Default and Bubble appearances; visual editor parity; English/Norwegian Bokmål.
- Never push, merge to main, tag, or release during implementation. Preserve umbrella user devcontainer changes.
- Test-first behavior changes, meaningful behavior assertions. Do not make real HA service calls in verification.

### Task 1: Discovery, health and registry lifecycle

**Files:** Create `lovelace-ajax/package.json`, lockfile, TypeScript/ESLint/Vitest configs, `.gitignore`; `src/types.ts`, `src/model.ts`, `src/registry.ts`; `tests/model.test.ts`, `tests/registry.test.ts`, `tests/fixtures.ts`.

**Interfaces:** Produce exported HA types, registry snapshot, device model and health types. Export `discoverDevices(snapshot, states)`, `deviceHealth(device, states, batteryWarning)`, `watchRegistries(hass, callback): () => void`. Callback receives `{ snapshot?: RegistrySnapshot, error?: string }`. Device model holds ID, display name, area, enabled entities grouped by roles, unknown entries, and disabled count. Document exact resulting exports in report; later tasks consume them directly.

- [ ] Bootstrap package version `0.1.0`, ESM, scripts `test`, `lint`, `typecheck`, `build` matching sibling `lovelace-house-state` dev versions. Install dependencies, use Chromium browser tests. A Rollup entry is created in Task 2, so build validation starts there. No production card shell is needed here.
- [ ] Write failing discovery/health tests with fixture Aegis device named Workshop and unrelated KNX smoke device. Cover platform exclusion, label precedence with domain guards, classes, suffix fallback, registry name/area, disabled count, generic Other and multiple same-role sensors. Example core assertion:
```ts
expect(discoverDevices(snapshot, states).map(device => device.name)).toEqual(["Workshop"]);
```
- [ ] Run `npm test -- tests/model.test.ts`; confirm behavior fails before implementation. Implement model without mutating registries or HA states. Health must distinguish alarm/tamper/problem/offline/lowBattery/bypassed/update/unknown and online evidence; derive min battery only from finite readings and retain units for display. Binary battery on is low. Keep smoke/heat on alarm separate from tamper; missing states unknown, unavailable offline, disabled excluded.
- [ ] Add threshold tests including zero, multiple sensors, connectivity unknown/off/on, missing/unavailable state, partial bypass deactivation attributes. Run same test file and verify green.
- [ ] Write lifecycle tests for initial registry fetch, shared watchers per connection, update refresh, failed fetch visible + retry on next update, stale response suppression, unsubscribe during pending subscribe, and detach cleanup. Use fake HA transport only at websocket boundary. Example observable contract:
```ts
const stop = watchRegistries(hass, value => observed.push(value));
await settle();
expect(observed.at(-1)?.snapshot?.devices[0].name).toBe("Workshop");
stop();
```
- [ ] Implement registry fetches for `config/entity_registry/list`, `config/device_registry/list`, `config/area_registry/list`, `config/label_registry/list`; listen to their update events. Preserve error state when required registries unavailable; optional unavailable label API may fall back to other role discovery. Handle connection changes via watcher replacement in cards in Task 2.
- [ ] Run tests, lint and typecheck. Commit only task files, report results/exported interfaces and behavior limits.

### Task 2: Both cards, detail views, themes and actions

**Files:** Create `lovelace-ajax/src/aegis-panel-card.ts` bundle entry, `src/aegis-device-card.ts`, `src/card-base.ts`, `src/styles.ts`, `src/localize.ts`, `src/config.ts`, `src/details.ts` as needed; `rollup.config.js`, `tsconfig.build.json`; `tests/cards.test.ts` and `tests/actions.test.ts`. Shared helpers can be split by responsibility.

**Interfaces:** Consume Task 1 exported model/registry types and functions. Export typed validated panel/device configs in config module, with common appearance, title, show_temperature, battery_warning, allow_bypass. Lit card `setConfig`, `hass`, `getCardSize`, `getConfigElement` and `getStubConfig`; register both in `window.customCards`. Editor element names `aegis-panel-card-editor`/`aegis-device-card-editor` (implemented Task 3).

- [ ] Write browser tests mounting real elements against fixture registries/HA state. Assert one row per physical device, no KNX device, severity order, area grouping, unknown not clear, temperature visibility, disabled notice, detail Other rows and name ambiguity error. Example:
```ts
card.setConfig({ type: "custom:aegis-panel-card", appearance: "bubble" });
card.hass = fixtureHass;
document.body.append(card);
await settle();
expect(card.shadowRoot?.textContent).toContain("Workshop");
```
- [ ] Observe failing behavior before implementing cards. Render loading/error/empty states; never show all-online while loading or lacking evidence. Refresh from latest HA state and registry changes; clean watcher/timer resources on detach and connection replacement. Display every active smoke/heat detector in takeover with elapsed time, including updates without new hass assignment. Details remain accessible during takeover. Device selection by ID first, then unique registry name; helpful no-match and ambiguous errors.
- [ ] Implement semantic accessible responsive default/Bubble styles with all supplied variables, distinct alarm/tamper styling. English/Bokmål via HA language. Details show entities with native more-info; registry link for disabled entity notice. Optional alarm_entity renders native alarm more-info control only for valid configured alarm domain/entity.
- [ ] Write failing action tests proving controls absent by default; Cancel makes zero service calls; confirm targets only current available Aegis bypass switches; changing hass/config during confirmation cannot execute stale scope; rejected/partially failed service calls show feedback; pending repeated clicks cannot duplicate calls. Confirm actual HA state drives display, not optimistic success. Tests exercise real DOM click events:
```ts
expect(calls).toEqual([]); // before confirmation and after Cancel
expect(calls[0]).toMatchObject({ domain: "switch", service: "turn_on" }); // only after Confirm
```
- [ ] Implement confirmed per-device and bulk bypass/restore using HA `switch.turn_on/turn_off`, opt-in gates on execution as well as visibility, explicit scope copy and bypass deactivation detail. Never store PINs; alarm control dispatches native more-info. Include available target count and device names in bulk confirmation.
- [ ] Add Rollup build matching sibling; bundle both cards from single entry. Run tests/lint/typecheck/build; commit source/config/tests and bundle. Report interfaces and validation.

### Task 3: Visual editors and distributable documentation

**Files:** Create `lovelace-ajax/src/editors.ts`, `tests/editors.test.ts`, README, LICENSE, hacs.json, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, screenshot in `docs/`; modify bundle entry to load editors and commit rebuilt bundle.

**Interfaces:** Consume Task 2 config exports; register editor names used by cards. Editors accept `setConfig`/`hass`, emit bubbling/composed `config-changed` with `{config}` retaining unknown keys.

- [ ] Write failing browser editor tests proving config fields round-trip correctly including battery_warning zero, selecting grouping and appearance, booleans false, clearing optional alarm entity, preserving unknown YAML keys, and device selection from Aegis registries only. Ensure selected current values visible when options render after initial config.
```ts
editor.setConfig({ type: "custom:aegis-panel-card", battery_warning: 0, custom: "keep" });
// Change title via DOM input and observe config-changed.
expect(event.detail.config).toMatchObject({ battery_warning: 0, custom: "keep", title: "Fire safety" });
```
- [ ] Implement editor parity using native inputs/selects with accessible labels, HA-compatible event emission and live registry choices; fallback device ID/name input if discovery cannot load. Validate enum/types/thresholds visibly and keep configuration unchanged for invalid input. Run tests to green.
- [ ] Write README describing installation using HACS custom Dashboard repository, resource `/hacsfiles/lovelace-ajax/aegis-panel-card.js`, YAML examples for both cards and every config field/default, native alarm control, registry/role discovery, permissions, unknown/disabled readings, bypass semantics/confirmations, and troubleshooting. Use source links to upstream Aegis, no claims of live HA testing. Add MIT license and HACS JSON with name, render_readme true, filename only (category plugin belongs in action).
- [ ] Generate genuine screenshot by rendering production bundle with documented simulated HA states in Chromium; inspect image before embedding README. No external image generation needed.
- [ ] Add CI with npm ci, Chromium install, test/lint/typecheck/build, `git diff --exit-code -- dist/`, HACS plugin action; release workflow on main and workflow_dispatch, gated on CI, package version drives annotated tag and release asset. Use sibling conventions, node22, limited token permissions.
- [ ] Run complete npm ci/test/lint/typecheck/build and npm audit, check deterministic dist rebuild, commit only repository task files. Report exact outcomes and limitations.

## Controller completion
- [ ] Review each task from its full task diff and report; fix important issues through implementer, scoped re-review.
- [ ] Add completed repository as umbrella submodule with SSH URL and README entry. Commit only own documentation/submodule changes.
- [ ] Run final broad source review, inspect rendered screenshots, verify clean repository and committed bundle. Present finished local changes and publication status; do not publish without authorization.
