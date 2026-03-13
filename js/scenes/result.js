// Road Shooter - Result Screen Scene (Glassmorphism redesign)
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
    // Floating background particles
    this.bgParticles = [];
    const cleared = result.cleared;
    for (let i = 0; i < 30; i++) {
      this.bgParticles.push({
        x: Math.random() * CONFIG.CANVAS_WIDTH,
        y: Math.random() * CONFIG.CANVAS_HEIGHT,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.8 - 0.2,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.4 + 0.1,
        color: cleared ? CONFIG.COLORS.primary : CONFIG.COLORS.danger
      });
    }
  }

  update(dt) {
    this.animTimer += dt;

    // Animate counters with easeOutCubic
    const raw = Math.min(this.animTimer / 1.5, 1);
    const t = 1 - Math.pow(1 - raw, 3);
    this.counters.kills = Math.floor(this.result.kills * t);
    this.counters.gold = Math.floor(this.result.gold * t);
    this.counters.squad = Math.floor(this.result.maxSquad * t);
    this.counters.stars = this.animTimer > 1.5 ? this.result.stars : 0;
    this.shown = this.animTimer > 2;

    // Update bg particles
    for (const p of this.bgParticles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = CONFIG.CANVAS_HEIGHT + 10; p.x = Math.random() * CONFIG.CANVAS_WIDTH; }
      if (p.x < -10) p.x = CONFIG.CANVAS_WIDTH + 10;
      if (p.x > CONFIG.CANVAS_WIDTH + 10) p.x = -10;
    }

    if (typeof Achievements !== 'undefined') Achievements.updateToast(dt);
  }

  // Glass panel helper
  _drawGlassPanel(ctx, x, y, w, h, r, borderColor, borderAlpha) {
    ctx.fillStyle = 'rgba(10,10,31,0.7)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    ctx.strokeStyle = borderColor || `rgba(0,229,255,${borderAlpha || 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  draw(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;
    const ch = CONFIG.CANVAS_HEIGHT;
    const cleared = this.result.cleared;
    const accentColor = cleared ? CONFIG.COLORS.primary : CONFIG.COLORS.danger;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
    bgGrad.addColorStop(0, '#050510');
    bgGrad.addColorStop(0.5, cleared ? '#0a0a2e' : '#1a0a0a');
    bgGrad.addColorStop(1, '#050510');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Floating particles
    for (const p of this.bgParticles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Entry animation slide
    const entryT = Math.min(this.animTimer / 0.6, 1);
    const slideY = (1 - entryT) * 40;
    ctx.globalAlpha = entryT;

    // Result header with glow
    const headerScale = 1 + Math.sin(this.animTimer * 2) * 0.02;
    ctx.save();
    ctx.translate(cw / 2, ch * 0.10 - slideY);
    ctx.scale(headerScale, headerScale);
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 32px Syne, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 20;
    ctx.fillText(
      cleared
        ? (this.game.i18n('result_clear') || 'STAGE CLEAR!')
        : (this.game.i18n('result_fail') || 'GAME OVER'),
      0, 0
    );
    ctx.shadowBlur = 0;
    ctx.restore();

    // Stage badge
    const badgeY = ch * 0.15 - slideY;
    this._drawGlassPanel(ctx, cw / 2 - 50, badgeY - 12, 100, 24, 12, `rgba(148,163,184,0.3)`);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.game.i18n('hud_stage') || 'Stage'} ${this.result.stage}`, cw / 2, badgeY + 5);

    // Stars with animation
    if (cleared && this.counters.stars > 0) {
      const starY = ch * 0.22 - slideY;
      for (let i = 0; i < 3; i++) {
        const sx = cw / 2 + (i - 1) * 44;
        const filled = i < this.counters.stars;
        const starDelay = 1.5 + i * 0.2;
        const starScale = this.animTimer > starDelay ? Math.min((this.animTimer - starDelay) / 0.15, 1) : 0;
        if (starScale <= 0) continue;
        ctx.save();
        ctx.translate(sx, starY);
        ctx.scale(starScale, starScale);
        if (filled) {
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 12;
        }
        ctx.fillStyle = filled ? '#fbbf24' : 'rgba(255,255,255,0.15)';
        ctx.font = '32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(filled ? '\u2605' : '\u2606', 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    // Stats glass panel
    const panelX = 24;
    const panelY = ch * 0.28 - slideY * 0.5;
    const panelW = cw - 48;

    const stats = [
      { label: this.game.i18n('result_kills') || 'Kills', value: this.counters.kills, color: '#ef4444', icon: '\u2694' },
      { label: this.game.i18n('result_max_squad') || 'Max Squad', value: this.counters.squad, color: '#10b981', icon: '\u{1F46A}' },
      { label: this.game.i18n('result_gold') || 'Gold', value: this.counters.gold, color: CONFIG.COLORS.gold, icon: '\u{1FA99}' },
      { label: this.game.i18n('result_time') || 'Time', value: `${Math.floor(this.result.time / 60)}:${(this.result.time % 60).toString().padStart(2, '0')}`, color: '#94a3b8', icon: '\u23F1' },
    ];

    if (this.result.bestCombo > 0) {
      stats.push({ label: this.game.i18n('result_best_combo') || 'Best Combo', value: `${this.result.bestCombo}x`, color: '#fbbf24', icon: '\u{1F525}' });
    }

    if (this.result.bossDefeated) {
      stats.push({ label: this.game.i18n('result_boss') || 'Boss Defeated!', value: `+${this.result.starCoins} \u2B50`, color: '#a855f7', icon: '\u{1F480}' });
    }

    const rowH = stats.length > 4 ? 42 : 48;
    const panelH = stats.length * rowH + 24;

    this._drawGlassPanel(ctx, panelX, panelY, panelW, panelH, 14, `rgba(${cleared ? '0,229,255' : '239,68,68'},0.2)`);

    stats.forEach((stat, i) => {
      const rowDelay = 0.3 + i * 0.12;
      const rowAlpha = Math.min((this.animTimer - rowDelay) / 0.3, 1);
      if (rowAlpha <= 0) return;
      ctx.globalAlpha = rowAlpha;

      const sy = panelY + 20 + i * rowH;

      // Row separator
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 12, sy - 4);
        ctx.lineTo(panelX + panelW - 12, sy - 4);
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = '#64748b';
      ctx.font = '13px Outfit';
      ctx.textAlign = 'left';
      ctx.fillText(stat.label, panelX + 16, sy + 14);

      // Value with glow
      ctx.fillStyle = stat.color;
      ctx.shadowColor = stat.color;
      ctx.shadowBlur = 6;
      ctx.font = 'bold 20px Outfit';
      ctx.textAlign = 'right';
      ctx.fillText(stat.value.toString(), panelX + panelW - 16, sy + 16);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    // Daily challenge completion banner
    const dailyReward = this.game.saveData._dailyReward;
    if (dailyReward && this.animTimer > 1.8) {
      const bannerY = panelY + panelH + 8;
      this._drawGlassPanel(ctx, 40, bannerY, cw - 80, 28, 8, 'rgba(16,185,129,0.5)');
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.game.i18n('daily_complete') || 'DAILY COMPLETE!'} +${dailyReward.reward} ${this.game.i18n('hud_gold') || 'Gold'}`, cw / 2, bannerY + 18);
    }

    // Buttons
    if (this.shown) {
      const btnFade = Math.min((this.animTimer - 2) / 0.3, 1);
      ctx.globalAlpha = btnFade;

      const btnW = 150;
      const btnH = 44;
      const retryX = cw / 2 - btnW - 10;
      const retryY = ch * 0.78;

      // Retry glass button with accent glow
      ctx.fillStyle = 'rgba(10,10,31,0.8)';
      ctx.beginPath();
      ctx.roundRect(retryX, retryY, btnW, btnH, 12);
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 16px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(this.game.i18n('result_retry') || 'RETRY', retryX + btnW / 2, retryY + btnH / 2 + 5);

      // Menu glass button
      const menuX = cw / 2 + 10;
      ctx.fillStyle = 'rgba(10,10,31,0.8)';
      ctx.beginPath();
      ctx.roundRect(menuX, retryY, btnW, btnH, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(this.game.i18n('result_menu') || 'MENU', menuX + btnW / 2, retryY + btnH / 2 + 5);

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
        ctx.globalAlpha = btnFade * pulse;
        ctx.fillStyle = 'rgba(217,119,6,0.3)';
        ctx.beginPath();
        ctx.roundRect(rwX, rwY, rwW, rwH, 10);
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.shadowColor = '#d97706';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 13px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(
          '\uD83C\uDFA5 ' + (this.game.i18n('ad_2x_gold') || 'Watch Ad for 2x Gold'),
          cw / 2, rwY + rwH / 2 + 4
        );
        ctx.globalAlpha = 1;
        this.rewardBtn = { x: rwX, y: rwY, w: rwW, h: rwH };
      }

      // Upgrade glass button
      const upgW = 140;
      const upgH = 36;
      const upgX = (cw - upgW) / 2;
      const upgY = retryY + btnH + (this.rewardBtn ? 58 : 16);
      ctx.globalAlpha = btnFade;
      ctx.fillStyle = 'rgba(10,10,31,0.8)';
      ctx.beginPath();
      ctx.roundRect(upgX, upgY, upgW, upgH, 10);
      ctx.fill();
      ctx.strokeStyle = CONFIG.COLORS.primary;
      ctx.lineWidth = 1;
      ctx.shadowColor = CONFIG.COLORS.primary;
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = CONFIG.COLORS.primary;
      ctx.font = 'bold 13px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(this.game.i18n('menu_upgrade') || 'UPGRADE', cw / 2, upgY + upgH / 2 + 4);
      this.upgradeBtn = { x: upgX, y: upgY, w: upgW, h: upgH };
      ctx.globalAlpha = 1;
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
