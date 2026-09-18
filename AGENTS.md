# Working in this repository

This is an umbrella repository for Home Assistant integrations, Lovelace cards
and Home Assistant apps (formerly add-ons). Every component here is a separate
subrepository, tracked by the umbrella as a git submodule. Each has its own Git
history, version, documentation, CI and release lifecycle. Integrations and cards
are independently installable HACS repositories: integrations use the HACS
Integration category; Lovelace cards use the Dashboard category. The umbrella
coordinates these repositories and is not itself a HACS installation package.

An app may be a subrepo here only when it works through a HACS integration: a
companion integration in this workspace, or an existing HACS integration it is
built for. Apps install from an app repository in the app store, not through
HACS. Keep the split clear:

- The integration owns what Home Assistant sees and relies on: entities, devices,
  config entries, services, events, runtime state machines, scheduling and
  safety behavior. It must keep working while the app is stopped, restarting or
  not installed, and fail clearly when the app's features are unavailable.
- The app owns what Home Assistant cannot reasonably host: heavy dependencies, a
  database, large content or media, and ingress UI for that content. It talks to
  Home Assistant through the integration's public API, not by writing entity
  states directly, and must not run a competing state machine.
- Apps only run on Home Assistant OS and Supervised installations. Anything core
  to the integration's purpose must therefore not depend on an app.
- Give the app its own version, changelog, CI and release process, and document
  which integration versions it is compatible with. Document the pairing in both
  READMEs.

Treat each component as independently distributable: its repository must contain
everything needed for its own installation and release. Run commands and make
component commits inside the appropriate subrepo, then update its gitlink in the
umbrella. These guidelines apply throughout the workspace; also read any
component-specific instructions.

## Cards are for everyday use

- Design cards around the household's tasks: understand the current state, see
  what needs attention, and take a clear action. Keep technical setup details out
  of the normal dashboard experience.
- Integrations own persistent configuration, automation rules, scheduling logic,
  validation, state transitions and device/service behavior. Cards render their
  entities and call their public services; they must not implement a competing
  state machine or independently run automations.
- Put integration setup and structural configuration under **Settings → Devices
  & services → the integration → Configure**, using structured forms and entity
  selectors. Avoid requiring users to edit JSON for normal setup.
- For House State, this includes the state tree, scene mappings, occupancy,
  default children, roles, overlays and rules, triggers and schedules. The card
  provides state/overlay selection, status, vacation confirmation and **Apply
  scene now**. Its settings cog links to the integration page.
- The Lovelace editor owns card-specific choices: entity/device selection, title,
  appearance, visible sections and interaction preferences. A dashboard action
  may update an integration setting through its public API when that is a useful
  everyday task, but integration settings must remain the authoritative setup
  surface. Do not make a custom card a prerequisite for configuring our integrations.
- Frontend-only cards for third-party integrations use the APIs those integrations
  expose. Keep necessary card bindings in the Lovelace editor; do not invent a
  backend configuration flow that the third-party integration does not provide.
- Existing cards may predate this split. Apply it to new work and deliberate
  refactors; do not silently broaden an unrelated change into a migration.

## English code, localized presentation

- Every card and its visual editor must support **English (`en`) and Norwegian
  Bokmål (`nb`)**. Our integrations should provide matching settings translations.
  English source code does not imply an English-only interface.
- Follow `hass.language`, falling back to `hass.locale?.language`, then English.
  Normalize case and underscores. Support `nb`, regional variants such as `nb-NO`
  and legacy `no`; retain the existing `nn` → Bokmål fallback without claiming
  that it is a separate Nynorsk translation. Unsupported label languages fall
  back to English. Update the UI when the HA language changes.
- Centralize card-owned strings in typed translation dictionaries shared by the
  card and editor within that package. Cover labels, statuses, help text,
  confirmations, validation messages, tooltips and accessible names—not just
  headings. Backend error details may retain their original wording.
- Keep identifiers, entity IDs, configuration keys, stored enum values and
  service payloads in their existing stable form. Translate their display labels;
  never translate the values sent to Home Assistant or written to configuration.
