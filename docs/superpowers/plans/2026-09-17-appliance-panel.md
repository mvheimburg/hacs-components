# Appliance Panel Implementation Plan

> **For agentic workers:** Use independent model and action workers under the
> dispatching-parallel-agents skill. Root implements UI against shared types and
> owns integration/review. No shared repository files may be edited by two workers.

**Goal:** Local-only dedicated appliance cards and kitchen overview, including
microwave and steam oven modules.
**Architecture:** Registry discovery -> pure role/status model -> typed action policy
-> tailored Lit cards/editors. Versioned role data remains reusable by future presets.
**Tech Stack:** Lit, TypeScript, Rollup, Vitest/Playwright.
**Spec:** docs/superpowers/specs/2026-09-17-appliance-panel-design.md

## Global Constraints
Version0.1.0. Home Connect Local platform homeconnect_ws only. No cloud or preset
engine. No live service calls or publication. Preserve all existing repositories.
Tests consume real functions/DOM and stub HA service/socket boundaries only.

## Shared API
Exact types are in the package src/types.ts. discoverAppliances(snapshot,states)
returns Appliance[]; applianceStatus(appliance,states,now) returns ApplianceStatus;
selectAppliances(appliances,config,snapshot) returns {devices,error?}.
actionPolicy(appliance,states,action) returns {allowed,reason?,confirmation};
executeAction(hass,appliance,action,confirmed) revalidates and calls native service.

### Task1: Role discovery and lifecycle
Files: src/roles.ts, src/model.ts, tests/model.test.ts, tests/fixtures/local.ts.
- [ ] Write failing cases: renamed ID with unique key sensor_operation_state still
  resolves operation; non-homeconnect_ws device excluded; disabled entities counted.
  Example: expect(discoverAppliances(fixture.registry,fixture.states)[0].entities
  .find(e=>e.entityId==='sensor.renamed')?.role).toBe('operation').
- [ ] Add fixtures with source provenance for ovens/combination ovens/dishwasher/
  coffee/cooling; normalize lifecycle, attention enums and duration units.
- [ ] Run npm test -- tests/model.test.ts; implement then verify all cases green.

### Task2: Guarded actions
Files: src/actions.ts, tests/actions.test.ts.
- [ ] Write failing case: executeAction(hass,oven,{entityId:start},false) rejects and
  service capture stays empty; confirmed with remote_start off also rejects.
- [ ] Implement fresh state/ownership checks, lifecycle guards, explicit option/value
  validation, guarded generic controls and direct abort.
- [ ] Verify target service payloads, rejected stale actions, absent/unknown permissions,
  numeric bounds and disabled/read-only controls via npm test -- tests/actions.test.ts.

### Task3: Tailored cards, registry and editors
Files: src/registry.ts, src/config.ts, src/card.ts, src/styles.ts,
src/editors.ts, src/appliance-panel-card.ts, tests/cards.test.ts,
tests/editors.test.ts, tests/registry.test.ts.
- [ ] Write failing DOM assertions for all six registered types; oven steam/microwave
  modules conditional; refrigerator has zones, coffee consumables, dishwasher options.
- [ ] Integrate registry watcher using tested Aegis reconnect behavior; add discovery
  error/retry, stale confirmation rejection and cleanup tests.
- [ ] Implement lifecycle-driven transport, options/settings/Other, compact dialog and
  overview with busy ordering/attention. All commands route through action policy.
- [ ] Add editors: expect config-changed detail.config to preserve unknown config
  fields and false/empty values. Device/area dropdowns use registries, no hardcoded IDs.
- [ ] Verify payloads and no auto service calls in real Chromium DOM tests.

### Task4: Package, integration and review
Files: README.md, hacs.json, .github/workflows/{ci,release}.yml, package metadata,
dist/appliance-panel-card.js, umbrella README/.gitmodules/submodule pointer.
- [ ] Run npm test, lint, typecheck, build, audit and verify repeat build hashes.
- [ ] Production-bundle smoke each card and editor at 1000/360/320px in both appearances;
  include steam/microwave, dark mode, confirmation changes and reconnect.
- [ ] Independent source review; fix and regression-test meaningful findings.
- [ ] Commit package and umbrella branch with documentation and validation evidence.
