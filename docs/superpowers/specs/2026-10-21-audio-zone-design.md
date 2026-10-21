# Audio Zone

## Purpose and ownership

Deliver two independent HACS repositories: `audio-zone` (integration domain
`audio_zone`) and `lovelace-audio-zone` (Dashboard configuration card), initially
0.1.0, for Home Assistant 2026.9+. One named config entry/device represents one
amplifier zone. The integration reacts to linked media players through existing
public HA services, without an app or an open dashboard.

During implementation the owner moved volume ramping to the external zone
server and requested an osdweb extension specification. This revised design
incorporates that steering: HA does not implement a volume ramper. The source of
truth for the proposed server extension is
`audio-zone/docs/osdweb-gentle-start.md`, based on inspected osdweb source.

## Configuration

Choose 1–32 distinct `media_player` entities. Optional outputs: power `switch`,
mute `switch`, input `select`, volume `number` for availability, and native
gentle-start `button`. At least one useful output is required. Power on means
powered; mute on means muted. A native-startup button requires mute feedback.
Controls cannot be shared between zones or used twice in one zone.

One optional default input applies to all players; each player can override it.
An empty input means retain the existing input. Reject invalid domains, duplicate
players, unsupported input options, unknown keys, non-finite/out-of-range numbers,
shared outputs and a power-off delay no longer than an enabled mute delay.

Default timings: mute 120 seconds after playback stops; power off 900 seconds
after the same stop; stabilization 2 seconds before unmuting. Zero disables
either inactivity action. Maximum inactivity delay 86400s; stabilization 0–60s.

## Runtime

`playing` activates a player. Buffering retains an already active player but
does not activate an idle one. Paused, idle, off, unknown and unavailable are
inactive. The most recently started active player owns the input. Attribute-only
updates do not change priority. If the owner stops, fall back to the most recent
remaining active player. Any active player prevents inactivity actions.

Resuming playback cancels both deadlines. Startup evaluates existing playing
entities, with configuration order breaking ties; inactive startup begins fresh
deadlines rather than guessing elapsed downtime.

Serialize cancellable transitions per zone. Mute, confirm power on, select input
while muted, wait stabilization, then unmute. Optional controls are skipped.
Wait at most 10 seconds for each commanded state to be confirmed. Failure or
unavailability stops preparation and reports an error; no later unmute follows
a failed sequence. Re-evaluate active playback after control availability returns.
Unload and reconfiguration cancel tasks, timers and subscriptions.

With a configured compatible native-startup button, send explicit mute-on even
when already muted (to cancel older server startup), confirm power/input, then
press the button. Wait for mute-off as confirmation that native audio startup
began; the server can continue its ramp. A failed/interrupted request sends an
explicit mute-on cancellation. Button state `unknown` is a valid never-pressed
timestamp; `unavailable` is not actionable.

The current osdweb version has native volume stepping but no gentle-start button.
Leave that binding empty until the server extension is implemented. Ordinary
power/mute/input/timer automation works now and retains listening volume.
Start volume, target mode/volume and ramp duration belong to server settings.

## Configuration surfaces

Structured setup and Configure options are authoritative and usable without
the card. The card embeds the same settings directly on an Automations dashboard,
using Time for School's HA visual conventions. HA config-entry flows create and
delete zones; card links to those flows.

Both editing surfaces use shared validation. Edit drafts; persist only on explicit
Save; Cancel leaves saved options unchanged. Save never commands hardware or
reactivates existing playback; a later playback transition uses the new settings.
Admin websocket read/save commands use revision hashes to reject stale saves.
Loading, empty, pending, offline, permission, validation and server failures are
visible. Preserve failed drafts and prevent duplicate requests. Confirm before
discarding unsaved changes and removing player bindings.

The card editor contains only title, optional zone binding and default/Bubble
appearance. Settings links remain accessible in error/unauthorized states.
Use HA selectors, accessible controls and responsive layout with light/dark
theme variables. Record design decisions in the card's DESIGN.md/UX-CONTRACT.md.

## Presentation and packaging

Support English/Bokmål, nb regional variants, no and nn fallback, live language
changes, safe regional formatting and preserved custom names/config values.
Static card-picker metadata can remain English without HA context.

Expose `sensor.<name>_audio` with phases idle/preparing/playing/muted/off/error,
active player and error attributes. Use `has_entity_name`, a named device and
fixed English suggested object key `audio`. Never rename existing entity IDs.
Phase describes controller operation rather than independently polled device
power. A numerical history chart adds nothing to this categorical config surface.

Each repository has its own README, changelog, license, CI/release lifecycle,
HACS metadata and self-contained runtime. Match versioned package/manifest and
package/lock files. Track built frontend distribution. Share real copies of the
icon, including integration brand PNGs at 256/512px. Use only generic demo data.

Use owner-supplied remotes `https://github.com/mvheimburg/audio-zone.git` and
`https://github.com/mvheimburg/lovelace-audio-zone.git`. Register valid gitlinks and
HACS add-all entries together; preserve unrelated submodules. Do not push or
publish without authorization. Provide description/topic commands when gh is
not authenticated.

## Verification

Test real HA config/options flows, cancel/save, duplicate/conflicting bindings,
admin API permissions, revision conflicts, non-English initial entity ID and
preserved registration. Test playback arbitration, buffering, inactivity deadlines,
restart, attribute updates, cancellation, unavailable controls, native-startup
feedback and failures. Verify no HA volume-step stream is emitted.

Browser tests cover rendered translations and schemas, stable service payloads,
Save/Cancel, stale/failed saves, duplicate requests, custom names, aliases and
regional formatting. Run backend tests/Ruff, frontend tests/lint/typecheck/format/
build, strict UI audit, hassfest with zero invalid integrations and HACS-list
validation. Distinguish standalone browser verification from live HA entity
picker/hardware validation; neither is a substitute for the other.
