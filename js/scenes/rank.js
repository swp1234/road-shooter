// Road Shooter - Ranking Board Scene
class RankScene {
  constructor(game) {
    this.game = game;
    this.tab = 'stage';
    this.scrollY = 0;
    this.lastDragY = null;
    this.backBtn = null;
    this.stageTab = null;
    this.endlessTab = null;
  }

  update(dt) {}

  draw(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;
    const ch = CONFIG.CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, cw, ch);

    // Title
    ctx.fillStyle = CONFIG.COLORS.primary;
    ctx.font = 'bold 22px Syne, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.game.i18n('rank_title') || 'LEADERBOARD', cw / 2, 36);

    // Tabs
    const tabW = 120;
    const tabH = 28;
    const tabY = 50;
    const tabGap = 8;

    // Stage tab
    const stageX = cw / 2 - tabW - tabGap / 2;
    ctx.fillStyle = this.tab === 'stage' ? CONFIG.COLORS.primary : '#1e293b';
    ctx.beginPath();
    ctx.roundRect(stageX, tabY, tabW, tabH, 6);
    ctx.fill();
    ctx.fillStyle = this.tab === 'stage' ? CONFIG.COLORS.bg : '#64748b';
    ctx.font = 'bold 12px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.game.i18n('hud_stage') || 'Stage', stageX + tabW / 2, tabY + tabH / 2);
    this.stageTab = { x: stageX, y: tabY, w: tabW, h: tabH };

    // Endless tab
    const endlessX = cw / 2 + tabGap / 2;
    ctx.fillStyle = this.tab === 'endless' ? '#a78bfa' : '#1e293b';
    ctx.beginPath();
    ctx.roundRect(endlessX, tabY, tabW, tabH, 6);
    ctx.fill();
    ctx.fillStyle = this.tab === 'endless' ? CONFIG.COLORS.bg : '#64748b';
    ctx.fillText(this.game.i18n('menu_endless') || 'ENDLESS', endlessX + tabW / 2, tabY + tabH / 2);
    ctx.textBaseline = 'alphabetic';
    this.endlessTab = { x: endlessX, y: tabY, w: tabW, h: tabH };

    // List area
    const entries = this.tab === 'stage' ? Ranking.getStage() : Ranking.getEndless();
    const listTop = 88;
    const listY = listTop + this.scrollY;
    const rowH = 54;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, listTop, cw, ch - listTop - 50);
    ctx.clip();

    if (entries.length === 0) {
      ctx.fillStyle = '#475569';
      ctx.font = '14px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(this.game.i18n('rank_empty') || 'No records yet', cw / 2, listY + 50);
    }

    const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const ey = listY + i * rowH;

      // Skip if out of view
      if (ey + rowH < listTop || ey > ch - 50) continue;

      // Row background
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)';
      ctx.beginPath();
      ctx.roundRect(12, ey, cw - 24, rowH - 4, 6);
      ctx.fill();

      // Rank
      ctx.textAlign = 'center';
      if (i < 3) {
        ctx.font = '18px sans-serif';
        ctx.fillText(medals[i], 32, ey + 30);
      } else {
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 14px Outfit';
        ctx.fillText(`#${i + 1}`, 32, ey + 30);
      }

      // Main info
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Outfit';

      if (this.tab === 'stage') {
        ctx.fillText(`${this.game.i18n('hud_stage') || 'Stage'} ${e.stage}`, 56, ey + 22);
        // Stars
        if (e.cleared) {
          ctx.font = '12px sans-serif';
          for (let s = 0; s < 3; s++) {
            ctx.fillStyle = s < e.stars ? '#fbbf24' : '#333';
            ctx.fillText(s < e.stars ? '\u2605' : '\u2606', 56 + s * 14, ey + 40);
          }
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.font = '11px Outfit';
          ctx.fillText(this.game.i18n('result_fail') || 'GAME OVER', 56, ey + 40);
        }
      } else {
        ctx.fillText(`${this.game.i18n('hud_wave') || 'Wave'} ${e.wave}`, 56, ey + 22);
        ctx.fillStyle = '#a78bfa';
        ctx.font = '11px Outfit';
        ctx.fillText(`${e.bossesDefeated || 0} ${this.game.i18n('stat_bosses') || 'bosses'}`, 56, ey + 40);
      }

      // Right side stats
      ctx.textAlign = 'right';
      ctx.fillStyle = CONFIG.COLORS.gold;
      ctx.font = 'bold 12px Outfit';
      ctx.fillText(`${e.gold}g`, cw - 22, ey + 18);

      ctx.fillStyle = '#ef4444';
      ctx.font = '11px Outfit';
      ctx.fillText(`${e.kills} ${this.game.i18n('hud_kills_suffix') || 'kills'}`, cw - 22, ey + 34);

      // Date
      const d = new Date(e.date);
      ctx.fillStyle = '#374151';
      ctx.font = '9px Outfit';
      ctx.fillText(`${d.getMonth() + 1}/${d.getDate()}`, cw - 22, ey + 47);
    }

    ctx.restore();

    // Back button
    const backW = 100;
    const backH = 36;
    const backX = (cw - backW) / 2;
    const backY = ch - 44;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(backX, backY, backW, backH, 8);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.game.i18n('upgrade_back') || 'BACK', cw / 2, backY + backH / 2);
    ctx.textBaseline = 'alphabetic';
    this.backBtn = { x: backX, y: backY, w: backW, h: backH };
  }

  handleClick(x, y) {
    // Back
    if (this.backBtn) {
      const b = this.backBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        Sound.uiClick();
        this.game.showMenu();
        return true;
      }
    }
    // Stage tab
    if (this.stageTab) {
      const b = this.stageTab;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.tab = 'stage';
        this.scrollY = 0;
        Sound.uiClick();
        return true;
      }
    }
    // Endless tab
    if (this.endlessTab) {
      const b = this.endlessTab;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.tab = 'endless';
        this.scrollY = 0;
        Sound.uiClick();
        return true;
      }
    }
    return false;
  }

  handleDrag(x, y) {
    if (this.lastDragY !== null) {
      this.scrollY += (y - this.lastDragY);
      const maxScroll = 0;
      const entries = this.tab === 'stage' ? Ranking.getStage() : Ranking.getEndless();
      const minScroll = Math.min(0, -(entries.length * 54 - 400));
      this.scrollY = Math.max(minScroll, Math.min(maxScroll, this.scrollY));
    }
    this.lastDragY = y;
  }
}
