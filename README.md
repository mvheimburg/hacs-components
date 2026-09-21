# hacs-components

Umbrella repository for Home Assistant household integrations and dashboards. Each part
is a git submodule with its own CI and automatic releases.

## Wake up

| Submodule | What it is |
| --- | --- |
| [`personal-wakeup`](personal-wakeup/) | The `personal_wakeup` custom integration: named alarms with individual weekday times, any-person-home checks, lights / music / both, stop / snooze / auto-off and skip-next. |
| [`lovelace-personal-wakeup`](lovelace-personal-wakeup/) | The Lovelace card: daily schedule, people and output settings, with a big Stop button, snooze presets and optional Bubble appearance. |

## Time for school

| Submodule | What it is |
| --- | --- |
| [`time-for-school`](time-for-school/) | The `time_for_school` custom integration: at a set time per weekday it turns off any number of entities (TVs, speakers) and blinks any number of lights, then restores them. |
| [`lovelace-time-for-school`](lovelace-time-for-school/) | The Lovelace card that controls it: a weekly schedule editor, blink settings and a Stop button. |

## House state

| Submodule | What it is |
| --- | --- |
| [`house-state`](house-state/) | The `house_state` integration: a configurable tree of household states, scene inheritance, overlays and automation roles. |
| [`lovelace-house-state`](lovelace-house-state/) | The Lovelace card: state and overlay controls, Apply scene now and a link to integration settings, with default and Bubble appearances. |

The integration owns the state machine, scene calls and configuration under
Settings → Devices & services → House State → Configure. The card uses its
entities and services for everyday actions. See the [settings plan](docs/superpowers/plans/2026-09-18-house-state-settings.md),
the [original design](docs/superpowers/specs/2026-09-17-house-state-tree.md)
and the integration README for setup and migration from existing helpers.

## Doors and gates

| Submodule | What it is |
| --- | --- |
| [`lovelace-access-control`](lovelace-access-control/) | The house's doors and gates in one card: overall lock status, the last door panel event, lock/unlock and gate controls with confirmation, in the House State card's style. Works with any `lock` and `cover` entities. |

## Ajax / Aegis

| Submodule | What it is |
| --- | --- |
| [`lovelace-ajax`](lovelace-ajax/) | Aegis system and device cards: automatic Ajax device discovery, alarm takeover, health reporting and confirmed bypass controls, with default and Bubble appearances. |

This frontend-only package uses the third-party [Aegis for Ajax integration](https://github.com/bvis/aegis-hass).
See the [approved design](docs/superpowers/specs/2026-09-17-aegis-panel-design.md).

## Water Guard

| Submodule | What it is |
| --- | --- |
| [`water-guard`](water-guard/) | The `water_guard` integration: a latched leak alert that reaches chosen people's phones, optional water shut-off, and **Override: open water**. |
| [`lovelace-water-guard`](lovelace-water-guard/) | The card: calm status, the red leak alert with sensors, valves and who was reached, and the confirmed override. Default and Bubble appearances. |

The integration owns the alert, pushes and valves, and keeps working without the
card. House State only switches the water for vacation and guests.

## Appliances

| Submodule | What it is |
| --- | --- |
| [`appliance-presets`](appliance-presets/) | The `appliance_presets` integration: named multi-step programmes (preheat, timed steps, hold) with scheduling from a ready time, remote-start checks, safety guards and a sidebar panel for editing presets. |
| [`lovelace-appliance-panel`](lovelace-appliance-panel/) | Home Connect Local cards for ovens (with microwave/steam modules), dishwashers, coffee machines, refrigerators and a kitchen overview. Visual editors and default/Bubble appearances included. |

The cards work directly with Home Connect Local and do not need the presets
integration. See the [design](docs/superpowers/specs/2026-09-17-appliance-panel-design.md)
and the presets README.

## Heat pump

| Submodule | What it is |
| --- | --- |
| [`lovelace-heatpump`](lovelace-heatpump/) | myVAILLANT heat pump card: comfort and quick veto, hot-water tank and boost, legionella reminders, measured heating/hot-water COP and outdoor-temperature plots. Visual editor, separate panel modes, English/Bokmål and default/Bubble appearances. |

Uses the third-party [myPyllant integration](https://github.com/signalkraft/mypyllant-component)
and Home Assistant long-term statistics. See the [approved design](docs/superpowers/specs/2026-09-18-heatpump-design.md)
and the card README for statistics coverage and installation.

```bash
git clone --recurse-submodules git@github.com:mvheimburg/hacs-components.git
```

See each submodule's README for installation, services, events and card
configuration.

All card packages support English and Norwegian Bokmål, following the Home
Assistant user's language. Source identifiers, configuration keys and service
values remain English; custom names are preserved.

## Adding everything to HACS

Each component is its own HACS custom repository. To add them all at once, open
Home Assistant in a browser as an admin, open the developer console (F12 →
Console), and paste [`scripts/hacs-add-all.js`](scripts/hacs-add-all.js). Then
install the components you want from HACS. `python3 scripts/check-hacs-list.py`
checks that the script lists every HACS submodule.
