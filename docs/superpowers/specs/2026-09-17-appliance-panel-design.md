# Appliance Panel design — approved scope

User approved cards first and Home Connect Local only, then requested dedicated
oven, dishwasher, coffee-machine and refrigerator cards. Oven must additionally
support microwave and steam modules. Preset engine and cloud are excluded.

One package `lovelace-appliance-panel`, version0.1.0, exports:
`oven-card`, `dishwasher-card`, `coffee-machine-card`, `refrigerator-card`,
`appliance-card` (generic/other appliance), `kitchen-panel-card` (overview).
All load from `dist/appliance-panel-card.js`. Every card has a visual editor and
default/Bubble appearances. Device/area selectors accept IDs or unambiguous names.

Model uses device/entity registries restricted to homeconnect_ws. Verified unique
ID keys resolve roles even when entity IDs are renamed; suffix aliases are a
fallback. Generic device classes never collapse unrelated options into one role.
Keep unknown entities in Other, with controls only for supported native domains.
Show disabled count, absent/unknown/unavailable distinctly and last report only
when supplied by HA. Registry cache invalidates on reconnect and registry events.

Oven layout: programme, target/current temperature, duration; optional microwave
power and steam level/water tank modules. `oven_modules: auto` (default) discovers
modules from exposed capabilities; an array containing microwave and/or steam
explicitly chooses modules. Empty array shows standard oven only. Settings must
never invent an unavailable entity. Dishwasher presents programme/options/care;
coffee presents drink selection, bean/temperature/milk/quantity and consumables;
refrigerator presents zones/setpoints/doors/super/vacation/alarms. Generic card
handles other exposed appliance kinds. Compact rows open full details.

Kitchen overview separates busy appliances (known finish first) from attention:
consumables, problems, open doors, offline and unknown status. Delayed and paused
runs are busy but never inferred from progress alone. An offline appliance cannot
be called idle. Programme states and duration units normalize from Local values.

Action policy is shared across all UI paths. Start and potentially-starting Local
programme selection require confirmation by default. Remote-start off/unknown/
unavailable when exposed blocks these actions; missing permission entity is
reported as unverified rather than silently inferred enabled. Abort remains direct
and does not depend on remote-start permission. Validate current state, availability,
entity ownership, select options and numeric bounds when dispatching, including
again after confirmation. Unknown button/select commands are conservative. Native
services only; no actual appliance commands during development.

Fixtures are synthetic, source-derived and provenance labelled because the
instance dumps mentioned in the proposition were not supplied. Test discovery,
state normalization, availability, controls, confirmation, reconnects, editors,
responsive layout and both appearances. Commit reproducible dist and HACS/CI/release
metadata. No remote publication until requested.
