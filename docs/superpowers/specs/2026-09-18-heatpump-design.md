# Heat pump card — approved design

Approved in conversation on 2026-09-18 following the supplied specification.

Create `lovelace-heatpump` as a git submodule of the umbrella workspace. Ship one
Lit/TypeScript custom card, `heatpump-card`, with modes `all`, `comfort`, `water`,
and `efficiency`. Use default and Bubble appearances, English and Norwegian
Bokmål, and a visual editor. No KNX, scheduling, tariff or integration backend.

Resolve entities inside a mypyllant config entry through registries, device
identifiers/models, domain and class, original metadata and entity suffixes.
An entity anchor selects its entry and zone; entry alone selects the first zone
and circuit deterministically. Never combine installations or energy devices.
Ambiguous roles remain unset and are reported; optional YAML role overrides
provide an escape hatch. All controls operate only on fresh available states.

Comfort includes climate target and mode, flow readings and quick veto duration.
Hot water includes a filled temperature column relative to setpoint (not a claim
about remaining shower capacity), explicit boost on/off and legionella recency
with a configurable seven-day reminder default. Faults take precedence in every
mode. Curve and minimum flow number controls require allow_curve_edit: true.

Efficiency uses hourly long-term statistics for 24h, 7d and 30d ending at the
latest completed UTC hour. Prefer integration-provided mypyllant external
statistics; fall back to recorder entity statistics. Normalize units to kWh.
Compute ratios on paired nonnegative hourly changes only; skip resets and gaps,
report incomplete coverage, and never equate unavailable data with no demand.
Show each mode separately and retain reported environmental energy independently
of heat output. Outdoor-temperature scatter plots pair hourly temperature means
with the same hourly energy buckets. No inferred heating-curve recommendation.

Keep last valid live readings in browser memory, marked stale with their actual
last update timestamp. No fabricated last-seen time on first load. Missing roles
render nothing; statistics failures have an explicit retry. Refresh bounded and
coalesced by connection/window; discard obsolete async responses and clean up
subscriptions on removal. Service errors and pending states must be visible.

Use synthetic, labelled test fixtures for a winter week, summer no demand,
counter reset and six-hour outage, plus discovery, lifecycle and control tests.
Real instance fixtures remain a follow-up because no export was supplied.

Commit dist/heatpump-card.js and its source map. npm ci, test, lint, typecheck and
build must pass; CI checks dist drift. HACS uses category plugin in validation,
not integration metadata. Release workflow tags v<package version> on main.
