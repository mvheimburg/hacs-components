# House State — configurable tree design

This supersedes the fixed four-axis model in the original proposition. On
2026-09-17 the user explicitly chose every state configurable, including
presence and modes with explicit parent relationships and automation roles,
and requested the ability to build a tree. The earlier Home/Day/TV etc.
model is an editable starter template only.

## Configuration contract (integration and card)

`config` on the hub contains these editable fields. `house_state.set_config`
accepts any subset directly, atomically; arrays/objects replace the complete
field, not a deep merge.

```json
{
  "state_tree": [
    {"id":"home","name":"Home","parent":null,"scene":"","default_child":"day","occupied":true},
    {"id":"day","name":"Day","parent":"home","scene":"","default_child":"idle","occupied":null},
    {"id":"idle","name":"None","parent":"day","scene":"","default_child":null,"occupied":null},
    {"id":"tv","name":"TV","parent":"day","scene":"","default_child":null,"occupied":null},
    {"id":"eating","name":"Eating","parent":"day","scene":"","default_child":null,"occupied":null},
    {"id":"night","name":"Night","parent":"home","scene":"","default_child":null,"occupied":null},
    {"id":"away","name":"Away","parent":null,"scene":"","default_child":null,"occupied":false},
    {"id":"vacation","name":"Vacation","parent":null,"scene":"","default_child":null,"occupied":false}
  ],
  "initial_state":"home",
  "overlays":[
    {"id":"christmas","name":"Christmas","scene":""},
    {"id":"halloween","name":"Halloween","scene":""},
    {"id":"party","name":"Party","scene":""}
  ],
  "roles":{"arrival":"home","departure":"away","vacation":"vacation","night":"night"},
  "door_entities":[],"gate_entities":[],"person_entities":[],
  "auto_return":true,"auto_away":false,"auto_away_grace":300,
  "night_schedule":{"type":"off"},
  "legacy_mirror":{}
}
```

Node IDs are stable identifiers matching `[a-z][a-z0-9_]*`, at most 64
characters; names are editable nonempty display labels (max 100 characters).
Parent is null for a root. Every node can be selected even when it has
children. Selecting a node follows its configured default_child recursively;
without a default child, that node is the active leaf. Occupied is inherited
from the nearest ancestor that explicitly sets it; absent any override, false.
The `none` overlay is a reserved off sentinel and does not occur in overlays.

At least one node is required. Reject duplicate IDs, cycles, missing parents,
invalid initial_state, non-direct default_child, missing role targets,
unrecognized fields, invalid scene/entity IDs and malformed schedules before
persisting anything. Roles may be null (disabled); they refer to arbitrary
node IDs, never magic names. Arrival and night targets must resolve occupied;
departure/vacation targets must resolve unoccupied. Validate the resolved
path including default children. All configured scene entities must exist;
warn about missing members inside scenes. A roles object has exactly the four
optional nullable role keys above; omitted keys become null.

`night_schedule`: `type` off/fixed/sun; fixed uses `time` HH:MM:SS; sun uses
`event` sunset/sunrise and signed `offset` seconds. Schedule triggers the night
role only while occupied and not already in the target's subtree. Missing role
means no automatic action. Presence unknown/unavailable does not prove absence.

`legacy_mirror`: optional `state` and `overlay` keys, each an input_select
entity ID. Mirror leaf ID/name and overlay ID/name when a matching helper
option exists; failure warns and does not undo state. The original multi-axis
legacy_mirror is superseded; migration docs explain using template sensors or
automations for old presence/day-night helpers instead.

## Runtime / services

- Persist active leaf `state`, overlay and `since`; derive `active_path` (root
  to leaf array of IDs), occupied status and resolved scene from current tree.
- Sensor `sensor.house_state` (default entry title House) state is the active
  node ID. Attributes: `state`, `active_path`, `state_tree`, `overlays`,
  `overlay`, `occupied`, `last_scene`, `last_changed_by`, `since`,
  `previous_state`, `application_pending`, `scene_warnings`, `config`.
  Also expose `auto_return_enabled`, `night_schedule`, `available_overlays`
  (IDs including none) for easy automation use. No fixed-axis attributes.
