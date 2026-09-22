# Light Group Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the Bubble lighting dashboard with a standalone, localized light-group card matching the existing household cards.

**Architecture:** One card per floor/zone contains ordered room sections and explicitly selected lights. A Lit card reads Home Assistant state and invokes light services; its visual editor owns dashboard configuration. Pure configuration/state helpers and a request tracker keep validation and asynchronous behavior separately testable.

**Tech Stack:** TypeScript, Lit 3, Rollup, Vitest browser mode with Playwright Chromium, ESLint, Node 22, HACS Dashboard packaging.

**Spec:** `docs/superpowers/specs/2026-09-22-light-group-design.md` (approved by the user).

## Global Constraints

- No Bubble Card dependency is required.
- Register `custom:light-group-card` and a visual editor.
- Accept only `light.*` entities, including existing HA light groups.
- All off targets only configured, available, currently on lights, deduplicated across sections.
- Keep rendered state authoritative: service success alone does not synthesize an entity state.
- Typed English/Bokmål dictionaries are shared by card and editor.
- Static picker metadata may remain English, documented in the README.
- Brightness is a controllable setting, not a sensor reading; it opens controls rather than a recorder history.
- Include a tracked `dist/light-group-card.js`, HACS metadata, license, README, changelog, consistent package/lock versions, CI and version-driven release workflow.
- Publishing is outside the current authorization.
- No runtime imports across sibling submodules; reuse conventions by copying/adapting relevant code into this package.

## Review Focus

1. A light appears twice: one bulk target, shared pending state, both instances refresh (tasks 1–3).
2. State confirmation arrives before the service promise resolves: retain the request lock until both complete (task 2).
3. Card configuration changes during a request: old completion must not alter the new card (tasks 2–3).
4. Brightness metadata is absent, malformed or nonfinite: suppress unsupported controls and never send invalid numbers (tasks 1–3).
5. A dialog trigger disappears on configuration changes: close the dialog without throwing or moving focus to a detached node (task 3).

## Files and responsibilities

All following component paths are relative to `lovelace-light-group/`:

