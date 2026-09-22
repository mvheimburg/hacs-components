# House Climate Card

A self-contained HACS Dashboard package in lovelace-climate. Combine the household's current weather and forecast with optional outdoor temperature, indoor temperature, CO₂ and indoor humidity. Follow existing card styling: rounded Default/Bubble surfaces, six theme schemes, 44px Configure cog, responsive layouts and EN/NB presentation.

Existing weather and sensor entities remain authoritative. Unconfigured sensors are omitted. Configured missing, unknown or unavailable sensors keep a calm labelled placeholder and recover when their entities appear. No fabricated readings, comfort classifications, or automation rules.

Forecasts use HA weather/subscribe_forecast, choose daily then hourly then twice-daily according to supported features, and clean up subscriptions on detach, selection or connection changes. Show failures with retry. Stale asynchronous callbacks cannot update a different selection.

Every current numeric reading opens a recorder history dialog showing all configured readings and weather temperature on one plot, grouped by unit with independent labelled axes. Provide 6h, 24h, 7d ranges, gaps for unavailable states, pointer/keyboard time inspection, and legend buttons opening HA more-info. Forecast values describe the future and do not open recorder history.

Visual editor uses entity selectors, optional bindings, title, appearance, scheme and forecast visibility. Dashboard Save/Cancel owns persistence. Configure remains available without live data and explains where to edit.

Ship README, generic simulated previews, tests, tracked bundle, independent version/changelog, CI/HACS validation/release workflows. Register the submodule and scripts/hacs-add-all.js. Publish only when authorized.
