// Road Shooter - Single Character Entity (Enhanced Visuals)
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
    this.muzzleFlash = 0;
  }

  get config() { return CONFIG.CHAR_TYPES[this.type]; }

  update(dt) {
    if (this.dying) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.active = false;
      return;
    }
    this.x += (this.targetX - this.x) * 0.15;
    this.y += (this.targetY - this.y) * 0.15;
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt;
  }

  canFire() {
    return !this.dying && this.fireTimer <= 0;
  }

  fire() {
    this.fireTimer = 1 / this.config.fireRate;
    this.muzzleFlash = 0.08;
  }

  takeDamage(dmg) {
    if (this.dying) return false;
    this.hp -= dmg;
    this.flashTimer = 0.2;
    if (this.hp <= 0) {
      this.dying = true;
      this.deathTimer = 0.2;
      return true;
    }
    return false;
  }

  draw(ctx, scale = 1) {
    if (!this.active) return;
    const cfg = this.config;
    const s = cfg.size * scale;
    const alpha = this.dying ? this.deathTimer / 0.2 : 1;

    ctx.globalAlpha = alpha;

    const isFlash = this.flashTimer > 0;
    const baseColor = isFlash ? '#ffffff' : cfg.color;

    switch (this.type) {
      case 'rifleman':
        this.drawRifleman(ctx, s, baseColor);
        break;
      case 'tanker':
        this.drawTanker(ctx, s, baseColor);
        break;
      case 'sniper':
        this.drawSniper(ctx, s, baseColor);
        break;
      case 'bomber':
        this.drawBomber(ctx, s, baseColor);
        break;
    }

    // Muzzle flash effect
    if (this.muzzleFlash > 0 && !this.dying) {
      const flashAlpha = this.muzzleFlash / 0.08;
      ctx.globalAlpha = flashAlpha * alpha;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(this.x, this.y - s * 2, s * 0.6 * flashAlpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x, this.y - s * 2, s * 0.3 * flashAlpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  drawRifleman(ctx, s, color) {
    // Body (rounded)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
    ctx.fill();

    if (!this.dying) {
      // Helmet (darker band on top)
      ctx.fillStyle = this.flashTimer > 0 ? '#ddd' : '#0d9568';
      ctx.beginPath();
      ctx.arc(this.x, this.y - s * 0.3, s * 0.85, -Math.PI, 0);
      ctx.fill();

      // Gun barrel (pointing up)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(this.x - 0.8, this.y - s * 1.8, 1.6, s * 1.2);

      // Eye slit
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.x - s * 0.35, this.y - s * 0.1, s * 0.7, 1.2);
    }
  }

  drawTanker(ctx, s, color) {
    // Larger body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
    ctx.fill();

    if (!this.dying) {
      // Shield plate (front arc)
      ctx.strokeStyle = this.flashTimer > 0 ? '#fff' : '#60a5fa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, s + 2, -Math.PI * 0.7, -Math.PI * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.x, this.y, s + 2, Math.PI * 0.3, Math.PI * 0.7);
      ctx.stroke();

      // Shield bar (HP indicator)
      const barW = s * 1.6;
      const pct = this.hp / this.maxHp;
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(this.x - barW / 2, this.y - s - 3, barW, 2);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(this.x - barW / 2, this.y - s - 3, barW * pct, 2);

      // Cross emblem
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.x - 0.8, this.y - s * 0.4, 1.6, s * 0.8);
      ctx.fillRect(this.x - s * 0.4, this.y - 0.8, s * 0.8, 1.6);
    }
  }

  drawSniper(ctx, s, color) {
    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
    ctx.fill();

    if (!this.dying) {
      // Long rifle barrel
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(this.x - 0.5, this.y - s * 3, 1, s * 2.5);
      // Scope
      ctx.fillStyle = '#c4b5fd';
      ctx.beginPath();
      ctx.arc(this.x, this.y - s * 2.5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Hood (triangle top)
      ctx.fillStyle = this.flashTimer > 0 ? '#ddd' : '#6d28d9';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - s * 1.3);
      ctx.lineTo(this.x - s * 0.6, this.y - s * 0.3);
      ctx.lineTo(this.x + s * 0.6, this.y - s * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawBomber(ctx, s, color) {
    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
    ctx.fill();

    if (!this.dying) {
      // Bomb pack on back
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.arc(this.x, this.y + s * 0.5, s * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Fuse/launcher pointing up
      ctx.fillStyle = '#666';
      ctx.fillRect(this.x - 1.5, this.y - s * 1.5, 3, s);
      // Blast nozzle
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(this.x, this.y - s * 1.5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Warning stripe
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, s * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