- `src/types.ts`: minimal HA types and stable card configuration types.
- `src/config.ts`: configuration validation and normalization.
- `src/model.ts`: availability, brightness capability/value and bulk target selection.
- `src/localize.ts`: typed dictionaries and locale-safe display formatting.
- `src/color-schemes.ts`: self-contained copy of sibling color-scheme conventions.
- `src/requests.ts`: request locking, confirmation, timeout and stale completion guards.
- `src/light-group-card.ts`: registration, reactive state, rendering and service actions.
- `src/styles.ts`: responsive grid, pills, header and dialog styles.
- `src/editor.ts`: structured visual editing and config-changed events.
- `tests/fixture.ts`: simulated HA state and service spies.
- `tests/config.test.ts`, `tests/model.test.ts`, `tests/localize.test.ts`, `tests/requests.test.ts`, `tests/card.test.ts`, `tests/editor.test.ts`: behavioral verification.
- `demo/index.html`, `demo/preview.ts`: production-bundle preview with simulated states.
- `scripts/screenshot.cjs`, `docs/light-group-card.png`: repeatable visual evidence.
- `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.build.json`, `rollup.config.js`, `eslint.config.js`, `vitest.config.ts`, `.gitignore`: independent build/test tooling.
- `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `hacs.json`, `LICENSE`, `README.md`, `CHANGELOG.md`, `dist/light-group-card.js`: distribution lifecycle.

Umbrella changes: `.gitmodules`, `lovelace-light-group` gitlink, `scripts/hacs-add-all.js`, `README.md`.

## Task 1: Validated configuration, light model and localized labels

**Interfaces:**

```ts
interface LightConfig { entity: string; name?: string; icon?: string }
interface SectionConfig { name: string; icon?: string; lights: LightConfig[] }
interface CardConfig {
  type: 'custom:light-group-card'; title?: string; icon?: string;
  appearance?: 'default' | 'bubble';
  color_scheme?: 'home-assistant' | 'bright' | 'warm' | 'mint' | 'sky' | 'lavender';
  sections: SectionConfig[];
}
interface HassEntity {
  entity_id: string; state: string; attributes: Record<string, unknown>;
}
interface HomeAssistant {
  language?: string;
  locale?: { language?: string; number_format?: string };
  connection?: { connected: boolean };
  states: Record<string, HassEntity>;
  callService(domain: string, service: string, data: Record<string, unknown>): Promise<unknown>;
}
// config.ts
function normalizeConfig(input: unknown): CardConfig;
// model.ts
function available(hass: HomeAssistant, id: string): boolean;
function supportsBrightness(entity?: HassEntity): boolean;
function brightnessPercent(entity?: HassEntity): number | undefined;
function allOffTargets(config: CardConfig, hass: HomeAssistant): string[];
// localize.ts: TextKey is keyof the English dictionary.
function t(hass: HomeAssistant | undefined, key: TextKey): string;
function formatPercent(hass: HomeAssistant | undefined, value: number): string;
```

- [x] Inspect git status and component instructions; establish an isolated implementation checkout using the worktree skill. Preserve unrelated files. Clone the empty remote into the future component directory. An empty remote needs an initial component commit before registration as a submodule; do not push it.
- [x] Copy the thermostat-valve tooling conventions, replacing package/artifact names and setting initial version `0.1.0`. Use its dependency set and regenerate the lockfile within this component. Configure Rollup input `src/light-group-card.ts` and output `dist/light-group-card.js`; no sibling runtime imports. Install dependencies and Chromium.
- [x] Add configuration/model tests before implementing the helpers. Use these core assertions with fixtures typed by the interfaces above:

```ts
expect(() => normalizeConfig({type:'custom:light-group-card', sections:[
  {name:'Kitchen', lights:[{entity:'switch.socket'}]}
]})).toThrow();
expect(normalizeConfig({type:'custom:light-group-card'}).sections).toEqual([]);
const config = normalizeConfig({type:'custom:light-group-card', sections:[
  {name:'Kitchen', lights:[{entity:'light.a'}, {entity:'light.a'}, {entity:'light.b'}]}
]});
const hass = {states:{
  'light.a':{entity_id:'light.a',state:'on',attributes:{}},
  'light.b':{entity_id:'light.b',state:'unavailable',attributes:{}}
}, callService: vi.fn()};
expect(allOffTargets(config, hass)).toEqual(['light.a']);
expect(supportsBrightness({entity_id:'light.a',state:'on',attributes:{supported_color_modes:['onoff']}})).toBe(false);
expect(brightnessPercent({entity_id:'light.a',state:'on',attributes:{brightness:NaN}})).toBeUndefined();
```

- [x] Run `npm test -- tests/config.test.ts tests/model.test.ts`; confirm the new tests fail for missing helpers.
- [x] Implement validation without mutating input: require valid object/array/string shapes, reject non-light IDs and unknown enum choices, preserve custom names, default missing sections to empty. Brightness support includes `brightness`, `color_temp`, `hs`, `xy`, `rgb`, `rgbw`, `rgbww`, `white`; missing/malformed modes are unsupported. Accept finite brightness in 0–255 only and convert to rounded percentage. Availability requires state `on` or `off` and no explicitly disconnected connection.
- [x] Add localization tests before implementation: `nb`, `NB_no`, `no`, `nn-NO` return `Alt av`; `en-GB` and unsupported languages return `All off`; fallback locale is used when language is empty. Assert malformed locale does not throw and custom names survive normalization unchanged. Exercise HA number-format preferences for percent display.
- [x] Implement dictionaries for all card/editor/action/error/help/accessibility strings, including Configure help and timeout copy. Reuse sibling locale safeguards, preserving formatting locale separately. Adapt the local color-schemes file to use the same typed dictionaries.
- [x] Run `npm test -- tests/config.test.ts tests/model.test.ts tests/localize.test.ts`, `npm run lint`, and `npm run typecheck`; commit the tested component foundation.

## Task 2: Confirmed requests and safe failure handling

**Files:** `src/requests.ts`, `tests/requests.test.ts`.

**Consumes:** `HomeAssistant`, `HassEntity` from task 1.

**Produces:**

```ts
type Expected = {state: 'on' | 'off'; brightnessPct?: number};
class Requests {
  constructor(changed: () => void, timeoutMs?: number);
  pending(id: string): boolean;
  error: 'failed' | 'timeout' | undefined;
  errorDetail: string | undefined;
  start(ids: string[], expected: Expected, send: () => Promise<unknown>): boolean;
  reconcile(states: Record<string, HassEntity>): void;
  reset(): void;
}
```

- [x] Write tests around a deferred service promise and injectable short timeout. Assert second overlapping request returns false and never invokes its callback. Confirmation before resolution must retain pending; resolution before confirmation must also retain pending. Both together clear it. Assert rejection records `failed`; timeout records `timeout`; `reset()` ignores later resolutions/rejections. Assert a bulk request remains pending for unconfirmed members. Use explicit deferred promises, not sleeps for synchronization.

```ts
let resolve!: () => void;
const tracker = new Requests(vi.fn(), 10000);
tracker.start(['light.a'], {state:'off'}, () => new Promise<void>(r => {resolve=r}));
tracker.reconcile({'light.a':{entity_id:'light.a',state:'off',attributes:{}}});
expect(tracker.pending('light.a')).toBe(true);
resolve();
await Promise.resolve();
expect(tracker.pending('light.a')).toBe(false);
```

- [x] Run `npm test -- tests/requests.test.ts` and confirm failure before implementation.
- [x] Implement per-request IDs, immutable target sets, a generation incremented by reset, and a default 10-second deadline. Finish only after service resolution and state confirmation; brightness confirmation permits one percentage point of device rounding. Brightness zero expects `off`. Clear timers on completion/reset. Retain readable backend failure details without translating them.
- [x] Run the request tests and typecheck, then commit.

## Task 3: Responsive lighting card and accessible controls

**Files:** `src/light-group-card.ts`, `src/styles.ts`, `tests/fixture.ts`, `tests/card.test.ts`.

**Consumes:** task 1 helpers/dictionaries and task 2 `Requests`.

**Produces:** `LightGroupCard extends LitElement` with public `hass`, `setConfig(input: unknown)`, `getCardSize()`, static `getConfigElement()` and `getStubConfig()`. Register `light-group-card`; picker metadata stays English. Card loads the editor from its own package.

- [x] Add browser fixtures with light.a on/dimmable, light.b off/onoff-only, light.c unavailable, and an unrelated on light. Use `vi.fn(async () => undefined)` for callService. Add a rendered test with a click on the `data-action="all-off"` button:

```ts
card.setConfig({type:'custom:light-group-card', sections:[
  {name:'Kitchen', lights:[{entity:'light.a'}, {entity:'light.a'}, {entity:'light.b'}, {entity:'light.c'}]}
]});
card.hass = hass;
document.body.append(card);
await card.updateComplete;
card.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="all-off"]')!.click();
expect(hass.callService).toHaveBeenCalledWith('light','turn_off',{entity_id:['light.a']});
```

- [x] Add tests for individual toggle payloads; duplicate pills sharing pending; no service on disabled/missing/disconnected lights; and no optimistic state after service completion. Confirm new HA state releases pending controls. Run `npm test -- tests/card.test.ts` to see failing behavior.
- [x] Render header, ordered sections and light pills using native buttons plus HA icons. Use CSS grid `repeat(auto-fit, minmax(min(100%, 170px), 1fr))`, 44px minimum controls, HA surface/text/status variables, and local color-scheme styles. Use name override, then friendly_name, then entity ID. Show localized on/off/unavailable text, pending feedback and an alert for failures. Empty configuration displays setup help.
- [x] Implement actions through a common availability/pending guard, re-evaluated at invocation. All off freezes its deduplicated target list when clicked. Per-light toggles call explicit turn_on/turn_off rather than toggle. Every state update reconciles requests. Configuration changes reset requests and close dialogs; disconnect tears down timers.
- [x] Add the lighting dialog using native dialog behavior or equivalent focus trapping. Keep its selected entity ID, not a copied HA state. Include slider only when supported; `input` updates only the local display, `change` sends numeric brightness_pct. A failed request restores the slider from current HA. More controls dispatches `hass-more-info` with `{entityId}`. Configure displays localized dashboard-editor instructions and Close.
- [x] Add browser tests that brightness `input` sends nothing, `change` sends `{entity_id:'light.a', brightness_pct:42}`, and failure restores the HA value. Test zero, malformed brightness, onoff-only capability, Escape, initial/restored focus, and config changes removing an open dialog's trigger. Test stale service rejection cannot add an error to the replacement configuration.
- [x] Test English/Bokmål and live language changes in rendered controls, custom name preservation, and `en-GB` formatting. Assert default/Bubble and all scheme attributes apply. Run card tests, lint, typecheck and build; commit.

## Task 4: Complete visual configuration editor

**Files:** `src/editor.ts`, `tests/editor.test.ts`; extend dictionaries/styles as needed.

**Consumes:** `CardConfig`, `normalizeConfig`, `t`, color-scheme choices. **Produces:** registered `light-group-card-editor` with `hass` and `setConfig(config: CardConfig)`.

- [x] Write rendered tests for adding/removing/reordering sections and lights, title/icon/name edits, entity selector filtering to `light`, and appearance/scheme changes. Listen for config-changed and inspect exact configuration, not private methods:

```ts
const changed = vi.fn();
editor.addEventListener('config-changed', changed);
editor.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="add-section"]')!.click();
await editor.updateComplete;
expect(changed.mock.lastCall![0].detail.config.sections).toHaveLength(1);
expect(originalConfig.sections).toHaveLength(0);
```

- [x] Run `npm test -- tests/editor.test.ts`; confirm the tests fail before editor implementation.
- [x] Render native text inputs and HA entity selectors with `.hass` and light-domain restriction. Keep local incomplete edits available but emit only valid configurations: a newly added section may contain an empty lights array; a new light selector stays draft until an entity is selected. Use immutable array copies for moves/removal. Emit bubbling/composed `config-changed` with `{config}`; never mutate the original config or persist via services/localStorage.
- [x] Test invalid manual domain input leaves emitted config unchanged and displays localized validation, empty sections remain editable, and changing language updates help/accessibility labels. Verify Lovelace Save/Cancel ownership in help and README. Run all browser tests, lint and typecheck; commit.

## Task 5: Distribution, preview and umbrella registration

**Files:** packaging/docs/demo/CI files listed above; umbrella `.gitmodules`, gitlink, HACS list and README.

- [x] Create HACS metadata and independent documentation. The installation filename is `light-group-card.js`; resource URL is `/hacsfiles/lovelace-light-group/light-group-card.js`. Initial version is `0.1.0` in package, lock and changelog. Retain the copied GPL-3.0 license and applicable attribution. Explain native light-group support, editor setup, Configure help, all-off scope, brightness/history exception, aliases, picker exception and every option.
- [x] Include this explicitly illustrative YAML, warning that example IDs must be replaced:

```yaml
type: custom:light-group-card
title: 2. etasje
icon: mdi:home-floor-2
appearance: bubble
color_scheme: home-assistant
sections:
  - name: Kjøkken
    icon: mdi:countertop
    lights:
      - entity: light.example_kitchen_ceiling
        name: Kjøkkentak
      - entity: light.example_kitchen_island
        name: Kjøkkenøy
