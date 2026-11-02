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

- [ ] Verify panel iBeacon format from its API or maintainer-provided contract.
- [ ] Add browser tests for explicit import, saved service payload, preservation/cancel, user switching, empty states and English/Bokmål.
- [ ] Extend HaUser type and existing users form with candidate select and apply button, using existing controls and translations.
- [ ] Document behavior in README and design context; run frontend lint/typecheck/browser tests/build and backend suite.
- [ ] Review, commit component changes, then commit docs and umbrella gitlink. Do not publish.

Backend milestone complete. UI import awaits the panel API format: the documented door_monitor repository returns 404 through the connected GitHub tool and public access. The Companion source confirms UUID_major_minor. No panel format conversion has been implemented.
