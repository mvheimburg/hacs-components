# Roborock dashboard and companion integration

## Intent and agreed constraints

Build the useful functionality of LocalRock into Home Assistant for an owner
with a Roborock Saros 20 Sonic. Replace everyday use and configuration in the
phone app with HA screens. Reuse the official Roborock integration as far as
possible. The owner explicitly permits a custom companion integration for gaps.

Updated owner decision during implementation: use the unmodified upstream
`local_roborock_server` and connect the official HA integration to it. Do not fork
LocalRock, duplicate its server, replace the official integration, or implement
another robot transport. Document the upstream server's DNS/certificate/pairing
setup and keep it outside our component repositories. Full offline operation of
the owner's firmware is not yet hardware-verified and must not be advertised.

The owner subsequently supplied the two component repositories below, confirming
the package names and the direction for implementation. Product code has not yet
been created. The minimum supported HA version and UI details below are builder
proposals, rather than preferences stated by the owner.

## Approaches and selection

1. A frontend alone, using standard entities and public HA actions. This covers
   substantial everyday functionality but cannot return arbitrary command
   responses or obtain the structured map needed for safe map editing.
2. A frontend plus a small companion attached to the existing HA Roborock entry.
   Standard controls use public HA services; advanced data and operations reuse
   that entry's existing device and properties API. This is the selected direction
   following the owner's permission to add a custom component when needed.
   Its tradeoff is a narrowly isolated dependency on HA integration internals.
3. The owner initially ruled out LocalRock's local server, then explicitly
   selected the standard upstream server after reviewing the cloud tradeoff.
   It is now the intended deployment backend for the official integration;
   approach 2 still defines our integration and frontend implementation.

## Evidence and connectivity limits

Inspected HA Core `2026.11.1`, which pins `python-roborock==7.12.0`, and the
library's corresponding tag. Use this as the first tested compatibility target;
do not infer the owner's installed version or claim support for untested versions.

- The official integration owns discovery, login, secrets, sessions, reconnects,
  standard entities and device state. The companion never copies its credentials
  or creates another client, channel, poller for standard state, or MQTT session.
- Its V1 coordinator exposes `properties_api.command.send(...)`, returning robot
  responses. Public `vacuum.send_command` awaits a command but discards the
  returned response; it is insufficient as a general read API.
- The existing home/map traits contain rendered images and parsed geometry.
  Public `roborock.get_maps` returns map IDs/names and room IDs/names, rather than
  complete geometry and the image-to-robot coordinate transform.
- The library's normal RPC channel prefers local transport and falls back to
  MQTT. The map RPC channel uses MQTT. A connected local socket does not prove
  which transport an individual command used.
- The original cloud-backed setup still needs Roborock services for login,
  discovery, maps and other cloud-only operations. The documented robot behavior
  also prevents assuming that blocking WAN leaves its local API working.
- A Saros 20 Sonic report for firmware `02.58.82` concerns operation through the
  standard upstream local server. It is not evidence that every map-edit command works
  through this design or on the owner's firmware.

Show accurate connection facts in configuration/diagnostics, including unavailable
or unknown. Do not label all traffic local, promise a strict local-only switch,
or add a cloud fallback outside the behavior already owned by HA. Do not refresh
maps or cloud-backed position on animation frames or at phone-app frequency.

## Components and ownership

Owner-supplied self-contained HACS repositories (both empty when inspected):

- `roborock-companion`, domain `roborock_companion`: attach to existing Roborock
  devices, serve a configuration panel, validate operations, expose structured
  advanced data and commands, and manage pending operations.
- `lovelace-roborock`: render standard entities and companion data, provide
  everyday controls, a visual card editor and a link to configuration.

Remotes: `https://github.com/mvheimburg/roborock-companion.git` and
`https://github.com/mvheimburg/lovelace-roborock.git`. Local implementation and
commits are authorized; publishing or pushing a release is a separate action.

The official integration remains usable without either component. The card's
standard functionality works without the companion; advanced sections explain
their dependency and link to setup. The companion works without a card or open
browser. Neither component is an HA app/add-on. The upstream server can be deployed
separately as its existing HA app or Docker container.

Use public entity services for start/pause/stop/home, fan speed, selects, switches,
numbers, times and buttons wherever available. Companion operations are named,
typed and allowlisted; do not expose an unrestricted RPC console to dashboards.
Avoid manufacturing duplicate vacuum, dock or maintenance entities.

## Official-integration adapter

Resolve a selected `vacuum` through the entity/device registries to its official
Roborock config entry and matching device/coordinator. Do not select the first
device in an account, rely on entity-name conventions or let a caller address
another entry's robot by sending an arbitrary device ID.

