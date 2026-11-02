# Companion app BLE discovery

Selecting a Home Assistant user in the DoorMonitor user form offers beacon IDs from that user's Companion app devices. This removes copying IDs while keeping changes explicit and reviewable before Save.

## Approach

Extend the existing admin-only users websocket response with discovered beacon candidates for each HA user. Match mobile_app config entries by their stored user_id, then use the entity registry to find their BLE transmitter sensors. Never infer ownership from device names. Read and validate the transmitter sensor's id attribute; exclude unavailable, disabled and malformed sensors. Deduplicate identical beacons and label choices with the device name.

The form offers a localized “Use phone beacon” action for one candidate or a device selector for several. Applying a candidate fills the phone BLE fields in the draft only. Existing values remain unchanged until the user chooses a candidate. Changing HA user clears candidate selection; it never silently replaces manually entered data. No candidate means a short explanation to enable the Android Companion app BLE Transmitter sensor; manual entry remains available.

Save persists the draft through the existing integration API. Cancel makes no changes. Discovery does not enable Bluetooth, change Companion app settings, or establish ongoing synchronization. English and Bokmål use the existing translation dictionaries and form controls.

## Alternatives

Automatic replacement on selection needs fewer clicks but can overwrite an existing identifier. Continuous synchronization introduces ongoing device and access changes outside the explicit Save flow. An explicit offer fits the requested behavior and existing draft/save contract.

## Verification

Backend tests cover ownership, renamed sensors, missing/invalid/unavailable data, multiple devices, deduplication and admin-only access. Browser tests cover applying a candidate, preserving manual values, switching users, cancellation, saved payloads and both languages. Run Python tests/lint and frontend tests/lint/typecheck/build; commit the rebuilt bundle and update the umbrella gitlink.

## Confirmed beacon contract

The maintainer confirmed `uuidhex_major_minor`: 32 lowercase UUID hex characters without hyphens,
then decimal major and minor (0–65535) without leading zeros, separated by underscores. Matching
is exact and case-sensitive. For example `00112233445566778899aabbccddeeff_1_513`.
The integration normalizes the Companion app identity before offering it to the form. The panel
currently imports/scans BLE identities but automatic BLE presence login is not wired in; state
this limitation in the form and README.
