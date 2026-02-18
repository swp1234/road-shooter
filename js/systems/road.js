// Road Shooter - 3D Perspective Road System
class Road {
  constructor() {
    this.scrollY = 0;
    this.speed = CONFIG.SCROLL_SPEED;

    const cw = CONFIG.CANVAS_WIDTH;
    const ch = CONFIG.CANVAS_HEIGHT;

    // Perspective geometry
    this.horizonY = ch * CONFIG.HORIZON_RATIO;
    this.centerX = cw / 2;
    this.roadWidthBottom = cw * CONFIG.ROAD_WIDTH_RATIO;
    this.roadWidthTop = this.roadWidthBottom * CONFIG.ROAD_TOP_RATIO;

    // Flat game-logic road bounds (unchanged for collision)
    this.roadLeft = (cw - this.roadWidthBottom) / 2;
    this.roadRight = this.roadLeft + this.roadWidthBottom;
    this.roadWidth = this.roadWidthBottom;

    // Scroll animation
    this.stripeOffset = 0;

    // Scrolling scenery (buildings on sides)
    this.sceneryL = [];
    this.sceneryR = [];
    for (let i = 0; i < 14; i++) {
      this.sceneryL.push(this._makeBuilding(i / 14));
      this.sceneryR.push(this._makeBuilding((i + 0.5) / 14));
    }
  }

  _makeBuilding(startDepth) {
    return {
      depth: startDepth,
      height: 25 + Math.random() * 65,
      width: 10 + Math.random() * 22,
      hue: 215 + Math.random() * 25,
      lightness: 5 + Math.random() * 7,
      hasWindows: Math.random() < 0.45
    };
  }

  // Perspective depth: 0 at horizon, 1 at bottom
  getDepth(y) {
    return Math.max(0, Math.min(1, (y - this.horizonY) / (CONFIG.CANVAS_HEIGHT - this.horizonY)));
  }

  // Visual road width at screen y
  getRoadWidth(y) {
    const t = this.getDepth(y);
    return this.roadWidthTop + (this.roadWidthBottom - this.roadWidthTop) * t;
  }

  // Visual road edges at screen y
  getVisualEdges(y) {
    const w = this.getRoadWidth(y);
    return { left: this.centerX - w / 2, right: this.centerX + w / 2, width: w };
  }

  // Get draw scale for entity at y (0.2 at horizon → 1.0 at bottom)
  getScale(y) {
    return 0.2 + this.getDepth(y) * 0.8;
  }

  // Project flat game-space X to visual perspective X
  projectX(gameX, y) {
    const t = (gameX - this.roadLeft) / this.roadWidth;
    const edges = this.getVisualEdges(y);
    return edges.left + t * edges.width;
  }

  // Inverse: visual/screen X → game-space X at given Y
  unprojectX(visualX, y) {
    const edges = this.getVisualEdges(y);
    if (edges.width < 1) return this.centerX;
    const t = (visualX - edges.left) / edges.width;
    return this.roadLeft + t * this.roadWidth;
  }

  // Random X in flat game-space road (for spawning)
  getRandomX(margin = 30) {
    return this.roadLeft + margin + Math.random() * (this.roadWidth - margin * 2);
  }

  update() {
    this.scrollY += this.speed;
    this.stripeOffset = (this.stripeOffset + this.speed * 0.012) % 1;

    const delta = this.speed * 0.0025;
    for (const s of this.sceneryL) s.depth = (s.depth + delta) % 1;
    for (const s of this.sceneryR) s.depth = (s.depth + delta * 1.05) % 1;
  }

  draw(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;
    const ch = CONFIG.CANVAS_HEIGHT;

    this.drawSky(ctx, cw, ch);
    this.drawScenery(ctx, cw, ch);
    this.drawRoadSurface(ctx, cw, ch);
    this.drawEdgeGlow(ctx, ch);
    this.drawLaneLines(ctx, ch);
    this.drawScrollStripes(ctx, ch);
  }

  drawSky(ctx, cw, ch) {
    // Dark space → horizon glow
    const grad = ctx.createLinearGradient(0, 0, 0, this.horizonY + 40);
    grad.addColorStop(0, '#020208');
    grad.addColorStop(0.65, '#060618');
    grad.addColorStop(1, '#100828');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, this.horizonY + 40);