Put all access to official runtime internals in one backend adapter. Verify the
expected protocol, trait shapes and lifecycle before enabling advanced features.
Use existing parsed map data and library converters; avoid another map parser
and treat cached raw map bytes as opaque. Return versioned, bounded JSON DTOs
with map ID, revision, freshness, geometry, transform and capability information.
Serve map images through an authenticated HA endpoint or the existing image
entity; protect maps as private home data and exclude them from diagnostics.

Track official entry unload/reload/removal and registry changes. Invalidate old
handles and caches immediately, cancel queued work and unsubscribe listeners.
Rebind after setup completes. Never close the shared connection or monkey-patch
the official integration. Fail advanced features clearly on incompatible APIs;
retain standard controls and the configuration link. Declare actual imported HA
component dependencies in the manifest and avoid independently pinning another
version of the official integration's Python library.

## User-facing surfaces

The card prioritizes current activity, attention required, map and selected rooms,
cleaning choices and a clear primary action. Provide pause/stop/home and supported
dock actions without exposing transport setup. Its top-right 44px round cog opens
the companion's HA configuration panel, with the integration page as fallback.
Do not add a fictitious robot power switch if the integration has none.

The visual Lovelace editor owns vacuum/device bindings, title, default/Bubble
appearance and visible sections. Discover associated entities by registry device
and allow explicit overrides. Keep structural integration settings out of it.

Integration setup and Configure use structured selection of an existing robot.
The integration-owned panel handles map/floor editing, persistent room settings,
robot/dock settings, schedules and cleaning-session history. Admin operations use
the companion's authenticated websocket API with entity permission checks.
Ordinary card controls respect normal HA control permissions. Saving drafts and
performing device actions require separate, clearly labeled actions.

Design for mobile, keyboard, light/dark themes and stable layouts. Use existing
household card conventions, HA/theme variables, English and Bokmål. Maintain
DESIGN.md and interaction contracts in the relevant component during implementation.

## Functional scope and capability gates

Target the LocalRock feature groups below. A command observed on an S8 or Qrevo
is a reference, not proof of Saros support. Use read-only discovery first and
never probe support by executing destructive commands. Unknown capabilities are
explicitly unverified. A disabled feature is not a completed parity claim.

| Feature | Route and completion requirement |
| --- | --- |
| Status, battery, errors and consumables | Existing HA entities, with authoritative feedback. |
| Start/pause/stop/home, locate and supported dock actions | Existing HA public actions; companion only for demonstrated gaps. |
| Suction, water, mop route/mode and run repeats | Existing entities where available; typed advanced calls otherwise. Validate actual device options; preserve stable enum values. |
| Rooms, floors, map view and live path | Existing image/room APIs plus companion geometry and existing update events. Use a verified coordinate transform, never guessed pixel coordinates. |
| Room cleaning, zone cleaning and go-to | Public HA services where possible, with validated IDs/coordinates and confirmed target map. |
| Per-room choices, cleaning order and SmartPlan | Discover actual model support and payloads; no browser-driven sequence of room jobs. Do not promise custom order from HA's basic room-cleaning action. |
| Split/merge rooms, names and floor types | Typed backend operations with fresh readback and explicit destructive-change summaries. Distinguish HA area/display names from robot-side names; avoid new direct cloud naming APIs. |
| No-go zones, walls, carpets and thresholds | Require complete, lossless current geometry, supported command shape and verified target map. Preserve every existing restriction and unknown field or block the operation. |
| Map creation, selection, names, deletion, backups and restore | Explicit actions, authoritative map inventory and model-confirmed support. Never delete a map to initiate mapping implicitly. |
| Robot settings, DND and dock settings | Existing HA controls first; validate/read back companion-only fields. |
| Recurring schedules | Expose native robot timers when supported, with backend read/validate/save/delete. The robot executes its own persisted schedule; no competing browser or HA scheduler. Clearly show robot timezone and preserve unrecognized timer entries. |
| Cleaning-session history and lifetime totals | Existing summaries plus bounded, paginated read-only robot history via the shared API; distinguish this from recorder sensor history. |
| Manual driving | Only with verified bounded movement duration, release/blur/visibility/unload stop handling and command-rate limits; otherwise unavailable with a reason. |

Phone Wi-Fi provisioning, firmware updates, camera/live video and reproducing the
official cloud's account management are outside this design. The owner already
has the robot; this is a dashboard/configuration project using HA's onboarding.
Device features with an unavoidable cloud requirement remain accurately labeled.

## Editing, safety and operation results

Configuration loads a draft. Cancel sends no mutations and leaves saved settings
untouched. Save validates and persists changes without starting cleaning or
applying unrelated device changes. Changing map geometry necessarily updates
the robot on explicit Save; do not misrepresent this as a reversible local file.

Keep draft and authoritative versions separate. Use per-device operation locks,
bounded queues/timeouts and revisions covering relevant map/settings data. Reject
stale saves and conflicting operations with an actionable message. Revalidate
the map, connection, freshness and appropriate robot activity immediately before
each mutation. Abort later steps if prerequisites change. Do not replay physical
actions after reconnect, retry non-idempotent edits blindly or silently fall back
between payload formats for destructive operations.

