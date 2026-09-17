# House State — spec proposition

> Historical starting proposal. The user's configurable-tree revision supersedes
> the fixed axes below; see [the implemented design](2026-09-17-house-state-tree.md).

A Home Assistant integration + Lovelace card that owns the house's mode, its
scenes and its seasonal overlays, in the same shape as
[personal-wakeup](https://github.com/mvheimburg/personal-wakeup) and
[time-for-school](https://github.com/mvheimburg/time-for-school).

Proposed repos: `mvheimburg/house-state` (integration, HACS category
*Integration*) and `mvheimburg/lovelace-house-state` (card, HACS category
*Dashboard*).

---

## Why

The house mode is real logic, but today it lives in five places with no single
owner:

| Where | What it does |
|---|---|
| `input_select.house_state` | Hjemme / Borte / Ferie — a bare helper, no rules |
| `input_select.house_states_home` | Dag / Natt — no link to the one above |
| AppDaemon `house_state` app | Fired scenes, auto-returned to Hjemme on door/gate. **Deleted from the repo** in `12c06ea` |
| `automations.yaml` "Leave home" | Fires `scene.leave_home` on Borte — duplicates the AppDaemon app |
| `00_home_view.yaml` | Nested `conditional` cards that re-implement the state machine in the UI |

Consequences visible in the repo right now:

- **The state machine only exists in the dashboard.** The conditional-card nest
  in `00_home_view.yaml` is the only place that knows Dag/Natt is meaningless
  when you are Borte. Any other dashboard — including the two new Bubble ones —
  has to reproduce that or silently allow nonsense states.
- **`scene.come_home` does not exist.** `apps.yaml` mapped
  `come_home: scene.come_home`, but `scenes.yaml` only defines Leave home,
  Movie time, Vacation, Night and Day. Arriving home fired nothing.
- **Double-firing.** Setting Borte triggered both the AppDaemon app and the
  `Leave home` automation, so `scene.leave_home` was applied twice.
- **Scenes carry stale entities.** Vacation, Night and Day include
  `lock.main_door`, `lock.workshop_door` and `cover.garage_gate`. The template
  locks that produced those are commented out in `configuration.yaml`, and the
  gate is `cover.garage_controller_garage_gate` today. The AppDaemon config
  pointed at the same dead names.
- **Day activities were never built.** `const.py` declares
  `DAY_ACTIONS = {TV, EATING}`, but nothing consumes them, and in the dashboard
  both the TV and Spise buttons call `scene.movie_time`.
- **Overlays are a parallel universe.** `input_select.party_modes`
  (`jul` / `halloween` / `on`), `input_boolean.halloween_mode` and
  `select.doorbell_partymode` overlap with no defined precedence.
- **`ring_bell_day` and `ring_bell_night` are the same script twice**, split
  because there is no first-class day/night value a single script can branch on.

---

## The model

Four axes. The first three are a hierarchy; the fourth is orthogonal.

```
presence      home ───────────────┬──── away ──── vacation
                                  │
mode                     day ─────┴───── night
                          │
activity          none ── tv ── eating


overlay      none · christmas · halloween · party        (independent of all above)
```

- `mode` is only meaningful while `presence: home`.
- `activity` is only meaningful while `mode: day`.
- Setting a child while its parent is inactive is **rejected**, not silently
  stored — the current bug where Dag/Natt drifts while you are away.
- `overlay` applies in every presence state. Christmas lights should stay on a
  timer while you are on holiday.

Narrowing the parent resets the children: going `home → away` clears `mode` and
`activity` back to their defaults, so returning home is deterministic.

### Scene resolution

The integration owns the mapping and is the only thing that calls
`scene.turn_on`. On every accepted transition it resolves the most specific
scene that is configured:

```
activity scene  →  mode scene  →  presence scene
```

`home + day + tv` tries the TV scene, falls back to the Day scene, then to the
Come-home scene. After the base scene, any configured **overlay scene** is
applied on top, so Christmas lights survive a Day/Night change instead of being
stomped.

A transition where the resolved scene equals the last applied scene is a no-op
unless `force: true`, which is what kills the double-fire.

---

## Entities

One config entry = one house. Entities are named from the entry.

| Entity | State | Purpose |
|---|---|---|
| `sensor.house_state` | `home` \| `away` \| `vacation` | The hub. Carries every attribute below. |
| `select.house_presence` | same three | Drop-in replacement for `input_select.house_state` |
| `select.house_mode` | `day` \| `night` | Replaces `input_select.house_states_home`. Unavailable when not home. |
| `select.house_activity` | `none` \| `tv` \| `eating` | Unavailable when not in day mode. |
| `select.house_overlay` | `none` \| `christmas` \| `halloween` \| `party` | Replaces `input_select.party_modes` |
| `binary_sensor.house_occupied` | on/off | `presence == home`, for trivial automation conditions |

Exposing real `select` entities matters: the existing Bubble
`card_type: select` cards keep working unchanged, just repointed from
`input_select.*` to `select.*`. Voice and automations get them for free too.

`select.house_mode` and `select.house_activity` going `unavailable` rather than
accepting a doomed value is what lets the dashboard stop nesting conditionals —
the card simply greys out.

### Attributes on `sensor.house_state`

`presence`, `mode`, `activity`, `overlay`, `last_scene`, `last_changed_by`
(`user` \| `door` \| `gate` \| `presence` \| `schedule` \| `service`),
`since`, `previous_presence`, `mode_is_available`, `activity_is_available`,
`auto_return_enabled`, `night_schedule`, `scene_map`, `available_overlays`.

---

## Config flow

Asked once at setup, all editable afterwards from the card or `set_config`,
and persisted in integration options.

| Field | Notes |
|---|---|
| `door_entities` | Locks whose unlocking means somebody came home. Today: `lock.lock_main_door` |
| `gate_entities` | Covers whose opening means the same. Today: `cover.garage_controller_garage_gate` |
| `person_entities` | Optional. Enables presence-driven transitions |
| `scene_map` | presence/mode/activity/overlay → scene entity. Any key may be empty |
| `auto_return` | Whether door/gate unlock forces `away → home` |
| `auto_away` | Whether all persons leaving sets `away`, with a grace period |
| `night_schedule` | Optional automatic `day → night`: a fixed time, or sun-based with offset |

The flow should validate that every scene in `scene_map` exists, and warn about
entities inside those scenes that no longer resolve — that alone would have
caught the four stale lock/gate references.

---

## Services

All target the hub entity.

| Service | Fields | Behaviour |
|---|---|---|
| `house_state.set` | `presence`, `mode`, `activity`, `overlay`, `reason`, `force` | Set any subset atomically. Rejects children of inactive parents. One scene resolution for the whole call, so `presence: home` + `mode: night` applies the Night scene once, not Come-home then Night. |
| `house_state.arrive` | `reason` | `away`/`vacation` → `home`. No-op when already home. What the door and gate call. |
| `house_state.depart` | `vacation` (bool) | → `away`, or `vacation`. Clears mode and activity. |
| `house_state.apply_scene` | `force` | Re-resolve and re-apply for the current state. For "the lights got out of sync". |
| `house_state.set_config` | Every config-flow field | Runtime settings, persisted. |

`house_state.set` replacing a pile of `input_select.select_option` calls is the
main ergonomic win: the dashboard stops needing to know which helper holds
which axis.

---

## Events

`house_state_event` on the bus, with `entity_id` and `type`:

| `type` | Extra data | When |
|---|---|---|
| `changed` | `presence`, `mode`, `activity`, `overlay`, `previous`, `reason` | Any accepted transition |
| `scene_applied` | `scene`, `resolved_from`, `overlay_scene` | A scene was actually called |
| `rejected` | `field`, `value`, `because` | A child was set while its parent was inactive |
| `arrived` / `departed` | `reason` | Presence crossed home/not-home |
| `overlay_changed` | `overlay`, `previous` | Seasonal overlay changed |

This is what lets `ring_bell_day` and `ring_bell_night` collapse into one
script that reads `state_attr('sensor.house_state', 'mode')` and
`…'overlay'`, instead of two near-identical scripts plus a `choose` on
`input_select.party_modes`.

---

## Transition rules

| Trigger | Condition | Result |
|---|---|---|
| Door in `door_entities` unlocks | `presence != home`, `auto_return` on | `arrive`, reason `door` |
| Gate in `gate_entities` leaves `closed` | `presence != home`, `auto_return` on | `arrive`, reason `gate` |
| All `person_entities` not home for the grace period | `auto_away` on, `presence == home` | `depart`, reason `presence` |
| Any person arrives home | `auto_return` on | `arrive`, reason `presence` |
| `night_schedule` fires | `presence == home`, `mode == day` | `mode: night`, reason `schedule` |
| `presence` leaves `home` | — | `mode`/`activity` reset to defaults |
| `mode` leaves `day` | — | `activity` → `none` |

The first two are the AppDaemon behaviour, preserved. The rest are new and each
is individually switchable, defaulting **off** so the first install behaves
exactly like today.

State, including `since` and a transition that was interrupted by a restart,
survives a Home Assistant restart.

---

## The card

`custom:lovelace-house-state-card`, following the two existing cards: compact
main card, gear opens a settings modal, `appearance: bubble` preset, failed
service calls surface as an HA toast.

```yaml
type: custom:lovelace-house-state-card
entity: sensor.house_state
name: Huset
appearance: bubble
show_activity: true      # optional, default true
show_overlay: true       # optional, default true
confirm_vacation: true   # optional, default true
```

Main card:

- A three-way segmented control for presence — Hjemme / Borte / Ferie. Ferie
  behind a confirmation, as in the current dashboard.
- Day/Night as a pair, **greyed out and unpressable when away** rather than
  hidden. Hiding it is what forced the conditional-card nest; disabling it keeps
  the layout stable and teaches the rule.
- Activity chips (Av / TV / Spise) only while in day mode.
- Overlay picker.
- A one-line status: current state, how long, and what caused it —
  "Hjemme · Natt · 3t 20m · låst opp dør" is genuinely useful.

Settings modal: the scene map with a picker per slot, door/gate/person
selections, auto-return and auto-away toggles, night schedule, and **Apply
scene now** (the sibling of Test now).

This replaces the whole *Status* + *Scener* block of
`bubble_domain/00_home.yaml` and the conditional nest of `00_home_view.yaml`
with one card.

---

## Migration

1. Install both, add the config entry, point `scene_map` at the existing scenes.
2. **Create the missing Come-home scene**, or leave the `home` slot empty —
   `scene.come_home` has never existed.
3. Repoint dashboards from `input_select.house_state` →
   `select.house_presence`, `input_select.house_states_home` →
   `select.house_mode`, `input_select.party_modes` → `select.house_overlay`.
4. **Delete the `Leave home` automation** (`automations.yaml`, id
   `1732874535769`). The integration owns that scene call now; leaving it in
   means firing twice.
5. Fix the stale members inside the Vacation, Night and Day scenes —
   `lock.main_door`, `lock.workshop_door`, `cover.garage_gate`.
6. Collapse `ring_bell_day` / `ring_bell_night` into one script reading the
   `mode` and `overlay` attributes.
7. Decide what happens to `input_boolean.halloween_mode` and
   `select.doorbell_partymode` — folded into `overlay`, or left alone with
   precedence written down.
8. Remove the two `input_select` helpers once nothing references them.

Worth keeping the helpers around read-only for a week; the integration can
mirror into them behind a `legacy_mirror` option so a missed automation does not
break silently.

---

## Out of scope

Per-room state, per-person state (that is Personal Wakeup's job), lighting
transitions and adaptive brightness, and anything that belongs in a scene rather
than in the state machine.

## Open questions

1. **Does `activity` earn its place**, or is TV/Spise just two scene buttons?
   It is the least-developed axis today — both buttons call the same scene. The
   cheap version is to drop the axis and let overlays cover it.
2. **Should `vacation` be a presence value or a flag on `away`?** As a third
   value it cannot express "away, and also on holiday". As a flag it complicates
   the segmented control.
3. **Overlay precedence** when two would apply — a fixed order, or a single
   value as specced here?
4. **Does auto-away belong here at all**, given HA has native presence? The
   argument for: the grace period and the "do not flip while someone is in the
   garage" guard are exactly the fiddly bits worth owning.

---

## Repo conventions

Matching the two existing projects, so CI and release flow are copy-paste:

**Integration** — config flow, `strings.json` + `translations/nb.json`,
`ruff check custom_components tests`, `pytest`, version kept in sync between
`pyproject.toml` and `custom_components/house_state/manifest.json` (CI fails if
they differ), merge to `main` tags `v<version>` and publishes a release.

**Card** — `npm ci`, `npm run lint`, `npm run typecheck`,
`npm run build` → `dist/lovelace-house-state-card.js` committed, CI verifies
`dist/` is up to date, version in `package.json` drives the release. Visual
editor exposing the same options as the YAML, and the `default` / `bubble`
appearance pair reading the shared `--bubble-*` CSS variables.

## Approved implementation decisions

User approved implementation on 2026-09-17: retain activity, vacation as a
presence value, a single overlay, and optional auto-away disabled by default.
Build both repositories and add them as submodules of hacs-components.

### Shared integration/card contract

- Domain `house_state`; hub default `sensor.house_state` when entry title is `House`.
- Scene map is a flat object with keys `home`, `away`, `vacation`, `day`, `night`,
  `tv`, `eating`, `christmas`, `halloween`, `party`; values are scene entity IDs
  or empty strings. `none` has no scene mapping.
- Runtime options: `door_entities`, `gate_entities`, `person_entities` (arrays),
  `scene_map` (object), `auto_return` (default true), `auto_away` (default false),
  `auto_away_grace` (seconds, default 300), `night_schedule` (object; `type` is
  `off`, `fixed`, or `sun`; `time` HH:MM:SS for fixed; `event` sunset/sunrise and
  `offset` signed seconds for sun), `legacy_mirror` (object, optional keys
  presence/mode/overlay mapping to input_select entity IDs).
- The hub also exposes `config` containing editable options for the settings UI.
- Inactive mode resets to `day`; inactive activity resets to `none`. Explicitly
  supplying either inactive child is rejected, even if it is the default.
- Dedupe compares the resolved base/overlay pair. Apply overlay after every
  actual base scene application. Changing overlay must apply even when base is
  unchanged. `apply_scene` defaults force to true for manual resynchronization.
- Persist desired state and an application-pending marker before scene calls;
  retry pending application after startup. Exactly-once device actions across a
  crash cannot be guaranteed; replay may repeat a scene.
- Unknown/unavailable person states never prove absence. Gate return requires a
  known closed → opening/open transition; startup/unknown does not imply arrival.
- No production Home Assistant configuration or scenes will be modified.
