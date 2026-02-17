// Road Shooter - Boss Entity (Multi-type)
class Boss {
  constructor(type = 'zombieTitan', stageMul = 1) {
    const cfg = CONFIG.BOSS[type];
    this.type = type;
    this.name = cfg.name || type;
    this.hp = Math.ceil(cfg.hp * stageMul);
    this.maxHp = this.hp;
    this.size = cfg.size;
    this.color = cfg.color;
    this.phases = cfg.phases;
    this.active = true;
    this.dying = false;
    this.deathTimer = 0;

    // Position
    this.x = CONFIG.CANVAS_WIDTH / 2;
    this.y = -this.size * 2;
    this.targetY = 80;
    this.entered = false;

    // Phase
    this.phase = 0;
    this.attackTimer = 2000;
    this.flashTimer = 0;
    this.weakSpotTimer = 0;
    this.weakSpotActive = false;

    // Shared attack state
    this.currentAttack = null;
    this.shockwaveRadius = 0;
    this.shockwaveActive = false;
    this.summonQueue = 0;
    this.chargeSpeed = 0;
    this.charging = false;
    this.moveDir = 1;
    this.moveTimer = 0;

    // War Machine specific
    this.bulletQueue = [];
    this.shielded = false;
    this.shieldTimer = 0;
    this.missileWarnings = [];
  }

  get hpPercent() { return this.hp / this.maxHp; }

  update(dt, squadX, squadY) {
    if (this.dying) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.active = false;
      return;
    }

