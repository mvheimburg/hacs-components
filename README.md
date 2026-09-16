# hacs-components

Umbrella repository for a set of Home Assistant household routines. Each part
is a git submodule with its own CI and automatic releases.

## Wake up

| Submodule | What it is |
| --- | --- |
| [`personal_wakeup_hacs`](personal_wakeup_hacs/) | The `personal_wakeup` custom integration: sunrise light fade, Music Assistant playlist fade-in, stop / snooze / auto-off, weekday schedule, skip-next, presence check, events. |
| [`lovelace-personal-wakeup-card`](lovelace-personal-wakeup-card/) | The Lovelace card that controls it, with a big Stop button and snooze presets. |

## Time for school

| Submodule | What it is |
| --- | --- |
| [`time-for-school`](time-for-school/) | The `time_for_school` custom integration: at a set time per weekday it turns off any number of entities (TVs, speakers) and blinks any number of lights, then restores them. |
| [`lovelace-time-for-school`](lovelace-time-for-school/) | The Lovelace card that controls it: a weekly schedule editor, blink settings and a Stop button. |

```bash
git clone --recurse-submodules git@github.com:mvheimburg/hacs-components.git
```

See each submodule's README for installation, services, events and card
configuration.
