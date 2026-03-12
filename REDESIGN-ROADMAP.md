# Road Shooter - Full Visual Redesign Roadmap

> NanoBanana AI art + weapon system overhaul. Incremental phases.

## Phase 1: Menu BG & Weapon Pickup System (Session 148)
- [x] AI menu background (cyberpunk armory, `assets/menu-bg.jpg`)
- [x] AI weapon icon strip (`assets/weapons-strip.png`)
- [x] Weapon config system (`js/weapons.js`) — 6 weapon types as road pickups
- [x] Weapon item in CONFIG.ITEMS — `weaponDrop` with `buffType: 'weapon'`
- [x] Menu background integration — load & draw menu-bg.jpg in MenuScene
- [x] Combat system weapon override — `squadFire()` accepts weapon param
- [x] Weapon pickup in run.js + endless.js — `applyBuff` handles `weapon` case
- [x] HUD weapon timer indicator in buff bar
- [x] Weapon item visuals in item.js (hexagon + crosshair icon)

## Phase 2: Character Sprites (Future)
- [ ] Generate AI character sprites per class (rifleman, tanker, sniper, bomber, shotgunner, laser)
  - Top-down view, 64x64px, cyberpunk military style
  - Each with idle + firing animation frames (2-frame minimum)
- [ ] Replace `Character.draw()` canvas shapes with sprite rendering
- [ ] Add weapon-specific muzzle flash effects
- [ ] Update squad formation visuals

## Phase 3: Enemy Sprites (Future)
- [ ] Generate AI enemy sprites for 11 types:
  - rusher, shooter, tank, brute, mortar, detonator, thief, flanker, elite, healer, splitter
  - Each with unique silhouette, cyberpunk style, 48-64px
- [ ] Replace `Enemy.draw()` canvas shapes with sprite rendering
- [ ] Add hit/death animation frames
- [ ] Update boss visuals (5 bosses: Zombie Titan, War Machine, Storm Colossus, Inferno Dragon, Frost Wraith)

## Phase 4: Environment & HUD (Future)
- [ ] Generate AI road textures (cyberpunk highway, neon lane markers)
- [ ] Generate AI gate textures (holographic choice gates)
- [ ] Redesign HUD with glassmorphism panels
- [ ] Add weapon ammo/reload indicator to HUD
- [ ] Generate AI item/power-up icons

## Phase 5: Effects & Polish (Future)
- [ ] Weapon-specific projectile visuals (rockets, laser beams, shotgun spread)
- [ ] Screen-space effects (muzzle flash glow, explosion shockwaves)
- [ ] Enhanced particle system per weapon type
- [ ] Victory/defeat screen redesign with AI art

## Weapon Types (Phase 1 config)
| Weapon | Fire Rate | Damage | Range | Special |
|--------|-----------|--------|-------|---------|
| Assault Rifle | 1.0x | 1.0x | 150 | Balanced, default |
| Shotgun | 0.5x | 0.6x | 90 | 5-spread per shot |
| Sniper Rifle | 0.3x | 2.5x | 300 | Pierce through enemies |
| Rocket Launcher | 0.25x | 3.0x | 180 | AOE 50px blast radius |
| Laser Gun | 0.2x | 1.5x | 350 | Pierce + continuous beam |
| Minigun | 2.0x | 0.5x | 130 | High fire rate, inaccurate |

## Asset Generation Prompts (for future NanoBanana sessions)
### Characters
"Top-down cyberpunk soldier sprite, 64x64, [CLASS] class, neon [COLOR] accents, dark background, pixel art game asset, clean silhouette"

### Enemies
"Top-down cyberpunk enemy robot sprite, 64x64, [TYPE] variant, menacing red/orange glow, dark background, pixel art game asset"

### Bosses
"Top-down massive cyberpunk boss sprite, 128x128, [NAME], [DESCRIPTION], glowing weak points, dark background, game asset"

### Road
"Top-down cyberpunk highway texture, dark asphalt with neon cyan lane markers, seamless tileable, 400x200, game asset"
