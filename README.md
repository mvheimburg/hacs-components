# personal-wakeup

Umbrella repository for a Home Assistant wake-up alarm. Both parts are git
submodules with their own CI and automatic releases:

| Submodule | What it is |
| --- | --- |
| [`personal_wakeup_hacs`](personal_wakeup_hacs/) | The `personal_wakeup` custom integration: sunrise light fade, Music Assistant playlist fade-in, stop / snooze / auto-off, weekday schedule, skip-next, presence check, events. |
| [`lovelace-personal-wakeup-card`](lovelace-personal-wakeup-card/) | The Lovelace card that controls it, with a big Stop button and snooze presets. |

```bash
git clone --recurse-submodules git@github.com:mvheimburg/personal-wakeup.git
```

See each submodule's README for installation, services, events and card
configuration.
