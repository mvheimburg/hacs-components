# House Climate implementation

Implement locally in the new component repository, preserving unrelated workspace work.

1. Scaffold the Lit/TypeScript package using the existing cards' build and test conventions. Define configuration, localized labels/formatting and numeric entity models. Test aliases, malformed values, missing entities and draft preservation.
2. Implement a generation-guarded HA forecast subscriber. Test subscription payload, unsupported features, failure/retry, cleanup, late callbacks and reconnection.
3. Adapt the package-local recorder history loader and SVG chart conventions. Test compressed recorder replies, boundary points, unavailable gaps, mixed units, stale replies and history errors.
4. Build the weather/sensor card and visual editor. Test rendered EN/NB text, entity selector events, recovery from missing entities, forecast labels, modal history, ranges and more-info.
5. Add standalone generic demo/screenshots, README and release packaging. Run test/lint/typecheck/build, inspect mobile/light/dark views, obtain code review, commit component and register umbrella gitlink/HACS list.

Review focus: late forecast subscriptions must unsubscribe; history gaps must not join across unavailable periods; different units must not share scales; configured missing sensors must recover without resetting config; language changes must not lose regional/date preferences.
