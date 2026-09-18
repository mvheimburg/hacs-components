# Card Bokmål Localization Implementation Plan

> Execute independent card packages with superpowers:dispatching-parallel-agents and test-driven-development; review and verify all packages before updating umbrella references.

Goal: All six Lovelace card packages support Home Assistant's Norwegian Bokmål UI while source identifiers, stored configuration and service payloads remain English.

Language policy: read hass.language first, falling back to hass.locale.language. Normalize case and underscores; nb / nb-NO and legacy no select Bokmål, existing nn aliases may retain Bokmål fallback. Unsupported languages use English. Re-render on HA language changes. Do not translate arbitrary user-configured entity/device/state/overlay names. Shared helpers live within each independently shipped repo, not cross-submodule imports.

- [x] House-state: extract shared typed labels for card/editor, finish schedule/accessibility/fallback strings and correct language selection; test rendered UI and unchanged English service IDs.
- [x] Personal wakeup and school: audit cards/editors, implement typed en/nb translations and matching locale detection; test controls and English payload values.
- [x] Appliance panel: localize card, six editors and card-owned status/action/reason text; preserve integration-reported names and values; test rendered labels and raw service payloads.
- [x] Aegis and heatpump: close language field/fallback/accessibility/enum gaps and add regressions.
- [x] Each package: patch version, README language behavior, rebuild dist, run test/lint/typecheck/build (add focused browser harness to school if needed).
- [x] Review results, verify committed bundles and clean child repositories, update umbrella gitlinks and commit locally. No publication requested.

Verification: all six packages passed browser tests, lint, typecheck and production builds. Independent review found and resolved regional English formatting regressions and the school blink interval decimal separator. Final counts: wakeup 31, school 14, house-state 27, appliance panel 162, Aegis 78, heatpump 50. House-state configuration was subsequently moved to the integration as documented in the adjacent settings plan.
