# Road Shooter

Full-screen canvas action game published at `/road-shooter/`.

## Release contract

- URL `?lang=` takes priority over a saved or browser language.
- Supported locales: `ko`, `en`, `zh`, `hi`, `ru`, `ja`, `es`, `pt`, `id`, `tr`, `de`, `fr`.
- The page emits each anonymous funnel event at most once per load: `road_shooter_view`, `road_shooter_start`, `road_shooter_progress`, `road_shooter_complete`.
- Funnel events contain only the app name and event category. Do not add scores, result details, stage numbers, URLs, or player identifiers.
- Ads, interstitials, and rewarded actions remain disabled while the 2026-09-03 invalid-traffic restriction is active.
- The service worker handles only same-origin GET requests inside `/road-shooter/` and deletes only stale `road-shooter-*` caches.

## Validate

From the workspace root:

```powershell
npm run verify:road-shooter-suspension
```
