// Road Shooter - Balance Constants & Configuration
const CONFIG = {
  // Canvas
  CANVAS_WIDTH: 400,
  CANVAS_HEIGHT: 700,
  FPS: 60,

  // Run Structure
  ROAD_SEGMENTS: 5,
  COMBAT_SEGMENTS: 5,
  ROAD_DURATION: 12, // seconds
  COMBAT_DURATION: 10,
  BOSS_DURATION: 25,

  // Road
  ROAD_WIDTH_RATIO: 0.7, // road width as % of canvas
  SCROLL_SPEED: 2, // pixels per frame
  LANE_COUNT: 5,

  // Squad
  START_SQUAD: 1,
  SOFT_CAP: 200,
  HARD_CAP: 999,
  SQUAD_MOVE_SPEED: 8,

  // Character Types
  CHAR_TYPES: {
    rifleman: { dmg: 10, range: 150, hp: 1, fireRate: 1.0, color: '#10b981', size: 4 },
    tanker:   { dmg: 5,  range: 50,  hp: 3, fireRate: 0.6, color: '#3b82f6', size: 6 },
    sniper:   { dmg: 30, range: 300, hp: 1, fireRate: 0.4, color: '#8b5cf6', size: 4 },
    bomber:   { dmg: 20, range: 120, hp: 1, fireRate: 0.3, color: '#f97316', size: 4, aoe: 40 }
  },

  // Items
  ITEM_SIZE: 16,
  ITEM_SPAWN_INTERVAL: 40, // frames between spawns
  ITEMS: {
    scoutToken:  { value: 1,  color: '#10b981', label: '+1',   charType: 'rifleman' },
    rallyFlag:   { value: 0.2, color: '#fbbf24', label: '+20%', isPercent: true },
    mercenary:   { value: 5,  color: '#d4a44c', label: '+5',   charType: 'random' },
    clonePod:    { value: 3,  color: '#06b6d4', label: '+3',   charType: 'tanker' },
    conscription:{ value: 8,  color: '#ef4444', label: '+8',   charType: 'mixed' }
  },

  // Gates
  GATE_HEIGHT: 60,
  GATE_SPAWN_INTERVAL: 600, // frames between gates

  // Enemies
  ENEMIES: {
    rusher:    { hp: 1,  speed: 3,   dmg: 1, color: '#ef4444', size: 8,  shape: 'triangle', reward: 2 },
    shooter:   { hp: 3,  speed: 1,   dmg: 1, color: '#f97316', size: 8,  shape: 'rect',     reward: 5,  fireRate: 2.0 },
    mortar:    { hp: 4,  speed: 0.5, dmg: 2, color: '#ea580c', size: 10, shape: 'circle',   reward: 8,  fireRate: 0.5, minStage: 5 },
    detonator: { hp: 2,  speed: 2.5, dmg: 5, color: '#dc2626', size: 7,  shape: 'circle',   reward: 6,  minStage: 10 },
    thief:     { hp: 2,  speed: 4,   dmg: 0, color: '#1f2937', size: 7,  shape: 'triangle', reward: 10, minStage: 7 },
    flanker:   { hp: 3,  speed: 2.5, dmg: 1, color: '#991b1b', size: 8,  shape: 'diamond',  reward: 7,  fireRate: 1.5, minStage: 12 }
  },

  // Upgrades
  UPGRADES: {
    startSquad:  { max: 4, baseCost: 500,  costMul: 3,   effect: '+1 starting soldier', perLevel: 1 },
    baseDamage:  { max: 10, baseCost: 200,  costMul: 1.8, effect: '+10% damage', perLevel: 0.10 },
    baseHP:      { max: 5,  baseCost: 300,  costMul: 2.2, effect: '+1 squad HP', perLevel: 1 },
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
    enemyHpMul: 0.1,    // +10% per stage
    enemyCountAdd: 1,    // +1 per stage
    itemReduction: 0.02  // -2% per stage
  }
};
