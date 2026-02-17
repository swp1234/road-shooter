// Road Shooter - Main Menu Scene
class MenuScene {
  constructor(game) {
    this.game = game;
    this.titleAlpha = 0;
    this.buttonPulse = 0;
    this.starField = [];
    this.selectedStage = (game.saveData.progress.maxStage || 0) + 1;

    for (let i = 0; i < 50; i++) {
      this.starField.push({
        x: Math.random() * CONFIG.CANVAS_WIDTH,
        y: Math.random() * CONFIG.CANVAS_HEIGHT,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1
      });
    }
  }

  update(dt) {
    this.titleAlpha = Math.min(1, this.titleAlpha + dt * 2);
    this.buttonPulse += dt * 3;
    for (const s of this.starField) {
      s.y += s.speed;
      if (s.y > CONFIG.CANVAS_HEIGHT) { s.y = 0; s.x = Math.random() * CONFIG.CANVAS_WIDTH; }
    }
  }

  draw(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;
    const ch = CONFIG.CANVAS_HEIGHT;
    const save = this.game.saveData;
    const maxStage = (save.progress.maxStage || 0) + 1;

    // Background
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, cw, ch);

    // Stars
    for (const s of this.starField) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Road preview
    const roadW = cw * 0.4;
    const roadL = (cw - roadW) / 2;
    ctx.fillStyle = CONFIG.COLORS.road;
    ctx.fillRect(roadL, ch * 0.3, roadW, ch * 0.5);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(roadL, ch * 0.3, roadW, ch * 0.5);

    // Title
    ctx.globalAlpha = this.titleAlpha;
    ctx.fillStyle = CONFIG.COLORS.primary;
    ctx.font = 'bold 36px Syne, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = CONFIG.COLORS.primary;
    ctx.shadowBlur = 20;
    ctx.fillText('ROAD', cw / 2, ch * 0.15);
    ctx.fillText('SHOOTER', cw / 2, ch * 0.22);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Outfit, sans-serif';
    ctx.fillText(this.game.i18n('menu_subtitle') || '1 to Army - Squad Runner Shooter', cw / 2, ch * 0.28);

    // Animated squad preview
    const time = Date.now() / 1000;
    const previewY = ch * 0.6 + Math.sin(time) * 10;
    ctx.fillStyle = '#10b981';
    for (let i = 0; i < 7; i++) {
      const px = cw / 2 + (i - 3) * 12;
      const py = previewY + Math.abs(i - 3) * 5;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stage selector
    const stageY = ch * 0.77;
    const stageText = `Stage ${this.selectedStage}`;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(stageText, cw / 2, stageY);

    // Stars for this stage
    const stageStars = save.progress.stars[this.selectedStage] || 0;
    if (stageStars > 0) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < stageStars ? '#fbbf24' : '#333';
        ctx.font = '14px sans-serif';
        ctx.fillText(i < stageStars ? '\u2605' : '\u2606', cw / 2 + (i - 1) * 18, stageY + 18);
      }
    }

    // Left arrow
    if (this.selectedStage > 1) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 20px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('\u25C0', cw / 2 - 70, stageY);
      this.leftArrow = { x: cw / 2 - 90, y: stageY - 15, w: 40, h: 30 };
    } else {
      this.leftArrow = null;
    }

    // Right arrow
    if (this.selectedStage < maxStage) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 20px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('\u25B6', cw / 2 + 70, stageY);
      this.rightArrow = { x: cw / 2 + 50, y: stageY - 15, w: 40, h: 30 };
    } else {
      this.rightArrow = null;
    }

    // Start button
    const btnW = 200;
    const btnH = 50;
    const btnX = (cw - btnW) / 2;
    const btnY = ch * 0.83;
    const pulse = Math.sin(this.buttonPulse) * 0.1 + 0.9;

    ctx.save();
    ctx.translate(cw / 2, btnY + btnH / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-cw / 2, -(btnY + btnH / 2));

    ctx.shadowColor = CONFIG.COLORS.primary;
    ctx.shadowBlur = 15;
    ctx.fillStyle = CONFIG.COLORS.primary;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.game.i18n('menu_start') || 'START', cw / 2, btnY + btnH / 2);
    ctx.restore();

    this.startBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

    // Upgrade button
    const upgBtnW = 160;
    const upgBtnH = 40;
    const upgBtnX = (cw - upgBtnW) / 2;
    const upgBtnY = ch * 0.92;

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(upgBtnX, upgBtnY, upgBtnW, upgBtnH, 10);
    ctx.fill();
    ctx.strokeStyle = CONFIG.COLORS.primary;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = CONFIG.COLORS.primary;
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.game.i18n('menu_upgrade') || 'UPGRADE', cw / 2, upgBtnY + upgBtnH / 2);
    ctx.textBaseline = 'alphabetic';

    this.upgradeBtn = { x: upgBtnX, y: upgBtnY, w: upgBtnW, h: upgBtnH };

    // Gold display
    ctx.fillStyle = CONFIG.COLORS.gold;
    ctx.font = 'bold 12px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(`${save.currency.gold} Gold`, cw / 2, ch * 0.97);

    ctx.globalAlpha = 1;
  }

  handleClick(x, y) {
    // Stage arrows
    if (this.leftArrow) {
      const b = this.leftArrow;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.selectedStage = Math.max(1, this.selectedStage - 1);
        return true;
      }
    }
    if (this.rightArrow) {
      const b = this.rightArrow;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        const maxStage = (this.game.saveData.progress.maxStage || 0) + 1;
        this.selectedStage = Math.min(maxStage, this.selectedStage + 1);
        return true;
      }
    }

    // Start
    if (this.startBtn) {
      const b = this.startBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.game.startRun(this.selectedStage);
        return true;
      }
    }

    // Upgrade
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
