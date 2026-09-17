# Wakeup configuration — requested design

User requested: use chosen entry name for sensors, track multiple people with
any-person-home semantics, choose lights/music/both, and individual times per day.
Implement in personal-wakeup and lovelace-personal-wakeup. Existing alarms must
retain behavior after upgrade. No remote publication is authorized by this task.

## Shared API contract
- `person_entities`: list of person entity IDs, stored in entry options and exposed
  as sensor attribute; deduplicate in order. Existing `person_entity` option is a
  fallback only when the new key is absent. Empty list explicitly clears it.
  Retain legacy set_config `person_entity` and read-only first-person alias for
  compatibility; new list wins if both supplied. require_home true allows scheduled
  triggers iff ANY selected person is exactly home. Unknown/unavailable/missing
  people do not count as home. Empty list leaves presence unrestricted, matching
  existing behavior. Manual trigger and snooze retain presence bypass behavior.
- `wake_mode`: `lights`, `music`, or `both`; default `both`. Stored in options,
  exposed as attribute, accepted by set_config and setup/options flows. Only
  selected channels need entities. Inactive channel IDs may be retained, omitted,
  or cleared. Validate the complete merged configuration before mutating it.
  Disabled channels receive no service calls, including snooze/resume/stop/auto-off.
  When changing wiring/mode during an active run, stop the OLD enabled media
  player before switching options; subsequent actions use the new mode.
  Music-only starts its music fade immediately; both retains existing light/music
  alignment. Restart/auto-off duration uses enabled channels, not disabled light fade.
- `day_times`: weekday->HH:MM mapping, keys mon..sun. Runtime setting, restored
  as JSON strings and exposed in sensor attributes. Missing keys inherit existing
  `time_of_day`. `{}` clears overrides. Existing `weekdays` still enables days;
  retain overrides for disabled days. Reject invalid weekday/time atomically.
  Existing empty weekdays means every day; card must prevent disabling last day
  through this legacy API and direct user to main enable toggle instead.
  Calculate next/skip-next across weeks using each enabled day's local time;
  correctly find two occurrences even when only one weekday is enabled.
- Names: `_attr_name = entry.title or "Wakeup Alarm"`; entry.entry_id remains
  unique ID. Existing registry IDs and custom entity names remain stable.
  Card already uses sensor friendly_name unless explicit card name is set.
- Versions: both packages become 0.4.0, integration manifest + pyproject match,
  frontend package + lock match. Preserve all unrelated user/workspace changes.

## User interface
Setup/options flows expose multi-person and wake mode with conditional target
requirements. Lovelace settings expose multi-person selection, any-home status,
mode and relevant target/fade/music controls, plus seven enabled/day-time rows.
Use the existing general time as the default for days without overrides. Keep
existing appearance presets and responsive layout. Stage mode/target changes if
needed and save together so selecting music-only without a player is repairable
in UI. Report backend errors, retain unsaved inputs, avoid hidden stale settings.
Legacy sensor attributes may be used as read fallback; require integration 0.4.0
for new settings, do not pretend old integration supports new service fields.

## Validation
Meaningful test-first HA tests and browser DOM tests for all new contracts.
Backend: any one home; none home/unknown; empty/legacy people; modes, no calls to
inactive channels, active-mode switch, restart/snooze; day-specific next times,
weekly skip-next, override clearing/validation/restore; sensor naming regressions.
Frontend: multi-selector payload, default/legacy display, mode/targets atomic save,
seven day-time controls, exact payloads and stale/error behavior, layout.
Run full backend suite/Ruff, frontend test/lint/typecheck/build/audit, dist freshness,
independent browser smoke and source review. No real HA calls; do not publish.
