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
    const s = this.size;

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
      const barW = s * 2.2;
      const barH = 2.5;
      const bx = this.x - barW / 2;
      const by = this.y - s - 7;
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
    // Zombie soldier — humanoid rushing figure
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

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

    // Legs (running stance)
    ctx.fillStyle = isFlash ? '#ddd' : '#4a1010';
    ctx.fillRect(-s * 0.3, s * 0.2, s * 0.2, s * 0.5);
    ctx.fillRect(s * 0.1, s * 0.15, s * 0.2, s * 0.55);

    // Body (hunched torso with torn armor)
    ctx.fillStyle = isFlash ? '#fff' : '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.lineTo(-s * 0.55, s * 0.1);
    ctx.lineTo(-s * 0.45, s * 0.35);
    ctx.lineTo(s * 0.45, s * 0.35);
    ctx.lineTo(s * 0.55, s * 0.1);
    ctx.closePath();
    ctx.fill();

    // Torn armor plates (damage marks)
    ctx.fillStyle = isFlash ? '#eee' : '#7f1d1d';
    ctx.fillRect(-s * 0.3, -s * 0.2, s * 0.6, s * 0.25);
    // Scratch lines
    ctx.strokeStyle = isFlash ? '#ddd' : '#991b1b';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.4);
    ctx.lineTo(s * 0.1, s * 0.1);
    ctx.moveTo(s * 0.15, -s * 0.3);
    ctx.lineTo(-s * 0.05, s * 0.05);
    ctx.stroke();

    // Arms reaching forward
    ctx.fillStyle = isFlash ? '#eee' : '#a91c1c';
    ctx.fillRect(-s * 0.65, -s * 0.4, s * 0.18, s * 0.5);
    ctx.fillRect(s * 0.47, -s * 0.35, s * 0.18, s * 0.45);

    // Head (cracked helmet)
    ctx.fillStyle = isFlash ? '#eee' : '#991b1b';
    ctx.beginPath();
    ctx.arc(0, -s * 0.65, s * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Cracked helmet top
    ctx.fillStyle = isFlash ? '#ddd' : '#5c1010';
    ctx.beginPath();
    ctx.arc(0, -s * 0.7, s * 0.38, -Math.PI, 0);
    ctx.fill();
    // Crack line
    ctx.strokeStyle = isFlash ? '#ccc' : '#ef4444';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-s * 0.05, -s * 1.05);
    ctx.lineTo(s * 0.1, -s * 0.65);
    ctx.stroke();

    // Angry V-shaped eye
    if (!this.dying) {
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
    // Gun turret emplacement with tracked base
    const x = this.x;
    const y = this.y;

    // Treads (two parallel tracks)
    ctx.fillStyle = isFlash ? '#ddd' : '#334155';
    ctx.fillRect(x - s * 0.9, y + s * 0.1, s * 0.25, s * 0.8);
    ctx.fillRect(x + s * 0.65, y + s * 0.1, s * 0.25, s * 0.8);
    // Tread segments
    ctx.strokeStyle = isFlash ? '#ccc' : '#475569';
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

    // Body platform
    ctx.fillStyle = isFlash ? '#fff' : '#92400e';
    ctx.fillRect(x - s * 0.65, y - s * 0.1, s * 1.3, s * 0.7);

    // Rivets on body
    if (!this.dying) {
      ctx.fillStyle = isFlash ? '#ddd' : '#78350f';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x - s * 0.4 + i * s * 0.4, y + s * 0.45, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Turret dome
    ctx.fillStyle = isFlash ? '#eee' : '#f97316';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.1, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Turret ring
    ctx.strokeStyle = isFlash ? '#ddd' : '#c2410c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.1, s * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    if (!this.dying) {
      // Barrel (pointing down toward player)
      ctx.fillStyle = isFlash ? '#bbb' : '#64748b';
      ctx.fillRect(x - s * 0.1, y + s * 0.3, s * 0.2, s * 0.7);
      // Muzzle tip
      ctx.fillStyle = isFlash ? '#eee' : '#f97316';
      ctx.beginPath();
      ctx.arc(x, y + s * 1.0, s * 0.12, 0, Math.PI * 2);
      ctx.fill();

      // Viewport slit
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x - s * 0.25, y - s * 0.2, s * 0.5, s * 0.08);

      // Ammo belt (left side)
      ctx.fillStyle = isFlash ? '#ccc' : '#78350f';
      ctx.fillRect(x - s * 0.7, y - s * 0.05, s * 0.12, s * 0.35);
      // Belt segments
      ctx.fillStyle = isFlash ? '#eee' : '#fbbf24';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x - s * 0.69, y + i * s * 0.1, s * 0.1, s * 0.04);
      }
    }
  }

  drawMortar(ctx, s, isFlash) {
    // Mobile artillery piece with detailed treads
    const x = this.x;
    const y = this.y;

    // Heavy treads (wider, segmented)
    ctx.fillStyle = isFlash ? '#ddd' : '#334155';
    ctx.fillRect(x - s * 0.95, y + s * 0.15, s * 0.3, s * 0.6);
    ctx.fillRect(x + s * 0.65, y + s * 0.15, s * 0.3, s * 0.6);
    // Tread teeth
    ctx.fillStyle = isFlash ? '#ccc' : '#1e293b';
    for (let i = 0; i < 5; i++) {
      const ty = y + s * 0.2 + i * s * 0.1;
      ctx.fillRect(x - s * 0.95, ty, s * 0.3, s * 0.03);
      ctx.fillRect(x + s * 0.65, ty, s * 0.3, s * 0.03);
    }

    // Hull body (rounded rectangle)
    ctx.fillStyle = isFlash ? '#fff' : '#7c2d12';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y - s * 0.15);
    ctx.lineTo(x + s * 0.6, y - s * 0.15);
    ctx.lineTo(x + s * 0.65, y + s * 0.5);
    ctx.lineTo(x - s * 0.65, y + s * 0.5);
    ctx.closePath();
    ctx.fill();

    // Hull armor lines
    ctx.strokeStyle = isFlash ? '#eee' : '#6b2510';
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
      // Recoil cylinder
      ctx.fillStyle = isFlash ? '#ccc' : '#475569';
      ctx.fillRect(-s * 0.08, -s * 0.4, s * 0.16, s * 0.35);
      // Main tube
      ctx.fillStyle = isFlash ? '#bbb' : '#64748b';
      ctx.fillRect(-s * 0.12, -s * 1.4, s * 0.24, s * 1.1);
      // Muzzle
      ctx.fillStyle = isFlash ? '#eee' : '#ea580c';
      ctx.beginPath();
      ctx.arc(0, -s * 1.4, s * 0.18, 0, Math.PI * 2);
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

      // Center targeting dot
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawDetonator(ctx, s, isFlash) {
    // Suicide bomber — humanoid with explosive vest
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Legs (frantic running)
    ctx.fillStyle = isFlash ? '#ddd' : '#4a1010';
    ctx.fillRect(-s * 0.35, s * 0.2, s * 0.22, s * 0.5);
    ctx.fillRect(s * 0.13, s * 0.15, s * 0.22, s * 0.55);

    // Body
    ctx.fillStyle = isFlash ? '#eee' : '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 0.15);
    ctx.lineTo(-s * 0.45, s * 0.35);
    ctx.lineTo(s * 0.45, s * 0.35);
    ctx.lineTo(s * 0.45, -s * 0.15);
    ctx.arc(0, -s * 0.15, s * 0.45, 0, -Math.PI, true);
    ctx.fill();

    // Explosive vest (rectangular chest piece)
    ctx.fillStyle = isFlash ? '#ddd' : '#7f1d1d';
    ctx.fillRect(-s * 0.3, -s * 0.1, s * 0.6, s * 0.35);
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
      ctx.fillStyle = this.fuseStarted ? (Math.sin(Date.now() / 80) > 0 ? '#fbbf24' : '#ef4444') : '#fbbf24';
      ctx.font = `bold ${s * 0.5}px Outfit`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.fuseStarted ? timeLeft.toString() : '!', 0, s * 0.08);
      ctx.textBaseline = 'alphabetic';
    }

    // Arms (wide apart, frantic)
    ctx.fillStyle = isFlash ? '#eee' : '#b91c1c';
    ctx.save();
    ctx.rotate(-0.4);
    ctx.fillRect(-s * 0.7, -s * 0.2, s * 0.2, s * 0.35);
    ctx.restore();
    ctx.save();
    ctx.rotate(0.4);
    ctx.fillRect(s * 0.5, -s * 0.2, s * 0.2, s * 0.35);
    ctx.restore();

    // Head
    ctx.fillStyle = isFlash ? '#eee' : '#991b1b';
    ctx.beginPath();
    ctx.arc(0, -s * 0.55, s * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Fuse spark on top
    if (!this.dying && this.fuseStarted) {
      const sparkAlpha = 0.5 + Math.sin(Date.now() / 50) * 0.5;
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
    // Shadow operative — tactical ninja figure
    const x = this.x;
    const y = this.y;

    // Legs (crouched, tactical)
    ctx.fillStyle = isFlash ? '#ccc' : '#111827';
    ctx.fillRect(x - s * 0.3, y + s * 0.3, s * 0.18, s * 0.5);
    ctx.fillRect(x + s * 0.12, y + s * 0.25, s * 0.18, s * 0.55);

    // Body (sleek tactical suit)
    ctx.fillStyle = isFlash ? '#fff' : '#1f2937';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y - s * 0.2);
    ctx.lineTo(x - s * 0.45, y + s * 0.4);
    ctx.lineTo(x + s * 0.45, y + s * 0.4);
    ctx.lineTo(x + s * 0.4, y - s * 0.2);
    ctx.arc(x, y - s * 0.2, s * 0.4, 0, -Math.PI, true);
    ctx.fill();

    // Utility belt
    ctx.fillStyle = isFlash ? '#bbb' : '#374151';
    ctx.fillRect(x - s * 0.4, y + s * 0.2, s * 0.8, s * 0.08);
    // Belt pouches
    ctx.fillRect(x - s * 0.35, y + s * 0.15, s * 0.12, s * 0.12);
    ctx.fillRect(x + s * 0.23, y + s * 0.15, s * 0.12, s * 0.12);

    // Arms
    ctx.fillStyle = isFlash ? '#eee' : '#1f2937';
    ctx.fillRect(x - s * 0.55, y - s * 0.1, s * 0.15, s * 0.35);
    // Extended reaching arm
    if (this.stealTarget && !this.dying) {
      ctx.fillRect(x + s * 0.4, y - s * 0.15, s * 0.15, s * 0.4);
    } else {
      ctx.fillRect(x + s * 0.4, y - s * 0.1, s * 0.15, s * 0.35);
    }

    // Head with mask
    ctx.fillStyle = isFlash ? '#eee' : '#111827';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
    // Mask wrap
    ctx.fillStyle = isFlash ? '#ddd' : '#374151';
    ctx.fillRect(x - s * 0.35, y - s * 0.55, s * 0.7, s * 0.12);

    if (!this.dying) {
      // Glowing purple eyes
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath();
      ctx.arc(x - s * 0.12, y - s * 0.48, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 0.12, y - s * 0.48, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      // Eye glow
      ctx.fillStyle = 'rgba(167,139,250,0.3)';
      ctx.beginPath();
      ctx.arc(x - s * 0.12, y - s * 0.48, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 0.12, y - s * 0.48, s * 0.14, 0, Math.PI * 2);
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
    // Attack drone — quadcopter with rotors
    const x = this.x;
    const y = this.y;

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

    // X-frame arms
    ctx.strokeStyle = isFlash ? '#ddd' : '#64748b';
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.8, y - s * 0.6);
    ctx.lineTo(x + s * 0.8, y + s * 0.6);
    ctx.moveTo(x + s * 0.8, y - s * 0.6);
    ctx.lineTo(x - s * 0.8, y + s * 0.6);
    ctx.stroke();

    // Central body pod
    ctx.fillStyle = isFlash ? '#fff' : '#991b1b';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Inner ring
    ctx.fillStyle = isFlash ? '#eee' : '#dc2626';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Camera/sensor lens
    ctx.fillStyle = isFlash ? '#ddd' : '#1e293b';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // Lens glint
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x - s * 0.03, y - s * 0.03, s * 0.04, 0, Math.PI * 2);
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
        // Rotor hub
        ctx.fillStyle = isFlash ? '#ccc' : '#475569';
        ctx.beginPath();
        ctx.arc(rx, ry, s * 0.1, 0, Math.PI * 2);
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

      // Mounted gun underneath (pointing down)
      ctx.fillStyle = isFlash ? '#bbb' : '#64748b';
      ctx.fillRect(x - s * 0.06, y + s * 0.25, s * 0.12, s * 0.35);
      ctx.fillStyle = isFlash ? '#eee' : '#dc2626';
      ctx.beginPath();
      ctx.arc(x, y + s * 0.6, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawElite(ctx, s, isFlash) {
    // Heavy mech / power armor
    const x = this.x;
    const y = this.y;
    const pulse = 1 + Math.sin(this.animTimer * 2) * 0.03;

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

    // Mechanical legs (two thick supports)
    ctx.fillStyle = isFlash ? '#ddd' : '#3b3275';
    ctx.fillRect(x - s * 0.55, y + s * 0.5, s * 0.25, s * 0.5);
    ctx.fillRect(x + s * 0.3, y + s * 0.5, s * 0.25, s * 0.5);
    // Leg joints
    ctx.fillStyle = isFlash ? '#ccc' : '#5b4dad';
    ctx.beginPath();
    ctx.arc(x - s * 0.42, y + s * 0.5, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + s * 0.42, y + s * 0.5, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // Feet
    ctx.fillStyle = isFlash ? '#bbb' : '#2d2460';
    ctx.fillRect(x - s * 0.65, y + s * 0.9, s * 0.4, s * 0.12);
    ctx.fillRect(x + s * 0.25, y + s * 0.9, s * 0.4, s * 0.12);

    // Body — hexagonal armored chassis
    ctx.fillStyle = isFlash ? '#fff' : '#4c1d95';
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

    // Inner armor plates with panel lines
    ctx.fillStyle = isFlash ? '#eee' : '#7c3aed';
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
    ctx.strokeStyle = isFlash ? '#ddd' : '#5b21b6';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y);
    ctx.lineTo(x + s * 0.5, y);
    ctx.moveTo(x, y - s * 0.5);
    ctx.lineTo(x, y + s * 0.4);
    ctx.stroke();

    if (!this.dying) {
      // Shoulder-mounted missile pods
      ctx.fillStyle = isFlash ? '#ccc' : '#3b3275';
      // Left pylon
      ctx.fillRect(x - s * 1.1, y - s * 0.5, s * 0.3, s * 0.6);
      ctx.fillStyle = isFlash ? '#eee' : '#a78bfa';
      ctx.beginPath();
      ctx.arc(x - s * 0.95, y - s * 0.5, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      // Right pylon
      ctx.fillStyle = isFlash ? '#ccc' : '#3b3275';
      ctx.fillRect(x + s * 0.8, y - s * 0.5, s * 0.3, s * 0.6);
      ctx.fillStyle = isFlash ? '#eee' : '#a78bfa';
      ctx.beginPath();
      ctx.arc(x + s * 0.95, y - s * 0.5, s * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // 3 cannon barrels (bottom)
      ctx.fillStyle = isFlash ? '#bbb' : '#64748b';
      ctx.fillRect(x - s * 0.08, y + s * 0.4, s * 0.16, s * 0.55);
      ctx.fillRect(x - s * 0.4, y + s * 0.35, s * 0.12, s * 0.45);
      ctx.fillRect(x + s * 0.28, y + s * 0.35, s * 0.12, s * 0.45);
      // Muzzle tips
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath();
      ctx.arc(x, y + s * 0.95, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - s * 0.34, y + s * 0.8, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 0.34, y + s * 0.8, s * 0.06, 0, Math.PI * 2);
      ctx.fill();

      // HUD visor (rectangular cockpit window)
      const eyePulse = 0.8 + Math.sin(this.animTimer * 3) * 0.2;
      ctx.fillStyle = `rgba(196,181,253,${0.5 + eyePulse * 0.3})`;
      ctx.fillRect(x - s * 0.35, y - s * 0.25, s * 0.7, s * 0.15);
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
