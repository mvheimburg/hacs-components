// Add every component in this workspace to HACS as a custom repository.
//
// Run once in Home Assistant: open any page as an admin, open the browser's
// developer console (F12 → Console), paste this whole file and press Enter.
// It only adds the repositories to HACS; install each one from HACS afterwards.
// Repositories HACS already knows are reported and skipped.
//
// Keep REPOSITORIES in step with .gitmodules: every HACS component submodule
// belongs here (checked by scripts/check-hacs-list.py).

const OWNER = "mvheimburg";

const REPOSITORIES = {
  // HACS category "Integration"
  integration: [
    "appliance-presets",
    "doorbell-integration",
    "house-state",
    "personal-wakeup",
    "time-for-school",
    "water-guard",
  ],
  // HACS category "Dashboard" (called "plugin" in HACS's API)
  plugin: [
    "lovelace-access-control",
    "lovelace-ajax",
    "lovelace-appliance-panel",
    "lovelace-heatpump",
    "lovelace-house-state",
    "lovelace-light-group",
    "lovelace-personal-wakeup",
    "lovelace-thermostat-valve",
    "lovelace-time-for-school",
    "lovelace-water-guard",
  ],
};

(async () => {
  const connection = document.querySelector("home-assistant")?.hass?.connection;
  if (!connection) {
    console.error("Open this in a Home Assistant browser tab.");
    return;
  }
  for (const [category, names] of Object.entries(REPOSITORIES)) {
    for (const name of names) {
      const repository = `${OWNER}/${name}`;
      try {
        await connection.sendMessagePromise({
          type: "hacs/repositories/add",
          repository,
          category,
        });
        console.log(`added   ${repository} (${category})`);
      } catch (error) {
        console.warn(`skipped ${repository}: ${error?.message ?? error}`);
      }
    }
  }
  console.log("Done. Install the components from HACS.");
})();
