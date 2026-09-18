# Panel door access events

Status: proposed · Date: 2026-09-18 · Implemented in: `door_monitor` (dxbell) ·
Consumed by: `doormonitor` integration (`doorbell-integration`), House State ≥ 0.5.0

## Why

When someone unlocks a door or opens the gate at the panel, Home Assistant has to
know who did it and at what access level. A guest being let in must not switch
the house to Home; a resident arriving must.

Today the panel publishes `LOCK`/`UNLOCK` and gate commands with no identity.
Identity only appears in the `logged_in_user` sensor, which carries a display
name, no ID and no access level, and has no link to any particular press. For a
KNX-owned door or gate the command goes straight onto the bus, so Home Assistant
only sees the real lock change state afterwards.

## Requirement

Every door or gate action taken on the panel by a logged-in user is published
on MQTT as an **access event**. The event names the door or gate, the action,
and the user and access level of the session. It is published **whether the
door or gate is MQTT-owned or KNX-owned**.

The panel stays independent of Home Assistant:

- It performs the action exactly as today.
- It never waits for a reply, and nothing depends on one.
- A failure to publish never delays or blocks a lock, unlock or gate command.

## MQTT contract

### Entity

A Home Assistant MQTT **event** entity, announced with the rest of the
discovery manifest and removed with it.

Discovery topic: `{discovery_prefix}/event/door_access/config`

```json
{
  "name": "door_access",
  "uniq_id": "{client_id}_door_access",
  "stat_t": "{base_topic}/event/door_access",
  "evt_typ": ["unlock", "lock", "open", "close"],
  "icon": "mdi:door-open",
  "dev": { "...": "the panel device, as for every other entity" },
  "avty_t": "{base_topic}/availability",
  "pl_avail": "online",
  "pl_not_avail": "offline"
}
```

With the default configuration this becomes `event.doorbell_door_access`.

### Event payload

Published to `{base_topic}/event/door_access`, **not retained**, at the
configured QoS. The payload is JSON:

```json
{
  "event_type": "unlock",
  "target": "door",
  "door": "front",
  "user_id": "kari",
  "user_name": "Kari",
  "access_level": "guest",
  "login_method": "code",
  "at": "2026-09-18T14:03:12.417Z"
}
```

| Field | Values | Notes |
|---|---|---|
| `event_type` | `unlock`, `lock` for a door; `open`, `close` for the gate | Must be one of `evt_typ`, or Home Assistant drops the event |
| `target` | `door`, `gate` | |
| `door` | the door ID as used in `{base_topic}/lock/{door}/…` | `null` when `target` is `gate` |
| `user_id` | `UserRecord.id` | Stable across renames; consumers use this, not the name |
| `user_name` | `UserRecord.name` | For logs and display only |
| `access_level` | `admin`, `resident`, `guest` | See [Access level naming](#access-level-naming) |
| `login_method` | `code`, `ble` | |
| `at` | RFC 3339 UTC timestamp with milliseconds | When the panel performed the action |

The payload never contains a PIN or a BLE identifier.

Gate **Stop** is not an access event and is not published.

### Access level naming

`User` is being renamed `Resident`. The event always sends `resident`, even from
a panel build that still calls the level `User` internally. Consumers accept
`user` as a synonym for `resident` during the transition. Any other value, or a
missing value, gives no privileges: consumers must not assume a resident.

## When to publish

| Action | Published |
|---|---|
| A door lock/unlock button pressed on the Control screen | Yes, `unlock` / `lock` |
| Gate Open / Close pressed on the Control screen | Yes, `open` / `close` |
| Gate Stop pressed | No |
| A lock, unlock or gate command received from Home Assistant over MQTT | No: Home Assistant already knows who asked |
| A door or gate state reported by the KNX bus | No |
| Boot sync, echo handling, or any other state correction | No |
| An action taken with no logged-in session | Publish with `user_id`, `user_name`, `access_level` and `login_method` set to `null` |

The panel UI can only lock or unlock with a session today, so the last row only
matters if that changes. Publishing it with null fields keeps "the panel did it,
but nobody was identified" distinguishable from "a key or app did it".

In `doorbell-core` this means emitting the event from the user-initiated paths
only: `unlock_door`, `lock_door` and the gate buttons. It must not go in the
shared tails (`apply_door_state`, `apply_garage_state`). `set_garage_state` is
also reached from the inbound MQTT gate command, so the gate path needs its own
entry point, or a flag, that separates a press from an inbound command.

## Ordering and timing

- **Queue the event before the command.** Push the access event into
  `publications` before the MQTT command publication and the KNX telegram, in
  the same call. The command and the event come from the same MQTT client at
  the same QoS, so Home Assistant receives the event first.
- **Don't wait for the KNX telegram.** The event goes out on MQTT immediately
  and independently of KNX. House State waits 3 seconds by default after a door
  unlock before treating it as an arrival (`arrival_delay`). The event must reach
  Home Assistant within that window.
- **No retries and no late replay.** If MQTT is disconnected, the event may be
  dropped. If the transport queues it, `at` lets consumers discard it: they
  ignore events older than 30 seconds, so a late event can't start a visit long
  after the guest came in.

## What Home Assistant does with it (informative)

This behavior lives in the `doormonitor` integration and House State, not the
panel. It's described here so the panel side can be checked against it.

| Event | Home Assistant |
|---|---|
| `unlock` or `open` by `guest` | Start a House State guest visit for this user; the house stays in Away/Vacation |
| `lock` or `close` by `guest` | End that guest's visit: House State reapplies the empty-house scene and verifies the configured locks |
| `unlock` or `open` by `resident` or `admin` | Arrival: the panel is at the door, so the person is there |
| `lock` or `close` by `resident` or `admin` | Nothing |
| Unknown or `null` access level | Logged only; normal lock/cover behavior applies |

## Tests (doorbell-core)

- The discovery manifest includes the `door_access` event entity with the
  payload above; `tests/mqtt_parity.rs` is updated to match.
- `unlock_door` / `lock_door` for a logged-in guest, resident and admin publish
  one event each with the right fields, before the door command publication.
- A KNX-owned door still publishes the event, and still sends its telegram
  with no MQTT command.
- Gate Open / Close publish `open` / `close`; Stop publishes nothing.
- An inbound MQTT lock, unlock or gate command publishes no event.
- A KNX bus state report publishes no event.
- The event is not retained, and contains no PIN or BLE data.
- A BLE login publishes `login_method: ble`.
- A panel still using the `User` level publishes `resident`.

## Documentation (dxbell)

- `SPEC.md`: add `door_access` to the MQTT entities, with the "When to publish"
  table.
- `SPEC.md` access levels: `guest` still grants the same panel rights, but Home
  Assistant now treats a guest's unlock as a guest visit rather than an
  arrival.

## Out of scope

- Any reply or acknowledgement from Home Assistant.
- Changing what each access level may do on the panel.
- Remote unlocking from the admin web app; it has no unlock route today.
