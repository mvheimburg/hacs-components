# Wakeup Configuration Implementation Plan

> **For agentic workers:** Use independent backend/frontend workers under the dispatching-parallel-agents skill, with the shared API contract in the spec. Do not share repository writes.

**Goal:** Entry-based naming, any-person presence, output modes and daily times.
**Architecture:** Integration owns configuration validation/scheduling/actuation; card sends the documented partial config service and renders authoritative sensor state.
**Tech Stack:** Home Assistant Python, Lit/TypeScript, Rollup, pytest, browser Vitest.
**Spec:** docs/superpowers/specs/2026-09-17-wakeup-configuration.md

## Global Constraints
Shared API and compatibility rules in the spec bind both tasks. Version 0.4.0.
No push, merge, release, or changes to unrelated repositories/devcontainer files.

### Task 1: Integration
- [x] Extend existing naming regressions and implement tests for new config flow,
  service validation, presence, channel isolation, schedule, persistence and restart.
- [x] Observe targeted failures, implement minimal behavior across alarm.py,
  config_flow.py, const.py, sensor.py and helpers as appropriate.
- [x] Update services.yaml, strings/translations, README and version metadata.
- [x] Run full pytest/Ruff, self-review and commit; report exact test evidence.

### Task 2: Lovelace card
- [x] Add browser test harness following lovelace-ajax/house-state conventions.
- [x] Write failing tests for new settings controls, payloads, fallback defaults,
  errors and responsiveness; implement on existing card.
- [x] Update README/version/lock/workflows to run new browser tests, rebuild dist.
- [x] Run test/lint/typecheck/build/audit, self-review and commit.

### Task 3: Cross-repository verification
- [x] Review API compatibility and source diffs; resolve meaningful findings.
- [x] Independently run tests and production-bundle browser smoke.
- [x] Commit umbrella references and completed plan; report publication status.


## Completion evidence

Both packages are version 0.4.0 on local `feat/wakeup-configuration` branches:
- Integration: `df169f6855e1f2fc8ccdb33ce2e4c9d67a314172`.
- Card: `4be47217d289a0b9c5a25336e2d81b3207bf0fda` (includes initial
  implementation `6ed461634fec8a0124b1a02bd6f527dbb1368b7d`).

Independent coordinator verification: 54 Home Assistant pytest tests passed and
Ruff passed; 15 Chromium card tests passed. Frontend lint, TypeScript, build,
dependency audit (zero vulnerabilities) and committed distribution freshness passed.
Production-bundle Playwright smoke passed seven daily times, inheritance/reset,
any-person-home display, exact atomic schedule/mode service payload, state
acknowledgement and Escape. Default and Bubble dialogs fit 1000/360/320px viewports;
320px screenshot visually inspected. Browser checks use simulated HA services and
custom-element boundaries; no physical devices or live HA installation tested.

Independent read-only code review covered both final commits with no unresolved
blocking findings. Review found a cleared-target null/empty acknowledgement mismatch;
regression and fix are included in the final card commit. Backend tests also exposed
and now cover settings reload races, stopping the previous media player, per-day
local scheduling, long music fades and restored auto-off timing.

Umbrella README and submodule references updated. No push, merge or release performed.
Unrelated devcontainer and House State work preserved.
