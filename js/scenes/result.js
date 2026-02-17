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
    ctx.fillText(`Stage ${this.result.stage}`, cw / 2, ch * 0.18);

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
    ];

    if (this.result.bossDefeated) {
      stats.push({ label: this.game.i18n('result_boss') || 'Boss Defeated!', value: `+${this.result.starCoins} \u2B50`, color: '#a855f7' });
    }

    stats.forEach((stat, i) => {
      const sy = panelY + 35 + i * 50;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Outfit';
      ctx.textAlign = 'left';
      ctx.fillText(stat.label, 50, sy);
      ctx.fillStyle = stat.color;
      ctx.font = 'bold 20px Outfit';
      ctx.textAlign = 'right';
      ctx.fillText(stat.value.toString(), cw - 50, sy);
    });

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
    }
  }

  handleClick(x, y) {
    if (!this.shown) return false;
    if (this.retryBtn) {
      const b = this.retryBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.game.startRun();
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
    return false;
  }
}
