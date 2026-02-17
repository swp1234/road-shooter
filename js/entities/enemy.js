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

    // Type-specific state
    this.fuseTimer = 3; // detonator countdown
    this.fuseStarted = false;
    this.stealTarget = null; // thief target item
    this.flankerSide = Math.random() < 0.5 ? -1 : 1; // flanker entry side
    this.mortarChargeTimer = 0;
    this.mortarTarget = { x: 0, y: 0 };
    this.mortarWarning = false;
  }

  update(dt, squadX, squadY) {
    if (this.dying) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.active = false;
      return;
    }

    if (this.flashTimer > 0) this.flashTimer -= dt;

    switch (this.type) {
      case 'rusher': {
        const dx = squadX - this.x;
        const dy = squadY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          this.x += (dx / dist) * this.speed;
          this.y += (dy / dist) * this.speed;
        }
        this.angle = Math.atan2(dy, dx);
        break;
      }
      case 'shooter':
        this.y += this.speed * 0.5;
        if (this.fireTimer > 0) this.fireTimer -= dt;
        if (squadX > this.x + 5) this.x += 0.5;
        else if (squadX < this.x - 5) this.x -= 0.5;
        break;
      case 'mortar':
        // Stays near top, charges and fires at predicted position
        if (this.y < 80) this.y += this.speed;
        else {
          if (squadX > this.x + 10) this.x += 0.3;
          else if (squadX < this.x - 10) this.x -= 0.3;
        }
        if (this.fireTimer > 0) this.fireTimer -= dt;
        if (this.mortarChargeTimer > 0) {
          this.mortarChargeTimer -= dt;
          if (this.mortarChargeTimer <= 0) this.mortarWarning = false;
        }
        break;
      case 'detonator': {
        // Rush toward squad, explode on proximity or after fuse
        const ddx = squadX - this.x;
        const ddy = squadY - this.y;
        const ddist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (ddist > 0) {
          this.x += (ddx / ddist) * this.speed;
          this.y += (ddy / ddist) * this.speed;
        }
        this.angle = Math.atan2(ddy, ddx);
        if (ddist < 40 && !this.fuseStarted) this.fuseStarted = true;
        if (this.fuseStarted) {
          this.fuseTimer -= dt;
          if (this.fuseTimer <= 0) {
            this.explode = true; // Flag checked by combat system
            this.dying = true;
            this.deathTimer = 0.3;
          }
        }
        break;
      }
      case 'thief':
        // Runs toward nearest item, steals it. If no item, flee downward
        if (this.stealTarget && this.stealTarget.active && !this.stealTarget.collected) {
          const tdx = this.stealTarget.x - this.x;
          const tdy = this.stealTarget.y - this.y;
          const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
          if (tdist > 5) {
            this.x += (tdx / tdist) * this.speed;
            this.y += (tdy / tdist) * this.speed;
          } else {
            this.stealTarget.active = false; // Steal the item!
            this.stealTarget = null;
          }
          this.angle = Math.atan2(tdy, tdx);
        } else {
          this.y += this.speed; // Flee down
          this.stealTarget = null;
        }
        break;
      case 'flanker':
        // Enter from side, move horizontally across
        if (this.y < 100) this.y += this.speed * 0.8;
        this.x += this.flankerSide * this.speed * 0.7;
        // Bounce off road edges
        const roadL = (CONFIG.CANVAS_WIDTH - CONFIG.CANVAS_WIDTH * CONFIG.ROAD_WIDTH_RATIO) / 2;
        const roadR = roadL + CONFIG.CANVAS_WIDTH * CONFIG.ROAD_WIDTH_RATIO;
        if (this.x < roadL + 10 || this.x > roadR - 10) this.flankerSide *= -1;
        if (this.fireTimer > 0) this.fireTimer -= dt;
        break;
    }

    // Off screen removal
    if (this.y > CONFIG.CANVAS_HEIGHT + 50) this.active = false;
  }

  canFire() {
    if (this.dying || this.fireTimer > 0) return false;
    return this.type === 'shooter' || this.type === 'mortar' || this.type === 'flanker';
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
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size);
        ctx.lineTo(this.x + this.size * 0.7, this.y);
        ctx.lineTo(this.x, this.y + this.size);
        ctx.lineTo(this.x - this.size * 0.7, this.y);
        ctx.closePath();
        ctx.fill();
        break;
      default:
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Detonator fuse indicator
    if (this.type === 'detonator' && this.fuseStarted && !this.dying) {
      const flash = Math.sin(Date.now() / 80) > 0;
      ctx.fillStyle = flash ? '#ff0' : '#f00';
      ctx.beginPath();
      ctx.arc(this.x, this.y - this.size - 4, 3, 0, Math.PI * 2);
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
