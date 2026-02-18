// Road Shooter - Enemy Types (Detailed Military Sprites)
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
    this.animTimer = Math.random() * Math.PI * 2;

    // Type-specific state
    this.fuseTimer = 3;
    this.fuseStarted = false;
    this.stealTarget = null;
    this.flankerSide = Math.random() < 0.5 ? -1 : 1;
    this.mortarChargeTimer = 0;
    this.mortarTarget = { x: 0, y: 0 };
    this.mortarWarning = false;
    // Trail for flanker
    this.trailX = [];
    this.trailY = [];
    // Elite state
    this.shieldActive = type === 'elite';
    this.shieldHp = type === 'elite' ? Math.ceil(8 * stageMul) : 0;
    this.shieldMaxHp = this.shieldHp;
    this.elitePhase = 0; // 0=advance, 1=hold, 2=attack
    this.eliteAttackTimer = 0;
  }

  update(dt, squadX, squadY) {
    if (this.dying) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.active = false;
      return;
    }

    if (this.flashTimer > 0) this.flashTimer -= dt;
    this.animTimer += dt * 3;

    // Store trail for flanker
    if (this.type === 'flanker') {
      this.trailX.push(this.x);
      this.trailY.push(this.y);
      if (this.trailX.length > 5) { this.trailX.shift(); this.trailY.shift(); }
    }

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
            this.explode = true;
            this.dying = true;
            this.deathTimer = 0.3;
          }
        }
        break;
      }
      case 'thief':
        if (this.stealTarget && this.stealTarget.active && !this.stealTarget.collected) {
          const tdx = this.stealTarget.x - this.x;
          const tdy = this.stealTarget.y - this.y;
          const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
          if (tdist > 5) {
            this.x += (tdx / tdist) * this.speed;
            this.y += (tdy / tdist) * this.speed;
          } else {
            this.stealTarget.active = false;
            this.stealTarget = null;
          }
          this.angle = Math.atan2(tdy, tdx);
        } else {
          this.y += this.speed;
          this.stealTarget = null;
        }
        break;
      case 'flanker':
        if (this.y < 100) this.y += this.speed * 0.8;
        this.x += this.flankerSide * this.speed * 0.7;
        const roadL = (CONFIG.CANVAS_WIDTH - CONFIG.CANVAS_WIDTH * CONFIG.ROAD_WIDTH_RATIO) / 2;
        const roadR = roadL + CONFIG.CANVAS_WIDTH * CONFIG.ROAD_WIDTH_RATIO;
        if (this.x < roadL + 10 || this.x > roadR - 10) this.flankerSide *= -1;
        if (this.fireTimer > 0) this.fireTimer -= dt;
        break;
      case 'elite': {
        if (this.elitePhase === 0) {
          this.y += this.speed;
          if (this.y >= 120) this.elitePhase = 1;
        } else {
          if (squadX > this.x + 15) this.x += 0.2;
          else if (squadX < this.x - 15) this.x -= 0.2;
        }
        if (this.fireTimer > 0) this.fireTimer -= dt;
        this.eliteAttackTimer += dt;
        if (this.shieldActive && this.shieldHp <= 0) {
          this.shieldActive = false;
        }
        break;
      }
    }

    if (this.y > CONFIG.CANVAS_HEIGHT + 50) this.active = false;
  }

  canFire() {
    if (this.dying || this.fireTimer > 0) return false;
    return this.type === 'shooter' || this.type === 'mortar' || this.type === 'flanker' || this.type === 'elite';
  }

  fire() {
    this.fireTimer = 1 / this.fireRate;
  }

  takeDamage(dmg) {
    if (this.dying) return false;
    if (this.shieldActive && this.shieldHp > 0) {
      this.shieldHp -= dmg;
      this.flashTimer = 0.05;
      if (this.shieldHp <= 0) {
        this.shieldActive = false;
        const overflow = -this.shieldHp;
        if (overflow > 0) this.hp -= overflow;
      }
    } else {
      this.hp -= dmg;
    }
    this.flashTimer = 0.1;
    if (this.hp <= 0) {
      this.dying = true;
      this.deathTimer = this.type === 'elite' ? 0.5 : 0.2;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (!this.active) return;
    const alpha = this.dying ? this.deathTimer / 0.2 : 1;
    ctx.globalAlpha = alpha;
    const isFlash = this.flashTimer > 0;
    // Visual size multiplier: render larger than collision hitbox for 3D detail visibility
    const s = this.type === 'elite' ? this.size * 1.3 : this.size * 2.2;

    switch (this.type) {
      case 'rusher':
        this.drawRusher(ctx, s, isFlash);
        break;
      case 'shooter':
        this.drawShooter(ctx, s, isFlash);
        break;
      case 'mortar':
        this.drawMortar(ctx, s, isFlash);
        break;
      case 'detonator':
        this.drawDetonator(ctx, s, isFlash);
        break;
      case 'thief':
        this.drawThief(ctx, s, isFlash);
        break;
      case 'flanker':
        this.drawFlanker(ctx, s, isFlash);
        break;
      case 'elite':
        this.drawElite(ctx, s, isFlash);
        break;
      default:
        ctx.fillStyle = isFlash ? '#fff' : this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
        ctx.fill();
    }

    // HP bar for multi-HP enemies (elite draws its own)
    if (this.maxHp > 1 && !this.dying && this.type !== 'elite') {
      const cs = this.size; // Use collision size for bar positioning
      const barW = cs * 3;
      const barH = 3;
      const bx = this.x - barW / 2;
      const by = this.y - s * 0.6 - 5;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx - 0.5, by - 0.5, barW + 1, barH + 1);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx, by, barW, barH);
      const pct = this.hp / this.maxHp;
      const hpColor = pct > 0.5 ? '#ef4444' : pct > 0.25 ? '#f97316' : '#fbbf24';
      ctx.fillStyle = hpColor;
      ctx.fillRect(bx, by, barW * pct, barH);
    }

    ctx.globalAlpha = 1;
  }

  drawRusher(ctx, s, isFlash) {
    // Zombie soldier — 3D humanoid rushing figure
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Ground shadow
    ctx.save();
    ctx.rotate(-(this.angle + Math.PI / 2));
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.85, s * 0.7, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Motion lines behind
    if (!this.dying) {
      ctx.globalAlpha *= 0.25;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.3 * i, s * (0.6 + i * 0.25));
        ctx.lineTo(s * 0.3 * i, s * (0.6 + i * 0.25));
        ctx.stroke();
      }
      ctx.globalAlpha /= 0.25;
    }

    // Legs (running stance) — gradient for volume
    const legGrad = ctx.createLinearGradient(-s * 0.3, s * 0.2, s * 0.3, s * 0.7);
    legGrad.addColorStop(0, isFlash ? '#eee' : '#6b1a1a');
    legGrad.addColorStop(1, isFlash ? '#bbb' : '#2a0808');
    ctx.fillStyle = legGrad;
    ctx.fillRect(-s * 0.3, s * 0.2, s * 0.2, s * 0.5);
    ctx.fillRect(s * 0.1, s * 0.15, s * 0.2, s * 0.55);
    // Leg edge shadow (right side)
    ctx.fillStyle = isFlash ? '#aaa' : '#1a0505';
    ctx.fillRect(-s * 0.13, s * 0.2, s * 0.03, s * 0.5);
    ctx.fillRect(s * 0.27, s * 0.15, s * 0.03, s * 0.55);

    // Body (hunched torso) — gradient lit from top-left
    const bodyGrad = ctx.createLinearGradient(-s * 0.55, -s * 0.7, s * 0.55, s * 0.35);
    bodyGrad.addColorStop(0, isFlash ? '#fff' : '#e23636');
    bodyGrad.addColorStop(0.4, isFlash ? '#fff' : '#b91c1c');
    bodyGrad.addColorStop(1, isFlash ? '#ccc' : '#7a1010');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.lineTo(-s * 0.55, s * 0.1);
    ctx.lineTo(-s * 0.45, s * 0.35);
    ctx.lineTo(s * 0.45, s * 0.35);
    ctx.lineTo(s * 0.55, s * 0.1);
    ctx.closePath();
    ctx.fill();

    // Rim lighting — top-left bright edge on torso
    ctx.strokeStyle = isFlash ? '#fff' : 'rgba(255,120,120,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.lineTo(-s * 0.55, s * 0.1);
    ctx.stroke();

    // Torn armor plates (gradient)
    const armorGrad = ctx.createLinearGradient(-s * 0.3, -s * 0.2, s * 0.3, s * 0.05);
    armorGrad.addColorStop(0, isFlash ? '#eee' : '#9a2525');
    armorGrad.addColorStop(1, isFlash ? '#ccc' : '#551010');
    ctx.fillStyle = armorGrad;
    ctx.fillRect(-s * 0.3, -s * 0.2, s * 0.6, s * 0.25);
    // Bottom edge shadow on armor
    ctx.fillStyle = isFlash ? '#aaa' : '#3a0808';
    ctx.fillRect(-s * 0.3, s * 0.03, s * 0.6, s * 0.02);

    // Scratch lines
    ctx.strokeStyle = isFlash ? '#ddd' : '#991b1b';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.4);
    ctx.lineTo(s * 0.1, s * 0.1);
    ctx.moveTo(s * 0.15, -s * 0.3);
    ctx.lineTo(-s * 0.05, s * 0.05);
    ctx.stroke();

    // Arms reaching forward — gradient for volume
    const armGrad = ctx.createLinearGradient(-s * 0.65, -s * 0.4, -s * 0.47, s * 0.1);
    armGrad.addColorStop(0, isFlash ? '#fff' : '#cc2a2a');
    armGrad.addColorStop(1, isFlash ? '#bbb' : '#701515');
    ctx.fillStyle = armGrad;
    ctx.fillRect(-s * 0.65, -s * 0.4, s * 0.18, s * 0.5);
    ctx.fillRect(s * 0.47, -s * 0.35, s * 0.18, s * 0.45);
    // Arm edge shadow
    ctx.fillStyle = isFlash ? '#999' : '#400a0a';
    ctx.fillRect(-s * 0.65, s * 0.07, s * 0.18, s * 0.03);
    ctx.fillRect(s * 0.47, s * 0.07, s * 0.18, s * 0.03);

    // Head (cracked helmet) — radial-style gradient via linear
    const headGrad = ctx.createLinearGradient(-s * 0.35, -s * 1.0, s * 0.35, -s * 0.3);
    headGrad.addColorStop(0, isFlash ? '#fff' : '#c42a2a');
    headGrad.addColorStop(0.5, isFlash ? '#eee' : '#991b1b');
    headGrad.addColorStop(1, isFlash ? '#bbb' : '#5c1010');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, -s * 0.65, s * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Cracked helmet top — darker gradient
    const helmetGrad = ctx.createLinearGradient(-s * 0.38, -s * 1.08, s * 0.2, -s * 0.5);
    helmetGrad.addColorStop(0, isFlash ? '#eee' : '#7a1515');
    helmetGrad.addColorStop(1, isFlash ? '#aaa' : '#3a0808');
    ctx.fillStyle = helmetGrad;
    ctx.beginPath();
    ctx.arc(0, -s * 0.7, s * 0.38, -Math.PI, 0);
    ctx.fill();

    // Specular highlight on helmet
    ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(-s * 0.1, -s * 0.85, s * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Rim lighting on helmet upper-left
    ctx.strokeStyle = isFlash ? '#fff' : 'rgba(255,160,160,0.3)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, -s * 0.7, s * 0.37, -Math.PI * 0.85, -Math.PI * 0.2);
    ctx.stroke();

    // Crack line
    ctx.strokeStyle = isFlash ? '#ccc' : '#ef4444';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-s * 0.05, -s * 1.05);
    ctx.lineTo(s * 0.1, -s * 0.65);
    ctx.stroke();

    // Angry V-shaped eye (with glow)
    if (!this.dying) {
      // Eye glow behind
      ctx.fillStyle = 'rgba(251,191,36,0.2)';
      ctx.beginPath();
      ctx.arc(0, -s * 0.54, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.58);
      ctx.lineTo(0, -s * 0.52);
      ctx.lineTo(s * 0.2, -s * 0.58);
      ctx.lineTo(s * 0.15, -s * 0.55);
      ctx.lineTo(0, -s * 0.5);
      ctx.lineTo(-s * 0.15, -s * 0.55);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  drawShooter(ctx, s, isFlash) {
    // Gun turret emplacement with tracked base — 3D
    const x = this.x;
    const y = this.y;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.95, s * 1.0, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Treads — metallic gradient (dark-light-dark)
    const treadGradL = ctx.createLinearGradient(x - s * 0.9, 0, x - s * 0.65, 0);
    treadGradL.addColorStop(0, isFlash ? '#ccc' : '#1e293b');
    treadGradL.addColorStop(0.4, isFlash ? '#eee' : '#4a5568');
    treadGradL.addColorStop(1, isFlash ? '#bbb' : '#1e293b');
    ctx.fillStyle = treadGradL;
    ctx.fillRect(x - s * 0.9, y + s * 0.1, s * 0.25, s * 0.8);

    const treadGradR = ctx.createLinearGradient(x + s * 0.65, 0, x + s * 0.9, 0);
    treadGradR.addColorStop(0, isFlash ? '#ccc' : '#1e293b');
    treadGradR.addColorStop(0.5, isFlash ? '#eee' : '#4a5568');
    treadGradR.addColorStop(1, isFlash ? '#bbb' : '#2d3748');
    ctx.fillStyle = treadGradR;
    ctx.fillRect(x + s * 0.65, y + s * 0.1, s * 0.25, s * 0.8);

    // Tread segments
    ctx.strokeStyle = isFlash ? '#aaa' : '#64748b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      const ty = y + s * 0.2 + i * s * 0.18;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.9, ty);
      ctx.lineTo(x - s * 0.65, ty);
      ctx.moveTo(x + s * 0.65, ty);
      ctx.lineTo(x + s * 0.9, ty);
      ctx.stroke();
    }

    // Body platform — volumetric gradient
    const bodyGrad = ctx.createLinearGradient(x - s * 0.65, y - s * 0.1, x + s * 0.65, y + s * 0.6);
    bodyGrad.addColorStop(0, isFlash ? '#fff' : '#c4610f');
    bodyGrad.addColorStop(0.5, isFlash ? '#eee' : '#92400e');
    bodyGrad.addColorStop(1, isFlash ? '#ccc' : '#5c2a08');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(x - s * 0.65, y - s * 0.1, s * 1.3, s * 0.7);

    // Bottom edge shadow on body
    ctx.fillStyle = isFlash ? '#aaa' : '#3d1a04';
    ctx.fillRect(x - s * 0.65, y + s * 0.55, s * 1.3, s * 0.05);
    // Right edge shadow
    ctx.fillStyle = isFlash ? '#bbb' : '#4a2508';
    ctx.fillRect(x + s * 0.6, y - s * 0.1, s * 0.05, s * 0.7);

    // Rim lighting on body — top-left edge
    ctx.fillStyle = isFlash ? '#fff' : 'rgba(255,200,120,0.2)';
    ctx.fillRect(x - s * 0.65, y - s * 0.1, s * 1.3, s * 0.03);

    // Rivets on body (3D raised)
    if (!this.dying) {
      for (let i = 0; i < 3; i++) {
        const rx = x - s * 0.4 + i * s * 0.4;
        const ry = y + s * 0.45;
        ctx.fillStyle = isFlash ? '#eee' : '#a0600f';
        ctx.beginPath();
        ctx.arc(rx, ry, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isFlash ? '#fff' : 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(rx - 0.3, ry - 0.3, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Turret dome — gradient for 3D sphere
    const turretGrad = ctx.createLinearGradient(x - s * 0.5, y - s * 0.6, x + s * 0.5, y + s * 0.4);
    turretGrad.addColorStop(0, isFlash ? '#fff' : '#fba43c');
    turretGrad.addColorStop(0.45, isFlash ? '#eee' : '#f97316');
    turretGrad.addColorStop(1, isFlash ? '#bbb' : '#a14a0c');
    ctx.fillStyle = turretGrad;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.1, s * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Turret ring (darker)
    ctx.strokeStyle = isFlash ? '#bbb' : '#8b3d0a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.1, s * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Specular highlight on turret dome
    ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(x - s * 0.15, y - s * 0.3, s * 0.14, 0, Math.PI * 2);
    ctx.fill();

    // Rim lighting on turret — upper-left arc
    ctx.strokeStyle = isFlash ? '#fff' : 'rgba(255,220,180,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.1, s * 0.48, -Math.PI * 0.9, -Math.PI * 0.3);
    ctx.stroke();

    if (!this.dying) {
      // Barrel — metallic sheen gradient
      const barrelGrad = ctx.createLinearGradient(x - s * 0.1, 0, x + s * 0.1, 0);
      barrelGrad.addColorStop(0, isFlash ? '#ccc' : '#475569');
      barrelGrad.addColorStop(0.4, isFlash ? '#eee' : '#94a3b8');
      barrelGrad.addColorStop(1, isFlash ? '#aaa' : '#334155');
      ctx.fillStyle = barrelGrad;
      ctx.fillRect(x - s * 0.1, y + s * 0.3, s * 0.2, s * 0.7);
      // Barrel edge shadow
      ctx.fillStyle = isFlash ? '#999' : '#1e293b';
      ctx.fillRect(x + s * 0.08, y + s * 0.3, s * 0.02, s * 0.7);

      // Muzzle tip (glowing)
      ctx.fillStyle = isFlash ? '#eee' : '#f97316';
      ctx.beginPath();
      ctx.arc(x, y + s * 1.0, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isFlash ? '#fff' : 'rgba(251,191,36,0.3)';
      ctx.beginPath();
      ctx.arc(x, y + s * 1.0, s * 0.18, 0, Math.PI * 2);
      ctx.fill();

      // Viewport slit (emissive glow)
      ctx.fillStyle = 'rgba(251,191,36,0.2)';
      ctx.fillRect(x - s * 0.3, y - s * 0.24, s * 0.6, s * 0.16);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x - s * 0.25, y - s * 0.2, s * 0.5, s * 0.08);

      // Ammo belt (left side) — metallic
      const beltGrad = ctx.createLinearGradient(x - s * 0.7, 0, x - s * 0.58, 0);
      beltGrad.addColorStop(0, isFlash ? '#bbb' : '#5c2a06');
      beltGrad.addColorStop(0.5, isFlash ? '#ddd' : '#9a5a10');
      beltGrad.addColorStop(1, isFlash ? '#aaa' : '#5c2a06');
      ctx.fillStyle = beltGrad;
      ctx.fillRect(x - s * 0.7, y - s * 0.05, s * 0.12, s * 0.35);
      // Belt segments
      ctx.fillStyle = isFlash ? '#eee' : '#fbbf24';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x - s * 0.69, y + i * s * 0.1, s * 0.1, s * 0.04);
      }
    }
  }

  drawMortar(ctx, s, isFlash) {
    // Mobile artillery piece — 3D with detailed treads
    const x = this.x;
    const y = this.y;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.8, s * 1.05, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heavy treads — metallic sheen (dark-light-dark)
    const treadGradL = ctx.createLinearGradient(x - s * 0.95, 0, x - s * 0.65, 0);
    treadGradL.addColorStop(0, isFlash ? '#ccc' : '#1e293b');
    treadGradL.addColorStop(0.35, isFlash ? '#eee' : '#4a5568');
    treadGradL.addColorStop(1, isFlash ? '#bbb' : '#1e293b');
    ctx.fillStyle = treadGradL;
    ctx.fillRect(x - s * 0.95, y + s * 0.15, s * 0.3, s * 0.6);

    const treadGradR = ctx.createLinearGradient(x + s * 0.65, 0, x + s * 0.95, 0);
    treadGradR.addColorStop(0, isFlash ? '#ccc' : '#1e293b');
    treadGradR.addColorStop(0.5, isFlash ? '#eee' : '#4a5568');
    treadGradR.addColorStop(1, isFlash ? '#bbb' : '#2d3748');
    ctx.fillStyle = treadGradR;
    ctx.fillRect(x + s * 0.65, y + s * 0.15, s * 0.3, s * 0.6);

    // Tread teeth
    ctx.fillStyle = isFlash ? '#aaa' : '#0f172a';
    for (let i = 0; i < 5; i++) {
      const ty = y + s * 0.2 + i * s * 0.1;
      ctx.fillRect(x - s * 0.95, ty, s * 0.3, s * 0.03);
      ctx.fillRect(x + s * 0.65, ty, s * 0.3, s * 0.03);
    }

    // Hull body — volumetric gradient (lit top-left)
    const hullGrad = ctx.createLinearGradient(x - s * 0.65, y - s * 0.15, x + s * 0.65, y + s * 0.5);
    hullGrad.addColorStop(0, isFlash ? '#fff' : '#a8420f');
    hullGrad.addColorStop(0.45, isFlash ? '#eee' : '#7c2d12');
    hullGrad.addColorStop(1, isFlash ? '#bbb' : '#4a1a0a');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y - s * 0.15);
    ctx.lineTo(x + s * 0.6, y - s * 0.15);
    ctx.lineTo(x + s * 0.65, y + s * 0.5);
    ctx.lineTo(x - s * 0.65, y + s * 0.5);
    ctx.closePath();
    ctx.fill();

    // Hull bottom edge shadow
    ctx.fillStyle = isFlash ? '#999' : '#2e1208';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.65, y + s * 0.47);
    ctx.lineTo(x + s * 0.65, y + s * 0.47);
    ctx.lineTo(x + s * 0.65, y + s * 0.5);
    ctx.lineTo(x - s * 0.65, y + s * 0.5);
    ctx.closePath();
    ctx.fill();
    // Hull right edge shadow
    ctx.fillStyle = isFlash ? '#aaa' : '#3d1c0a';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.58, y - s * 0.15);
    ctx.lineTo(x + s * 0.6, y - s * 0.15);
    ctx.lineTo(x + s * 0.65, y + s * 0.5);
    ctx.lineTo(x + s * 0.62, y + s * 0.5);
    ctx.closePath();
    ctx.fill();

    // Rim lighting — top edge
    ctx.strokeStyle = isFlash ? '#fff' : 'rgba(255,180,100,0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y - s * 0.15);
    ctx.lineTo(x + s * 0.6, y - s * 0.15);
    ctx.stroke();

    // Hull armor lines
    ctx.strokeStyle = isFlash ? '#ccc' : '#5a200d';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y + s * 0.1);
    ctx.lineTo(x + s * 0.5, y + s * 0.1);
    ctx.moveTo(x - s * 0.5, y + s * 0.3);
    ctx.lineTo(x + s * 0.5, y + s * 0.3);
    ctx.stroke();

    if (!this.dying) {
      // Mortar tube (angled with recoil spring)
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(0.2 * Math.sin(this.animTimer));

      // Recoil cylinder — metallic
      const cylGrad = ctx.createLinearGradient(-s * 0.08, 0, s * 0.08, 0);
      cylGrad.addColorStop(0, isFlash ? '#ccc' : '#334155');
      cylGrad.addColorStop(0.4, isFlash ? '#eee' : '#64748b');
      cylGrad.addColorStop(1, isFlash ? '#aaa' : '#334155');
      ctx.fillStyle = cylGrad;
      ctx.fillRect(-s * 0.08, -s * 0.4, s * 0.16, s * 0.35);

      // Main tube — metallic sheen
      const tubeGrad = ctx.createLinearGradient(-s * 0.12, 0, s * 0.12, 0);
      tubeGrad.addColorStop(0, isFlash ? '#bbb' : '#475569');
      tubeGrad.addColorStop(0.35, isFlash ? '#eee' : '#94a3b8');
      tubeGrad.addColorStop(0.65, isFlash ? '#ddd' : '#7a8a9e');
      tubeGrad.addColorStop(1, isFlash ? '#999' : '#334155');
      ctx.fillStyle = tubeGrad;
      ctx.fillRect(-s * 0.12, -s * 1.4, s * 0.24, s * 1.1);

      // Tube rim light — left edge
      ctx.fillStyle = isFlash ? '#fff' : 'rgba(200,220,255,0.15)';
      ctx.fillRect(-s * 0.12, -s * 1.4, s * 0.03, s * 1.1);

      // Muzzle (glowing)
      const muzzleGrad = ctx.createLinearGradient(-s * 0.18, -s * 1.58, s * 0.18, -s * 1.22);
      muzzleGrad.addColorStop(0, isFlash ? '#fff' : '#fb923c');
      muzzleGrad.addColorStop(1, isFlash ? '#bbb' : '#9a3412');
      ctx.fillStyle = muzzleGrad;
      ctx.beginPath();
      ctx.arc(0, -s * 1.4, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      // Muzzle specular
      ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(-s * 0.05, -s * 1.48, s * 0.06, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Charge indicator
      if (this.mortarChargeTimer > 0) {
        const chargePct = 1 - this.mortarChargeTimer / 2;
        ctx.strokeStyle = `rgba(249,115,22,${0.5 + chargePct * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, s + 4 + chargePct * 6, 0, Math.PI * 2 * chargePct);
        ctx.stroke();
      }

      // Center targeting dot (with glow)
      ctx.fillStyle = 'rgba(251,191,36,0.2)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawDetonator(ctx, s, isFlash) {
    // Suicide bomber — 3D humanoid with explosive vest
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Ground shadow
    ctx.save();
    ctx.rotate(-(this.angle + Math.PI / 2));
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.8, s * 0.6, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs (frantic running) — gradient for volume
    const legGrad = ctx.createLinearGradient(-s * 0.35, s * 0.2, s * 0.35, s * 0.7);
    legGrad.addColorStop(0, isFlash ? '#eee' : '#6b1515');
    legGrad.addColorStop(1, isFlash ? '#aaa' : '#2a0606');
    ctx.fillStyle = legGrad;
    ctx.fillRect(-s * 0.35, s * 0.2, s * 0.22, s * 0.5);
    ctx.fillRect(s * 0.13, s * 0.15, s * 0.22, s * 0.55);
    // Leg edge shadows
    ctx.fillStyle = isFlash ? '#999' : '#1a0404';
    ctx.fillRect(-s * 0.15, s * 0.2, s * 0.02, s * 0.5);
    ctx.fillRect(s * 0.33, s * 0.15, s * 0.02, s * 0.55);

    // Body — gradient lit from top-left
    const bodyGrad = ctx.createLinearGradient(-s * 0.45, -s * 0.6, s * 0.45, s * 0.35);
    bodyGrad.addColorStop(0, isFlash ? '#fff' : '#ef4444');
    bodyGrad.addColorStop(0.45, isFlash ? '#eee' : '#dc2626');
    bodyGrad.addColorStop(1, isFlash ? '#bbb' : '#8b1414');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 0.15);
    ctx.lineTo(-s * 0.45, s * 0.35);
    ctx.lineTo(s * 0.45, s * 0.35);
    ctx.lineTo(s * 0.45, -s * 0.15);
    ctx.arc(0, -s * 0.15, s * 0.45, 0, -Math.PI, true);
    ctx.fill();

    // Body rim lighting — left edge
    ctx.strokeStyle = isFlash ? '#fff' : 'rgba(255,130,130,0.3)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 0.15);
    ctx.lineTo(-s * 0.45, s * 0.35);
    ctx.stroke();

    // Body bottom edge shadow
    ctx.fillStyle = isFlash ? '#999' : '#5c0a0a';
    ctx.fillRect(-s * 0.45, s * 0.32, s * 0.9, s * 0.03);

    // Explosive vest — gradient for depth
    const vestGrad = ctx.createLinearGradient(-s * 0.3, -s * 0.1, s * 0.3, s * 0.25);
    vestGrad.addColorStop(0, isFlash ? '#eee' : '#9a2525');
    vestGrad.addColorStop(0.5, isFlash ? '#ddd' : '#7f1d1d');
    vestGrad.addColorStop(1, isFlash ? '#bbb' : '#4a0e0e');
    ctx.fillStyle = vestGrad;
    ctx.fillRect(-s * 0.3, -s * 0.1, s * 0.6, s * 0.35);

    // Vest edge shadow
    ctx.fillStyle = isFlash ? '#aaa' : '#2e0808';
    ctx.fillRect(-s * 0.3, s * 0.22, s * 0.6, s * 0.03);
    ctx.fillRect(s * 0.27, -s * 0.1, s * 0.03, s * 0.35);

    // Wires on vest
    ctx.strokeStyle = isFlash ? '#ccc' : '#fbbf24';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.05);
    ctx.lineTo(-s * 0.2, s * 0.2);
    ctx.moveTo(0, -s * 0.05);
    ctx.lineTo(0, s * 0.2);
    ctx.moveTo(s * 0.2, -s * 0.05);
    ctx.lineTo(s * 0.2, s * 0.2);
    ctx.stroke();

    // Countdown display on chest
    if (!this.dying) {
      const timeLeft = Math.max(0, Math.ceil(this.fuseTimer));
      // Glow behind text
      ctx.fillStyle = this.fuseStarted ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.15)';
      ctx.beginPath();
      ctx.arc(0, s * 0.08, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.fuseStarted ? (Math.sin(Date.now() / 80) > 0 ? '#fbbf24' : '#ef4444') : '#fbbf24';
      ctx.font = `bold ${s * 0.5}px Outfit`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.fuseStarted ? timeLeft.toString() : '!', 0, s * 0.08);
      ctx.textBaseline = 'alphabetic';
    }

    // Arms (wide apart, frantic) — gradient
    const armGrad = ctx.createLinearGradient(-s * 0.7, -s * 0.2, -s * 0.5, s * 0.15);
    armGrad.addColorStop(0, isFlash ? '#fff' : '#d93030');
    armGrad.addColorStop(1, isFlash ? '#bbb' : '#7a1212');
    ctx.fillStyle = armGrad;
    ctx.save();
    ctx.rotate(-0.4);
    ctx.fillRect(-s * 0.7, -s * 0.2, s * 0.2, s * 0.35);
    ctx.restore();
    ctx.fillStyle = armGrad;
    ctx.save();
    ctx.rotate(0.4);
    ctx.fillRect(s * 0.5, -s * 0.2, s * 0.2, s * 0.35);
    ctx.restore();

    // Head — 3D sphere gradient
    const headGrad = ctx.createLinearGradient(-s * 0.3, -s * 0.85, s * 0.3, -s * 0.25);
    headGrad.addColorStop(0, isFlash ? '#fff' : '#c42a2a');
    headGrad.addColorStop(0.45, isFlash ? '#eee' : '#991b1b');
    headGrad.addColorStop(1, isFlash ? '#bbb' : '#5c1010');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, -s * 0.55, s * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Head specular highlight
    ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(-s * 0.08, -s * 0.68, s * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Rim lighting on head
    ctx.strokeStyle = isFlash ? '#fff' : 'rgba(255,150,150,0.25)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(0, -s * 0.55, s * 0.29, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();

    // Fuse spark on top
    if (!this.dying && this.fuseStarted) {
      const sparkAlpha = 0.5 + Math.sin(Date.now() / 50) * 0.5;
      // Outer glow
      ctx.fillStyle = `rgba(251,191,36,${sparkAlpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(0, -s * 0.9, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(251,191,36,${sparkAlpha})`;
      ctx.beginPath();
      ctx.arc(0, -s * 0.9, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Countdown ring
    if (!this.dying && this.fuseStarted) {
      const fusePct = this.fuseTimer / 3;
      const flash = Math.sin(Date.now() / 80) > 0;
      ctx.strokeStyle = flash ? '#fbbf24' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s + 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fusePct);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawThief(ctx, s, isFlash) {
    // Shadow operative — 3D tactical ninja figure
    const x = this.x;
    const y = this.y;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.85, s * 0.55, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (crouched, tactical) — gradient for volume
    const legGrad = ctx.createLinearGradient(x - s * 0.3, y + s * 0.3, x + s * 0.3, y + s * 0.8);
    legGrad.addColorStop(0, isFlash ? '#ddd' : '#1f2937');
    legGrad.addColorStop(1, isFlash ? '#999' : '#070b12');
    ctx.fillStyle = legGrad;
    ctx.fillRect(x - s * 0.3, y + s * 0.3, s * 0.18, s * 0.5);
    ctx.fillRect(x + s * 0.12, y + s * 0.25, s * 0.18, s * 0.55);
    // Leg edge shadows
    ctx.fillStyle = isFlash ? '#888' : '#030508';
    ctx.fillRect(x - s * 0.14, y + s * 0.3, s * 0.02, s * 0.5);
    ctx.fillRect(x + s * 0.28, y + s * 0.25, s * 0.02, s * 0.55);

    // Body (sleek tactical suit) — gradient lit from top-left
    const bodyGrad = ctx.createLinearGradient(x - s * 0.45, y - s * 0.6, x + s * 0.45, y + s * 0.4);
    bodyGrad.addColorStop(0, isFlash ? '#fff' : '#374151');
    bodyGrad.addColorStop(0.4, isFlash ? '#eee' : '#1f2937');
    bodyGrad.addColorStop(1, isFlash ? '#aaa' : '#0a0f18');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y - s * 0.2);
    ctx.lineTo(x - s * 0.45, y + s * 0.4);
    ctx.lineTo(x + s * 0.45, y + s * 0.4);
    ctx.lineTo(x + s * 0.4, y - s * 0.2);
    ctx.arc(x, y - s * 0.2, s * 0.4, 0, -Math.PI, true);
    ctx.fill();

    // Body rim lighting — left edge
    ctx.strokeStyle = isFlash ? '#fff' : 'rgba(150,160,180,0.2)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y - s * 0.2);
    ctx.lineTo(x - s * 0.45, y + s * 0.4);
    ctx.stroke();

    // Body bottom edge shadow
    ctx.fillStyle = isFlash ? '#888' : '#050810';
    ctx.fillRect(x - s * 0.45, y + s * 0.37, s * 0.9, s * 0.03);

    // Utility belt — metallic gradient
    const beltGrad = ctx.createLinearGradient(x - s * 0.4, y + s * 0.2, x + s * 0.4, y + s * 0.28);
    beltGrad.addColorStop(0, isFlash ? '#ccc' : '#2d3748');
    beltGrad.addColorStop(0.4, isFlash ? '#eee' : '#4a5568');
    beltGrad.addColorStop(1, isFlash ? '#aaa' : '#2d3748');
    ctx.fillStyle = beltGrad;
    ctx.fillRect(x - s * 0.4, y + s * 0.2, s * 0.8, s * 0.08);
    // Belt pouches — with small highlight
    ctx.fillStyle = isFlash ? '#bbb' : '#374151';
    ctx.fillRect(x - s * 0.35, y + s * 0.15, s * 0.12, s * 0.12);
    ctx.fillRect(x + s * 0.23, y + s * 0.15, s * 0.12, s * 0.12);
    ctx.fillStyle = isFlash ? '#eee' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(x - s * 0.35, y + s * 0.15, s * 0.12, s * 0.03);
    ctx.fillRect(x + s * 0.23, y + s * 0.15, s * 0.12, s * 0.03);

    // Arms — gradient
    const armGrad = ctx.createLinearGradient(x - s * 0.55, y - s * 0.1, x - s * 0.4, y + s * 0.25);
    armGrad.addColorStop(0, isFlash ? '#fff' : '#2d3748');
    armGrad.addColorStop(1, isFlash ? '#aaa' : '#0a0f18');
    ctx.fillStyle = armGrad;
    ctx.fillRect(x - s * 0.55, y - s * 0.1, s * 0.15, s * 0.35);
    // Extended reaching arm
    if (this.stealTarget && !this.dying) {
      ctx.fillRect(x + s * 0.4, y - s * 0.15, s * 0.15, s * 0.4);
    } else {
      ctx.fillRect(x + s * 0.4, y - s * 0.1, s * 0.15, s * 0.35);
    }

    // Head with mask — 3D sphere gradient
    const headGrad = ctx.createLinearGradient(x - s * 0.32, y - s * 0.82, x + s * 0.32, y - s * 0.18);
    headGrad.addColorStop(0, isFlash ? '#fff' : '#1f2937');
    headGrad.addColorStop(0.4, isFlash ? '#eee' : '#111827');
    headGrad.addColorStop(1, isFlash ? '#aaa' : '#060910');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Head specular highlight
    ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.arc(x - s * 0.1, y - s * 0.65, s * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Rim lighting on head
    ctx.strokeStyle = isFlash ? '#fff' : 'rgba(180,190,210,0.2)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.31, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();

    // Mask wrap — gradient
    const maskGrad = ctx.createLinearGradient(x - s * 0.35, y - s * 0.55, x + s * 0.35, y - s * 0.43);
    maskGrad.addColorStop(0, isFlash ? '#eee' : '#4a5568');
    maskGrad.addColorStop(1, isFlash ? '#aaa' : '#252e3d');
    ctx.fillStyle = maskGrad;
    ctx.fillRect(x - s * 0.35, y - s * 0.55, s * 0.7, s * 0.12);

    if (!this.dying) {
      // Glowing purple eyes — brighter with glow
      ctx.fillStyle = 'rgba(167,139,250,0.25)';
      ctx.beginPath();
      ctx.arc(x - s * 0.12, y - s * 0.48, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 0.12, y - s * 0.48, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath();
      ctx.arc(x - s * 0.12, y - s * 0.48, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 0.12, y - s * 0.48, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      // Eye specular (white dot)
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(x - s * 0.14, y - s * 0.5, s * 0.025, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 0.1, y - s * 0.5, s * 0.025, 0, Math.PI * 2);
      ctx.fill();

      // Steal indicator
      if (this.stealTarget) {
        ctx.strokeStyle = 'rgba(167,139,250,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(this.stealTarget.x, this.stealTarget.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  drawFlanker(ctx, s, isFlash) {
    // Attack drone — 3D quadcopter with rotors
    const x = this.x;
    const y = this.y;

    // Ground shadow (offset for hovering effect)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.1, y + s * 1.0, s * 0.8, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Motion trail (afterimages)
    if (!this.dying && this.trailX.length > 1) {
      for (let i = 0; i < this.trailX.length - 1; i++) {
        const a = (i + 1) / this.trailX.length * 0.15;
        ctx.globalAlpha *= a;
        ctx.fillStyle = isFlash ? '#eee' : '#991b1b';
        ctx.beginPath();
        ctx.arc(this.trailX[i], this.trailY[i], s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha /= a;
      }
    }

    // X-frame arms — metallic gradient strokes
    const armGrad = ctx.createLinearGradient(x - s * 0.8, y - s * 0.6, x + s * 0.8, y + s * 0.6);
    armGrad.addColorStop(0, isFlash ? '#eee' : '#475569');
    armGrad.addColorStop(0.4, isFlash ? '#fff' : '#94a3b8');
    armGrad.addColorStop(1, isFlash ? '#bbb' : '#334155');
    ctx.strokeStyle = armGrad;
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.8, y - s * 0.6);
    ctx.lineTo(x + s * 0.8, y + s * 0.6);
    ctx.stroke();

    const armGrad2 = ctx.createLinearGradient(x + s * 0.8, y - s * 0.6, x - s * 0.8, y + s * 0.6);
    armGrad2.addColorStop(0, isFlash ? '#eee' : '#475569');
    armGrad2.addColorStop(0.4, isFlash ? '#fff' : '#94a3b8');
    armGrad2.addColorStop(1, isFlash ? '#bbb' : '#334155');
    ctx.strokeStyle = armGrad2;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.8, y - s * 0.6);
    ctx.lineTo(x - s * 0.8, y + s * 0.6);
    ctx.stroke();

    // Central body pod — 3D sphere gradient
    const podGrad = ctx.createLinearGradient(x - s * 0.4, y - s * 0.4, x + s * 0.4, y + s * 0.4);
    podGrad.addColorStop(0, isFlash ? '#fff' : '#c42828');
    podGrad.addColorStop(0.45, isFlash ? '#eee' : '#991b1b');
    podGrad.addColorStop(1, isFlash ? '#bbb' : '#5c1010');
    ctx.fillStyle = podGrad;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Pod specular highlight
    ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(x - s * 0.12, y - s * 0.15, s * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Pod rim lighting — upper-left arc
    ctx.strokeStyle = isFlash ? '#fff' : 'rgba(255,120,120,0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.39, -Math.PI * 0.9, -Math.PI * 0.3);
    ctx.stroke();

    // Inner ring — gradient
    const innerGrad = ctx.createLinearGradient(x - s * 0.25, y - s * 0.25, x + s * 0.25, y + s * 0.25);
    innerGrad.addColorStop(0, isFlash ? '#fff' : '#ef4444');
    innerGrad.addColorStop(1, isFlash ? '#ccc' : '#a81b1b');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Camera/sensor lens — dark with gloss
    const lensGrad = ctx.createLinearGradient(x - s * 0.12, y - s * 0.12, x + s * 0.12, y + s * 0.12);
    lensGrad.addColorStop(0, isFlash ? '#ddd' : '#2d3748');
    lensGrad.addColorStop(1, isFlash ? '#aaa' : '#0a0f18');
    ctx.fillStyle = lensGrad;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // Lens glint
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x - s * 0.03, y - s * 0.03, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
    // Lens specular
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(x - s * 0.04, y - s * 0.04, s * 0.025, 0, Math.PI * 2);
    ctx.fill();

    if (!this.dying) {
      // 4 rotor positions
      const rotorPositions = [
        [x - s * 0.8, y - s * 0.6],
        [x + s * 0.8, y - s * 0.6],
        [x - s * 0.8, y + s * 0.6],
        [x + s * 0.8, y + s * 0.6]
      ];

      // Rotor discs (spinning)
      const rotAngle = this.animTimer * 8;
      for (const [rx, ry] of rotorPositions) {
        // Rotor hub — metallic gradient
        const hubGrad = ctx.createLinearGradient(rx - s * 0.1, ry - s * 0.1, rx + s * 0.1, ry + s * 0.1);
        hubGrad.addColorStop(0, isFlash ? '#eee' : '#64748b');
        hubGrad.addColorStop(1, isFlash ? '#aaa' : '#2d3748');
        ctx.fillStyle = hubGrad;
        ctx.beginPath();
        ctx.arc(rx, ry, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        // Hub specular
        ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(rx - s * 0.03, ry - s * 0.03, s * 0.035, 0, Math.PI * 2);
        ctx.fill();

        // Spinning blades
        ctx.strokeStyle = isFlash ? '#bbb' : 'rgba(148,163,184,0.6)';
        ctx.lineWidth = s * 0.06;
        ctx.beginPath();
        ctx.moveTo(rx + Math.cos(rotAngle) * s * 0.3, ry + Math.sin(rotAngle) * s * 0.3);
        ctx.lineTo(rx - Math.cos(rotAngle) * s * 0.3, ry - Math.sin(rotAngle) * s * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rx + Math.cos(rotAngle + Math.PI / 2) * s * 0.3, ry + Math.sin(rotAngle + Math.PI / 2) * s * 0.3);
        ctx.lineTo(rx - Math.cos(rotAngle + Math.PI / 2) * s * 0.3, ry - Math.sin(rotAngle + Math.PI / 2) * s * 0.3);
        ctx.stroke();
      }

      // Mounted gun underneath — metallic sheen
      const gunGrad = ctx.createLinearGradient(x - s * 0.06, 0, x + s * 0.06, 0);
      gunGrad.addColorStop(0, isFlash ? '#ccc' : '#475569');
      gunGrad.addColorStop(0.4, isFlash ? '#eee' : '#94a3b8');
      gunGrad.addColorStop(1, isFlash ? '#aaa' : '#334155');
      ctx.fillStyle = gunGrad;
      ctx.fillRect(x - s * 0.06, y + s * 0.25, s * 0.12, s * 0.35);
      // Gun edge shadow
      ctx.fillStyle = isFlash ? '#999' : '#1e293b';
      ctx.fillRect(x + s * 0.04, y + s * 0.25, s * 0.02, s * 0.35);

      // Muzzle tip (glowing)
      ctx.fillStyle = isFlash ? '#eee' : '#dc2626';
      ctx.beginPath();
      ctx.arc(x, y + s * 0.6, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isFlash ? '#fff' : 'rgba(220,38,38,0.3)';
      ctx.beginPath();
      ctx.arc(x, y + s * 0.6, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawElite(ctx, s, isFlash) {
    // Heavy mech / power armor — 3D
    const x = this.x;
    const y = this.y;
    const pulse = 1 + Math.sin(this.animTimer * 2) * 0.03;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 1.05, s * 1.1, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shield aura
    if (this.shieldActive) {
      const shieldPulse = 0.3 + Math.sin(this.animTimer * 4) * 0.1;
      ctx.strokeStyle = `rgba(167,139,250,${shieldPulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, s * 1.3 * pulse, s * 1.1 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(124,58,237,${shieldPulse * 0.3})`;
      ctx.fill();
    }

    // Mechanical legs — gradient for metallic armor
    const legGradL = ctx.createLinearGradient(x - s * 0.55, 0, x - s * 0.3, 0);
    legGradL.addColorStop(0, isFlash ? '#eee' : '#2d2460');
    legGradL.addColorStop(0.35, isFlash ? '#fff' : '#4e3da0');
    legGradL.addColorStop(1, isFlash ? '#bbb' : '#2d2460');
    ctx.fillStyle = legGradL;
    ctx.fillRect(x - s * 0.55, y + s * 0.5, s * 0.25, s * 0.5);

    const legGradR = ctx.createLinearGradient(x + s * 0.3, 0, x + s * 0.55, 0);
    legGradR.addColorStop(0, isFlash ? '#eee' : '#2d2460');
    legGradR.addColorStop(0.4, isFlash ? '#fff' : '#4e3da0');
    legGradR.addColorStop(1, isFlash ? '#aaa' : '#1e1850');
    ctx.fillStyle = legGradR;
    ctx.fillRect(x + s * 0.3, y + s * 0.5, s * 0.25, s * 0.5);

    // Leg bottom edge shadows
    ctx.fillStyle = isFlash ? '#999' : '#151040';
    ctx.fillRect(x - s * 0.55, y + s * 0.97, s * 0.25, s * 0.03);
    ctx.fillRect(x + s * 0.3, y + s * 0.97, s * 0.25, s * 0.03);

    // Leg joints — 3D sphere gradient
    const jointGradL = ctx.createLinearGradient(x - s * 0.54, y + s * 0.38, x - s * 0.3, y + s * 0.62);
    jointGradL.addColorStop(0, isFlash ? '#eee' : '#7a6ad0');
    jointGradL.addColorStop(1, isFlash ? '#aaa' : '#3b3080');
    ctx.fillStyle = jointGradL;
    ctx.beginPath();
    ctx.arc(x - s * 0.42, y + s * 0.5, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // Joint specular
    ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(x - s * 0.45, y + s * 0.47, s * 0.04, 0, Math.PI * 2);
    ctx.fill();

    const jointGradR = ctx.createLinearGradient(x + s * 0.3, y + s * 0.38, x + s * 0.54, y + s * 0.62);
    jointGradR.addColorStop(0, isFlash ? '#eee' : '#7a6ad0');
    jointGradR.addColorStop(1, isFlash ? '#aaa' : '#3b3080');
    ctx.fillStyle = jointGradR;
    ctx.beginPath();
    ctx.arc(x + s * 0.42, y + s * 0.5, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // Joint specular
    ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(x + s * 0.39, y + s * 0.47, s * 0.04, 0, Math.PI * 2);
    ctx.fill();

    // Feet — metallic gradient
    const footGrad = ctx.createLinearGradient(0, y + s * 0.9, 0, y + s * 1.02);
    footGrad.addColorStop(0, isFlash ? '#ccc' : '#3b3080');
    footGrad.addColorStop(1, isFlash ? '#888' : '#151040');
    ctx.fillStyle = footGrad;
    ctx.fillRect(x - s * 0.65, y + s * 0.9, s * 0.4, s * 0.12);
    ctx.fillRect(x + s * 0.25, y + s * 0.9, s * 0.4, s * 0.12);
    // Foot rim lighting — top edge
    ctx.fillStyle = isFlash ? '#fff' : 'rgba(180,160,255,0.15)';
    ctx.fillRect(x - s * 0.65, y + s * 0.9, s * 0.4, s * 0.02);
    ctx.fillRect(x + s * 0.25, y + s * 0.9, s * 0.4, s * 0.02);

    // Body — hexagonal armored chassis with gradient
    // Outer hex — gradient from top-left to bottom-right
    const hexGrad = ctx.createLinearGradient(x - s, y - s * 0.85, x + s, y + s * 0.85);
    hexGrad.addColorStop(0, isFlash ? '#fff' : '#6d3ab8');
    hexGrad.addColorStop(0.4, isFlash ? '#eee' : '#4c1d95');
    hexGrad.addColorStop(1, isFlash ? '#bbb' : '#2a1060');
    ctx.fillStyle = hexGrad;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * s * pulse;
      const py = y + Math.sin(a) * s * 0.85 * pulse;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Hex bottom edge shadow
    ctx.strokeStyle = isFlash ? '#999' : '#1a0d40';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const a4 = (4 / 6) * Math.PI * 2 - Math.PI / 2;
    const a3 = (3 / 6) * Math.PI * 2 - Math.PI / 2;
    const a2 = (2 / 6) * Math.PI * 2 - Math.PI / 2;
    ctx.moveTo(x + Math.cos(a2) * s * pulse, y + Math.sin(a2) * s * 0.85 * pulse);
    ctx.lineTo(x + Math.cos(a3) * s * pulse, y + Math.sin(a3) * s * 0.85 * pulse);
    ctx.lineTo(x + Math.cos(a4) * s * pulse, y + Math.sin(a4) * s * 0.85 * pulse);
    ctx.stroke();

    // Hex rim lighting — upper-left edges
    ctx.strokeStyle = isFlash ? '#fff' : 'rgba(180,160,255,0.3)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const a0 = (0 / 6) * Math.PI * 2 - Math.PI / 2;
    const a5 = (5 / 6) * Math.PI * 2 - Math.PI / 2;
    const a0x = x + Math.cos(a0) * s * pulse, a0y = y + Math.sin(a0) * s * 0.85 * pulse;
    const a5x = x + Math.cos(a5) * s * pulse, a5y = y + Math.sin(a5) * s * 0.85 * pulse;
    const a4x = x + Math.cos(a4) * s * pulse, a4y = y + Math.sin(a4) * s * 0.85 * pulse;
    ctx.moveTo(a4x, a4y);
    ctx.lineTo(a5x, a5y);
    ctx.lineTo(a0x, a0y);
    ctx.stroke();

    // Inner armor plates — gradient
    const innerGrad = ctx.createLinearGradient(x - s * 0.7, y - s * 0.6, x + s * 0.7, y + s * 0.6);
    innerGrad.addColorStop(0, isFlash ? '#fff' : '#9b6de8');
    innerGrad.addColorStop(0.4, isFlash ? '#eee' : '#7c3aed');
    innerGrad.addColorStop(1, isFlash ? '#bbb' : '#4a1da0');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * s * 0.7;
      const py = y + Math.sin(a) * s * 0.6;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Panel lines
    ctx.strokeStyle = isFlash ? '#ccc' : '#5b21b6';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y);
    ctx.lineTo(x + s * 0.5, y);
    ctx.moveTo(x, y - s * 0.5);
    ctx.lineTo(x, y + s * 0.4);
    ctx.stroke();

    // Body center specular
    ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.ellipse(x - s * 0.15, y - s * 0.2, s * 0.2, s * 0.12, -0.3, 0, Math.PI * 2);
    ctx.fill();

    if (!this.dying) {
      // Shoulder-mounted missile pods — gradient with metallic sheen
      // Left pylon
      const pylonGradL = ctx.createLinearGradient(x - s * 1.1, 0, x - s * 0.8, 0);
      pylonGradL.addColorStop(0, isFlash ? '#ccc' : '#2d2460');
      pylonGradL.addColorStop(0.4, isFlash ? '#eee' : '#4e3da0');
      pylonGradL.addColorStop(1, isFlash ? '#aaa' : '#2d2460');
      ctx.fillStyle = pylonGradL;
      ctx.fillRect(x - s * 1.1, y - s * 0.5, s * 0.3, s * 0.6);
      // Pylon edge shadow
      ctx.fillStyle = isFlash ? '#999' : '#151040';
      ctx.fillRect(x - s * 1.1, y + s * 0.07, s * 0.3, s * 0.03);
      // Pylon rim light — top
      ctx.fillStyle = isFlash ? '#fff' : 'rgba(180,160,255,0.2)';
      ctx.fillRect(x - s * 1.1, y - s * 0.5, s * 0.3, s * 0.02);
      // Missile tip
      ctx.fillStyle = isFlash ? '#eee' : '#a78bfa';
      ctx.beginPath();
      ctx.arc(x - s * 0.95, y - s * 0.5, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(x - s * 0.97, y - s * 0.52, s * 0.03, 0, Math.PI * 2);
      ctx.fill();

      // Right pylon
      const pylonGradR = ctx.createLinearGradient(x + s * 0.8, 0, x + s * 1.1, 0);
      pylonGradR.addColorStop(0, isFlash ? '#ccc' : '#2d2460');
      pylonGradR.addColorStop(0.5, isFlash ? '#eee' : '#4e3da0');
      pylonGradR.addColorStop(1, isFlash ? '#aaa' : '#1e1850');
      ctx.fillStyle = pylonGradR;
      ctx.fillRect(x + s * 0.8, y - s * 0.5, s * 0.3, s * 0.6);
      // Pylon edge shadow
      ctx.fillStyle = isFlash ? '#999' : '#151040';
      ctx.fillRect(x + s * 0.8, y + s * 0.07, s * 0.3, s * 0.03);
      // Pylon rim light — top
      ctx.fillStyle = isFlash ? '#fff' : 'rgba(180,160,255,0.2)';
      ctx.fillRect(x + s * 0.8, y - s * 0.5, s * 0.3, s * 0.02);
      // Missile tip
      ctx.fillStyle = isFlash ? '#eee' : '#a78bfa';
      ctx.beginPath();
      ctx.arc(x + s * 0.95, y - s * 0.5, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isFlash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(x + s * 0.93, y - s * 0.52, s * 0.03, 0, Math.PI * 2);
      ctx.fill();

      // 3 cannon barrels — metallic sheen gradient
      const barrelGradC = ctx.createLinearGradient(x - s * 0.08, 0, x + s * 0.08, 0);
      barrelGradC.addColorStop(0, isFlash ? '#bbb' : '#475569');
      barrelGradC.addColorStop(0.4, isFlash ? '#eee' : '#94a3b8');
      barrelGradC.addColorStop(1, isFlash ? '#999' : '#334155');
      ctx.fillStyle = barrelGradC;
      ctx.fillRect(x - s * 0.08, y + s * 0.4, s * 0.16, s * 0.55);

      const barrelGradL = ctx.createLinearGradient(x - s * 0.4, 0, x - s * 0.28, 0);
      barrelGradL.addColorStop(0, isFlash ? '#bbb' : '#475569');
      barrelGradL.addColorStop(0.4, isFlash ? '#ddd' : '#8293a8');
      barrelGradL.addColorStop(1, isFlash ? '#999' : '#334155');
      ctx.fillStyle = barrelGradL;
      ctx.fillRect(x - s * 0.4, y + s * 0.35, s * 0.12, s * 0.45);

      const barrelGradR = ctx.createLinearGradient(x + s * 0.28, 0, x + s * 0.4, 0);
      barrelGradR.addColorStop(0, isFlash ? '#bbb' : '#475569');
      barrelGradR.addColorStop(0.5, isFlash ? '#ddd' : '#8293a8');
      barrelGradR.addColorStop(1, isFlash ? '#999' : '#334155');
      ctx.fillStyle = barrelGradR;
      ctx.fillRect(x + s * 0.28, y + s * 0.35, s * 0.12, s * 0.45);

      // Barrel edge shadows
      ctx.fillStyle = isFlash ? '#888' : '#1e293b';
      ctx.fillRect(x + s * 0.06, y + s * 0.4, s * 0.02, s * 0.55);
      ctx.fillRect(x - s * 0.29, y + s * 0.35, s * 0.01, s * 0.45);
      ctx.fillRect(x + s * 0.39, y + s * 0.35, s * 0.01, s * 0.45);

      // Muzzle tips (glowing)
      ctx.fillStyle = 'rgba(167,139,250,0.3)';
      ctx.beginPath();
      ctx.arc(x, y + s * 0.95, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath();
      ctx.arc(x, y + s * 0.95, s * 0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(167,139,250,0.25)';
      ctx.beginPath();
      ctx.arc(x - s * 0.34, y + s * 0.8, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath();
      ctx.arc(x - s * 0.34, y + s * 0.8, s * 0.06, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(167,139,250,0.25)';
      ctx.beginPath();
      ctx.arc(x + s * 0.34, y + s * 0.8, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath();
      ctx.arc(x + s * 0.34, y + s * 0.8, s * 0.06, 0, Math.PI * 2);
      ctx.fill();

      // HUD visor — emissive glass gradient
      const eyePulse = 0.8 + Math.sin(this.animTimer * 3) * 0.2;
      // Visor glow behind
      ctx.fillStyle = `rgba(167,139,250,${0.15 + eyePulse * 0.1})`;
      ctx.fillRect(x - s * 0.4, y - s * 0.3, s * 0.8, s * 0.25);
      // Main visor
      const visorGrad = ctx.createLinearGradient(x - s * 0.35, y - s * 0.25, x + s * 0.35, y - s * 0.1);
      visorGrad.addColorStop(0, `rgba(210,200,255,${0.6 + eyePulse * 0.3})`);
      visorGrad.addColorStop(0.5, `rgba(196,181,253,${0.5 + eyePulse * 0.3})`);
      visorGrad.addColorStop(1, `rgba(140,120,230,${0.4 + eyePulse * 0.2})`);
      ctx.fillStyle = visorGrad;
      ctx.fillRect(x - s * 0.35, y - s * 0.25, s * 0.7, s * 0.15);
      // Visor specular
      ctx.fillStyle = `rgba(255,255,255,${0.15 + eyePulse * 0.1})`;
      ctx.fillRect(x - s * 0.3, y - s * 0.24, s * 0.25, s * 0.04);
      // Visor scanline
      ctx.fillStyle = `rgba(255,255,255,${0.2 + eyePulse * 0.15})`;
      const scanY = y - s * 0.25 + (Math.sin(this.animTimer * 2) * 0.5 + 0.5) * s * 0.12;
      ctx.fillRect(x - s * 0.3, scanY, s * 0.6, s * 0.02);

      // Shield HP bar
      if (this.shieldMaxHp > 0) {
        const sBarW = s * 2.4;
        const sPct = Math.max(0, this.shieldHp / this.shieldMaxHp);
        const sbx = x - sBarW / 2;
        const sby = y - s - 14;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(sbx, sby, sBarW, 2.5);
        ctx.fillStyle = this.shieldActive ? '#a78bfa' : '#334155';
        ctx.fillRect(sbx, sby, sBarW * sPct, 2.5);
      }
    }

    // HP bar for elite
    if (!this.dying) {
      const barW = s * 2.4;
      const barH = 3.5;
      const bx = x - barW / 2;
      const by = y - s - 9;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx - 0.5, by - 0.5, barW + 1, barH + 1);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx, by, barW, barH);
      const pct = this.hp / this.maxHp;
      ctx.fillStyle = pct > 0.5 ? '#ef4444' : pct > 0.25 ? '#f97316' : '#fbbf24';
      ctx.fillRect(bx, by, barW * pct, barH);
    }
  }
}
