# Road Shooter Launch Notes

This workspace is an isolated launch copy for Road Shooter:

- Working directory: `E:\CodexWork\fire-road-shooter-launch`
- Source project remains untouched under `E:\Fire Project\projects\road-shooter`

## 1) Configure Release Values

Edit `js/shared/launch-config.js`.

- `enableAds`: `true` to load AdSense script
- `adsenseClient`: e.g. `ca-pub-xxxxxxxxxxxxxxxx`
- `enableAnalytics`: `true` to load GA4
- `gaMeasurementId`: e.g. `G-XXXXXXXXXX`
- `enableCrossPromo`: `true` to load cross-promo script
- `crossPromoScriptUrl`: full script URL
- `canonicalUrl`: canonical page URL for metadata
- `ogImageUrl`: full image URL for OG cards (optional)

Or generate it with script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set-launch-config.ps1 `
  -CanonicalUrl "https://YOUR_DOMAIN/" `
  -OgImageUrl "https://YOUR_DOMAIN/icon-512.svg" `
  -AdsenseClient "ca-pub-xxxxxxxxxxxxxxxx" `
  -GaMeasurementId "G-XXXXXXXXXX"
```

Edit `privacy-policy.html` and set your final support contact channel.

## 2) Run Local Preview

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\preview.ps1 -Port 5173
```

Open `http://127.0.0.1:5173`.

## 3) Run Launch Preflight

```powershell
node .\scripts\launch-preflight.mjs
```

Preflight fails if release-blocking issues remain (for example placeholder privacy email).

## 4) Build Release ZIP

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\release-package.ps1
```

Output is generated under `dist\road-shooter-launch-YYYYMMDD-HHMMSS.zip`.

## 5) Standalone Path Compatibility

This package runs from any base path:

- `manifest.json` uses `./` for `id`, `start_url`, and `scope`
- `sw.js` precache list is relative and scope-resolved
- `index.html` has no runtime dependency on `/portal/*` or `/road-shooter/*`
- Three.js is bundled locally (`vendor/three-r128.min.js`) for offline/PWA stability

## 6) Quick Validation Checklist

1. Open app and verify no 404 for local scripts.
2. Confirm gameplay loads and menu/game loop works.
3. Install as PWA and test offline reload.
4. If ads enabled, confirm rewarded/interstitial flow fallback still works.
5. If analytics enabled, verify page_view/events in GA4 DebugView.

## 7) Publish (GitHub)

```powershell
git add .
git commit -m "chore: launch-ready standalone package"
git push origin master
```

GitHub Actions workflow for Pages is included at `.github/workflows/deploy-pages.yml`.
If Pages is not yet live, set repository Pages source to `GitHub Actions` once.
