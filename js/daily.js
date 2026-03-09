// Road Shooter - Daily Challenge System
const DailyChallenge = {
  TYPES: [
    { id: 'kills',   target: [30, 50, 80],  key: 'daily_kills',   icon: '\u2694' },
    { id: 'squad',   target: [20, 40, 60],  key: 'daily_squad',   icon: '\uD83D\uDC65' },
    { id: 'gold',    target: [100, 200, 400], key: 'daily_gold',  icon: '\uD83D\uDCB0' },
    { id: 'stage',   target: [2, 3, 5],     key: 'daily_stage',   icon: '\u2B50' },
    { id: 'endless', target: [3, 5, 8],     key: 'daily_endless', icon: '\u267E' }
  ],

  REWARD_GOLD: [100, 250, 500],

  getDayNumber() {
    const now = new Date();
    const start = new Date(2024, 0, 1);
    return Math.floor((now - start) / 86400000);
  },

  getToday(saveData) {
    const day = this.getDayNumber();
    const seed = day * 7 + 3;
    const typeIdx = seed % this.TYPES.length;
    const diffIdx = (seed * 13) % 3;
    const type = this.TYPES[typeIdx];

    const challenge = {
      day,
      type: type.id,
      icon: type.icon,
      i18nKey: type.key,
      target: type.target[diffIdx],
      reward: this.REWARD_GOLD[diffIdx],
      completed: false,
      progress: 0
    };

    // Check if already completed today
    const saved = saveData.daily || {};
    if (saved.day === day) {
      challenge.completed = saved.completed || false;
      challenge.progress = saved.progress || 0;
    }

    return challenge;
  },

  updateProgress(saveData, result) {
    const challenge = this.getToday(saveData);
    if (challenge.completed) return null;

    if (!saveData.daily) saveData.daily = {};
    saveData.daily.day = challenge.day;

    let progress = saveData.daily.progress || 0;

    switch (challenge.type) {
      case 'kills':
        progress += result.kills || 0;
        break;
      case 'squad':
        progress = Math.max(progress, result.maxSquad || 0);
        break;
      case 'gold':
        progress += result.gold || 0;
        break;
      case 'stage':
        if (result.cleared) progress = Math.max(progress, result.stage || 0);
        break;
      case 'endless':
        progress = Math.max(progress, result.wave || result.endlessWave || 0);
        break;
    }

    saveData.daily.progress = progress;

    if (progress >= challenge.target && !saveData.daily.completed) {
      saveData.daily.completed = true;
      saveData.currency.gold += challenge.reward;
      SaveManager.save(saveData);
      return { reward: challenge.reward, type: challenge.type };
    }

    SaveManager.save(saveData);
    return null;
  },

  drawOnMenu(ctx, game, y) {
    const challenge = this.getToday(game.saveData);
    const cw = CONFIG.CANVAS_WIDTH;
    const boxW = 220;
    const boxH = 52;
    const boxX = (cw - boxW) / 2;

    // Background
    ctx.fillStyle = challenge.completed ? 'rgba(16,185,129,0.15)' : 'rgba(0,229,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(boxX, y, boxW, boxH, 8);
    ctx.fill();
    ctx.strokeStyle = challenge.completed ? '#10b981' : 'rgba(0,229,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Icon + title
    ctx.fillStyle = challenge.completed ? '#10b981' : CONFIG.COLORS.primary;
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'left';
    const label = game.i18n('daily_title') || 'DAILY CHALLENGE';
    ctx.fillText(`${challenge.icon} ${label}`, boxX + 10, y + 16);

    // Description
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Outfit, sans-serif';
    const desc = (game.i18n(challenge.i18nKey) || challenge.type) + `: ${challenge.target}`;
    ctx.fillText(desc, boxX + 10, y + 30);

    // Progress bar
    const barX = boxX + 10;
    const barY = y + 36;
    const barW = boxW - 70;
    const barH = 6;
    const pct = Math.min(1, (challenge.progress || 0) / challenge.target);

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();

    ctx.fillStyle = challenge.completed ? '#10b981' : CONFIG.COLORS.primary;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * pct, barH, 3);
    ctx.fill();

    // Progress text
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px Outfit';
    ctx.textAlign = 'left';
    ctx.fillText(`${challenge.progress || 0}/${challenge.target}`, barX + barW + 4, barY + 5);

    // Reward
    ctx.fillStyle = challenge.completed ? '#10b981' : CONFIG.COLORS.gold;
    ctx.textAlign = 'right';
    ctx.font = 'bold 10px Outfit';
    const rewardText = challenge.completed
      ? (game.i18n('daily_done') || 'DONE')
      : `+${challenge.reward}G`;
    ctx.fillText(rewardText, boxX + boxW - 8, y + 16);

    ctx.textAlign = 'left';
  }
};