Map replacement operations such as `save_map` may replace the entire restriction
set. Do not enable them from only a rendered bitmap or incomplete parsed data.
Require preservation/readback evidence. LocalRock itself limits some such edits
to a single saved map and blocks unsupported restrictions; those safeguards are
evidence to study, not permission to bypass them for this robot.

A successful service call is not proof the robot accepted/applied an operation.
Interpret robot errors and retry acknowledgements explicitly and verify relevant
state afterwards. Distinguish accepted, pending, confirmed and unconfirmed/error.
After a multi-step save fails, stop, refresh and explain which steps completed;
preserve the remaining draft. Do not claim atomicity or automatic rollback of
robot operations. On stale/unavailable data disable device actions while keeping
setup accessible. Clear data when the selected device changes.

## Localization, history and data

Follow `hass.language`, then `hass.locale?.language`, then English. Support case
and underscore normalization, nb variants, no, existing nn-to-Bokmål fallback and
live changes. Centralize typed card/editor strings; translate backend settings,
errors and accessible names. Preserve user names and numeric service values.
Keep dictionary language separate from a safely normalized formatting locale and
respect HA date/time/number preferences. Picker metadata may remain English;
document that exception.

Card sensor values open a bundled recorder history view with 6h/24h/7d ranges,
pointer/keyboard inspection, related readings, gaps and separate unit scales.
Use package-contained copies of the existing history library. A future schedule
timestamp or static setting has no useful numeric history; document these
exceptions. Cleaning-session records use their own history surface.

Reuse existing HA devices/entities and preserve all entity IDs. If implementation
needs companion entities, use has_entity_name, the device's existing user name
and documented fixed English suggested-object keys. Test first registration
under Bokmål and preservation of an existing registered ID.

## Packaging and verification

Each component must be independently distributable with its own version,
README/setup instructions, changelog, license, HACS metadata, CI and release.
Share real copies of recognizable icon artwork; the integration bundles 256px
and 512px brand PNGs. Attribute any reused MIT-licensed LocalRock code. Use only
generic dummy homes in demo fixtures, screenshots and published docs.

Create component repositories and add umbrella submodule/HACS-list entries only
during implementation, preserving unrelated work. Remote repository creation,
pushes and releases follow the owner's authorization; no publishing is part of
this design approval. Commit component changes before umbrella gitlink updates.

Before broad UI work, prove the shared-runtime adapter, command responses, parsed
geometry/transform, lifecycle rebinding and real Saros command/capability mapping.
An inability to preserve maps or identify supported operations is a blocker to
that feature, requiring an explicit design update rather than unsafe guessed
commands. Hardware tests require an available HA instance and deliberately
authorized real device actions; no real deployment access is assumed here.

Test actual HA setup/options flows, draft Save/Cancel, permissions, cross-device
isolation, conflicts, robot errors, malformed data, partial saves, stale maps,
entry reload/removal and compatibility guards. Meaningful browser tests cover
rendered translations/aliases, language changes, regional formats, custom names,
correct payloads, pending actions, failures, stale data, mobile and keyboard use.
Run required backend tests/lint, frontend tests/lint/typecheck/build, hassfest
with `Invalid integrations: 0`, and `python3 scripts/check-hacs-list.py`.
Rebuild tracked distributions. Report hardware verification separately from
fixture/browser tests; do not call untested Saros operations supported.

## Sources

- HA Roborock documentation: https://www.home-assistant.io/integrations/roborock/
- HA 2026.11.1 integration: https://github.com/home-assistant/core/tree/2026.11.1/homeassistant/components/roborock
- Library transport selection: https://github.com/Python-roborock/python-roborock/blob/v7.12.0/roborock/devices/rpc/v1_channel.py
- Library command trait: https://github.com/Python-roborock/python-roborock/blob/v7.12.0/roborock/devices/traits/v1/command.py
- LocalRock scope: https://github.com/DonSidro/LocalRock
- LocalRock edit safeguards: https://github.com/DonSidro/LocalRock/blob/master/composeApp/src/commonMain/kotlin/com/kodraliu/localrock/shared/vacuum/MapEditCommands.kt
- Saros report (local-server transport only): https://github.com/Python-roborock/local_roborock_server/issues/217#issuecomment-6504895070

## Deployment update — 2026-11-17

The owner prefers an explicit MQTT service in the existing support stack. The
Docker recipe now uses a dedicated `roborock-mqtt` Mosquitto container, private
internal Docker network and persistent named volume. Standard server v1.2.1 uses
its existing external-broker mode at `roborock-mqtt:1883`; robot/HA TLS endpoints
remain at the server on 8881. No server fork or HA integration change is needed.
Migration and backup instructions include the separate broker. Runtime validation
on the owner's Docker host remains outstanding.