- Preserve user-defined names, titles, playlists and integration-provided names.
  Translate a stock starter name only when both its ID and unchanged original
  name match the known default. This is a display transformation, not a rename
  of stored data. Unknown device/program values must remain recognizable.
- Separate **translation language** from **formatting locale**. Preserve valid
  regional formats such as `en-GB`; selecting the English dictionary must not
  force US dates or a 12-hour clock. Use locale-aware dates, times and numbers,
  and respect HA formatting preferences where available. Normalize Norwegian
  aliases safely and handle malformed locale tags without crashing.
- Format numbers for display only; keep service values numeric. Avoid `toFixed()`
  as the final user-facing decimal formatter. Use HA entity-state formatting
  where appropriate, without adding a unit twice.
- Static card-picker metadata without a `hass` context may remain English.
  Document this exception; it does not extend to rendered cards or editors.

## State, safety and usability

- Treat Home Assistant as authoritative. Show pending actions, prevent duplicate
  requests, surface failures, and restore the authoritative control value after
  a rejected request. Disable device actions when data is unavailable.
- During a temporary reload, retaining the last valid display is useful, but it
  must not enable actions on stale data. Clear cached data when the selected
  entity/device changes. Keep the settings link accessible during failures.
- Configuration flows should edit a draft, validate it, and persist only on
  explicit Save. Cancel must leave saved settings untouched. Explain destructive
  changes and clean up references without silently broadening automation rules.
- Saving House State configuration must not apply scenes. Scene application is
  an explicit action or an integration-controlled runtime transition.
- Support narrow/mobile layouts, light and dark themes, accessible controls and
  both default and Bubble appearances where the package offers them. Use HA and
  existing theme variables rather than assuming a particular dashboard palette.

## Entity identifiers

- When a user names something in a config flow (a wakeup alarm, a school
  alert, a guarded water supply, a house), that name becomes a device, and every
  entity ID is `<domain>.<slug of the name>_<key>`: "Lila" gives
  `sensor.lila_wakeup`, "Hytta" gives `binary_sensor.hytta_leak`. The key is a
  short, fixed English word per entity (`wakeup`, `school`, `leak`, `override`,
  `state`, `preset`), chosen once and documented in the README.
- Produce this with `has_entity_name = True`, a device named after the entry,
  and `suggested_object_id` returning the key. Never let a translated entity name
  shape the ID: an ID must be the same whatever language Home Assistant runs in.
  The friendly name may stay translated or be just the entered name.
- The rule applies when an entity is first created. Never rename existing
  entity IDs in a migration or on an entry rename: automations and dashboards
  depend on them. Test the new ID under a non-English HA language, and that a
  pre-registered entity keeps its ID.

## Implementation and verification

- Keep packages self-contained: no runtime imports across sibling submodules.
  Reuse the package's existing components and conventions before adding another
  abstraction or dependency.
- Test rendered behavior and meaningful service payloads: Bokmål, English,
  locale aliases, language changes, custom names, regional formatting,
  unavailable states and failed requests. Test integration flows through Home
  Assistant, including cancellation, validation and persistence.
- Run the affected package's required tests, lint, typecheck and build. Rebuild
  tracked distributions when source changes. Keep package/lockfile versions and
  integration manifest/project versions consistent with their release process.
- Update the component README when behavior or setup changes. When configuration
  moves, document where users now find it and any minimum integration version.
- Commit component changes in their own repositories, then update umbrella
  submodule references. Inspect each repository's state and preserve unrelated
  work. Pushes to `main` can trigger releases: do not publish unless authorized.
- Every component repository needs a GitHub description and topics; HACS shows
  the description and validation expects topics. When creating a repository,
  or when either is missing, give the owner a ready-to-run
  `gh repo edit <owner>/<repo> --description "…" --add-topic …` command (or run
  it if `gh` is authenticated). Always include `home-assistant`,
  `homeassistant` and `hacs`; add `hacs-integration` for integrations, or
  `hacs-dashboard`, `lovelace`, `lovelace-card` and `lovelace-custom-card` for
  cards; then a few topics naming what the component is about. Base the
  description on the README's first paragraph.
