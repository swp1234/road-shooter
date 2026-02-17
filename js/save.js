// Road Shooter - Save/Load System
const SaveManager = {
  KEY: 'roadShooter_save',

  getDefault() {
    return {
      version: 1,
      progress: { maxStage: 0, stars: {}, difficulty: 'normal' },
      upgrades: {
        startSquad: 0, baseDamage: 0, baseHP: 0,
        moveSpeed: 0, magnetRange: 0, goldBonus: 0
      },
      currency: { gold: 0, starCoin: 0 },
      stats: { totalRuns: 0, totalKills: 0, maxSquadSize: 0, bossesDefeated: 0 },
      settings: { sound: true, music: true, language: 'ko' }
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this.getDefault();
      const data = JSON.parse(raw);
      // Merge with defaults for forward compatibility
      return { ...this.getDefault(), ...data };
    } catch (e) {
      return this.getDefault();
    }
  },

  save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) { /* quota exceeded - silent */ }
  },

  updateAfterRun(data, result) {
    data.stats.totalRuns++;
    data.stats.totalKills += result.kills;
    data.stats.maxSquadSize = Math.max(data.stats.maxSquadSize, result.maxSquad);
    data.currency.gold += result.gold;
    if (result.bossDefeated) {
      data.stats.bossesDefeated++;
      data.currency.starCoin += result.starCoins;
    }
    if (result.cleared) {
      const stage = result.stage;
      data.progress.maxStage = Math.max(data.progress.maxStage, stage);
      const oldStars = data.progress.stars[stage] || 0;
      data.progress.stars[stage] = Math.max(oldStars, result.stars);
    }
    this.save(data);
    return data;
  }
};
