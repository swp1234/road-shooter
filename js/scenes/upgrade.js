// Road Shooter - Upgrade Shop Scene
class UpgradeScene {
  constructor(game) {
    this.game = game;
    this.buttons = [];
    this.backBtn = null;
    this.buildLayout();
  }

  buildLayout() {
    this.buttons = [];
    const upgrades = CONFIG.UPGRADES;
    const save = this.game.saveData;
    let y = 120;

    for (const [key, cfg] of Object.entries(upgrades)) {
      const level = save.upgrades[key] || 0;
      const maxed = level >= cfg.max;
      const cost = maxed ? 0 : Math.floor(cfg.baseCost * Math.pow(cfg.costMul, level));
      const canBuy = !maxed && save.currency.gold >= cost;

      this.buttons.push({
        key, level, max: cfg.max, cost, canBuy, maxed,
        effect: cfg.effect, y, height: 70, buyBtn: null
      });
      y += 80;
    }
  }

  update(dt) {}

  draw(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;
    const ch = CONFIG.CANVAS_HEIGHT;
    const save = this.game.saveData;

    // Background
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, cw, ch);

    // Title
    ctx.fillStyle = CONFIG.COLORS.primary;
    ctx.font = 'bold 28px Syne';
    ctx.textAlign = 'center';
    ctx.fillText(this.game.i18n('upgrade_title') || 'UPGRADES', cw / 2, 45);

    // Gold display
    ctx.fillStyle = CONFIG.COLORS.gold;
    ctx.font = 'bold 18px Outfit';
    ctx.fillText(`${save.currency.gold} Gold`, cw / 2, 80);

    // Upgrade cards
    for (const btn of this.buttons) {
      const bx = 20;
      const bw = cw - 40;

      // Card background
      ctx.fillStyle = btn.canBuy ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.03)';
      ctx.beginPath();
      ctx.roundRect(bx, btn.y, bw, btn.height, 8);
      ctx.fill();

      // Border
      ctx.strokeStyle = btn.canBuy ? CONFIG.COLORS.primary : '#334155';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Name
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Outfit';
      ctx.textAlign = 'left';
      const name = this.game.i18n('upgrade_' + btn.key) || btn.key.replace(/([A-Z])/g, ' $1').trim();
      ctx.fillText(name, bx + 12, btn.y + 22);

      // Effect description
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Outfit';
      ctx.fillText(btn.effect, bx + 12, btn.y + 40);

      // Level
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Outfit';
      ctx.fillText(`Lv.${btn.level}/${btn.max}`, bx + 12, btn.y + 56);

      // Buy button or MAX
      if (btn.maxed) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 14px Outfit';
        ctx.textAlign = 'right';
        ctx.fillText('MAX', bx + bw - 12, btn.y + 38);
      } else {
        const bbw = 80;
        const bbh = 32;
        const bbx = bx + bw - bbw - 8;
        const bby = btn.y + (btn.height - bbh) / 2;

        ctx.fillStyle = btn.canBuy ? CONFIG.COLORS.primary : '#334155';
        ctx.beginPath();
        ctx.roundRect(bbx, bby, bbw, bbh, 6);
        ctx.fill();

        ctx.fillStyle = btn.canBuy ? CONFIG.COLORS.bg : '#64748b';
        ctx.font = 'bold 12px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${btn.cost}g`, bbx + bbw / 2, bby + bbh / 2);
        ctx.textBaseline = 'alphabetic';

        btn.buyBtn = { x: bbx, y: bby, w: bbw, h: bbh };
      }
    }

    // Back button
    const backW = 150;
    const backH = 44;
    const backX = (cw - backW) / 2;
    const backY = ch - 70;

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(backX, backY, backW, backH, 8);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.game.i18n('upgrade_back') || 'BACK', cw / 2, backY + backH / 2);
    ctx.textBaseline = 'alphabetic';

    this.backBtn = { x: backX, y: backY, w: backW, h: backH };
  }

  handleClick(x, y) {
    // Check buy buttons
    for (const btn of this.buttons) {
      if (btn.canBuy && btn.buyBtn) {
        const b = btn.buyBtn;
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          this.buyUpgrade(btn.key, btn.cost);
          Sound.itemCollect();
          return true;
        }
      }
    }

    // Check back button
    if (this.backBtn) {
      const b = this.backBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        Sound.uiClick();
        this.game.showMenu();
        return true;
      }
    }
    return false;
  }

  buyUpgrade(key, cost) {
    const save = this.game.saveData;
    save.currency.gold -= cost;
    save.upgrades[key] = (save.upgrades[key] || 0) + 1;
    SaveManager.save(save);
    this.buildLayout();
  }
}
