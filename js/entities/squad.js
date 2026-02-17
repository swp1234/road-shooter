// Road Shooter - Squad Management (Enhanced Visuals)
class Squad {
  constructor(startSize = 1) {
    this.members = [];
    this.x = CONFIG.CANVAS_WIDTH / 2;
    this.y = CONFIG.CANVAS_HEIGHT * 0.85;
    this.targetX = this.x;
    this.maxSize = 0;
    this.shieldPulse = 0;

    for (let i = 0; i < startSize; i++) {
      this.addMember('rifleman');
    }
  }

  get size() { return this.members.filter(m => !m.dying).length; }
  get alive() { return this.members.filter(m => m.active && !m.dying); }

  addMember(type = 'rifleman', count = 1) {
    for (let i = 0; i < count; i++) {
      if (this.members.filter(m => m.active).length >= CONFIG.HARD_CAP) break;
      const char = new Character(this.x, this.y, type);
      this.members.push(char);
    }
    this.maxSize = Math.max(this.maxSize, this.size);
    this.updateFormation();
  }

  addByPercent(pct) {
    const count = Math.max(2, Math.round(this.size * pct));
    this.addMember('rifleman', Math.min(count, 15));
  }

  removeMember(count = 1) {
    const alive = this.alive;
    for (let i = 0; i < count && i < alive.length; i++) {
      alive[alive.length - 1 - i].takeDamage(999);
    }
  }

  multiplyMembers(factor) {
    const current = this.size;
    const target = Math.floor(current * factor);
    const toAdd = target - current;
    if (toAdd > 0) this.addMember('rifleman', toAdd);
  }

  applyGateEffect(option) {
    switch (option.op) {
      case 'add':
        this.addMember('rifleman', option.value);
        break;
      case 'multiply':
        this.multiplyMembers(option.value);
        break;
      case 'gamble':
        if (Math.random() < 0.5) {
          this.multiplyMembers(option.value);
        } else {
          const current = this.size;
          this.removeMember(Math.floor(current / 2));
        }
        break;
    }
  }

  moveTo(x) {
    const cw = CONFIG.CANVAS_WIDTH;
    const roadW = cw * CONFIG.ROAD_WIDTH_RATIO;
    const roadL = (cw - roadW) / 2;
    const roadR = roadL + roadW;
    this.targetX = Math.max(roadL + 20, Math.min(roadR - 20, x));
  }

  update(dt) {
    this.x += (this.targetX - this.x) * 0.12;
    this.shieldPulse += dt * 2;
    this.updateFormation();

    for (let i = this.members.length - 1; i >= 0; i--) {
      this.members[i].update(dt);
      if (!this.members[i].active) {
        this.members.splice(i, 1);
      }
    }
  }

  updateFormation() {
    const alive = this.alive;
    const count = alive.length;
    if (count === 0) return;

    alive.sort((a, b) => {
      const order = { tanker: 0, bomber: 1, rifleman: 2, sniper: 3 };
      return (order[a.type] || 2) - (order[b.type] || 2);
    });

    const spacing = count > 50 ? 6 : count > 20 ? 8 : 10;
    const cols = Math.min(count, Math.ceil(Math.sqrt(count * 1.5)));
    const rows = Math.ceil(count / cols);

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const colsInRow = (row === rows - 1) ? (count % cols || cols) : cols;
      const offsetX = (col - (colsInRow - 1) / 2) * spacing;
      const offsetY = (row - (rows - 1) / 2) * spacing;
      alive[i].targetX = this.x + offsetX;
      alive[i].targetY = this.y + offsetY;
    }
  }

  getFrontline() {
    const alive = this.alive;
    if (alive.length === 0) return [];
    const minY = Math.min(...alive.map(a => a.y));
    return alive.filter(a => a.y < minY + 15);
  }

  getFirers() {
    return this.alive.filter(c => c.canFire());
  }

  getRank(count) {
    if (count >= 100) return { name: 'REGIMENT', color: '#fbbf24' };
    if (count >= 60)  return { name: 'BATTALION', color: '#f97316' };
    if (count >= 30)  return { name: 'COMPANY', color: '#a78bfa' };
    if (count >= 12)  return { name: 'PLATOON', color: '#3b82f6' };
    if (count >= 5)   return { name: 'SQUAD', color: '#10b981' };
    return { name: '', color: '#94a3b8' };
  }

  draw(ctx) {
    const alive = this.alive;
    if (alive.length === 0) return;

    const count = alive.length;
    const scale = count > 100 ? 0.6 : count > 50 ? 0.8 : 1;

    // Formation boundary glow (subtle ring around squad)
    const topY = Math.min(...alive.map(a => a.y));
    const botY = Math.max(...alive.map(a => a.y));
    const leftX = Math.min(...alive.map(a => a.x));
    const rightX = Math.max(...alive.map(a => a.x));
    const centerY = (topY + botY) / 2;
    const radiusX = (rightX - leftX) / 2 + 12;
    const radiusY = (botY - topY) / 2 + 12;

    // Shield ring (pulses gently)
    const shieldAlpha = 0.08 + Math.sin(this.shieldPulse) * 0.04;
    ctx.strokeStyle = `rgba(0,229,255,${shieldAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(this.x, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Ground shadow under formation
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(this.x, botY + 4, radiusX * 0.8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw all characters
    for (const char of alive) {
      char.draw(ctx, scale);
    }

    // Squad count + rank with background pill
    const rank = this.getRank(count);
    const countStr = count.toString();
    const rankStr = rank.name;
    const label = rankStr ? `${rankStr} ${countStr}` : countStr;
    ctx.font = 'bold 12px Outfit';
    const tw = ctx.measureText(label).width;
    const pillW = tw + 14;
    const pillH = 18;
    const pillX = this.x - pillW / 2;
    const pillY = topY - 24;

    // Pill background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(pillX + pillH / 2, pillY + pillH / 2, pillH / 2, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(pillX + pillW - pillH / 2, pillY + pillH / 2, pillH / 2, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();

    // Pill border (rank color)
    ctx.strokeStyle = rank.name ? rank.color : 'rgba(0,229,255,0.3)';
    ctx.lineWidth = rank.name ? 1 : 0.5;
    ctx.beginPath();
    ctx.arc(pillX + pillH / 2, pillY + pillH / 2, pillH / 2, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(pillX + pillW - pillH / 2, pillY + pillH / 2, pillH / 2, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.stroke();

    // Label text
    ctx.fillStyle = rank.name ? rank.color : '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(label, this.x, pillY + 13);
  }
}
