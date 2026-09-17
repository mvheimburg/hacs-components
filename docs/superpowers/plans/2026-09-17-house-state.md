# House State Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement and review the independent integration and card tasks.

**Goal:** Deliver the approved configurable state-tree integration and Lovelace tree editor as independently installable HACS projects.

**Architecture:** The integration owns the active path, inherited occupancy, ancestor scene resolution, persistence and role-driven automation. The card renders the tree and edits configuration through hub services. The umbrella repository records both as submodules.

**Tech Stack:** Python 3.13/Home Assistant, pytest, Ruff; TypeScript/Lit, Rollup, ESLint, Vitest/Playwright.

**Spec:** docs/superpowers/specs/2026-09-17-house-state-tree.md

## Global Constraints

- Integration domain house_state; card custom:lovelace-house-state-card.
- All states configurable: the initial home/day/night/activity arrangement is a starter template.
- Shared state_tree, overlays, roles and service contract is defined by the binding spec.
- English/Bokmål interface; default/bubble appearance; mobile and keyboard usability.
- Version 0.1.0; integration manifest and pyproject synchronized.
- New repositories on feat/house-state; keep commits local pending publication authorization.
- Existing integrations and user's devcontainer work remain outside scope.

### Task 1: Integration

**Files:** house-state/custom_components/house_state/{__init__,const,model,config,coordinator,triggers,config_flow,entity,sensor,select,binary_sensor}.py; manifest.json, services.yaml, strings.json, translations/{en,nb}.json; tests/{conftest,test_model,test_integration,test_config_flow,test_triggers,test_reliability}.py; pyproject.toml, requirements_test.txt, README.md, LICENSE, hacs.json, .github/workflows/{ci,release}.yml.

**Interfaces:** Hub state is active node ID; active_path derives ancestry. Public set/arrive/depart/apply_scene/set_config services follow the spec. Branch selects offer child IDs, roles specify automation targets.

- [x] Write failing tests for arbitrary nodes/default descent/occupancy, hierarchy validation, nearest-ancestor scene fallback, overlays and deduplication.
- [x] Implement tree model and atomic configuration validation, rejecting cycles, broken references, role occupancy mismatches and missing scenes.
- [x] Test and implement serialized transitions, durable failed-scene replay, initial/restored timestamps and scene-error behavior.
- [x] Add dynamic selects, hub sensor, occupied sensor, service metadata and bilingual config/options flows.
- [x] Test role-driven door/gate/person/grace/fixed/sun triggers, including unknown states, timezone and unload cleanup.
- [x] Reproduce and fix queued trigger/branch-select races by checking conditions inside the transition lock.
- [x] Test no scene calls on options edits, partial-update preservation, state reconciliation and obsolete entity cleanup.
- [x] Add HACS/CI/release/migration docs and verify 40 real HA tests, Ruff and version consistency.

### Task 2: Card

**Files:** lovelace-house-state/src/{lovelace-house-state-card,lovelace-house-state-editor,types,styles}.ts; tests/card.test.ts; package.json, package-lock.json, rollup.config.js, tsconfig*.json, eslint.config.js, vitest.config.ts; README.md, LICENSE, hacs.json, dist/lovelace-house-state-card.js and map, .github/workflows/{ci,release}.yml.

**Interfaces:** Consumes hub active_path/state_tree/overlays/config; sends state IDs and atomic configuration drafts. State semantics come from role configuration, never fixed IDs.

- [x] Write failing browser tests for dynamic controls, arbitrary overlays, role/default-descended vacation confirmation and API payloads.
- [x] Implement draft tree editor with add/remove/reparent, labels, scenes, default child, inherited occupancy and role eligibility.
- [x] Implement overlay editor, automation/entity/schedule settings, visual card editor, localized status and responsive appearances.
- [x] Test and fix unavailable hubs, subtree deletion, role/reference cleanup, failed-save draft retention and in-flight save races.
- [x] Verify native select initial values and rejected-overlay restoration in real Chromium.
- [x] Update test tooling, verify clean installation and zero npm audit findings.
- [x] Verify final reload-draft preservation and zero-second grace regressions, then rerun card checks and commit.

### Task 3: Review and umbrella integration

**Files:** .gitmodules, README.md, submodule gitlinks, design and plan documents.

- [x] Independently review runtime and card; fix material findings with regression tests.
- [x] Add both clones as submodules and document them in umbrella README.
- [x] Run independent browser checks at 1000/360/320px with a custom four-level tree and overlay, including initial select values and service payloads.
- [x] Independently verify full backend/card suites, lints, build reproducibility, versions, workflow parsing and HACS artifact paths.
- [x] Complete scoped verification of final review fixes and commit umbrella changes.
- [x] Report final evidence and local-only publication status, plus requested GitHub metadata commands.
