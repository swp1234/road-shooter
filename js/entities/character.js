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

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.95, s * 0.6, s * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs with volumetric gradient
    let lg = ctx.createLinearGradient(x - s * 0.35, 0, x - s * 0.1, 0);
    lg.addColorStop(0, flash ? '#ddd' : '#3a3a3a');
    lg.addColorStop(0.5, flash ? '#ccc' : '#2a2a2a');
    lg.addColorStop(1, flash ? '#aaa' : '#1a1a1a');
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.35, y + s * 0.3, s * 0.25, s * 0.6);
    lg = ctx.createLinearGradient(x + s * 0.1, 0, x + s * 0.35, 0);
    lg.addColorStop(0, flash ? '#ddd' : '#3a3a3a');
    lg.addColorStop(0.5, flash ? '#ccc' : '#2a2a2a');
    lg.addColorStop(1, flash ? '#aaa' : '#1a1a1a');
    ctx.fillStyle = lg;
    ctx.fillRect(x + s * 0.1, y + s * 0.3, s * 0.25, s * 0.6);

    // Body torso with top-left lighting gradient
    lg = ctx.createLinearGradient(x - s * 0.5, y - s * 0.3, x + s * 0.5, y + s * 0.4);
    if (flash) {
      lg.addColorStop(0, '#ffffff');
      lg.addColorStop(1, '#cccccc');
    } else {
      lg.addColorStop(0, '#3cb371');
      lg.addColorStop(0.5, '#228B22');
      lg.addColorStop(1, '#145a1e');
    }
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y - s * 0.1);
    ctx.lineTo(x - s * 0.5, y + s * 0.4);
    ctx.lineTo(x + s * 0.5, y + s * 0.4);
    ctx.lineTo(x + s * 0.5, y - s * 0.1);
    ctx.arc(x, y - s * 0.1, s * 0.5, 0, -Math.PI, true);
    ctx.fill();

    // Rim light on torso upper-left edge
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.6)' : 'rgba(100,255,150,0.25)';
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.1, s * 0.49, -Math.PI * 0.9, -Math.PI * 0.4);
    ctx.stroke();

    // Body armor vest with gradient
    lg = ctx.createLinearGradient(x - s * 0.35, y - s * 0.05, x + s * 0.35, y + s * 0.3);
    if (flash) {
      lg.addColorStop(0, '#fff');
      lg.addColorStop(1, '#ccc');
    } else {
      lg.addColorStop(0, '#3d9a5a');
      lg.addColorStop(0.5, '#2d7a4a');
      lg.addColorStop(1, '#1d5a3a');
    }
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.35, y - s * 0.05, s * 0.7, s * 0.35);
    // Vest edge shadow (bottom/right)
    ctx.fillStyle = flash ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + s * 0.25, y - s * 0.05, s * 0.1, s * 0.35);
    ctx.fillRect(x - s * 0.35, y + s * 0.22, s * 0.7, s * 0.08);

    // Belt with subtle gradient
    lg = ctx.createLinearGradient(x - s * 0.45, y + s * 0.25, x + s * 0.45, y + s * 0.33);
    lg.addColorStop(0, flash ? '#ccc' : '#264a38');
    lg.addColorStop(0.5, flash ? '#bbb' : '#1a3a28');
    lg.addColorStop(1, flash ? '#999' : '#0e2a18');
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.45, y + s * 0.25, s * 0.9, s * 0.08);

    // Arms with volumetric gradient (left arm - lit side)
    lg = ctx.createLinearGradient(x - s * 0.7, y - s * 0.05, x - s * 0.48, y + s * 0.25);
    if (flash) {
      lg.addColorStop(0, '#fff');
      lg.addColorStop(1, '#ccc');
    } else {
      lg.addColorStop(0, '#3cb371');
      lg.addColorStop(1, '#1a6b2e');
    }
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.7, y - s * 0.05, s * 0.22, s * 0.3);
    // Right arm (shadow side, darker)
    lg = ctx.createLinearGradient(x + s * 0.48, y - s * 0.05, x + s * 0.7, y + s * 0.25);
    if (flash) {
      lg.addColorStop(0, '#eee');
      lg.addColorStop(1, '#bbb');
    } else {
      lg.addColorStop(0, '#228B22');
      lg.addColorStop(1, '#145a1e');
    }
    ctx.fillStyle = lg;
    ctx.fillRect(x + s * 0.48, y - s * 0.05, s * 0.22, s * 0.3);

    // Rifle with metal gradient sheen
    if (!this.dying) {
      ctx.save();
      ctx.translate(x + s * 0.15, y);
      ctx.rotate(-0.2);
      // Barrel body - gradient sheen along length
      lg = ctx.createLinearGradient(-s * 0.08, 0, s * 0.08, 0);
      lg.addColorStop(0, flash ? '#bbb' : '#4a4a4a');
      lg.addColorStop(0.3, flash ? '#ddd' : '#7a7a7a');
      lg.addColorStop(0.5, flash ? '#ccc' : '#6c6c6c');
      lg.addColorStop(1, flash ? '#999' : '#3a3a3a');
      ctx.fillStyle = lg;
      ctx.fillRect(-s * 0.08, -s * 1.8, s * 0.16, s * 1.6);
      // Barrel tip - darker metal
      lg = ctx.createLinearGradient(-s * 0.06, 0, s * 0.06, 0);
      lg.addColorStop(0, flash ? '#aaa' : '#3a3a3a');
      lg.addColorStop(0.4, flash ? '#ccc' : '#5a5a5a');
      lg.addColorStop(1, flash ? '#888' : '#2a2a2a');
      ctx.fillStyle = lg;
      ctx.fillRect(-s * 0.06, -s * 2.0, s * 0.12, s * 0.25);
      // Specular highlight along barrel
      ctx.fillStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
      ctx.fillRect(-s * 0.02, -s * 1.7, s * 0.04, s * 1.2);
      ctx.restore();
    }

    // Head with skin gradient (volumetric sphere)
    const headR = s * 0.38;
    lg = ctx.createRadialGradient(x - headR * 0.3, y - s * 0.55 - headR * 0.3, headR * 0.1, x, y - s * 0.55, headR);
    lg.addColorStop(0, flash ? '#fff' : '#e8c49a');
    lg.addColorStop(0.6, flash ? '#eee' : '#d4a574');
    lg.addColorStop(1, flash ? '#ccc' : '#a87a50');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.55, headR, 0, Math.PI * 2);
    ctx.fill();

    // Helmet with gradient (top-left lighting)
    const helmR = s * 0.42;
    lg = ctx.createLinearGradient(x - helmR, y - s * 1.0, x + helmR, y - s * 0.6);
    lg.addColorStop(0, flash ? '#eee' : '#2a8040');
    lg.addColorStop(0.5, flash ? '#ddd' : '#1a5c2e');
    lg.addColorStop(1, flash ? '#bbb' : '#0e3a1a');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, helmR, -Math.PI, 0);
    ctx.fill();
    // Helmet brim with gradient
    lg = ctx.createLinearGradient(x - s * 0.46, y - s * 0.62, x + s * 0.46, y - s * 0.54);
    lg.addColorStop(0, flash ? '#eee' : '#2a8040');
    lg.addColorStop(1, flash ? '#bbb' : '#0e3a1a');
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.46, y - s * 0.62, s * 0.92, s * 0.08);
    // Helmet rim light (upper-left edge)
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.5)' : 'rgba(150,255,180,0.3)';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, helmR - s * 0.02, -Math.PI * 0.85, -Math.PI * 0.35);
    ctx.stroke();
    // Helmet specular highlight
    ctx.fillStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(x - helmR * 0.3, y - s * 0.8, helmR * 0.2, helmR * 0.1, -0.3, 0, Math.PI * 2);
    ctx.fill();

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

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.9, s * 0.7, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs with volumetric gradient (wider stance)
    let lg = ctx.createLinearGradient(x - s * 0.45, 0, x - s * 0.15, 0);
    lg.addColorStop(0, flash ? '#ddd' : '#3a3a3a');
    lg.addColorStop(0.5, flash ? '#ccc' : '#2a2a2a');
    lg.addColorStop(1, flash ? '#aaa' : '#1a1a1a');
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.45, y + s * 0.3, s * 0.3, s * 0.55);
    lg = ctx.createLinearGradient(x + s * 0.15, 0, x + s * 0.45, 0);
    lg.addColorStop(0, flash ? '#ddd' : '#3a3a3a');
    lg.addColorStop(0.5, flash ? '#ccc' : '#2a2a2a');
    lg.addColorStop(1, flash ? '#aaa' : '#1a1a1a');
    ctx.fillStyle = lg;
    ctx.fillRect(x + s * 0.15, y + s * 0.3, s * 0.3, s * 0.55);

    // Body (wider/bulkier) with top-left lighting
    lg = ctx.createLinearGradient(x - s * 0.6, y - s * 0.4, x + s * 0.6, y + s * 0.4);
    if (flash) {
      lg.addColorStop(0, '#ffffff');
      lg.addColorStop(1, '#cccccc');
    } else {
      lg.addColorStop(0, '#5b8cc8');
      lg.addColorStop(0.5, '#3b6ea8');
      lg.addColorStop(1, '#1e3a6e');
    }
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y - s * 0.15);
    ctx.lineTo(x - s * 0.6, y + s * 0.4);
    ctx.lineTo(x + s * 0.6, y + s * 0.4);
    ctx.lineTo(x + s * 0.6, y - s * 0.15);
    ctx.arc(x, y - s * 0.15, s * 0.6, 0, -Math.PI, true);
    ctx.fill();

    // Body rim light upper-left
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.6)' : 'rgba(130,180,255,0.3)';
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.15, s * 0.59, -Math.PI * 0.9, -Math.PI * 0.4);
    ctx.stroke();

    // Body edge shadow (bottom/right)
    ctx.fillStyle = flash ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + s * 0.45, y - s * 0.15, s * 0.15, s * 0.55);
    ctx.fillRect(x - s * 0.6, y + s * 0.32, s * 1.2, s * 0.08);

    // Shoulder pads with gradient (armor plates)
    // Left pad (lit side)
    lg = ctx.createLinearGradient(x - s * 0.75, y - s * 0.2, x - s * 0.55, y + s * 0.1);
    lg.addColorStop(0, flash ? '#eee' : '#5580b8');
    lg.addColorStop(0.5, flash ? '#ddd' : '#3b5998');
    lg.addColorStop(1, flash ? '#bbb' : '#1e3060');
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.75, y - s * 0.2, s * 0.2, s * 0.3);
    // Left pad specular
    ctx.fillStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.fillRect(x - s * 0.72, y - s * 0.18, s * 0.08, s * 0.1);
    // Right pad (shadow side)
    lg = ctx.createLinearGradient(x + s * 0.55, y - s * 0.2, x + s * 0.75, y + s * 0.1);
    lg.addColorStop(0, flash ? '#ddd' : '#3b5998');
    lg.addColorStop(1, flash ? '#aaa' : '#1e3060');
    ctx.fillStyle = lg;
    ctx.fillRect(x + s * 0.55, y - s * 0.2, s * 0.2, s * 0.3);

    // Riot shield with 3D glass gradient
    if (!this.dying) {
      lg = ctx.createLinearGradient(x - s * 0.55, y - s * 0.8, x + s * 0.55, y - s * 0.2);
      if (flash) {
        lg.addColorStop(0, 'rgba(255,255,255,0.6)');
        lg.addColorStop(0.5, 'rgba(255,255,255,0.4)');
        lg.addColorStop(1, 'rgba(255,255,255,0.55)');
      } else {
        lg.addColorStop(0, 'rgba(130,190,255,0.45)');
        lg.addColorStop(0.4, 'rgba(96,165,250,0.2)');
        lg.addColorStop(0.6, 'rgba(96,165,250,0.25)');
        lg.addColorStop(1, 'rgba(60,120,200,0.4)');
      }
      ctx.fillStyle = lg;
      ctx.fillRect(x - s * 0.55, y - s * 0.8, s * 1.1, s * 0.6);
      // Shield specular highlight (glass reflection)
      ctx.fillStyle = flash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.ellipse(x - s * 0.2, y - s * 0.65, s * 0.2, s * 0.08, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Shield cross-hatch
      ctx.strokeStyle = flash ? 'rgba(255,255,255,0.3)' : 'rgba(96,165,250,0.25)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.55, y - s * 0.5);
      ctx.lineTo(x + s * 0.55, y - s * 0.5);
      ctx.moveTo(x, y - s * 0.8);
      ctx.lineTo(x, y - s * 0.2);
      ctx.stroke();
      // Shield border with gradient
      ctx.strokeStyle = flash ? '#fff' : '#60a5fa';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - s * 0.55, y - s * 0.8, s * 1.1, s * 0.6);
      // Shield bottom edge shadow
      ctx.fillStyle = flash ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,50,0.15)';
      ctx.fillRect(x - s * 0.55, y - s * 0.28, s * 1.1, s * 0.08);
    }

    // HP bar
    const barW = s * 1.6;
    const pct = this.hp / this.maxHp;
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(x - barW / 2, y - s - 3, barW, 2);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(x - barW / 2, y - s - 3, barW * pct, 2);

    // Head with volumetric skin gradient
    const headR = s * 0.35;
    lg = ctx.createRadialGradient(x - headR * 0.3, y - s * 0.55 - headR * 0.3, headR * 0.1, x, y - s * 0.55, headR);
    lg.addColorStop(0, flash ? '#fff' : '#e8c49a');
    lg.addColorStop(0.6, flash ? '#eee' : '#d4a574');
    lg.addColorStop(1, flash ? '#ccc' : '#a87a50');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.55, headR, 0, Math.PI * 2);
    ctx.fill();

    // Helmet with visor (blue-tinted) with gradient
    const helmR = s * 0.4;
    lg = ctx.createLinearGradient(x - helmR, y - s * 1.0, x + helmR, y - s * 0.6);
    lg.addColorStop(0, flash ? '#eee' : '#3c6aac');
    lg.addColorStop(0.5, flash ? '#ddd' : '#2c4a7c');
    lg.addColorStop(1, flash ? '#bbb' : '#1a2e5a');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, helmR, -Math.PI, 0);
    ctx.fill();
    // Helmet rim light
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.5)' : 'rgba(140,190,255,0.3)';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, helmR - s * 0.02, -Math.PI * 0.85, -Math.PI * 0.35);
    ctx.stroke();
    // Helmet specular
    ctx.fillStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(x - helmR * 0.3, y - s * 0.78, helmR * 0.18, helmR * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Visor slit with glass gradient
    lg = ctx.createLinearGradient(x - s * 0.25, y - s * 0.52, x + s * 0.25, y - s * 0.46);
    lg.addColorStop(0, flash ? '#ccc' : '#b3d5fd');
    lg.addColorStop(0.5, flash ? '#aaa' : '#93c5fd');
    lg.addColorStop(1, flash ? '#999' : '#73a5dd');
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.25, y - s * 0.52, s * 0.5, s * 0.06);

    // Pistol in right hand with metal sheen
    if (!this.dying) {
      lg = ctx.createLinearGradient(x + s * 0.55, 0, x + s * 0.67, 0);
      lg.addColorStop(0, flash ? '#bbb' : '#4a4a4a');
      lg.addColorStop(0.4, flash ? '#ddd' : '#6a6a6a');
      lg.addColorStop(1, flash ? '#999' : '#3a3a3a');
      ctx.fillStyle = lg;
      ctx.fillRect(x + s * 0.55, y + s * 0.05, s * 0.12, s * 0.35);
      // Pistol specular line
      ctx.fillStyle = flash ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + s * 0.57, y + s * 0.08, s * 0.03, s * 0.25);
    }
  }

  drawSniper(ctx, s, color) {
    const x = this.x;
    const y = this.y;
    const flash = this.flashTimer > 0;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.8, s * 0.5, s * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs with volumetric gradient (crouched, angled)
    let lg = ctx.createLinearGradient(x - s * 0.3, 0, x - s * 0.1, 0);
    lg.addColorStop(0, flash ? '#ddd' : '#3a3a3a');
    lg.addColorStop(0.5, flash ? '#ccc' : '#2a2a2a');
    lg.addColorStop(1, flash ? '#aaa' : '#1a1a1a');
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.3, y + s * 0.25, s * 0.2, s * 0.5);
    lg = ctx.createLinearGradient(x + s * 0.1, 0, x + s * 0.3, 0);
    lg.addColorStop(0, flash ? '#ddd' : '#3a3a3a');
    lg.addColorStop(0.5, flash ? '#ccc' : '#2a2a2a');
    lg.addColorStop(1, flash ? '#aaa' : '#1a1a1a');
    ctx.fillStyle = lg;
    ctx.fillRect(x + s * 0.1, y + s * 0.2, s * 0.2, s * 0.55);

    // Body (slimmer build) with top-left lighting
    lg = ctx.createLinearGradient(x - s * 0.4, y - s * 0.3, x + s * 0.4, y + s * 0.35);
    if (flash) {
      lg.addColorStop(0, '#ffffff');
      lg.addColorStop(1, '#cccccc');
    } else {
      lg.addColorStop(0, '#9b5de5');
      lg.addColorStop(0.5, '#7c3aed');
      lg.addColorStop(1, '#4c1d95');
    }
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y - s * 0.1);
    ctx.lineTo(x - s * 0.4, y + s * 0.35);
    ctx.lineTo(x + s * 0.4, y + s * 0.35);
    ctx.lineTo(x + s * 0.4, y - s * 0.1);
    ctx.arc(x, y - s * 0.1, s * 0.4, 0, -Math.PI, true);
    ctx.fill();

    // Body rim light (upper-left)
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.6)' : 'rgba(200,170,255,0.3)';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.1, s * 0.39, -Math.PI * 0.9, -Math.PI * 0.4);
    ctx.stroke();

    // Body edge shadow (bottom/right)
    ctx.fillStyle = flash ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + s * 0.3, y - s * 0.1, s * 0.1, s * 0.45);
    ctx.fillRect(x - s * 0.4, y + s * 0.28, s * 0.8, s * 0.07);

    // Long sniper rifle with metal gradient sheen
    if (!this.dying) {
      // Main barrel - gradient sheen across width
      lg = ctx.createLinearGradient(x - s * 0.06, 0, x + s * 0.06, 0);
      lg.addColorStop(0, flash ? '#bbb' : '#555860');
      lg.addColorStop(0.3, flash ? '#ddd' : '#8b8f98');
      lg.addColorStop(0.5, flash ? '#ccc' : '#7b7f88');
      lg.addColorStop(1, flash ? '#999' : '#3b3f48');
      ctx.fillStyle = lg;
      ctx.fillRect(x - s * 0.06, y - s * 2.8, s * 0.12, s * 2.6);
      // Barrel specular line
      ctx.fillStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)';
      ctx.fillRect(x - s * 0.015, y - s * 2.6, s * 0.03, s * 2.0);
      // Stock with gradient
      lg = ctx.createLinearGradient(x - s * 0.1, 0, x + s * 0.1, 0);
      lg.addColorStop(0, flash ? '#ccc' : '#5a5e66');
      lg.addColorStop(0.4, flash ? '#ddd' : '#7b7f88');
      lg.addColorStop(1, flash ? '#aaa' : '#3a3e46');
      ctx.fillStyle = lg;
      ctx.fillRect(x - s * 0.1, y - s * 0.2, s * 0.2, s * 0.3);
      // Barrel tip - darker metal
      lg = ctx.createLinearGradient(x - s * 0.04, 0, x + s * 0.04, 0);
      lg.addColorStop(0, flash ? '#aaa' : '#3a3a3a');
      lg.addColorStop(0.4, flash ? '#ccc' : '#555');
      lg.addColorStop(1, flash ? '#888' : '#2a2a2a');
      ctx.fillStyle = lg;
      ctx.fillRect(x - s * 0.04, y - s * 3.0, s * 0.08, s * 0.25);
      // Scope lens with radial glow
      const scopeR = s * 0.12;
      lg = ctx.createRadialGradient(x - scopeR * 0.3, y - s * 2.2 - scopeR * 0.3, scopeR * 0.05, x, y - s * 2.2, scopeR);
      lg.addColorStop(0, flash ? '#fff' : '#e0d5ff');
      lg.addColorStop(0.5, flash ? '#ddd' : '#c4b5fd');
      lg.addColorStop(1, flash ? '#bbb' : '#8b5cf6');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(x, y - s * 2.2, scopeR, 0, Math.PI * 2);
      ctx.fill();
      // Scope specular
      ctx.fillStyle = flash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(x - scopeR * 0.3, y - s * 2.2 - scopeR * 0.2, scopeR * 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Scope mount with metal gradient
      lg = ctx.createLinearGradient(x - s * 0.08, y - s * 2.3, x + s * 0.08, y - s * 2.24);
      lg.addColorStop(0, flash ? '#ccc' : '#666');
      lg.addColorStop(0.5, flash ? '#bbb' : '#555');
      lg.addColorStop(1, flash ? '#999' : '#3a3a3a');
      ctx.fillStyle = lg;
      ctx.fillRect(x - s * 0.08, y - s * 2.3, s * 0.16, s * 0.06);
    }

    // Arms with gradient (holding rifle)
    // Left arm (lit side)
    lg = ctx.createLinearGradient(x - s * 0.5, y - s * 0.05, x - s * 0.35, y + s * 0.2);
    if (flash) {
      lg.addColorStop(0, '#fff');
      lg.addColorStop(1, '#ccc');
    } else {
      lg.addColorStop(0, '#9b5de5');
      lg.addColorStop(1, '#5b21b6');
    }
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.5, y - s * 0.05, s * 0.15, s * 0.25);
    // Right arm (shadow side)
    lg = ctx.createLinearGradient(x + s * 0.35, y - s * 0.05, x + s * 0.5, y + s * 0.2);
    if (flash) {
      lg.addColorStop(0, '#eee');
      lg.addColorStop(1, '#bbb');
    } else {
      lg.addColorStop(0, '#7c3aed');
      lg.addColorStop(1, '#4c1d95');
    }
    ctx.fillStyle = lg;
    ctx.fillRect(x + s * 0.35, y - s * 0.05, s * 0.15, s * 0.25);

    // Head with volumetric skin gradient
    const headR = s * 0.32;
    lg = ctx.createRadialGradient(x - headR * 0.3, y - s * 0.5 - headR * 0.3, headR * 0.08, x, y - s * 0.5, headR);
    lg.addColorStop(0, flash ? '#fff' : '#e8c49a');
    lg.addColorStop(0.6, flash ? '#eee' : '#d4a574');
    lg.addColorStop(1, flash ? '#ccc' : '#a87a50');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, headR, 0, Math.PI * 2);
    ctx.fill();

    // Ghillie hood with gradient (pointed triangle)
    lg = ctx.createLinearGradient(x, y - s * 1.1, x, y - s * 0.35);
    lg.addColorStop(0, flash ? '#eee' : '#6d28d9');
    lg.addColorStop(0.5, flash ? '#ddd' : '#4c1d95');
    lg.addColorStop(1, flash ? '#bbb' : '#3b0f80');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.1);
    ctx.lineTo(x - s * 0.45, y - s * 0.35);
    ctx.lineTo(x + s * 0.45, y - s * 0.35);
    ctx.closePath();
    ctx.fill();
    // Hood rim light (left edge)
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.5)' : 'rgba(180,150,255,0.3)';
    ctx.lineWidth = s * 0.04;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.08);
    ctx.lineTo(x - s * 0.42, y - s * 0.37);
    ctx.stroke();
    // Hood specular highlight
    ctx.fillStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(x - s * 0.12, y - s * 0.8, s * 0.08, s * 0.15, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Hood fabric drape (left - lit)
    lg = ctx.createLinearGradient(x - s * 0.55, y - s * 0.1, x - s * 0.3, y - s * 0.4);
    lg.addColorStop(0, flash ? '#ddd' : '#7c3aed');
    lg.addColorStop(1, flash ? '#ccc' : '#5b21b6');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.38, y - s * 0.4);
    ctx.lineTo(x - s * 0.55, y - s * 0.1);
    ctx.lineTo(x - s * 0.3, y - s * 0.2);
    ctx.closePath();
    ctx.fill();
    // Hood fabric drape (right - shadowed)
    lg = ctx.createLinearGradient(x + s * 0.3, y - s * 0.4, x + s * 0.55, y - s * 0.1);
    lg.addColorStop(0, flash ? '#ccc' : '#5b21b6');
    lg.addColorStop(1, flash ? '#aaa' : '#3b0f80');
    ctx.fillStyle = lg;
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

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.9, s * 0.6, s * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs with volumetric gradient (stocky)
    let lg = ctx.createLinearGradient(x - s * 0.35, 0, x - s * 0.07, 0);
    lg.addColorStop(0, flash ? '#ddd' : '#3a3a3a');
    lg.addColorStop(0.5, flash ? '#ccc' : '#2a2a2a');
    lg.addColorStop(1, flash ? '#aaa' : '#1a1a1a');
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.35, y + s * 0.35, s * 0.28, s * 0.5);
    lg = ctx.createLinearGradient(x + s * 0.07, 0, x + s * 0.35, 0);
    lg.addColorStop(0, flash ? '#ddd' : '#3a3a3a');
    lg.addColorStop(0.5, flash ? '#ccc' : '#2a2a2a');
    lg.addColorStop(1, flash ? '#aaa' : '#1a1a1a');
    ctx.fillStyle = lg;
    ctx.fillRect(x + s * 0.07, y + s * 0.35, s * 0.28, s * 0.5);

    // Backpack with explosives - gradient for depth
    lg = ctx.createLinearGradient(x - s * 0.35, y - s * 0.1, x + s * 0.35, y + s * 0.4);
    lg.addColorStop(0, flash ? '#eee' : '#9c4020');
    lg.addColorStop(0.5, flash ? '#ddd' : '#7c2d12');
    lg.addColorStop(1, flash ? '#bbb' : '#5c1d08');
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.35, y - s * 0.1, s * 0.7, s * 0.5);
    // Backpack edge shadow
    ctx.fillStyle = flash ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + s * 0.25, y - s * 0.1, s * 0.1, s * 0.5);
    ctx.fillRect(x - s * 0.35, y + s * 0.32, s * 0.7, s * 0.08);
    // Warning stripes on pack (with glow)
    ctx.strokeStyle = flash ? '#eee' : '#fbbf24';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.25, y + s * 0.05);
    ctx.lineTo(x + s * 0.25, y + s * 0.05);
    ctx.moveTo(x - s * 0.25, y + s * 0.2);
    ctx.lineTo(x + s * 0.25, y + s * 0.2);
    ctx.stroke();
    // Stripe glow
    if (!flash) {
      ctx.strokeStyle = 'rgba(251,191,36,0.15)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.25, y + s * 0.05);
      ctx.lineTo(x + s * 0.25, y + s * 0.05);
      ctx.moveTo(x - s * 0.25, y + s * 0.2);
      ctx.lineTo(x + s * 0.25, y + s * 0.2);
      ctx.stroke();
    }

    // Body (stocky) with top-left lighting
    lg = ctx.createLinearGradient(x - s * 0.5, y - s * 0.35, x + s * 0.5, y + s * 0.4);
    if (flash) {
      lg.addColorStop(0, '#ffffff');
      lg.addColorStop(1, '#cccccc');
    } else {
      lg.addColorStop(0, '#d97706');
      lg.addColorStop(0.5, '#b45309');
      lg.addColorStop(1, '#7c3a08');
    }
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y - s * 0.15);
    ctx.lineTo(x - s * 0.5, y + s * 0.4);
    ctx.lineTo(x + s * 0.5, y + s * 0.4);
    ctx.lineTo(x + s * 0.5, y - s * 0.15);
    ctx.arc(x, y - s * 0.15, s * 0.5, 0, -Math.PI, true);
    ctx.fill();

    // Body rim light (upper-left)
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.6)' : 'rgba(255,200,100,0.3)';
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.15, s * 0.49, -Math.PI * 0.9, -Math.PI * 0.4);
    ctx.stroke();

    // Body edge shadow (bottom/right)
    ctx.fillStyle = flash ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + s * 0.38, y - s * 0.15, s * 0.12, s * 0.55);
    ctx.fillRect(x - s * 0.5, y + s * 0.32, s * 1.0, s * 0.08);

    // Warning diamond on chest with gradient glow
    lg = ctx.createRadialGradient(x, y + s * 0.1, 0, x, y + s * 0.1, s * 0.18);
    lg.addColorStop(0, flash ? '#fff' : '#fde68a');
    lg.addColorStop(0.6, flash ? '#eee' : '#fbbf24');
    lg.addColorStop(1, flash ? '#ddd' : '#d97706');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.05);
    ctx.lineTo(x + s * 0.15, y + s * 0.1);
    ctx.lineTo(x, y + s * 0.25);
    ctx.lineTo(x - s * 0.15, y + s * 0.1);
    ctx.closePath();
    ctx.fill();
    // Diamond specular
    ctx.fillStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.04, y);
    ctx.lineTo(x + s * 0.04, y + s * 0.04);
    ctx.lineTo(x - s * 0.02, y + s * 0.1);
    ctx.lineTo(x - s * 0.08, y + s * 0.06);
    ctx.closePath();
    ctx.fill();

    // Grenade launcher with metal gradient sheen
    if (!this.dying) {
      // Barrel body
      lg = ctx.createLinearGradient(x - s * 0.12, 0, x + s * 0.12, 0);
      lg.addColorStop(0, flash ? '#bbb' : '#4a4a4a');
      lg.addColorStop(0.3, flash ? '#ddd' : '#7a7a7a');
      lg.addColorStop(0.5, flash ? '#ccc' : '#6a6a6a');
      lg.addColorStop(1, flash ? '#999' : '#3a3a3a');
      ctx.fillStyle = lg;
      ctx.fillRect(x - s * 0.12, y - s * 1.5, s * 0.24, s * 1.2);
      // Barrel specular line
      ctx.fillStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)';
      ctx.fillRect(x - s * 0.03, y - s * 1.4, s * 0.04, s * 0.9);
      // Blast nozzle (orange glow) with radial gradient
      const nozR = s * 0.16;
      lg = ctx.createRadialGradient(x, y - s * 1.5, 0, x, y - s * 1.5, nozR);
      lg.addColorStop(0, flash ? '#ffe' : '#fbbf24');
      lg.addColorStop(0.5, flash ? '#ffd' : '#ea580c');
      lg.addColorStop(1, flash ? '#eec' : '#9a3800');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(x, y - s * 1.5, nozR, 0, Math.PI * 2);
      ctx.fill();
      // Nozzle inner with glow
      const innerR = s * 0.08;
      lg = ctx.createRadialGradient(x, y - s * 1.5, 0, x, y - s * 1.5, innerR);
      lg.addColorStop(0, flash ? '#fff' : '#fde68a');
      lg.addColorStop(1, flash ? '#eeb' : '#fbbf24');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(x, y - s * 1.5, innerR, 0, Math.PI * 2);
      ctx.fill();
      // Nozzle specular
      ctx.fillStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(x - nozR * 0.3, y - s * 1.5 - nozR * 0.2, nozR * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    // Arms with gradient
    // Left arm (lit side)
    lg = ctx.createLinearGradient(x - s * 0.65, y - s * 0.05, x - s * 0.47, y + s * 0.25);
    if (flash) {
      lg.addColorStop(0, '#fff');
      lg.addColorStop(1, '#ccc');
    } else {
      lg.addColorStop(0, '#d97706');
      lg.addColorStop(1, '#8a4a06');
    }
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.65, y - s * 0.05, s * 0.18, s * 0.3);
    // Right arm (shadow side)
    lg = ctx.createLinearGradient(x + s * 0.47, y - s * 0.05, x + s * 0.65, y + s * 0.25);
    if (flash) {
      lg.addColorStop(0, '#eee');
      lg.addColorStop(1, '#bbb');
    } else {
      lg.addColorStop(0, '#b45309');
      lg.addColorStop(1, '#6a3006');
    }
    ctx.fillStyle = lg;
    ctx.fillRect(x + s * 0.47, y - s * 0.05, s * 0.18, s * 0.3);

    // Head with volumetric skin gradient
    const headR = s * 0.35;
    lg = ctx.createRadialGradient(x - headR * 0.3, y - s * 0.55 - headR * 0.3, headR * 0.1, x, y - s * 0.55, headR);
    lg.addColorStop(0, flash ? '#fff' : '#e8c49a');
    lg.addColorStop(0.6, flash ? '#eee' : '#d4a574');
    lg.addColorStop(1, flash ? '#ccc' : '#a87a50');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.55, headR, 0, Math.PI * 2);
    ctx.fill();

    // Helmet (military brown) with gradient
    const helmR = s * 0.4;
    lg = ctx.createLinearGradient(x - helmR, y - s * 1.0, x + helmR, y - s * 0.6);
    lg.addColorStop(0, flash ? '#eee' : '#7c5030');
    lg.addColorStop(0.5, flash ? '#ddd' : '#5c3a1a');
    lg.addColorStop(1, flash ? '#bbb' : '#3c2010');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, helmR, -Math.PI, 0);
    ctx.fill();
    // Helmet brim with gradient
    lg = ctx.createLinearGradient(x - s * 0.44, y - s * 0.62, x + s * 0.44, y - s * 0.54);
    lg.addColorStop(0, flash ? '#eee' : '#7c5030');
    lg.addColorStop(1, flash ? '#bbb' : '#3c2010');
    ctx.fillStyle = lg;
    ctx.fillRect(x - s * 0.44, y - s * 0.62, s * 0.88, s * 0.08);
    // Helmet rim light (upper-left edge)
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.5)' : 'rgba(255,200,140,0.3)';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, helmR - s * 0.02, -Math.PI * 0.85, -Math.PI * 0.35);
    ctx.stroke();
    // Helmet specular highlight
    ctx.fillStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(x - helmR * 0.3, y - s * 0.78, helmR * 0.18, helmR * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}
