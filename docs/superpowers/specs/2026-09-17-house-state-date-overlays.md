# House State — date-driven overlays (proposal)

For `mvheimburg/house-state`. Written from the point of view of a consumer —
the DoorMonitor panel reads overlays through the doormonitor integration — but
the request is general and nothing in it is doorbell-specific.

Revised on 2026-09-17 after reading the implementation at 0.1.0. Claims about
current behavior below are cited to the code rather than assumed, and the
opening section replaces an earlier framing that treated scene application as
a detail. It is the main decision.

## What I'm asking for

Let an overlay activate itself from a date rule, so Christmas, Halloween,
Easter and birthdays apply without anyone touching a select.

Overlays already exist and already have the right precedence: a configured
overlay scene runs after the active node's own scene. What is missing is a
reason for one to turn on by itself.

## First: an overlay is a mode, and its scene is optional

An overlay carries two things. A **label** — `overlay: christmas`, published on
the hub, read by consumers who act on it whenever *they* act, such as a
doorbell that rings at 14:00 and asks what mode the house is in. And an
optional **scene**, which is a device action that fires the moment the overlay
changes.

These have opposite timing needs. The label wants to flip exactly at the
boundary, because nothing happens when it flips. The scene wants to flip only
when touching the house is welcome.

The model already separates them: `scene: ""` resolves to no overlay scene
(`StateTree.resolve`) and nothing is called. **A household that only wants
Christmas to change the bell sound and the panel theme configures no scene at
all, and has no timing problem to solve.** That is the doormonitor case
entirely, and it should be stated in the README, because it means the hard part
below applies only to people who also want Christmas lights.

For those people, automating this axis is not free. Changing the overlay
reapplies the base scene and then the overlay scene (`HouseCoordinator.
transition` → `apply`). A rule evaluated at local midnight on 1 December
therefore calls `scene.turn_on` on the night base scene and then the Christmas
scene, in a dark house, with people asleep. Today that can only happen because
a human touched a select.

### The rule: rules set the mode, people and events apply the scene

A rule-driven overlay change is **quiet**. It updates the selection, fires
`overlay_changed`, and does not apply scenes. A manual change stays **eager**,
because someone who touches a select expects to see something happen.

The deferred scene lands on the next application that was going to happen
anyway: someone comes home, the night schedule fires, someone picks a state,
someone calls `apply_scene`. On 1 December the mode flips at 00:00 and the tree
comes on when somebody walks in the door.

This is close to free in the current code. `transition` computes

```python
needed = force or self.pending or [base, overlay_scene] != self.last_pair
```

so a quiet transition that skips `apply()` simply leaves `last_pair` stale, and
the next transition — even one that would otherwise dedupe — applies the new
pair on its own. Two constraints:

- **Do not reuse `pending`.** `pending` means "application failed, retry", and
  it retries on HA start, which is another unattended moment that would fire
  scenes at 04:00 after a reboot.
- **Expose the quiet window separately.** Between the label changing and the
  scene landing, the hub is deliberately inconsistent, and `application_pending`
  must not be overloaded to describe it. A distinct attribute lets a dashboard
  say "Christmas, scene not yet applied" instead of looking broken.

### Why not a time window per overlay

Midday application was the obvious alternative and it is worse. It is still an
unattended moment — lights snapping on at 12:00 in an empty house is only
marginally less odd than at 00:00 — and it is wrong at any hour if the house is
away. It also needs a decision and a config field per overlay, where the quiet
rule needs neither and fits in one sentence.

"Christmas lights should come on at dusk" is a real want, but it is a *what*,
not a *when the mode is on*. It belongs in an automation that reads
`overlay == christmas` and fires at sunset, where the user can be as specific
as they like. Putting it in house-state means owning dusk logic, per-overlay
schedules, and their interaction with `night_schedule` — a second scheduler
inside an integration that already has one.

### The one rough edge

Late activation is invisible; late deactivation is visible. When Christmas ends
on the 27th the mode drops at midnight but the tree stays lit until something
triggers a transition. This is the already-documented rule that turning an
overlay off does not reverse its actions, so the base scene is what turns it
off — but a rule makes it happen unattended, which is new.

Cheap mitigation if it proves annoying: let a rule-driven *deactivation* be
eager while the house is unoccupied or inside the night role — apply
immediately in exactly the circumstances where nobody is there to be startled.
It is a special case, so it should wait until the plain rule actually bites.

## Keep the split: house-state says *when*, consumers say *what*

house-state should decide **which overlay is active** and nothing more. It
should not learn what Christmas looks like.

| | Owner |
|---|---|
| whether the `christmas` overlay is active today | house-state |
| what `christmas` renders as — theme, bell sounds, light scene | each consumer |

The panel already stores a theme and a media group per party mode in its own
admin app, and the doormonitor integration maps an overlay id onto one of them.
If house-state also carried the look, Christmas would be defined in two places
and they would drift. The scene an overlay applies is already house-state's
business; a consumer's own rendering of it is not.

