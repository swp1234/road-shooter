// Road Shooter - Single Character Entity (Detailed Military Sprites)
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
    const x = this.x;
    const y = this.y;
    const flash = this.flashTimer > 0;

    // Legs (two rectangles, slightly apart)
    ctx.fillStyle = flash ? '#ccc' : '#2a2a2a';
    ctx.fillRect(x - s * 0.35, y + s * 0.3, s * 0.25, s * 0.6);
    ctx.fillRect(x + s * 0.1, y + s * 0.3, s * 0.25, s * 0.6);

    // Body torso (rounded rect)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y - s * 0.1);
    ctx.lineTo(x - s * 0.5, y + s * 0.4);
    ctx.lineTo(x + s * 0.5, y + s * 0.4);
    ctx.lineTo(x + s * 0.5, y - s * 0.1);
    ctx.arc(x, y - s * 0.1, s * 0.5, 0, -Math.PI, true);
    ctx.fill();

    // Body armor vest (lighter green)
    ctx.fillStyle = flash ? '#eee' : '#2d7a4a';
    ctx.fillRect(x - s * 0.35, y - s * 0.05, s * 0.7, s * 0.35);

    // Belt
    ctx.fillStyle = flash ? '#bbb' : '#1a3a28';
    ctx.fillRect(x - s * 0.45, y + s * 0.25, s * 0.9, s * 0.08);

    // Arms (shoulders extending out)
    ctx.fillStyle = color;
    ctx.fillRect(x - s * 0.7, y - s * 0.05, s * 0.22, s * 0.3);
    ctx.fillRect(x + s * 0.48, y - s * 0.05, s * 0.22, s * 0.3);

    // Rifle (diagonal across body, barrel pointing up)
    if (!this.dying) {
      ctx.fillStyle = flash ? '#aaa' : '#5c5c5c';
      ctx.save();
      ctx.translate(x + s * 0.15, y);
      ctx.rotate(-0.2);
      ctx.fillRect(-s * 0.08, -s * 1.8, s * 0.16, s * 1.6);
      // Barrel tip
      ctx.fillStyle = flash ? '#999' : '#444';
      ctx.fillRect(-s * 0.06, -s * 2.0, s * 0.12, s * 0.25);
      ctx.restore();
    }

    // Head circle
    ctx.fillStyle = flash ? '#eee' : '#d4a574';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.55, s * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Helmet (half-circle on top, darker green)
    ctx.fillStyle = flash ? '#ddd' : '#1a5c2e';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, s * 0.42, -Math.PI, 0);
    ctx.fill();
    // Helmet brim
    ctx.fillRect(x - s * 0.46, y - s * 0.62, s * 0.92, s * 0.08);

    // Eye slit
    if (!this.dying) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - s * 0.2, y - s * 0.5, s * 0.12, s * 0.06);
      ctx.fillRect(x + s * 0.08, y - s * 0.5, s * 0.12, s * 0.06);
    }
  }

  drawTanker(ctx, s, color) {
    const x = this.x;
    const y = this.y;
    const flash = this.flashTimer > 0;

    // Legs (wider stance)
    ctx.fillStyle = flash ? '#ccc' : '#2a2a2a';
    ctx.fillRect(x - s * 0.45, y + s * 0.3, s * 0.3, s * 0.55);
    ctx.fillRect(x + s * 0.15, y + s * 0.3, s * 0.3, s * 0.55);

    // Body (wider/bulkier)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y - s * 0.15);
    ctx.lineTo(x - s * 0.6, y + s * 0.4);
    ctx.lineTo(x + s * 0.6, y + s * 0.4);
    ctx.lineTo(x + s * 0.6, y - s * 0.15);
    ctx.arc(x, y - s * 0.15, s * 0.6, 0, -Math.PI, true);
    ctx.fill();

    // Shoulder pads (armor)
    ctx.fillStyle = flash ? '#ddd' : '#3b5998';
    ctx.fillRect(x - s * 0.75, y - s * 0.2, s * 0.2, s * 0.3);
    ctx.fillRect(x + s * 0.55, y - s * 0.2, s * 0.2, s * 0.3);

    // Riot shield (front, semi-transparent)
    if (!this.dying) {
      ctx.fillStyle = flash ? 'rgba(255,255,255,0.5)' : 'rgba(96,165,250,0.35)';
      ctx.fillRect(x - s * 0.55, y - s * 0.8, s * 1.1, s * 0.6);
      // Shield cross-hatch
      ctx.strokeStyle = flash ? 'rgba(255,255,255,0.3)' : 'rgba(96,165,250,0.25)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.55, y - s * 0.5);
      ctx.lineTo(x + s * 0.55, y - s * 0.5);
      ctx.moveTo(x, y - s * 0.8);
      ctx.lineTo(x, y - s * 0.2);
      ctx.stroke();
      // Shield border
      ctx.strokeStyle = flash ? '#fff' : '#60a5fa';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - s * 0.55, y - s * 0.8, s * 1.1, s * 0.6);
    }

    // HP bar
    const barW = s * 1.6;
    const pct = this.hp / this.maxHp;
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(x - barW / 2, y - s - 3, barW, 2);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(x - barW / 2, y - s - 3, barW * pct, 2);

    // Head
    ctx.fillStyle = flash ? '#eee' : '#d4a574';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.55, s * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Helmet with visor (blue-tinted)
    ctx.fillStyle = flash ? '#ddd' : '#2c4a7c';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, s * 0.4, -Math.PI, 0);
    ctx.fill();
    // Visor slit
    ctx.fillStyle = flash ? '#aaa' : '#93c5fd';
    ctx.fillRect(x - s * 0.25, y - s * 0.52, s * 0.5, s * 0.06);

    // Pistol in right hand
    if (!this.dying) {
      ctx.fillStyle = flash ? '#aaa' : '#555';
      ctx.fillRect(x + s * 0.55, y + s * 0.05, s * 0.12, s * 0.35);
    }
  }

  drawSniper(ctx, s, color) {
    const x = this.x;
    const y = this.y;
    const flash = this.flashTimer > 0;

    // Legs (crouched, angled)
    ctx.fillStyle = flash ? '#ccc' : '#2a2a2a';
    ctx.fillRect(x - s * 0.3, y + s * 0.25, s * 0.2, s * 0.5);
    ctx.fillRect(x + s * 0.1, y + s * 0.2, s * 0.2, s * 0.55);

    // Body (slimmer build)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y - s * 0.1);
    ctx.lineTo(x - s * 0.4, y + s * 0.35);
    ctx.lineTo(x + s * 0.4, y + s * 0.35);
    ctx.lineTo(x + s * 0.4, y - s * 0.1);
    ctx.arc(x, y - s * 0.1, s * 0.4, 0, -Math.PI, true);
    ctx.fill();

    // Long sniper rifle (extends far above)
    if (!this.dying) {
      ctx.fillStyle = flash ? '#aaa' : '#6b7280';
      ctx.fillRect(x - s * 0.06, y - s * 2.8, s * 0.12, s * 2.6);
      // Stock
      ctx.fillRect(x - s * 0.1, y - s * 0.2, s * 0.2, s * 0.3);
      // Barrel tip
      ctx.fillStyle = flash ? '#999' : '#444';
      ctx.fillRect(x - s * 0.04, y - s * 3.0, s * 0.08, s * 0.25);
      // Scope lens
      ctx.fillStyle = flash ? '#ddd' : '#c4b5fd';
      ctx.beginPath();
      ctx.arc(x, y - s * 2.2, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      // Scope mount
      ctx.fillStyle = flash ? '#bbb' : '#555';
      ctx.fillRect(x - s * 0.08, y - s * 2.3, s * 0.16, s * 0.06);
    }

    // Arms holding rifle
    ctx.fillStyle = color;
    ctx.fillRect(x - s * 0.5, y - s * 0.05, s * 0.15, s * 0.25);
    ctx.fillRect(x + s * 0.35, y - s * 0.05, s * 0.15, s * 0.25);

    // Head
    ctx.fillStyle = flash ? '#eee' : '#d4a574';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Ghillie hood (pointed triangle)
    ctx.fillStyle = flash ? '#ddd' : '#4c1d95';
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.1);
    ctx.lineTo(x - s * 0.45, y - s * 0.35);
    ctx.lineTo(x + s * 0.45, y - s * 0.35);
    ctx.closePath();
    ctx.fill();
    // Hood fabric drape
    ctx.fillStyle = flash ? '#ccc' : '#5b21b6';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.38, y - s * 0.4);
    ctx.lineTo(x - s * 0.55, y - s * 0.1);
    ctx.lineTo(x - s * 0.3, y - s * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.38, y - s * 0.4);
    ctx.lineTo(x + s * 0.55, y - s * 0.1);
    ctx.lineTo(x + s * 0.3, y - s * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  drawBomber(ctx, s, color) {
    const x = this.x;
    const y = this.y;
    const flash = this.flashTimer > 0;

    // Legs (stocky)
    ctx.fillStyle = flash ? '#ccc' : '#2a2a2a';
    ctx.fillRect(x - s * 0.35, y + s * 0.35, s * 0.28, s * 0.5);
    ctx.fillRect(x + s * 0.07, y + s * 0.35, s * 0.28, s * 0.5);

    // Backpack with explosives
    ctx.fillStyle = flash ? '#ddd' : '#7c2d12';
    ctx.fillRect(x - s * 0.35, y - s * 0.1, s * 0.7, s * 0.5);
    // Warning stripes on pack
    ctx.strokeStyle = flash ? '#eee' : '#fbbf24';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.25, y + s * 0.05);
    ctx.lineTo(x + s * 0.25, y + s * 0.05);
    ctx.moveTo(x - s * 0.25, y + s * 0.2);
    ctx.lineTo(x + s * 0.25, y + s * 0.2);
    ctx.stroke();

    // Body (stocky)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y - s * 0.15);
    ctx.lineTo(x - s * 0.5, y + s * 0.4);
    ctx.lineTo(x + s * 0.5, y + s * 0.4);
    ctx.lineTo(x + s * 0.5, y - s * 0.15);
    ctx.arc(x, y - s * 0.15, s * 0.5, 0, -Math.PI, true);
    ctx.fill();

    // Warning diamond on chest
    ctx.fillStyle = flash ? '#eee' : '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.05);
    ctx.lineTo(x + s * 0.15, y + s * 0.1);
    ctx.lineTo(x, y + s * 0.25);
    ctx.lineTo(x - s * 0.15, y + s * 0.1);
    ctx.closePath();
    ctx.fill();

    // Grenade launcher (shorter, thicker barrel)
    if (!this.dying) {
      ctx.fillStyle = flash ? '#aaa' : '#555';
      ctx.fillRect(x - s * 0.12, y - s * 1.5, s * 0.24, s * 1.2);
      // Blast nozzle (orange glow)
      ctx.fillStyle = flash ? '#ffd' : '#ea580c';
      ctx.beginPath();
      ctx.arc(x, y - s * 1.5, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      // Nozzle inner
      ctx.fillStyle = flash ? '#eeb' : '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y - s * 1.5, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    // Arms
    ctx.fillStyle = color;
    ctx.fillRect(x - s * 0.65, y - s * 0.05, s * 0.18, s * 0.3);
    ctx.fillRect(x + s * 0.47, y - s * 0.05, s * 0.18, s * 0.3);

    // Head
    ctx.fillStyle = flash ? '#eee' : '#d4a574';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.55, s * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Helmet (military)
    ctx.fillStyle = flash ? '#ddd' : '#5c3a1a';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, s * 0.4, -Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - s * 0.44, y - s * 0.62, s * 0.88, s * 0.08);
  }
}
