// Road Shooter - Road Generation & Scrolling (Enhanced Visuals)
class Road {
  constructor() {
    this.scrollY = 0;
    this.speed = CONFIG.SCROLL_SPEED;
    this.tileHeight = 40;
    this.lineOffset = 0;

    // Road bounds
    const cw = CONFIG.CANVAS_WIDTH;
    const roadW = cw * CONFIG.ROAD_WIDTH_RATIO;
    this.roadLeft = (cw - roadW) / 2;
    this.roadRight = this.roadLeft + roadW;
    this.roadWidth = roadW;
    this.centerX = cw / 2;

    // Scenery (pre-generated buildings)
    this.buildingsL = [];
    this.buildingsR = [];
    for (let i = 0; i < 20; i++) {
      this.buildingsL.push({
        h: 30 + Math.random() * 80,
        w: 15 + Math.random() * 25,
        windows: Math.floor(Math.random() * 4) + 1,
        lit: Math.random() < 0.3
      });
      this.buildingsR.push({
        h: 30 + Math.random() * 80,
        w: 15 + Math.random() * 25,
        windows: Math.floor(Math.random() * 4) + 1,
        lit: Math.random() < 0.3
      });
    }
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

    // Sky/Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
    bgGrad.addColorStop(0, '#080818');
    bgGrad.addColorStop(0.5, '#0a0a1f');
    bgGrad.addColorStop(1, '#0d0d25');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Buildings (behind road)
    this.drawBuildings(ctx, ch);

    // Road surface with subtle gradient
    const roadGrad = ctx.createLinearGradient(this.roadLeft, 0, this.roadRight, 0);
    roadGrad.addColorStop(0, '#161b2e');
    roadGrad.addColorStop(0.15, '#1a2035');
    roadGrad.addColorStop(0.5, '#1e263d');
    roadGrad.addColorStop(0.85, '#1a2035');
    roadGrad.addColorStop(1, '#161b2e');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(this.roadLeft, 0, this.roadWidth, ch);

    // Road edge glow lines
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(0,229,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.roadLeft, 0);
    ctx.lineTo(this.roadLeft, ch);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.roadRight, 0);
    ctx.lineTo(this.roadRight, ch);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Solid road edge markers
    ctx.fillStyle = '#334155';
    ctx.fillRect(this.roadLeft - 2, 0, 2, ch);
    ctx.fillRect(this.roadRight, 0, 2, ch);

    // Lane dashed lines
    ctx.strokeStyle = 'rgba(100,116,139,0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([18, 24]);
    ctx.lineDashOffset = -this.lineOffset;

    const laneW = this.roadWidth / CONFIG.LANE_COUNT;
    for (let i = 1; i < CONFIG.LANE_COUNT; i++) {
      const lx = this.roadLeft + laneW * i;
      const alpha = i === Math.floor(CONFIG.LANE_COUNT / 2) ? 0.5 : 0.25;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, ch);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    // Ground markers (moving chevrons)
    this.drawGroundMarkers(ctx, ch);
  }

  drawGroundMarkers(ctx, ch) {
    // Subtle moving road markings
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    const spacing = 120;
    for (let y = -this.lineOffset % spacing; y < ch + spacing; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(this.roadLeft + 20, y);
      ctx.lineTo(this.centerX, y - 15);
      ctx.lineTo(this.roadRight - 20, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawBuildings(ctx, ch) {
    const blockH = 55;
    const baseOff = this.lineOffset * 0.3;

    // Left side
    for (let i = 0; i < this.buildingsL.length; i++) {
      const b = this.buildingsL[i];
      const by = (i * blockH - baseOff % (blockH * this.buildingsL.length / 2) + ch * 2) % (ch + b.h) - b.h;
      const bx = this.roadLeft - 4 - b.w;

      // Building body
      ctx.fillStyle = '#0c1021';
      ctx.fillRect(bx, by, b.w, b.h);
      ctx.strokeStyle = '#1a1f35';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, by, b.w, b.h);

      // Windows
      if (!b.lit) continue;
      const winW = 3;
      const winH = 4;
      const cols = Math.min(b.windows, Math.floor(b.w / 7));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < Math.floor(b.h / 12); r++) {
          if (Math.random() < 0.6) continue;
          const wx = bx + 3 + c * 7;
          const wy = by + 4 + r * 12;
          ctx.fillStyle = Math.random() < 0.3 ? 'rgba(251,191,36,0.4)' : 'rgba(100,200,255,0.2)';
          ctx.fillRect(wx, wy, winW, winH);
        }
      }
    }

    // Right side
    for (let i = 0; i < this.buildingsR.length; i++) {
      const b = this.buildingsR[i];
      const by = (i * blockH - (baseOff + 25) % (blockH * this.buildingsR.length / 2) + ch * 2) % (ch + b.h) - b.h;
      const bx = this.roadRight + 4;

      ctx.fillStyle = '#0c1021';
      ctx.fillRect(bx, by, b.w, b.h);
      ctx.strokeStyle = '#1a1f35';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, by, b.w, b.h);

      if (!b.lit) continue;
      const winW = 3;
      const winH = 4;
      const cols = Math.min(b.windows, Math.floor(b.w / 7));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < Math.floor(b.h / 12); r++) {
          if (Math.random() < 0.6) continue;
          const wx = bx + 3 + c * 7;
          const wy = by + 4 + r * 12;
          ctx.fillStyle = Math.random() < 0.3 ? 'rgba(251,191,36,0.4)' : 'rgba(100,200,255,0.2)';
          ctx.fillRect(wx, wy, winW, winH);
        }
      }
    }
  }
}
