// Road Shooter - Balance Constants & Configuration
const CONFIG = {
  // Canvas
  CANVAS_WIDTH: 400,
  CANVAS_HEIGHT: 700,
  FPS: 60,

  // Run Structure
  ROAD_SEGMENTS: 5,
  COMBAT_SEGMENTS: 5,
  ROAD_DURATION: 10, // seconds (was 12)
  COMBAT_DURATION: 8, // seconds (was 10)
  BOSS_DURATION: 30,

  // Road
  ROAD_WIDTH_RATIO: 0.75, // road width as % of canvas (was 0.7)
  SCROLL_SPEED: 2.5, // pixels per frame (was 2 — faster pace)
  LANE_COUNT: 5,

  // Squad
  START_SQUAD: 3, // start with 3 (was 1 — too lonely)
  SOFT_CAP: 200,
  HARD_CAP: 999,
  SQUAD_MOVE_SPEED: 8,

  // Character Types
  CHAR_TYPES: {
    rifleman:   { dmg: 10, range: 150, hp: 1, fireRate: 1.0, color: '#10b981', size: 4 },
    tanker:     { dmg: 7,  range: 50,  hp: 3, fireRate: 0.7, color: '#3b82f6', size: 6 },
    sniper:     { dmg: 30, range: 300, hp: 1, fireRate: 0.4, color: '#8b5cf6', size: 4 },
    bomber:     { dmg: 20, range: 120, hp: 1, fireRate: 0.3, color: '#f97316', size: 4, aoe: 40 },
    shotgunner: { dmg: 6,  range: 90,  hp: 1, fireRate: 0.45, color: '#dc2626', size: 5, spread: 5 },
    laser:      { dmg: 18, range: 350, hp: 1, fireRate: 0.2, color: '#06b6d4', size: 4, pierce: true }
  },

  // Perspective
  HORIZON_RATIO: 0.10, // pushed higher (was 0.2) — more road visible
  ROAD_TOP_RATIO: 0.18, // less extreme narrowing (was 0.22)

  // Items
  ITEM_SIZE: 16,
  ITEM_SPAWN_INTERVAL: 0.667, // seconds between spawns
  ITEMS: {
    // Squad growth
    scoutToken:  { value: 1,  color: '#10b981', label: '+1',   charType: 'rifleman', weight: 20 },
    rallyFlag:   { value: 0.2, color: '#fbbf24', label: '+20%', isPercent: true, weight: 12 },
    mercenary:   { value: 5,  color: '#d4a44c', label: '+5',   charType: 'random', weight: 10 },
    clonePod:    { value: 3,  color: '#06b6d4', label: '+3',   charType: 'tanker', weight: 10 },
    conscription:{ value: 8,  color: '#ef4444', label: '+8',   charType: 'mixed', weight: 5 },
    // Power-ups
    dmgBoost:    { value: 0.3, color: '#f43f5e', label: 'DMG+',   isBuff: true, buffType: 'dmg', duration: 8, weight: 8 },
    shieldBuff:  { value: 5,   color: '#60a5fa', label: 'SHIELD', isBuff: true, buffType: 'shield', weight: 6 },
    rapidFire:   { value: 2,   color: '#eab308', label: 'RAPID',  isBuff: true, buffType: 'fireRate', duration: 8, weight: 7 },
    magnetPulse: { value: 80,  color: '#a855f7', label: 'MAGNET', isBuff: true, buffType: 'magnet', duration: 6, weight: 5 },
    nuke:        { value: 250, color: '#ff6b35', label: 'NUKE!',  isBuff: true, buffType: 'nuke', weight: 2 }
  },

  // Gates
  GATE_HEIGHT: 60,
  GATE_SPAWN_INTERVAL: 10, // seconds between gates

  // Enemies
  ENEMIES: {
    rusher:    { hp: 1,  speed: 3.5, dmg: 1, color: '#ef4444', size: 14, shape: 'triangle', reward: 2 },
    shooter:   { hp: 4,  speed: 1.2, dmg: 1, color: '#f97316', size: 14, shape: 'rect',     reward: 5,  fireRate: 1.8 },
    tank:      { hp: 15, speed: 0.8, dmg: 2, color: '#475569', size: 26, shape: 'tank',     reward: 12, minStage: 1 },
    brute:     { hp: 45, speed: 0.4, dmg: 5, color: '#7f1d1d', size: 36, shape: 'brute',    reward: 25, minStage: 3 },
    mortar:    { hp: 5,  speed: 0.6, dmg: 2, color: '#ea580c', size: 16, shape: 'circle',   reward: 8,  fireRate: 0.5, minStage: 4 },
    detonator: { hp: 3,  speed: 2.8, dmg: 5, color: '#dc2626', size: 12, shape: 'circle',   reward: 6,  minStage: 4 },
    thief:     { hp: 2,  speed: 4,   dmg: 1, color: '#1f2937', size: 12, shape: 'triangle', reward: 10, minStage: 7 },
    flanker:   { hp: 4,  speed: 2.8, dmg: 1, color: '#991b1b', size: 14, shape: 'diamond',  reward: 7,  fireRate: 1.3, minStage: 5 },
    elite:     { hp: 30, speed: 0.3, dmg: 3, color: '#7c3aed', size: 42, shape: 'elite',    reward: 30, fireRate: 1.0, minStage: 2 }
  },

  // Upgrades
  UPGRADES: {
    startSquad:  { max: 4, baseCost: 500,  costMul: 3,   effect: '+1 starting soldier', perLevel: 1 },
    baseDamage:  { max: 10, baseCost: 200,  costMul: 1.6, effect: '+15% damage', perLevel: 0.15 },
    baseHP:      { max: 5,  baseCost: 300,  costMul: 1.8, effect: '+1 squad HP', perLevel: 1 },
    moveSpeed:   { max: 5,  baseCost: 200,  costMul: 1.5, effect: '+5% move speed', perLevel: 0.05 },
    magnetRange: { max: 5,  baseCost: 150,  costMul: 1.5, effect: '+10% pickup range', perLevel: 0.10 },
    goldBonus:   { max: 10, baseCost: 300,  costMul: 1.6, effect: '+10% gold', perLevel: 0.10 }
  },

  // Bosses
  BOSS: {
    zombieTitan: {
      hp: 80,
      size: 40,
      color: '#dc2626',
      name: 'ZOMBIE TITAN',
      phases: [
        { threshold: 0.66, attack: 'shockwave', interval: 3000 },
        { threshold: 0.33, attack: 'summon', interval: 4000 },
        { threshold: 0, attack: 'charge', interval: 2000 }
      ]
    },
    warMachine: {
      hp: 120,
      size: 35,
      color: '#475569',
      name: 'WAR MACHINE',
      phases: [
        { threshold: 0.66, attack: 'gatling', interval: 2500 },
        { threshold: 0.33, attack: 'missiles', interval: 3500 },
        { threshold: 0, attack: 'shield_rush', interval: 3000 }
      ]
    },
    stormColossus: {
      hp: 150,
      size: 38,
      color: '#7c3aed',
      name: 'STORM COLOSSUS',
      phases: [
        { threshold: 0.66, attack: 'lightning', interval: 2000 },
        { threshold: 0.33, attack: 'tornado', interval: 3000 },
        { threshold: 0, attack: 'thunderstorm', interval: 2500 }
      ]
    }
  },

  // Boss rotation by stage
  BOSS_ROTATION: ['zombieTitan', 'warMachine', 'stormColossus'],

  // Bullet
  BULLET_SPEED: 6,
  BULLET_SIZE: 3,

  // Gold
  GOLD_PER_KILL: 2,
  GOLD_PER_ITEM: 5,
  BOSS_GOLD: 200,

  // Stars
  STAR_THRESHOLDS: { star1: 0, star2: 0.5, star3: 0.8 },

  // Colors
  COLORS: {
    primary: '#00e5ff',
    bg: '#0a0a1f',
    road: '#1e293b',
    roadLine: '#334155',
    hud: '#ffffff',
    hudBg: 'rgba(0,0,0,0.5)',
    gold: '#fbbf24',
    danger: '#ef4444',
    gate_left: '#3b82f6',
    gate_right: '#10b981'
  },

  // Difficulty scaling per stage
  DIFFICULTY_SCALE: {
    enemyHpMul: 0.15,     // +15% HP per stage
    enemyCountAdd: 2,      // +2 enemies per stage
    enemySpeedMul: 0.05,   // +5% speed per stage
    itemReduction: 0.01,   // -1% item frequency per stage (was 3% — too punishing)
    spawnRateReduction: 0.08 // -8% spawn interval per stage (faster spawns)
  }
};
