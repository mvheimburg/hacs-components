# Companion BLE discovery implementation plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution.

**Goal:** Offer verified Companion app beacon IDs in the existing DoorMonitor draft form.
**Architecture:** Backend discovery joins mobile_app config entries to registered sensors by config_entry_id and user_id, returning candidates on the existing admin users response. The Lit form explicitly copies a selected candidate into its phone draft.
**Tech Stack:** Home Assistant Python, Lit, TypeScript, Vitest browser tests.
**Spec:** ../specs/2026-11-02-doorbell-ble-discovery-design.md

## Global constraints

Admin-only discovery; no inferred ownership from names; no automatic overwrite; explicit Save; English and Bokmål; no continuous synchronization. Verify the panel format before enabling import.

## Review focus

Renamed entities must work. Other users' devices must stay separate. Disabled/unavailable/malformed sensors must be excluded. Multiple devices must be selectable. Cancel and changing linked user must not silently change saved data.

## Task 1: Backend discovery

- [x] Add failing websocket tests for owned BLE sensors, exclusions, duplicate IDs and multiple devices.
- [x] Implement self-contained `companion_ble.py` discovery using HA config entries/entity registry and extend the existing users response with optional beacon lists per HA user.
- [x] Run backend tests and lint: 105 passed; ruff check passed.

## Task 2: Explicit draft import

- [x] Verify maintainer contract: lowercase compact UUID hex, decimal major/minor 0–65535, no leading zeros.
- [x] Add browser tests for explicit import, saved service payload, preservation/cancel, user switching, empty states and English/Bokmål.
- [x] Extend HaUser type and existing users form with candidate select and apply button, using existing controls and translations.
- [x] Document README and DESIGN.md; Python lint and 106 tests pass; frontend lint/typecheck, 37 browser tests and build pass. Mobile light/dark screenshots and keyboard import checked.
- [x] Independent review found no issues; component committed and umbrella gitlink updated. Nothing published.

The maintainer supplied the panel format. Backend normalization and explicit draft import are implemented. Independent review found no issues. The panel still lacks automatic BLE presence login; UI and README state this limitation. Browser viewport/keyboard tests required adding @types/node as a development-only dependency for Vitest browser declarations.