This keeps the rule the panel's spec is built on: whoever owns a piece of state
defines its vocabulary. Overlay ids become house-state's vocabulary, and
consumers map them.

## Don't build a date engine — take a calendar entity

The most useful primitive is not a date field. It is:

> this overlay is active while an event matching *M* is running on calendar *C*.

Home Assistant already supplies the calendars:

- **Holiday** (`calendar.*`, backed by the `holidays` PyPI package, configured
  by country and province) gives correct public holidays for Norway, moveable
  ones included, with no date code in house-state at all.
- **Local Calendar** covers everything a holiday table does not: birthdays as
  yearly recurring all-day events, a self-defined Christmas window, a trip.
- Google, CalDAV and the rest work the same way, so a household that already
  keeps its seasons in a shared calendar gets them for free.

Matching should be on the event summary — a substring or regex,
case-insensitive — because a holiday calendar's summaries are generated, not
chosen.

```yaml
overlays:
  - id: birthday
    calendar: calendar.family_birthdays     # any all-day event on that calendar
  - id: christmas
    calendar: calendar.seasons
    match: "^jul"                            # a Dec 1–26 event the household defines
```

### What the calendar route actually costs

The proposal originally sold calendars as the cheap path. They are the more
expensive one, and the implementation should know it up front:

- **A calendar entity's state is only on/off**, and its attributes may describe
  the *next* event rather than a current one. Matching a summary means calling
  `calendar.get_events` over a window — a cross-integration service dependency
  that can be absent, can fail, and must not break state selection when it does.
- **Startup ordering.** Calendar entities may not exist when house-state loads.
  Declare `after_dependencies` and re-evaluate once HA has started; the
  coordinator already has that hook for pending scene retries.
- **Boundaries are not sharp.** A transition lands when the calendar entity
  updates, which can be minutes late. Fine for a season starting on 1 December;
  worth documenting so nobody expects a midnight-precise change.
- **Holiday summaries are localized.** `match: "^jul"` works until someone
  changes HA's language. Document it, and prefer matching the calendar over the
  summary where a dedicated calendar is available.

### One thing a calendar cannot do

**Easter is not a date.** It is the Sunday after the first full moon on or
after the vernal equinox, and no RRULE expresses it:

| Year | Easter Sunday | 1st Sunday of Advent |
|------|---------------|----------------------|
| 2026 | 5 April       | 29 November          |
| 2027 | 28 March      | 28 November          |
| 2028 | 16 April      | 3 December           |
| 2029 | 1 April       | 2 December           |
| 2030 | 21 April      | 1 December           |

Easter swings 25 days. Advent swings a week. A `from = "04-01"`, `to = "04-10"`
config looks right the year it is written and is silently wrong for the next
decade — it will be the most common way this feature gets misconfigured, so the
fix belongs in house-state rather than in every user's head.

So alongside the calendar route, support a few **rule types** that cover what
calendars express badly:

```yaml
overlays:
  - id: halloween
    dates: { type: fixed, from: "10-25", to: "11-01" }
  - id: easter
    dates: { type: easter, from: -7, to: +1 }      # Palm Sunday to Easter Monday
  - id: advent
    dates: { type: nth_weekday, weekday: sun, nth: -4, anchor: "12-25", days: 28 }
```

`type` rather than `kind`, to match `night_schedule: {type: fixed | sun | off}`
in the same config blob.

An earlier draft wrote Advent as `month: 12, nth: -4`, the fourth-from-last
Sunday of December. That is 6 December 2026; the real first Advent is 29
November. Advent is the fourth Sunday *before* 25 December, so `nth_weekday`
counts either within a `month` or strictly before an `anchor` date — the second
form is what liturgical and school-term dates actually need.

`fixed`, `easter` (an offset window around computed Easter Sunday) and
`nth_weekday` are, as far as I can tell, the whole set worth building.
Everything else is a calendar.

If only one of these ships, make it `easter` — it is the one nothing else can
do. **Implement it inline.** The manifest currently declares no requirements;
adding `python-dateutil` to a 1050-line integration to avoid ten lines of
Anonymous Gregorian is the wrong trade, and the year table above is the test
fixture.

## A manual choice must win, and must expire visibly

If someone picks an overlay by hand, the next evaluation must not stomp it.
This is the failure that makes scheduled state feel broken:

- a manual selection holds until a stated moment — end of local day is a good
  default — and the hub should expose when that is, so a dashboard can say
  "manual until 00:00" rather than leaving people guessing why the tree stopped
  following its rules;
- clearing the manual selection hands the axis straight back to the rules;
- a rule window *opening* while a manual choice is held does not take over. The
  person is more current than the calendar.

### `none` cannot mean two things

The overlay select offers exactly `none` plus the configured ids. But the two
requirements above need *three* meanings: follow the rules, hold this overlay,
and hold nothing. Selecting `none` cannot be both "no overlay, and I mean it"
and "resume automatic behavior".

