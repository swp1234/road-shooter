// Road Shooter - Choice Gates
class Gate {
  constructor(y, type = 'classic') {
    this.y = y;
    this.type = type;
    this.active = true;
    this.chosen = null; // 'left' or 'right'
    this.chosenTimer = 0;
    this.height = CONFIG.GATE_HEIGHT;

    // Generate gate options based on type
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
    if (this.y > CONFIG.CANVAS_HEIGHT + 100) this.active = false;
  }

  checkCollision(squadX) {
    if (this.chosen) return null;
    const cw = CONFIG.CANVAS_WIDTH;
    const roadW = cw * CONFIG.ROAD_WIDTH_RATIO;
    const mid = cw / 2;

    if (squadX < mid) {
      return 'left';
    } else {
      return 'right';
    }
  }

  choose(side) {
    if (this.chosen) return null;
    this.chosen = side;
    this.chosenTimer = 0.5;
    const option = side === 'left' ? this.left : this.right;
    return option;
  }

  draw(ctx) {
    if (!this.active) return;
    const alpha = this.chosen ? this.chosenTimer / 0.5 : 1;
    ctx.globalAlpha = alpha;

    // Left gate
    this.drawHalf(ctx, this.leftX, this.y, this.gateWidth, this.height, this.left, this.chosen === 'left');
    // Right gate
    this.drawHalf(ctx, this.rightX, this.y, this.gateWidth, this.height, this.right, this.chosen === 'right');

    // Divider
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.leftX + this.gateWidth, this.y);
    ctx.lineTo(this.leftX + this.gateWidth, this.y + this.height);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  drawHalf(ctx, x, y, w, h, option, isChosen) {
    // Background
    ctx.fillStyle = isChosen ? '#ffffff33' : option.color + '44';
    ctx.fillRect(x, y, w, h);

    // Border
    ctx.strokeStyle = option.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Label
    ctx.fillStyle = option.color;
    ctx.font = 'bold 22px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(option.label, x + w / 2, y + h / 2);
  }
}
