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

    // Storm Colossus specific
    this.lightningStrikes = []; // {x, y, timer, dmg, width}
    this.tornadoActive = false;
    this.tornadoX = 0;
    this.tornadoDir = 1;
    this.tornadoTimer = 0;
    this.stormTimer = 0;
    this.stormActive = false;
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

    // Lightning strikes decay
    for (let i = this.lightningStrikes.length - 1; i >= 0; i--) {
      this.lightningStrikes[i].timer -= dt;
      if (this.lightningStrikes[i].timer <= 0) {
        this.lightningStrikes.splice(i, 1);
      }
    }

    // Tornado movement
    if (this.tornadoActive) {
      this.tornadoTimer -= dt;
      this.tornadoX += this.tornadoDir * 3;
      const roadL = (CONFIG.CANVAS_WIDTH - CONFIG.CANVAS_WIDTH * CONFIG.ROAD_WIDTH_RATIO) / 2 + 20;
      const roadR = roadL + CONFIG.CANVAS_WIDTH * CONFIG.ROAD_WIDTH_RATIO - 40;
      if (this.tornadoX < roadL || this.tornadoX > roadR) this.tornadoDir *= -1;
      if (this.tornadoTimer <= 0) this.tornadoActive = false;
    }

    // Storm decay
    if (this.stormActive) {
      this.stormTimer -= dt;
      if (this.stormTimer <= 0) this.stormActive = false;
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

      // Storm Colossus attacks
      case 'lightning': {
        // 2 vertical lightning bolts at semi-random positions
        const cw2 = CONFIG.CANVAS_WIDTH;
        for (let i = 0; i < 2; i++) {
          const lx = 50 + Math.random() * (cw2 - 100);
          this.lightningStrikes.push({ x: lx, y: 0, timer: 0.8, dmg: 2, width: 30 });
        }
        // Vulnerable after lightning
        setTimeout(() => {
          this.weakSpotActive = true;
          this.weakSpotTimer = 2;
        }, 800);
        break;
      }
      case 'tornado':
        this.tornadoActive = true;
        this.tornadoX = this.x;
        this.tornadoDir = Math.random() < 0.5 ? -1 : 1;
        this.tornadoTimer = 4;
        break;
      case 'thunderstorm':
        // Combination: lightning + bullets + storm visual
        this.stormActive = true;
        this.stormTimer = 3;
        // Lightning bursts staggered
        for (let i = 0; i < 4; i++) {
          setTimeout(() => {
            if (!this.dying) {
              const lx = 40 + Math.random() * (CONFIG.CANVAS_WIDTH - 80);
              this.lightningStrikes.push({ x: lx, y: 0, timer: 0.6, dmg: 2, width: 25 });
            }
          }, i * 600);
        }
        // Bullet ring
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8;
          this.bulletQueue.push({
            x: this.x, y: this.y + this.size,
            vx: Math.cos(angle) * 2.5,
            vy: Math.sin(angle) * 2.5,
            dmg: 1, delay: 500
          });
        }
        // Vulnerable after storm
        setTimeout(() => {
          this.weakSpotActive = true;
          this.weakSpotTimer = 3;
        }, 3000);
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

    // Lightning strikes
    for (const l of this.lightningStrikes) {
      const la = Math.min(l.timer / 0.3, 1);
      ctx.globalAlpha = la * alpha;
      ctx.strokeStyle = '#e0e7ff';
      ctx.lineWidth = l.width * 0.3;
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 20;
      // Jagged bolt
      ctx.beginPath();
      ctx.moveTo(l.x, 0);
      let ly = 0;
      while (ly < CONFIG.CANVAS_HEIGHT) {
        ly += 30 + Math.random() * 40;
        const lxOff = l.x + (Math.random() - 0.5) * l.width;
        ctx.lineTo(lxOff, ly);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Bright center
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l.x, 0);
      ly = 0;
      while (ly < CONFIG.CANVAS_HEIGHT) {
        ly += 30 + Math.random() * 40;
        ctx.lineTo(l.x + (Math.random() - 0.5) * l.width * 0.5, ly);
      }
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }

    // Tornado
    if (this.tornadoActive) {
      const ta = Math.min(this.tornadoTimer / 0.5, 1);
      ctx.globalAlpha = ta * 0.6 * alpha;
      const tx = this.tornadoX;
      // Spinning funnel
      for (let i = 0; i < 5; i++) {
        const ty = 200 + i * 80;
        const tw = 15 + i * 12;
        const offset = Math.sin(Date.now() / 100 + i) * tw * 0.4;
        ctx.fillStyle = `rgba(124,58,237,${0.3 + i * 0.1})`;
        ctx.beginPath();
        ctx.ellipse(tx + offset, ty, tw, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
    }

    // Storm overlay
    if (this.stormActive) {
      const sa = Math.min(this.stormTimer / 0.5, 1) * 0.15;
      ctx.fillStyle = `rgba(124,58,237,${sa})`;
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }

    const s = this.size;
    ctx.fillStyle = this.flashTimer > 0 ? '#fff' : this.color;

    if (this.type === 'warMachine') {
      this.drawWarMachine(ctx, s);
    } else if (this.type === 'stormColossus') {
      this.drawStormColossus(ctx, s);
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

  drawStormColossus(ctx, s) {
    // Main body - hexagonal shape
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const px = this.x + Math.cos(angle) * s;
      const py = this.y + Math.sin(angle) * s;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    if (!this.dying) {
      // Inner energy core
      const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(167,139,250,${pulse})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, s * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Eye - single glowing orb
      ctx.fillStyle = this.weakSpotActive ? '#fbbf24' : '#c4b5fd';
      if (this.weakSpotActive) { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 15; }
      ctx.beginPath();
      ctx.arc(this.x, this.y - s * 0.15, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Orbiting particles (electric arcs)
      const time = Date.now() / 300;
      for (let i = 0; i < 3; i++) {
        const oa = time + (Math.PI * 2 * i) / 3;
        const ox = this.x + Math.cos(oa) * (s + 8);
        const oy = this.y + Math.sin(oa) * (s + 8);
        ctx.fillStyle = '#a78bfa';
        ctx.beginPath();
        ctx.arc(ox, oy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
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
