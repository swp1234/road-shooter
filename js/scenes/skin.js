// Road Shooter - Skin Gallery Scene
class SkinScene {
  constructor(game) {
    this.game = game;
    this.scrollY = 0;
    this.lastDragY = null;
    this.cards = [];
    this.backBtn = null;
    this.feedbackTimer = 0;
    this.feedbackText = '';
    this.feedbackColor = '';
  }

  update(dt) {
    if (this.feedbackTimer > 0) this.feedbackTimer -= dt;
  }

  draw(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;
    const ch = CONFIG.CANVAS_HEIGHT;
    const save = this.game.saveData;

    // Background
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, cw, ch);

    // Title
    ctx.fillStyle = CONFIG.COLORS.primary;
    ctx.font = 'bold 24px Syne, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.game.i18n('skin_title') || 'SKINS', cw / 2, 36);

    // Gold display
    ctx.fillStyle = CONFIG.COLORS.gold;
    ctx.font = 'bold 12px Outfit';
    ctx.fillText(`${save.currency.gold} Gold`, cw / 2, 56);

    // Feedback toast
    if (this.feedbackTimer > 0) {
      ctx.globalAlpha = Math.min(1, this.feedbackTimer * 2);
      ctx.fillStyle = this.feedbackColor;
      ctx.font = 'bold 12px Outfit';
      ctx.fillText(this.feedbackText, cw / 2, 72);
      ctx.globalAlpha = 1;
    }

    // Clip for scrollable area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 78, cw, ch - 130);
    ctx.clip();

    const skins = SkinManager.SKINS;
    const cardW = 170;
    const cardH = 130;
    const gap = 12;
    const cols = 2;
    const startX = (cw - (cardW * cols + gap * (cols - 1))) / 2;
    const startY = 86 + this.scrollY;

    this.cards = [];

    for (let i = 0; i < skins.length; i++) {
      const skin = skins[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      const owned = SkinManager.isOwned(save, skin.id);
      const equipped = (save.skin && save.skin.equipped || 'default') === skin.id;

      // Card background
      ctx.fillStyle = equipped ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 10);
      ctx.fill();

      // Border
      ctx.strokeStyle = equipped ? CONFIG.COLORS.primary : (owned ? '#475569' : '#1e293b');
      ctx.lineWidth = equipped ? 2 : 1;
      ctx.stroke();

      // Preview area — draw sample soldiers with skin filter
      const previewY = y + 20;
      const prevFilter = ctx.filter;
      if (skin.filter !== 'none') ctx.filter = skin.filter;

      const types = [
        { color: '#10b981', w: 8 },  // rifleman
        { color: '#3b82f6', w: 10 }, // tanker
        { color: '#8b5cf6', w: 8 }   // sniper
      ];
      for (let j = 0; j < 3; j++) {
        const px = x + cardW / 2 + (j - 1) * 24;
        const py = previewY + 22;
        const t = types[j];

        // Body
        ctx.fillStyle = t.color;
        ctx.fillRect(px - t.w / 2, py - 4, t.w, 14);

        // Arms
        ctx.fillRect(px - t.w / 2 - 3, py, 3, 8);
        ctx.fillRect(px + t.w / 2, py, 3, 8);

        // Head (skin tone)
        ctx.fillStyle = '#e8c49a';
        ctx.beginPath();
        ctx.arc(px, py - 8, 5, 0, Math.PI * 2);
        ctx.fill();

        // Helmet
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(px, py - 9, 5.5, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(px - 6, py - 10, 12, 2);

        // Legs
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(px - 3, py + 10, 3, 6);
        ctx.fillRect(px, py + 10, 3, 6);
      }

      if (skin.filter !== 'none') ctx.filter = prevFilter || 'none';

      // Skin name
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Outfit';
      ctx.textAlign = 'center';
      const name = this.game.i18n(skin.nameKey) || skin.id;
      ctx.fillText(`${skin.icon} ${name}`, x + cardW / 2, y + cardH - 32);

      // Status/Cost line
      if (equipped) {
        ctx.fillStyle = CONFIG.COLORS.primary;
        ctx.font = 'bold 11px Outfit';
        ctx.fillText(this.game.i18n('skin_equipped') || 'EQUIPPED', x + cardW / 2, y + cardH - 14);
      } else if (owned) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Outfit';
        ctx.fillText(this.game.i18n('skin_tap_equip') || 'Tap to equip', x + cardW / 2, y + cardH - 14);
      } else if (skin.achievement) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = '10px Outfit';
        const achLabel = this.game.i18n('skin_locked_ach') || '100 Runs to Unlock';
        ctx.fillText('\uD83D\uDD12 ' + achLabel, x + cardW / 2, y + cardH - 14);
      } else {
        const canAfford = save.currency.gold >= skin.cost;
        ctx.fillStyle = canAfford ? CONFIG.COLORS.gold : '#ef4444';
        ctx.font = 'bold 11px Outfit';
        ctx.fillText(`${skin.cost} Gold`, x + cardW / 2, y + cardH - 14);
      }

      this.cards.push({ x, y, w: cardW, h: cardH, skin, owned, equipped });
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
    // Back button
    if (this.backBtn) {
      const b = this.backBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        Sound.uiClick();
        this.game.showMenu();
        return true;
      }
    }

    // Skin cards
    for (const card of this.cards) {
      if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
        Sound.uiClick();
        const save = this.game.saveData;

        if (card.equipped) return true;

        if (card.owned) {
          SkinManager.equip(save, card.skin.id);
          if (this.game.applySkinFilter) this.game.applySkinFilter();
          this.feedbackText = this.game.i18n('skin_equipped') || 'EQUIPPED';
          this.feedbackColor = CONFIG.COLORS.primary;
          this.feedbackTimer = 1.5;
        } else if (!card.skin.achievement && card.skin.cost > 0) {
          if (SkinManager.buy(save, card.skin.id)) {
            SkinManager.equip(save, card.skin.id);
            if (this.game.applySkinFilter) this.game.applySkinFilter();
            this.feedbackText = this.game.i18n('skin_purchased') || 'PURCHASED!';
            this.feedbackColor = CONFIG.COLORS.gold;
            this.feedbackTimer = 1.5;
          } else {
            this.feedbackText = this.game.i18n('skin_no_gold') || 'Not enough gold';
            this.feedbackColor = '#ef4444';
            this.feedbackTimer = 1.5;
          }
        }
        return true;
      }
    }
    return false;
  }

  handleDrag(x, y) {
    if (this.lastDragY !== null) {
      this.scrollY += (y - this.lastDragY);
      const maxScroll = 0;
      const rows = Math.ceil(SkinManager.SKINS.length / 2);
      const minScroll = Math.min(0, -(rows * 142 - 450));
      this.scrollY = Math.max(minScroll, Math.min(maxScroll, this.scrollY));
    }
    this.lastDragY = y;
  }
}
