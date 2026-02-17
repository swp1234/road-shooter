// Road Shooter - Road Generation & Scrolling
class Road {
  constructor() {
    this.scrollY = 0;
    this.speed = CONFIG.SCROLL_SPEED;
    this.tileHeight = 40;
    this.tiles = [];
    this.lineOffset = 0;

    // Road bounds
    const cw = CONFIG.CANVAS_WIDTH;
    const roadW = cw * CONFIG.ROAD_WIDTH_RATIO;
    this.roadLeft = (cw - roadW) / 2;
    this.roadRight = this.roadLeft + roadW;
    this.roadWidth = roadW;
    this.centerX = cw / 2;
  }

  getRandomX(margin = 30) {
    return this.roadLeft + margin + Math.random() * (this.roadWidth - margin * 2);
  }

  update() {
    this.scrollY += this.speed;
    this.lineOffset = (this.lineOffset + this.speed) % (this.tileHeight * 2);
  }

  draw(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;
    const ch = CONFIG.CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, cw, ch);

    // Road surface
    ctx.fillStyle = CONFIG.COLORS.road;
    ctx.fillRect(this.roadLeft, 0, this.roadWidth, ch);

    // Road edges
    ctx.fillStyle = '#475569';
    ctx.fillRect(this.roadLeft - 3, 0, 3, ch);
    ctx.fillRect(this.roadRight, 0, 3, ch);

    // Center dashed lines
    ctx.strokeStyle = CONFIG.COLORS.roadLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 15]);
    ctx.lineDashOffset = -this.lineOffset;
    ctx.beginPath();
    ctx.moveTo(this.centerX, 0);
    ctx.lineTo(this.centerX, ch);
    ctx.stroke();

    // Side lane lines
    const laneW = this.roadWidth / CONFIG.LANE_COUNT;
    for (let i = 1; i < CONFIG.LANE_COUNT; i++) {
      if (i === Math.floor(CONFIG.LANE_COUNT / 2)) continue; // Skip center (already drawn)
      const lx = this.roadLeft + laneW * i;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, ch);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.setLineDash([]);

    // Ambient side details (buildings/trees)
    this.drawSideDetails(ctx, ch);
  }

  drawSideDetails(ctx, ch) {
    // Left side dark buildings
    ctx.fillStyle = '#0f172a';
    const blockH = 60;
    for (let y = -this.lineOffset % blockH; y < ch; y += blockH) {
      const w = 10 + Math.sin(y * 0.1) * 8;
      ctx.fillRect(this.roadLeft - 6 - w, y, w, blockH - 5);
    }
    // Right side
    for (let y = -(this.lineOffset + 30) % blockH; y < ch; y += blockH) {
      const w = 10 + Math.cos(y * 0.1) * 8;
      ctx.fillRect(this.roadRight + 6, y, w, blockH - 5);
    }
  }
}
