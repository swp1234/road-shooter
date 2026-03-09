// Road Shooter - Local Ranking System
const Ranking = (() => {
  const KEY = 'roadShooter_ranking';
  const MAX_ENTRIES = 10;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { stage: [], endless: [] };
      return JSON.parse(raw);
    } catch (e) {
      return { stage: [], endless: [] };
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* quota exceeded */ }
  }

  return {
    addStageRun(result) {
      const data = load();
      const entry = {
        stage: result.stage,
        cleared: result.cleared,
        kills: result.kills,
        gold: result.gold,
        maxSquad: result.maxSquad,
        stars: result.stars || 0,
        time: result.time,
        date: Date.now()
      };
      data.stage.push(entry);
      data.stage.sort((a, b) => {
        if (a.cleared !== b.cleared) return (b.cleared ? 1 : 0) - (a.cleared ? 1 : 0);
        if (a.stage !== b.stage) return b.stage - a.stage;
        if (a.stars !== b.stars) return b.stars - a.stars;
        return b.kills - a.kills;
      });
      data.stage = data.stage.slice(0, MAX_ENTRIES);
      save(data);
      const rank = data.stage.findIndex(e => e.date === entry.date);
      return rank >= 0 ? rank + 1 : 0;
    },

    addEndlessRun(result) {
      const data = load();
      const entry = {
        wave: result.wave,
        kills: result.kills,
        gold: result.gold,
        maxSquad: result.maxSquad,
        bossesDefeated: result.bossesDefeated || 0,
        time: result.time,
        date: Date.now()
      };
      data.endless.push(entry);
      data.endless.sort((a, b) => {
        if (a.wave !== b.wave) return b.wave - a.wave;
        return b.kills - a.kills;
      });
      data.endless = data.endless.slice(0, MAX_ENTRIES);
      save(data);
      const rank = data.endless.findIndex(e => e.date === entry.date);
      return rank >= 0 ? rank + 1 : 0;
    },

    getStage() { return load().stage; },
    getEndless() { return load().endless; }
  };
})();
