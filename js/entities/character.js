// Road Shooter - Single Character Entity
class Character {
  constructor(x, y, type = 'rifleman') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.hp = CONFIG.CHAR_TYPES[type].hp;
    this.maxHp = this.hp;
    this.fireTimer = 0;
    this.deathTimer = 0;
    this.dying = false;
    this.targetX = x;
    this.targetY = y;
    this.flashTimer = 0;
  }

  get config() { return CONFIG.CHAR_TYPES[this.type]; }

  update(dt) {
    if (this.dying) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.active = false;
      return;
    }
    // Smooth movement to target position
    this.x += (this.targetX - this.x) * 0.15;
    this.y += (this.targetY - this.y) * 0.15;
    // Fire timer
    if (this.fireTimer > 0) this.fireTimer -= dt;
    // Flash fade
    if (this.flashTimer > 0) this.flashTimer -= dt;
  }

  canFire() {
    return !this.dying && this.fireTimer <= 0;
  }

  fire() {
    this.fireTimer = 1 / this.config.fireRate;
  }

  takeDamage(dmg) {
    if (this.dying) return false;
    this.hp -= dmg;
    this.flashTimer = 0.2;
    if (this.hp <= 0) {
      this.dying = true;
      this.deathTimer = 0.2;
      return true; // died
    }
    return false;
  }

  draw(ctx, scale = 1) {
    if (!this.active) return;
    const cfg = this.config;
    const s = cfg.size * scale;
    const alpha = this.dying ? this.deathTimer / 0.2 : 1;

    ctx.globalAlpha = alpha;

    // Flash effect on damage
    if (this.flashTimer > 0) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = cfg.color;
    }

    switch (this.type) {
      case 'rifleman':
        // Green circle + gray gun
        ctx.beginPath();
        ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
        ctx.fill();
        if (!this.dying) {
          ctx.fillStyle = '#666';
          ctx.fillRect(this.x + s * 0.5, this.y - 1, s * 1.5, 2);
        }
        break;
      case 'tanker':
        // Blue larger circle + shield
        ctx.beginPath();
        ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(this.x - s * 0.7, this.y - s - 2, s * 1.4, 3);
        break;
      case 'sniper':
        // Purple triangle + long barrel
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - s);
        ctx.lineTo(this.x - s, this.y + s);
        ctx.lineTo(this.x + s, this.y + s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x - 0.5, this.y - s - s, 1, s);
        break;
      case 'bomber':
        // Orange circle + bomb circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x, this.y - s - 2, s * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.globalAlpha = 1;
  }
}
