// Road Shooter - Choice Gates (Enhanced Visuals)
class Gate {
  constructor(y, type = 'classic') {
    this.y = y;
    this.type = type;
    this.active = true;
    this.chosen = null;
    this.chosenTimer = 0;
    this.height = CONFIG.GATE_HEIGHT;
    this.animTimer = 0;
    this.generateOptions();
  }

  generateOptions() {
    const cw = CONFIG.CANVAS_WIDTH;
    const roadW = cw * CONFIG.ROAD_WIDTH_RATIO;
    const roadL = (cw - roadW) / 2;
    this.leftX = roadL;
    this.rightX = roadL + roadW / 2;
    this.gateWidth = roadW / 2;

    switch (this.type) {
      case 'classic':
        this.left = { label: 'x2', op: 'multiply', value: 2, color: CONFIG.COLORS.gate_left };
        this.right = { label: '+10', op: 'add', value: 10, color: CONFIG.COLORS.gate_right };
        break;
      case 'gambler':
        this.left = { label: 'x3/÷2', op: 'gamble', value: 3, color: '#f59e0b' };
        this.right = { label: '+5', op: 'add', value: 5, color: CONFIG.COLORS.gate_right };
        break;
      case 'addLarge':
        this.left = { label: '+15', op: 'add', value: 15, color: CONFIG.COLORS.gate_left };
        this.right = { label: 'x1.5', op: 'multiply', value: 1.5, color: CONFIG.COLORS.gate_right };
        break;
      case 'weapons':
        this.left = { label: 'SNIPER +3', op: 'addType', charType: 'sniper', value: 3, color: '#8b5cf6' };
        this.right = { label: 'BOMBER +2', op: 'addType', charType: 'bomber', value: 2, color: '#f97316' };
        break;
      case 'power':
        this.left = { label: 'DMG +30%', op: 'buff', isBuff: true, buffType: 'dmg', value: 0.3, duration: 10, color: '#f43f5e' };
        this.right = { label: 'SHIELD +5', op: 'buff', isBuff: true, buffType: 'shield', value: 5, color: '#60a5fa' };
        break;
      default:
        this.left = { label: 'x2', op: 'multiply', value: 2, color: CONFIG.COLORS.gate_left };
        this.right = { label: '+5', op: 'add', value: 5, color: CONFIG.COLORS.gate_right };
    }
  }

  update(scrollSpeed) {
    if (this.chosen) {
      this.chosenTimer -= 1 / 60;
      if (this.chosenTimer <= 0) this.active = false;
      return;
    }
    this.y += scrollSpeed;
    this.animTimer += 0.03;
    if (this.y > CONFIG.CANVAS_HEIGHT + 100) this.active = false;
  }

  checkCollision(squadX) {
    if (this.chosen) return null;
    const mid = CONFIG.CANVAS_WIDTH / 2;
    return squadX < mid ? 'left' : 'right';
  }

  choose(side) {
    if (this.chosen) return null;
    this.chosen = side;
    this.chosenTimer = 0.5;
    return side === 'left' ? this.left : this.right;
  }

  draw(ctx) {
    if (!this.active) return;
    const alpha = this.chosen ? this.chosenTimer / 0.5 : 1;
    ctx.globalAlpha = alpha;

    // Left gate
    this.drawHalf(ctx, this.leftX, this.y, this.gateWidth, this.height, this.left, this.chosen === 'left');
    // Right gate
    this.drawHalf(ctx, this.rightX, this.y, this.gateWidth, this.height, this.right, this.chosen === 'right');

    // Center divider (glowing line)
    const midX = this.leftX + this.gateWidth;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(midX, this.y);
    ctx.lineTo(midX, this.y + this.height);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Top and bottom gate bars
    const fullW = this.gateWidth * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(this.leftX, this.y - 2, fullW, 3);
    ctx.fillRect(this.leftX, this.y + this.height - 1, fullW, 3);

    ctx.globalAlpha = 1;
  }

  drawHalf(ctx, x, y, w, h, option, isChosen) {
    // Background gradient
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    if (isChosen) {
      grad.addColorStop(0, 'rgba(255,255,255,0.25)');
      grad.addColorStop(1, 'rgba(255,255,255,0.05)');
    } else {
      const r = parseInt(option.color.slice(1, 3), 16);
      const g = parseInt(option.color.slice(3, 5), 16);
      const b = parseInt(option.color.slice(5, 7), 16);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.25)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0.08)`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Animated scan line
    if (!this.chosen) {
      const scanY = y + (this.animTimer * 40) % h;
      ctx.fillStyle = option.color;
      ctx.globalAlpha *= 0.15;
      ctx.fillRect(x, scanY, w, 2);
      ctx.globalAlpha /= 0.15;
    }

    // Side border glow
    ctx.shadowColor = option.color;
    ctx.shadowBlur = 4;
    ctx.strokeStyle = option.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.shadowBlur = 0;

    // Arrow indicators (pointing inward)
    if (!this.chosen) {
      const pulse = 0.6 + Math.sin(this.animTimer * 3) * 0.2;
      ctx.globalAlpha *= pulse;
      ctx.fillStyle = option.color;
      const arrowX = x + w / 2;
      const arrowY = y + 8;
      ctx.font = '10px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(x < CONFIG.CANVAS_WIDTH / 2 ? '<<<' : '>>>', arrowX, arrowY);
      ctx.globalAlpha /= pulse;
    }

    // Label with glow
    ctx.shadowColor = option.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(option.label, x + w / 2, y + h / 2);
    ctx.shadowBlur = 0;

    // Subtitle for gambler
    if (option.op === 'gamble') {
      ctx.fillStyle = '#f59e0b';
      ctx.font = '9px Outfit';
      ctx.fillText('50/50', x + w / 2, y + h / 2 + 14);
    }

    ctx.textBaseline = 'alphabetic';
  }
}
