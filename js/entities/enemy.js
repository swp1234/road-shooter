// Road Shooter - Enemy Types
class Enemy {
  constructor(x, y, type = 'rusher', stageMul = 1) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    const cfg = CONFIG.ENEMIES[type];
    this.hp = Math.ceil(cfg.hp * stageMul);
    this.maxHp = this.hp;
    this.speed = cfg.speed;
    this.dmg = cfg.dmg;
    this.color = cfg.color;
    this.size = cfg.size;
    this.shape = cfg.shape;
    this.reward = cfg.reward;
    this.fireRate = cfg.fireRate || 0;
    this.fireTimer = 0;
    this.flashTimer = 0;
    this.dying = false;
    this.deathTimer = 0;
    this.targetX = x;
    this.angle = 0;
  }

  update(dt, squadX, squadY) {
    if (this.dying) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.active = false;
      return;
    }

    if (this.flashTimer > 0) this.flashTimer -= dt;

    switch (this.type) {
      case 'rusher':
        // Move toward squad, targeting outer members
        const dx = squadX - this.x;
        const dy = squadY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          this.x += (dx / dist) * this.speed;
          this.y += (dy / dist) * this.speed;
        }
        this.angle = Math.atan2(dy, dx);
        break;
      case 'shooter':
        // Move down slowly, fire at squad
        this.y += this.speed * 0.5;
        if (this.fireTimer > 0) this.fireTimer -= dt;
        // Slight tracking
        if (squadX > this.x + 5) this.x += 0.5;
        else if (squadX < this.x - 5) this.x -= 0.5;
        break;
    }

    // Off screen removal
    if (this.y > CONFIG.CANVAS_HEIGHT + 50) this.active = false;
  }

  canFire() {
    return this.type === 'shooter' && !this.dying && this.fireTimer <= 0;
  }

  fire() {
    this.fireTimer = 1 / this.fireRate;
  }

  takeDamage(dmg) {
    if (this.dying) return false;
    this.hp -= dmg;
    this.flashTimer = 0.1;
    if (this.hp <= 0) {
      this.dying = true;
      this.deathTimer = 0.2;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (!this.active) return;
    const alpha = this.dying ? this.deathTimer / 0.2 : 1;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.flashTimer > 0 ? '#fff' : this.color;

    switch (this.shape) {
      case 'triangle':
        ctx.beginPath();
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        ctx.moveTo(0, -this.size);
        ctx.lineTo(-this.size * 0.7, this.size * 0.7);
        ctx.lineTo(this.size * 0.7, this.size * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      case 'rect':
        ctx.fillRect(this.x - this.size * 0.7, this.y - this.size * 0.7,
                     this.size * 1.4, this.size * 1.4);
        // Gun barrel
        if (!this.dying) {
          ctx.fillStyle = '#666';
          ctx.fillRect(this.x - 1.5, this.y + this.size * 0.7, 3, this.size * 0.5);
        }
        break;
      default:
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // HP bar for enemies with more than 1 HP
    if (this.maxHp > 1 && !this.dying) {
      const barW = this.size * 2;
      const barH = 3;
      const bx = this.x - barW / 2;
      const by = this.y - this.size - 6;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx, by, barW * (this.hp / this.maxHp), barH);
    }

    ctx.globalAlpha = 1;
  }
}
