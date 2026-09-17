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
| [`lovelace-house-state`](lovelace-house-state/) | The Lovelace card: state controls, a tree editor, scene mapping and automation settings, with default and Bubble appearances. |

The integration owns the state machine and scene calls; the card uses its
entities and services. See the [approved design](docs/superpowers/specs/2026-09-17-house-state-tree.md)
and the integration README for setup and migration from existing helpers.

## Ajax / Aegis

| Submodule | What it is |
| --- | --- |
| [`lovelace-ajax`](lovelace-ajax/) | Aegis system and device cards: automatic Ajax device discovery, alarm takeover, health reporting and confirmed bypass controls, with default and Bubble appearances. |

This frontend-only package uses the third-party [Aegis for Ajax integration](https://github.com/bvis/aegis-hass).
See the [approved design](docs/superpowers/specs/2026-09-17-aegis-panel-design.md).

## Appliances

| Submodule | What it is |
| --- | --- |
| [`lovelace-appliance-panel`](lovelace-appliance-panel/) | Home Connect Local cards for ovens (with microwave/steam modules), dishwashers, coffee machines, refrigerators and a kitchen overview. Visual editors and default/Bubble appearances included. |

Cards work directly with Home Connect Local; staged presets are a separate future
integration. See the [design](docs/superpowers/specs/2026-09-17-appliance-panel-design.md).

```bash
git clone --recurse-submodules git@github.com:mvheimburg/hacs-components.git
```

See each submodule's README for installation, services, events and card
configuration.
