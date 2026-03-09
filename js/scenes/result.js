// Road Shooter - Result Screen Scene
class ResultScene {
  constructor(game, result) {
    this.game = game;
    this.result = result;
    this.animTimer = 0;
    this.shown = false;
    this.counters = {
      kills: 0,
      gold: 0,
      squad: 0,
      stars: 0
    };
  }

  update(dt) {
    this.animTimer += dt;

    // Animate counters
    const t = Math.min(this.animTimer / 1.5, 1);
    this.counters.kills = Math.floor(this.result.kills * t);
    this.counters.gold = Math.floor(this.result.gold * t);
    this.counters.squad = Math.floor(this.result.maxSquad * t);
    this.counters.stars = this.animTimer > 1.5 ? this.result.stars : 0;
    this.shown = this.animTimer > 2;
    if (typeof Achievements !== 'undefined') Achievements.updateToast(dt);
  }

  draw(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;
    const ch = CONFIG.CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, cw, ch);

    // Result header
    const cleared = this.result.cleared;
    ctx.fillStyle = cleared ? CONFIG.COLORS.primary : CONFIG.COLORS.danger;
    ctx.font = 'bold 32px Syne, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = cleared ? CONFIG.COLORS.primary : CONFIG.COLORS.danger;
    ctx.shadowBlur = 15;
    ctx.fillText(
      cleared
        ? (this.game.i18n('result_clear') || 'STAGE CLEAR!')
        : (this.game.i18n('result_fail') || 'GAME OVER'),
      cw / 2, ch * 0.12
    );
    ctx.shadowBlur = 0;

    // Stage info
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Outfit';
    ctx.fillText(`${this.game.i18n('hud_stage') || 'Stage'} ${this.result.stage}`, cw / 2, ch * 0.18);

    // Stars
    if (cleared && this.counters.stars > 0) {
      const starY = ch * 0.25;
      for (let i = 0; i < 3; i++) {
        const sx = cw / 2 + (i - 1) * 40;
        const filled = i < this.counters.stars;
        ctx.fillStyle = filled ? '#fbbf24' : '#333';
        ctx.font = '30px sans-serif';
        ctx.fillText(filled ? '\u2605' : '\u2606', sx, starY);
      }
    }

    // Stats panel
    const panelY = ch * 0.32;
    const panelH = ch * 0.35;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(30, panelY, cw - 60, panelH, 12);
    ctx.fill();

    const stats = [
      { label: this.game.i18n('result_kills') || 'Kills', value: this.counters.kills, color: '#ef4444' },
      { label: this.game.i18n('result_max_squad') || 'Max Squad', value: this.counters.squad, color: '#10b981' },
      { label: this.game.i18n('result_gold') || 'Gold', value: this.counters.gold, color: CONFIG.COLORS.gold },
      { label: this.game.i18n('result_time') || 'Time', value: `${Math.floor(this.result.time / 60)}:${(this.result.time % 60).toString().padStart(2, '0')}`, color: '#94a3b8' },
    ];

    if (this.result.bestCombo > 0) {
      stats.push({ label: this.game.i18n('result_best_combo') || 'Best Combo', value: `${this.result.bestCombo}x`, color: '#fbbf24' });
    }

    if (this.result.bossDefeated) {
      stats.push({ label: this.game.i18n('result_boss') || 'Boss Defeated!', value: `+${this.result.starCoins} \u2B50`, color: '#a855f7' });
    }

    const rowH = stats.length > 4 ? 40 : 50;
    stats.forEach((stat, i) => {
      const sy = panelY + 30 + i * rowH;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Outfit';
      ctx.textAlign = 'left';
      ctx.fillText(stat.label, 50, sy);
      ctx.fillStyle = stat.color;
      ctx.font = 'bold 20px Outfit';
      ctx.textAlign = 'right';
      ctx.fillText(stat.value.toString(), cw - 50, sy);
    });

