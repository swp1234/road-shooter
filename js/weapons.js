// Road Shooter - Weapon Pickup System
// Weapons appear as road items. Collecting one changes squad firing behavior.
// Default weapon: assault. Others are timed (duration in seconds).

const WEAPONS = {
  assault: {
    id: 'assault',
    name: 'RIFLE',
    color: '#10b981',
    glowColor: '#00e5ff',
    dmgMul: 1.0,
    fireRateMul: 1.0,
    bulletSpeed: 6,
    spread: 0,
    aoe: 0,
    pierce: false,
    accuracy: 1,
    duration: 0, // 0 = default, never expires
    icon: 'R',
    minStage: 0
  },
  shotgun: {
    id: 'shotgun',
    name: 'SHOTGUN',
    color: '#dc2626',
    glowColor: '#ff4444',
    dmgMul: 0.7,
    fireRateMul: 0.5,
    bulletSpeed: 5,
    spread: 5,
    aoe: 0,
    pierce: false,
    accuracy: 1,
    duration: 12,
    icon: 'S',
    minStage: 1
  },
  sniper: {
    id: 'sniper',
    name: 'SNIPER',
    color: '#8b5cf6',
    glowColor: '#a78bfa',
    dmgMul: 2.5,
    fireRateMul: 0.35,
    bulletSpeed: 10,
    spread: 0,
    aoe: 0,
    pierce: true,
    accuracy: 1,
    duration: 10,
    icon: 'Z',
    minStage: 2
  },
  rocket: {
    id: 'rocket',
    name: 'ROCKET',
    color: '#f97316',
    glowColor: '#ff6b35',
    dmgMul: 3.0,
    fireRateMul: 0.25,
    bulletSpeed: 4,
    spread: 0,
    aoe: 50,
    pierce: false,
    accuracy: 1,
    duration: 8,
    icon: 'K',
    minStage: 3
  },
  laser: {
    id: 'laser',
    name: 'LASER',
    color: '#06b6d4',
    glowColor: '#22d3ee',
    dmgMul: 1.8,
    fireRateMul: 0.22,
    bulletSpeed: 12,
    spread: 0,
    aoe: 0,
    pierce: true,
    accuracy: 1,
    duration: 10,
    icon: 'L',
    minStage: 4
  },
  minigun: {
    id: 'minigun',
    name: 'MINIGUN',
    color: '#eab308',
    glowColor: '#fbbf24',
    dmgMul: 0.5,
    fireRateMul: 2.5,
    bulletSpeed: 7,
    spread: 0,
    aoe: 0,
    pierce: false,
    accuracy: 0.82,
    duration: 10,
    icon: 'M',
    minStage: 5
  }
};

const WEAPON_IDS = ['shotgun', 'sniper', 'rocket', 'laser', 'minigun'];

// Pick a random weapon appropriate for current stage
function rollWeaponDrop(stage) {
  const pool = WEAPON_IDS.filter(id => WEAPONS[id].minStage <= stage);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