    // Enter animation
    if (!this.entered) {
      this.y += (this.targetY - this.y) * 0.03;
      if (Math.abs(this.y - this.targetY) < 2) {
        this.entered = true;
        this.y = this.targetY;
      }
      return;
    }

    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.weakSpotTimer > 0) {
      this.weakSpotTimer -= dt;
      if (this.weakSpotTimer <= 0) this.weakSpotActive = false;
    }

    // Shield timer (War Machine)
    if (this.shielded) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shielded = false;
        this.weakSpotActive = true;
        this.weakSpotTimer = 3;
      }
    }

    // Missile warnings decay
    for (let i = this.missileWarnings.length - 1; i >= 0; i--) {
      this.missileWarnings[i].timer -= dt;
      if (this.missileWarnings[i].timer <= 0) {
        this.missileWarnings.splice(i, 1);
      }
    }

    this.updatePhase();

    // Movement
    this.moveTimer += dt;
    this.x += Math.sin(this.moveTimer * 1.5) * 1.5;

    // Attack timer
    this.attackTimer -= dt * 1000;
    if (this.attackTimer <= 0) {
      this.performAttack(squadX, squadY);
    }

    // Shockwave expand
    if (this.shockwaveActive) {
      this.shockwaveRadius += 4;
      if (this.shockwaveRadius > 300) this.shockwaveActive = false;
    }

    // Charge movement
    if (this.charging) {
      this.y += this.chargeSpeed;
      if (this.y > CONFIG.CANVAS_HEIGHT * 0.6) {
        this.charging = false;
        this.y = this.targetY;
        if (!this.shielded) {
          this.weakSpotActive = true;
          this.weakSpotTimer = 3;
        }
      }
    }
  }

  updatePhase() {
    const pct = this.hpPercent;
    for (let i = this.phases.length - 1; i >= 0; i--) {
      if (pct <= this.phases[i].threshold + 0.34) {
        if (this.phase < i) this.phase = i;
        break;
      }
    }
  }

  performAttack(squadX, squadY) {
    const phase = this.phases[Math.min(this.phase, this.phases.length - 1)];
    this.attackTimer = phase.interval;
    this.currentAttack = phase.attack;

    switch (phase.attack) {
      // Zombie Titan attacks
      case 'shockwave':
        this.shockwaveActive = true;
        this.shockwaveRadius = 0;
        break;
      case 'summon':
        this.summonQueue = 3;
        setTimeout(() => {
          this.weakSpotActive = true;
          this.weakSpotTimer = 3;
        }, 2000);
        break;
      case 'charge':
        this.charging = true;
        this.chargeSpeed = 4;
        break;

      // War Machine attacks
      case 'gatling': {
        // Fire 5 bullets in a spread
        const spread = 0.4;
        for (let i = 0; i < 5; i++) {
          const angle = Math.PI / 2 + (i - 2) * spread;
          this.bulletQueue.push({
            x: this.x, y: this.y + this.size,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            dmg: 1, delay: i * 100
          });
        }
        break;
      }
      case 'missiles': {
        // 3 mortar-style area warnings
        const cw = CONFIG.CANVAS_WIDTH;
        for (let i = 0; i < 3; i++) {
          const tx = 60 + Math.random() * (cw - 120);
          const ty = 400 + Math.random() * 200;
          this.missileWarnings.push({ x: tx, y: ty, timer: 1.5, dmg: 3, radius: 50 });
        }
        // Vulnerable after missiles
        setTimeout(() => {
          this.weakSpotActive = true;
          this.weakSpotTimer = 2;
        }, 1500);
        break;
      }
      case 'shield_rush':
        this.shielded = true;
        this.shieldTimer = 4;
        this.charging = true;
        this.chargeSpeed = 3;
        break;
    }
  }

  takeDamage(dmg) {
    if (this.dying || this.shielded) return false;
    const actualDmg = this.weakSpotActive ? dmg * 2 : dmg;
    this.hp -= actualDmg;
    this.flashTimer = 0.1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      this.deathTimer = 1.5;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (!this.active) return;
    const alpha = this.dying ? this.deathTimer / 1.5 : 1;
    ctx.globalAlpha = alpha;

    // Shockwave
    if (this.shockwaveActive) {
      ctx.strokeStyle = `rgba(239,68,68,${1 - this.shockwaveRadius / 300})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.shockwaveRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Missile warnings
    for (const m of this.missileWarnings) {
      const a = Math.sin(Date.now() / 100) * 0.3 + 0.4;
      ctx.fillStyle = `rgba(239,68,68,${a})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const s = this.size;
    ctx.fillStyle = this.flashTimer > 0 ? '#fff' : this.color;

    if (this.type === 'warMachine') {
      this.drawWarMachine(ctx, s);
    } else {
      this.drawZombieTitan(ctx, s);
    }

    // Shield visual
    if (this.shielded) {
      ctx.strokeStyle = 'rgba(100,200,255,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, s + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // HP Bar
    if (!this.dying) {
      this.drawHPBar(ctx, s);
    }

    ctx.globalAlpha = 1;
  }

  drawZombieTitan(ctx, s) {
    // Main body - circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
    ctx.fill();

    if (!this.dying) {
      // X eyes
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(this.x + side * s * 0.35 - 5, this.y - s * 0.2 - 5);
        ctx.lineTo(this.x + side * s * 0.35 + 5, this.y - s * 0.2 + 5);
        ctx.moveTo(this.x + side * s * 0.35 + 5, this.y - s * 0.2 - 5);
        ctx.lineTo(this.x + side * s * 0.35 - 5, this.y - s * 0.2 + 5);
        ctx.stroke();
      }
      // Mouth weak spot
      ctx.fillStyle = this.weakSpotActive ? '#fbbf24' : '#7f1d1d';
      if (this.weakSpotActive) { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 15; }
      ctx.beginPath();
      ctx.arc(this.x, this.y + s * 0.3, s * 0.2, 0, Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  drawWarMachine(ctx, s) {
    // Main body - angular rectangle
    ctx.beginPath();
    ctx.roundRect(this.x - s, this.y - s * 0.8, s * 2, s * 1.6, 6);
    ctx.fill();

    if (!this.dying) {
      // Turret (top center)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(this.x - s * 0.3, this.y - s * 0.8 - 8, s * 0.6, 12);

      // Barrel
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(this.x - 2, this.y + s * 0.8, 4, 10);

      // Eyes (red LEDs)
      ctx.fillStyle = this.weakSpotActive ? '#fbbf24' : '#ef4444';
      if (this.weakSpotActive) { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12; }
      ctx.beginPath();
      ctx.arc(this.x - s * 0.3, this.y - s * 0.2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x + s * 0.3, this.y - s * 0.2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Track marks (sides)
      ctx.fillStyle = '#334155';
      ctx.fillRect(this.x - s - 4, this.y - s * 0.6, 4, s * 1.2);
      ctx.fillRect(this.x + s, this.y - s * 0.6, 4, s * 1.2);
    }
  }

  drawHPBar(ctx, s) {
    const barW = s * 2.5;
    const barH = 6;
    const bx = this.x - barW / 2;
    const by = this.y - s - 15;
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, barW, barH);
    const pct = this.hpPercent;
    ctx.fillStyle = pct > 0.5 ? '#ef4444' : pct > 0.25 ? '#f97316' : '#dc2626';
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);

    // Phase markers
    for (const p of this.phases) {
      if (p.threshold > 0) {
        const px = bx + barW * p.threshold;
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(px, by);
        ctx.lineTo(px, by + barH);
        ctx.stroke();
      }
    }

    // Boss name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, by - 5);
  }
}