    // Daily challenge completion banner
    const dailyReward = this.game.saveData._dailyReward;
    if (dailyReward && this.animTimer > 1.8) {
      const bannerY = ch * 0.72;
      ctx.fillStyle = 'rgba(16,185,129,0.2)';
      ctx.beginPath();
      ctx.roundRect(40, bannerY, cw - 80, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.game.i18n('daily_complete') || 'DAILY COMPLETE!'} +${dailyReward.reward} Gold`, cw / 2, bannerY + 18);
    }

    // Buttons
    if (this.shown) {
      // Retry button
      const btnW = 150;
      const btnH = 44;
      const retryX = cw / 2 - btnW - 10;
      const retryY = ch * 0.78;
      ctx.fillStyle = CONFIG.COLORS.primary;
      ctx.beginPath();
      ctx.roundRect(retryX, retryY, btnW, btnH, 10);
      ctx.fill();
      ctx.fillStyle = CONFIG.COLORS.bg;
      ctx.font = 'bold 16px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(this.game.i18n('result_retry') || 'RETRY', retryX + btnW / 2, retryY + btnH / 2 + 1);

      // Menu button
      const menuX = cw / 2 + 10;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(menuX, retryY, btnW, btnH, 10);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(this.game.i18n('result_menu') || 'MENU', menuX + btnW / 2, retryY + btnH / 2 + 1);

      this.retryBtn = { x: retryX, y: retryY, w: btnW, h: btnH };
      this.menuBtn = { x: menuX, y: retryY, w: btnW, h: btnH };

      // 2x Gold rewarded ad button
      this.rewardBtn = null;
      if (typeof GameAds !== 'undefined' && GameAds.isAvailable() && !this.rewardClaimed) {
        const rwW = cw - 60;
        const rwH = 38;
        const rwX = 30;
        const rwY = retryY + btnH + 12;
        const pulse = 0.85 + Math.sin(this.animTimer * 4) * 0.15;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.roundRect(rwX, rwY, rwW, rwH, 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(
          '\uD83C\uDFA5 ' + (this.game.i18n('ad_2x_gold') || 'Watch Ad for 2x Gold'),
          cw / 2, rwY + rwH / 2 + 1
        );
        ctx.globalAlpha = 1;
        this.rewardBtn = { x: rwX, y: rwY, w: rwW, h: rwH };
      }

      // Upgrade button
      const upgW = 140;
      const upgH = 36;
      const upgX = (cw - upgW) / 2;
      const upgY = retryY + btnH + (this.rewardBtn ? 58 : 16);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(upgX, upgY, upgW, upgH, 8);
      ctx.fill();
      ctx.strokeStyle = CONFIG.COLORS.primary;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = CONFIG.COLORS.primary;
      ctx.font = 'bold 13px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(this.game.i18n('menu_upgrade') || 'UPGRADE', cw / 2, upgY + upgH / 2 + 1);
      this.upgradeBtn = { x: upgX, y: upgY, w: upgW, h: upgH };
    }

    // Achievement toast
    if (typeof Achievements !== 'undefined') {
      Achievements.drawToast(ctx, (k) => this.game.i18n(k));
    }
  }

  handleClick(x, y) {
    if (!this.shown) return false;
    if (this.retryBtn) {
      const b = this.retryBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.game.startRun(this.result.stage);
        return true;
      }
    }
    if (this.menuBtn) {
      const b = this.menuBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.game.showMenu();
        return true;
      }
    }
    if (this.rewardBtn) {
      const b = this.rewardBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        Sound.uiClick();
        GameAds.showRewarded({
          onReward: () => {
            const bonus = this.result.gold;
            this.game.saveData.currency.gold += bonus;
            if (this.game.saveData.stats.totalGoldEarned) {
              this.game.saveData.stats.totalGoldEarned += bonus;
            }
            SaveManager.save(this.game.saveData);
            this.rewardClaimed = true;
            this.result.gold *= 2;
          },
          onSkip: () => {}
        });
        return true;
      }
    }
    if (this.upgradeBtn) {
      const b = this.upgradeBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.game.showUpgrade();
        return true;
      }
    }
    return false;
  }
}
