// Road Shooter - Squad Management
class Squad {
  constructor(startSize = 1) {
    this.members = [];
    this.x = CONFIG.CANVAS_WIDTH / 2;
    this.y = CONFIG.CANVAS_HEIGHT * 0.75;
    this.targetX = this.x;
    this.maxSize = 0;

    // Add initial members
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
    // Move squad center
    this.x += (this.targetX - this.x) * 0.12;

    // Update formation positions
    this.updateFormation();

    // Update all members
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

    // Sort: tankers front, snipers back
    alive.sort((a, b) => {
      const order = { tanker: 0, bomber: 1, rifleman: 2, sniper: 3 };
      return (order[a.type] || 2) - (order[b.type] || 2);
    });

    // Calculate formation based on squad size
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

  // Get frontline characters for enemy collision
  getFrontline() {
    const alive = this.alive;
    if (alive.length === 0) return [];
    const minY = Math.min(...alive.map(a => a.y));
    return alive.filter(a => a.y < minY + 15);
  }

  // Get characters that can fire
  getFirers() {
    return this.alive.filter(c => c.canFire());
  }

  draw(ctx) {
    // Draw count above squad
    const alive = this.alive;
    if (alive.length === 0) return;

    // Draw characters
    const scale = alive.length > 100 ? 0.6 : alive.length > 50 ? 0.8 : 1;
    for (const char of alive) {
      char.draw(ctx, scale);
    }

    // Squad size indicator
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Outfit';
    ctx.textAlign = 'center';
    const topY = Math.min(...alive.map(a => a.y));
    ctx.fillText(alive.length.toString(), this.x, topY - 15);
  }
}