    // Horizon radial glow
    const hg = ctx.createRadialGradient(cw / 2, this.horizonY, 0, cw / 2, this.horizonY, cw * 0.55);
    hg.addColorStop(0, 'rgba(0,229,255,0.07)');
    hg.addColorStop(0.4, 'rgba(80,40,180,0.03)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, cw, this.horizonY + 60);

    // Ground plane
    const gg = ctx.createLinearGradient(0, this.horizonY, 0, ch);
    gg.addColorStop(0, '#08081a');
    gg.addColorStop(0.4, '#0a0a1e');
    gg.addColorStop(1, '#0e0e24');
    ctx.fillStyle = gg;
    ctx.fillRect(0, this.horizonY, cw, ch - this.horizonY);
  }

  drawRoadSurface(ctx, cw, ch) {
    const steps = 50;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const y0 = this.horizonY + (ch - this.horizonY) * t0;
      const y1 = this.horizonY + (ch - this.horizonY) * t1;
      const e0 = this.getVisualEdges(y0);
      const e1 = this.getVisualEdges(y1);

      const b = 14 + t0 * 18;
      ctx.fillStyle = `rgb(${b|0},${(b + 1)|0},${(b + 7)|0})`;
      ctx.beginPath();
      ctx.moveTo(e0.left, y0);
      ctx.lineTo(e0.right, y0);
      ctx.lineTo(e1.right, y1);
      ctx.lineTo(e1.left, y1);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawEdgeGlow(ctx, ch) {
    const te = this.getVisualEdges(this.horizonY);
    const be = this.getVisualEdges(ch);

    // Neon edge lines
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(0,229,255,0.5)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(te.left, this.horizonY);
    ctx.lineTo(be.left, ch);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(te.right, this.horizonY);
    ctx.lineTo(be.right, ch);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Solid edge markers
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(te.left - 1, this.horizonY);
    ctx.lineTo(be.left - 1, ch);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(te.right + 1, this.horizonY);
    ctx.lineTo(be.right + 1, ch);
    ctx.stroke();
  }

  drawLaneLines(ctx, ch) {
    const lanes = CONFIG.LANE_COUNT;
    const segs = 25;
    ctx.lineWidth = 1;

    for (let lane = 1; lane < lanes; lane++) {
      const ratio = lane / lanes;
      ctx.strokeStyle = lane === Math.floor(lanes / 2) ? 'rgba(100,116,139,0.3)' : 'rgba(100,116,139,0.15)';
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = -(this.scrollY * 0.5);
      ctx.beginPath();

      for (let i = 0; i <= segs; i++) {
        const y = this.horizonY + (ch - this.horizonY) * (i / segs);
        const e = this.getVisualEdges(y);
        const x = e.left + e.width * ratio;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  drawScrollStripes(ctx, ch) {
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;

    const count = 18;
    for (let i = 0; i < count; i++) {
      let raw = ((i / count) + this.stripeOffset) % 1;
      const t = raw * raw; // bunch near horizon
      const y = this.horizonY + (ch - this.horizonY) * t;
      const e = this.getVisualEdges(y);

      ctx.beginPath();
      ctx.moveTo(e.left + 3, y);
      ctx.lineTo(e.right - 3, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawScenery(ctx, cw, ch) {
    const drawSide = (list, side) => {
      for (const s of list) {
        const t = s.depth * s.depth;
        const y = this.horizonY + (ch - this.horizonY) * t;
        const scale = 0.12 + t * 0.88;
        const e = this.getVisualEdges(y);
        const w = s.width * scale;
        const h = s.height * scale;

        if (h < 2) continue;

        const x = side < 0 ? e.left - w - 2 : e.right + 2;

        ctx.fillStyle = `hsl(${s.hue}, 20%, ${s.lightness}%)`;
        ctx.fillRect(x, y - h, w, h);

        if (s.hasWindows && scale > 0.3) {
          const ws = Math.max(1.5, 2.5 * scale);
          const cols = Math.max(1, Math.floor(w / (ws * 3)));
          const rows = Math.max(1, Math.floor(h / (ws * 4)));
          for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
              if (Math.random() < 0.65) continue;
              ctx.fillStyle = Math.random() < 0.3 ? 'rgba(251,191,36,0.35)' : 'rgba(100,200,255,0.15)';
              ctx.fillRect(x + 2 * scale + c * ws * 3, y - h + 2 * scale + r * ws * 4, ws, ws * 1.2);
            }
          }
        }
      }
    };
    drawSide(this.sceneryL, -1);
    drawSide(this.sceneryR, 1);
  }
}