- `house_state.set`: `state` and/or `overlay`, optional `reason`, `force`.
  Selection resolves full path atomically with one base scene, then overlay.
- `house_state.arrive`: optional reason; select arrival role unless already
  occupied. `house_state.depart`: vacation bool + optional reason; select
  departure/vacation role. An explicitly called action with missing role is
  rejected clearly; automatic actions with missing roles do nothing.
- `house_state.apply_scene`: force defaults true.
- `house_state.set_config`: fields above; persist as integration options.
- Scene resolution walks leaf toward root for first nonempty scene. Dedupe
  resolved base/overlay pair; changing overlay reapplies base before overlay.
  Persist desired state/pending marker before scene calls; retry pending after
  startup. No claim of exactly-once effects across a process crash.
- Config edits normally do not fire scenes. If selected state/overlay is
  removed, normalize to initial_state/default descendants or none, update
  timestamp and emit changed. Clear scene deduplication history after structural
  configuration changes. Clear pending application when the selection or desired
  scene pair changes; retain genuine failed-scene work when its desired pair is
  unchanged. Options reload never automatically retries it. Use Apply scene now
  or another state request to synchronize after editing; an actual HA restart
  can retry preserved failed-scene work.
- On restore, missing stored node falls back to initial_state/defaults; missing
  overlay becomes none. Preserve since when the selected state is still valid.

## Entities and events

- Hub sensor and occupied binary sensor per entry.
- Root select `select.house_state` chooses root IDs.
- One select per node with children (for example `select.house_home`,
  `select.house_day`), with stable unique ID from entry + parent node ID.
  It offers direct child IDs and is unavailable while parent is inactive.
  If active parent has no selected child, current_option is None.
- Overlay select dynamically offers none plus configured overlay IDs.
- Add/remove branch entities when tree changes; reload entry safely if needed.
- changed event carries state, active_path, overlay, previous, reason;
  arrived/departed reflect occupied boundary; overlay_changed, rejected and
  scene_applied retain their purposes with generic state IDs/resolved_from.

## Card

`custom:lovelace-house-state-card`, entity, name, appearance default/bubble,
show_overlay (true), confirm_vacation (true). Remove show_activity because
the tree has arbitrary depth; visual editor exposes the actual options.

Main card renders siblings for every step along the active path, plus the
active node's children if none is selected. Names come from configuration;
never fixed labels or fixed state IDs. Selecting a node uses set(state:id).
Vacation confirmation applies to the configured vacation-role target and its
descendants. Overlay picker uses configurable names. Status shows path, elapsed
time, and reason. User clicks pass reason:user; errors raise HA toast.

Settings tree editor shows all nodes indented. Select a node to edit its name,
parent, scene, default child and occupied inheritance. Add root/child and remove
subtree (confirmation) controls. Stable IDs generated on creation and shown
only where needed to disambiguate. Reparent picker excludes self/descendants.
Removing referenced nodes clears role/default_child references and selects a
valid initial_state. Prevent deleting the last node. Save tree changes as one
atomic set_config payload including state_tree/roles/initial_state; local draft
and explicit Save/Cancel avoid invalid intermediate configurations. Overlay
editor supports add/rename/scene/remove and saves the complete list. Existing
entity selectors, toggles, grace and schedule settings remain.

Role dropdowns choose any eligible configured node (with disabled option).
Occupied flag is configurable per node with inherit/occupied/unoccupied.
Explain it as whether someone is home, not an implementation detail.
No drag-and-drop required: parent selection fully supports rearranging a tree.

## Validation and documentation

Test arbitrary renamed roots, 4+ levels, custom overlays, default descent,
ancestor scene fallback, occupancy overrides, graph rejection atomicity,
role-driven triggers, dynamic entity removal/reload and renamed active states.
Retain scene dedupe/failure/restart/timezone/unload tests. Browser-test adding,
reparenting and removing nodes, atomic save, dynamic controls, role confirmation,
custom overlays, mobile rendering and settings focus.

README explains starter template, editing tree, service/config schemas,
installation and migration. HACS/version/CI/release requirements are unchanged.