Add `auto` as a third option — `auto` follows the rules, `none` is an explicit
"not today" that outranks every rule, an id is an explicit choice. One caution:
`validate_config` currently reserves only `none`, and validation runs when the
coordinator is constructed, so newly reserving `auto` would fail entry setup for
anyone who already has an overlay with that id. Grandfather it or rename on
migration.

### Persist the hold

A hold that does not survive a restart is not a hold — a 22:00 reboot would
reinstate Christmas. This is nearly free: the store already persists `reason`
and `since`, and `schedule` is already in the reason vocabulary, so a hold is
derivable from "last change was `user`, within the current local day" rather
than being new state. Expose the expiry moment as an attribute regardless.

## Overlapping rules need a stated winner

A birthday on 25 December is not a hypothetical, and the overlay axis holds one
value, so one of them loses. **Default to the order of the `overlays` array,
with an optional `priority` to override.**

Order is already meaningful, already visible in the card's editor,
deterministic, and needs nothing computed. "Shortest window wins" is the more
charming rule and it captures the birthday-beats-Christmas intuition without
configuration, but it needs a duration that calendar rules do not hand you
without extra `get_events` work, and it inverts the moment somebody defines a
one-day test Christmas.

Whatever the rule is, write it down. Two overlays silently racing is worse than
either outcome.

Note also what the single-value axis costs: on 25 December a consumer can see
`birthday` or `christmas`, never both. If that turns out to matter, it is a
model change, not a tie-break tweak.

## An overlay should be able to require a house state

Christmas chimes while the house is on vacation are noise for the neighbours.

The 80% case is presence, and presence is already computed:

```yaml
  - id: christmas
    calendar: calendar.seasons
    when_occupied: true
```

That reuses `tree.occupied()`, costs one line, and survives any tree edit.

For the general form, a rule may name node ids matched against `active_path`,
so naming a parent covers its subtree. Two constraints: they are references and
must be validated like roles are, and deleting a node referenced by an overlay
must be rejected — which extends the README's existing warning about updating
tree, roles and initial state together.

There is no closed set of root states to match against. The tree is entirely
user-defined and `home`/`away`/`vacation` are only the starter template; an
earlier draft of this proposal assumed otherwise.

## Evaluate on local dates

Re-evaluate at startup (after HA has started, not during setup), at local
midnight, on config reload, on a calendar entity change — **and on every state
transition**, because `when_state` and `when_occupied` make the active node an
input to the rules. The original trigger list omitted that one and the feature
does not work without it.

Use local dates throughout: a UTC day boundary rolls the season over at 01:00
or 02:00 Norwegian time, which is exactly when a Christmas chime is least
welcome.

Note the chain this creates: a state change can change the overlay, which can
apply a scene. The quiet rule above keeps that chain from firing scenes at
surprising moments, but the evaluation itself must stay re-entrant under the
coordinator's lock.

## The id hazard, stated correctly

An earlier draft asked for overlay ids to be separate from display names and
immutable. That is already true: selects carry ids, the card renders names, and
the README says so.

The real gap is that there is **no rename operation**. `set_config` replaces the
whole overlays array, so changing an id is indistinguishable from delete plus
add, and when the active overlay's id disappears it resets to `none` with no
error anywhere. Consumers key on the id — the doormonitor mapping does, and the
panel's bell-sound groups hang off the result — so this is the kind of thing
only ever noticed by a chime that did not ring. The same hazard already exists
in doorbell-bridge's mute list.

## What I would not build

- **The look.** No themes, no sounds, no per-consumer rendering in house-state.
- **A bundled holiday table.** That is the `holidays` package's job, and the
  Holiday integration already wraps it. Copying a list of Norwegian holidays
  into this repo means maintaining it.
- **A date expression language.** Three rule types plus calendars covers the
  ground; a mini-language is a parser, an error surface and a documentation page
  nobody reads.
- **Per-overlay time windows.** See the opening section: a second scheduler,
  and the wrong owner for "at dusk".
- **Silent activation with no way out.** Whatever the rules say, there must be
  one obvious control that means *not today*, and it must outrank every rule.

## Cross-repo note

The card is already forward-compatible with new overlay fields: its overlay
editor spreads the existing object when editing a name or scene, and seeds its
draft from the hub's `overlays` attribute, so `calendar` and `dates` set through
JSON survive someone renaming an overlay in the card. What it cannot do is
create or edit them, and overlays added from the card will lack them.

The honest scope is therefore: integration and `set_config` first, JSON-only
editing, card editor later. Worth saying in the proposal rather than leaving
the card repo to discover it.

## Test surface

The Easter and Advent table above is a fixture, not an illustration. Beyond it:

- a quiet transition leaves the label changed, `last_pair` stale, `pending`
  false, and no `scene.turn_on` call;
- the next unrelated transition applies the deferred pair exactly once, and a
  deduped selection still applies it;
- a manual hold survives a reload and a restart, and expires at local midnight
  rather than UTC midnight;
- a rule window opening during a hold changes nothing;
- `auto`, `none` and an id are three distinguishable select states;
- a missing or unavailable calendar entity leaves the overlay unchanged and does
  not break state selection;
- evaluation across a DST boundary, in the HA timezone.
