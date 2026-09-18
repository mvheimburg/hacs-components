# House State settings relocation

Approved direction: configure House State under Settings → Devices & services → House State → Configure. The dashboard handles everyday state/overlay selection and Apply scene now. Its cog links to the integration settings; the Lovelace editor keeps presentation and entity selection.

The integration already owns all stored configuration. Preserve its schema and public services, including set_config, so existing installations and automations need no migration. Existing onboarding remains compatible.

## Implementation

- Integration 0.3.0: replace options JSON objects with a menu and structured forms for state tree, initial state, roles, overlays/rules, trigger entities, arrival/departure behavior, night scheduling and legacy helper mirrors.
- Work on a deep-copied draft. Only explicit Save validates the complete configuration, confirms scene warnings and persists. Closing the flow discards edits. Keep intermediate edits repairable, avoid cycles, and clean references safely when removing states. Explain that removal promotes children and never allow the final state to be removed.
- Card 0.3.0: remove embedded configuration dialog and configuration writes. Keep everyday controls, vacation confirmation, status and localized Apply scene now. Disable actions while unavailable/busy while retaining settings access.
- English source/config values, English and Bokmål presentation. Preserve user-defined names and existing options.
- Tests: real HA options navigation, editing, cancellation, validation, warnings and atomic persistence; browser card action payloads, navigation, busy/unavailable behavior and language switching.
- Verify full package suites, lint/typecheck/build, translation parity, release versions and generated distributions. Review changes and commit locally with umbrella gitlinks; no push or release.

## Parallel ownership

- Integration: nb_aegis_heatpump, branch feat/structured-settings.
- Card: nb_wakeup_school, existing fix/bokmal-localization branch.
- Parent: design, cross-repository review, umbrella references and verification.

## Verification outcome

Implemented integration and card version 0.3.0. The integration passes 82 real
Home Assistant tests and Ruff. The card passes 27 Chromium tests, lint,
typecheck and build. Independent reviews found no outstanding blocker; the
fixed-time selector normalization issue was corrected and verified through the
real options flow. English and Bokmål translation keys match (237 keys), and
all options menus/steps have corresponding handlers and translations.

Draft cancellation, validation failures, warning acknowledgement, optional
selector clearing, state/overlay CRUD, safe reference cleanup, every overlay
rule type and saving without applying scenes are covered. Existing stored
configuration and public services remain compatible. Distribution rebuilt;
local commits only.