```

- [x] Adapt sibling CI/release workflows to the exact new artifact. CI runs npm ci, browser installation, tests, lint, typecheck, build and tracked-dist verification; HACS validation uses category plugin. Release waits for CI, reads package version, skips existing tags and attaches dist/light-group-card.js. Do not trigger it locally or push main.
- [x] Add a simulated preview importing the built distribution. Render floor/room names from the screenshot with clearly simulated IDs, default/Bubble appearances, light/dark themes, all six schemes, a 360px viewport, disabled and pending/error examples. Capture screenshots via Playwright and inspect for clipping, overlap, contrast and dialog behavior. Document that screenshots use simulated HA states.
- [x] Run the complete package checks once the final code is in place:

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run build
node scripts/screenshot.cjs
```

- [x] Inspect git diff and commit component files including dist. Register the now-committed component as a submodule using the supplied remote URL and local repository, then add `lovelace-light-group` to the plugin list and a Lighting entry to the umbrella README. Verify:

```sh
python3 scripts/check-hacs-list.py
git diff --check
git submodule status lovelace-light-group
```

- [x] Inspect staged umbrella files, preserving unrelated gitlinks, then commit only the new component reference, metadata and documentation. Complete the required final code review and verification skills. Report local commits and checks, with publishing still pending authorization. Since gh was unauthenticated at exploration, provide the ready-to-run description/topics command from the spec if metadata cannot be updated.

## Execution results — 2026-09-22

Implemented on `feat/light-group` in the isolated `.worktrees/light-group` checkout.
The component is independently committed and registered as a submodule.

- Clean dependency installation; 69 browser tests pass.
- Lint, TypeScript checking and Rollup build pass.
- Seven production-bundle previews generated; desktop/mobile and dialogs inspected, no browser errors or horizontal overflow at 360px.
- Umbrella HACS list check passes for all 16 components.
- Independent final review found two presentation/editor issues; both were reproduced with failing tests, fixed, and verified with the full suite. No deferred findings.
- Live HA/device behavior and hosted GitHub/HACS release execution remain unverified. No push or publication performed; GitHub description/topics command is in the component README because the CLI was unauthenticated.
