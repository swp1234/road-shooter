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
    const x = this.x;
    const y = this.y;
    const flash = this.flashTimer > 0;

    // Legs (massive, torn pants with exposed muscle)
    ctx.fillStyle = flash ? '#ddd' : '#5c1010';
    ctx.fillRect(x - s * 0.55, y + s * 0.45, s * 0.35, s * 0.65);
    ctx.fillRect(x + s * 0.2, y + s * 0.45, s * 0.35, s * 0.65);
    // Torn cloth strips
    ctx.fillStyle = flash ? '#ccc' : '#3a0a0a';
    ctx.fillRect(x - s * 0.5, y + s * 0.7, s * 0.12, s * 0.3);
    ctx.fillRect(x + s * 0.4, y + s * 0.65, s * 0.1, s * 0.35);
    // Exposed bone/muscle on left leg
    ctx.fillStyle = flash ? '#eee' : '#e8c8a8';
    ctx.fillRect(x - s * 0.42, y + s * 0.55, s * 0.12, s * 0.2);

    // Massive torso (hunched, wide)
    ctx.fillStyle = flash ? '#fff' : '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.8, y - s * 0.1);
    ctx.lineTo(x - s * 0.85, y + s * 0.55);
    ctx.lineTo(x + s * 0.85, y + s * 0.55);
    ctx.lineTo(x + s * 0.8, y - s * 0.1);
    ctx.arc(x, y - s * 0.1, s * 0.8, 0, -Math.PI, true);
    ctx.fill();

    // Exposed ribcage (right side)
    ctx.strokeStyle = flash ? '#ddd' : '#e8c8a8';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + s * 0.25, y + i * s * 0.1);
      ctx.quadraticCurveTo(x + s * 0.55, y + i * s * 0.1 + s * 0.03, x + s * 0.65, y + i * s * 0.1 - s * 0.02);
      ctx.stroke();
    }

    // Rusted shoulder armor plates
    ctx.fillStyle = flash ? '#ccc' : '#7f1d1d';
    // Left shoulder
    ctx.beginPath();
    ctx.moveTo(x - s * 0.9, y - s * 0.25);
    ctx.lineTo(x - s * 1.1, y + s * 0.1);
    ctx.lineTo(x - s * 0.7, y + s * 0.15);
    ctx.lineTo(x - s * 0.65, y - s * 0.2);
    ctx.closePath();
    ctx.fill();
    // Right shoulder
    ctx.beginPath();
    ctx.moveTo(x + s * 0.9, y - s * 0.25);
    ctx.lineTo(x + s * 1.1, y + s * 0.1);
    ctx.lineTo(x + s * 0.7, y + s * 0.15);
    ctx.lineTo(x + s * 0.65, y - s * 0.2);
    ctx.closePath();
    ctx.fill();
    // Bolts on armor
    ctx.fillStyle = flash ? '#bbb' : '#991b1b';
    ctx.beginPath(); ctx.arc(x - s * 0.85, y - s * 0.05, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.85, y - s * 0.05, s * 0.05, 0, Math.PI * 2); ctx.fill();

    // Long arms with clawed hands
    ctx.fillStyle = flash ? '#eee' : '#991b1b';
    // Left arm
    ctx.fillRect(x - s * 1.05, y - s * 0.15, s * 0.22, s * 0.65);
    // Right arm
    ctx.fillRect(x + s * 0.83, y - s * 0.15, s * 0.22, s * 0.65);
    // Claws
    if (!this.dying) {
      ctx.fillStyle = flash ? '#ddd' : '#e8c8a8';
      for (const side of [-1, 1]) {
        const cx = side < 0 ? x - s * 0.95 : x + s * 0.94;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * s * 0.06, y + s * 0.5);
          ctx.lineTo(cx + i * s * 0.04, y + s * 0.65);
          ctx.lineTo(cx + i * s * 0.08, y + s * 0.5);
          ctx.fill();
        }
      }
    }

    // Chains dangling from wrists
    ctx.strokeStyle = flash ? '#bbb' : '#78350f';
    ctx.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      const wx = side < 0 ? x - s * 0.95 : x + s * 0.94;
      ctx.beginPath();
      let cy = y + s * 0.45;
      ctx.moveTo(wx, cy);
      for (let i = 0; i < 4; i++) {
        cy += s * 0.08;
        ctx.lineTo(wx + (i % 2 === 0 ? s * 0.06 : -s * 0.06), cy);
      }
      ctx.stroke();
    }

    // Head (cracked skull helmet)
    ctx.fillStyle = flash ? '#eee' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.55, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Skull helmet (cracked dome)
    ctx.fillStyle = flash ? '#ddd' : '#5c1010';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, s * 0.55, -Math.PI, 0);
    ctx.fill();
    // Crack lines on helmet
    ctx.strokeStyle = flash ? '#ccc' : '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.1, y - s * 1.1);
    ctx.lineTo(x + s * 0.05, y - s * 0.7);
    ctx.lineTo(x + s * 0.15, y - s * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, y - s * 1.05);
    ctx.lineTo(x + s * 0.1, y - s * 0.65);
    ctx.stroke();

    if (!this.dying) {
      // Glowing eye sockets (hollow, menacing)
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x - s * 0.2, y - s * 0.5, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 0.2, y - s * 0.5, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Pupil dots
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(x - s * 0.2, y - s * 0.5, s * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s * 0.2, y - s * 0.5, s * 0.04, 0, Math.PI * 2); ctx.fill();

      // Exposed lower jaw
      ctx.fillStyle = flash ? '#ddd' : '#e8c8a8';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.25, y - s * 0.3);
      ctx.lineTo(x - s * 0.2, y - s * 0.15);
      ctx.lineTo(x + s * 0.2, y - s * 0.15);
      ctx.lineTo(x + s * 0.25, y - s * 0.3);
      ctx.closePath();
      ctx.fill();

      // Mouth weak spot (between jaw bones)
      ctx.fillStyle = this.weakSpotActive ? '#fbbf24' : '#450a0a';
      if (this.weakSpotActive) { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 15; }
      ctx.beginPath();
      ctx.arc(x, y - s * 0.22, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Jagged teeth
      ctx.fillStyle = flash ? '#eee' : '#e8c8a8';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * s * 0.08 - s * 0.03, y - s * 0.3);
        ctx.lineTo(x + i * s * 0.08, y - s * 0.23);
        ctx.lineTo(x + i * s * 0.08 + s * 0.03, y - s * 0.3);
        ctx.fill();
      }
    }
  }

  drawWarMachine(ctx, s) {
    const x = this.x;
    const y = this.y;
    const flash = this.flashTimer > 0;

    // Heavy treads (two wide tracked sections)
    ctx.fillStyle = flash ? '#ddd' : '#1e293b';
    ctx.fillRect(x - s * 1.15, y + s * 0.1, s * 0.35, s * 0.9);
    ctx.fillRect(x + s * 0.8, y + s * 0.1, s * 0.35, s * 0.9);
    // Track wheels (circles inside treads)
    ctx.fillStyle = flash ? '#ccc' : '#334155';
    for (let i = 0; i < 3; i++) {
      const ty = y + s * 0.25 + i * s * 0.28;
      ctx.beginPath(); ctx.arc(x - s * 0.97, ty, s * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s * 0.97, ty, s * 0.1, 0, Math.PI * 2); ctx.fill();
    }
    // Track segments
    ctx.strokeStyle = flash ? '#bbb' : '#475569';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
      const ty = y + s * 0.15 + i * s * 0.14;
      ctx.beginPath();
      ctx.moveTo(x - s * 1.15, ty); ctx.lineTo(x - s * 0.8, ty);
      ctx.moveTo(x + s * 0.8, ty); ctx.lineTo(x + s * 1.15, ty);
      ctx.stroke();
    }

    // Hull body (sloped armor, trapezoid shape)
    ctx.fillStyle = flash ? '#fff' : '#475569';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.75, y - s * 0.3);
    ctx.lineTo(x - s * 0.85, y + s * 0.65);
    ctx.lineTo(x + s * 0.85, y + s * 0.65);
    ctx.lineTo(x + s * 0.75, y - s * 0.3);
    ctx.closePath();
    ctx.fill();

    // Reactive armor blocks (bolt-on panels)
    ctx.fillStyle = flash ? '#eee' : '#64748b';
    ctx.fillRect(x - s * 0.7, y - s * 0.15, s * 0.3, s * 0.5);
    ctx.fillRect(x + s * 0.4, y - s * 0.15, s * 0.3, s * 0.5);
    // Panel rivets
    ctx.fillStyle = flash ? '#ddd' : '#334155';
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.beginPath(); ctx.arc(x - s * 0.6 + j * s * 0.15, y + i * s * 0.2, s * 0.025, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + s * 0.5 + j * s * 0.15, y + i * s * 0.2, s * 0.025, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Hull detail lines (welding seams)
    ctx.strokeStyle = flash ? '#ddd' : '#334155';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y + s * 0.2);
    ctx.lineTo(x + s * 0.6, y + s * 0.2);
    ctx.moveTo(x - s * 0.5, y + s * 0.45);
    ctx.lineTo(x + s * 0.5, y + s * 0.45);
    ctx.stroke();

    // Turret base (circular platform)
    ctx.fillStyle = flash ? '#eee' : '#334155';
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.3, s * 0.55, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Turret dome (main rotating turret)
    ctx.fillStyle = flash ? '#fff' : '#64748b';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.45, 0, Math.PI * 2);
    ctx.fill();
    // Turret armor ring
    ctx.strokeStyle = flash ? '#ddd' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    if (!this.dying) {
      // Twin gatling barrels (extending downward toward player)
      ctx.fillStyle = flash ? '#bbb' : '#94a3b8';
      ctx.fillRect(x - s * 0.22, y + s * 0.3, s * 0.12, s * 0.8);
      ctx.fillRect(x + s * 0.1, y + s * 0.3, s * 0.12, s * 0.8);
      // Barrel tips
      ctx.fillStyle = flash ? '#eee' : '#ef4444';
      ctx.beginPath(); ctx.arc(x - s * 0.16, y + s * 1.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s * 0.16, y + s * 1.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
      // Barrel shroud
      ctx.fillStyle = flash ? '#ccc' : '#475569';
      ctx.fillRect(x - s * 0.28, y + s * 0.3, s * 0.56, s * 0.12);

      // Missile launchers (two pods on turret sides)
      ctx.fillStyle = flash ? '#ccc' : '#334155';
      ctx.fillRect(x - s * 0.8, y - s * 0.7, s * 0.2, s * 0.4);
      ctx.fillRect(x + s * 0.6, y - s * 0.7, s * 0.2, s * 0.4);
      // Missile tube openings
      ctx.fillStyle = flash ? '#aaa' : '#1e293b';
      ctx.beginPath(); ctx.arc(x - s * 0.7, y - s * 0.6, s * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x - s * 0.7, y - s * 0.45, s * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s * 0.7, y - s * 0.6, s * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s * 0.7, y - s * 0.45, s * 0.06, 0, Math.PI * 2); ctx.fill();

      // Commander hatch
      ctx.fillStyle = flash ? '#ddd' : '#475569';
      ctx.beginPath();
      ctx.arc(x + s * 0.2, y - s * 0.7, s * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Antenna array (back)
      ctx.strokeStyle = flash ? '#ccc' : '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.15, y - s * 0.9);
      ctx.lineTo(x - s * 0.15, y - s * 1.2);
      ctx.stroke();
      // Antenna tip
      ctx.fillStyle = flash ? '#eee' : '#ef4444';
      ctx.beginPath(); ctx.arc(x - s * 0.15, y - s * 1.2, s * 0.04, 0, Math.PI * 2); ctx.fill();

      // Sensor viewport (weak spot)
      ctx.fillStyle = this.weakSpotActive ? '#fbbf24' : '#ef4444';
      if (this.weakSpotActive) { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12; }
      ctx.fillRect(x - s * 0.25, y - s * 0.55, s * 0.5, s * 0.1);
      ctx.shadowBlur = 0;
      // Sensor sub-lenses
      ctx.fillStyle = this.weakSpotActive ? '#fff' : '#fbbf24';
      ctx.beginPath(); ctx.arc(x - s * 0.12, y - s * 0.5, s * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s * 0.12, y - s * 0.5, s * 0.04, 0, Math.PI * 2); ctx.fill();

      // Exhaust vents (back of hull)
      ctx.fillStyle = flash ? '#aaa' : '#1e293b';
      ctx.fillRect(x - s * 0.35, y - s * 0.25, s * 0.1, s * 0.08);
      ctx.fillRect(x + s * 0.25, y - s * 0.25, s * 0.1, s * 0.08);
    }
  }

  drawStormColossus(ctx, s) {
    const x = this.x;
    const y = this.y;
    const flash = this.flashTimer > 0;
    const time = Date.now() / 300;
    const pulse = Math.sin(Date.now() / 200) * 0.15 + 0.85;

    // Floating armor plates (3 segments orbiting the core)
    for (let i = 0; i < 3; i++) {
      const angle = time * 0.5 + (Math.PI * 2 * i) / 3;
      const dist = s * 0.85 * pulse;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist * 0.7;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle + Math.PI / 2);

      // Armor plate body
      ctx.fillStyle = flash ? '#eee' : '#5b21b6';
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, -s * 0.4);
      ctx.lineTo(-s * 0.22, s * 0.4);
      ctx.lineTo(s * 0.22, s * 0.4);
      ctx.lineTo(s * 0.28, -s * 0.4);
      ctx.closePath();
      ctx.fill();
      // Circuit/rune pattern
      ctx.strokeStyle = flash ? '#ddd' : '#a78bfa';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.lineTo(0, s * 0.3);
      ctx.moveTo(-s * 0.15, 0);
      ctx.lineTo(s * 0.15, 0);
      ctx.stroke();
      // Energy dots at intersections
      ctx.fillStyle = flash ? '#fff' : '#c4b5fd';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.04, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    // Electric arcs between floating plates
    if (!this.dying) {
      ctx.strokeStyle = `rgba(167,139,250,${0.3 + Math.sin(time * 3) * 0.2})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const a1 = time * 0.5 + (Math.PI * 2 * i) / 3;
        const a2 = time * 0.5 + (Math.PI * 2 * ((i + 1) % 3)) / 3;
        const d = s * 0.85 * pulse;
        const x1 = x + Math.cos(a1) * d;
        const y1 = y + Math.sin(a1) * d * 0.7;
        const x2 = x + Math.cos(a2) * d;
        const y2 = y + Math.sin(a2) * d * 0.7;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        // Jagged arc path
        const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * s * 0.3;
        const my = (y1 + y2) / 2 + (Math.random() - 0.5) * s * 0.2;
        ctx.lineTo(mx, my);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Central hexagonal reactor core (main body)
    ctx.fillStyle = flash ? '#fff' : '#4c1d95';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const px = x + Math.cos(angle) * s * 0.65;
      const py = y + Math.sin(angle) * s * 0.65;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Inner hexagonal shell
    ctx.fillStyle = flash ? '#eee' : '#7c3aed';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const px = x + Math.cos(angle) * s * 0.45;
      const py = y + Math.sin(angle) * s * 0.45;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Reactor panel lines
    ctx.strokeStyle = flash ? '#ddd' : '#5b21b6';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * s * 0.6, y + Math.sin(angle) * s * 0.6);
      ctx.stroke();
    }

    // Lightning conductor spires (3 extending upward/outward)
    if (!this.dying) {
      ctx.fillStyle = flash ? '#ccc' : '#374151';
      for (let i = 0; i < 3; i++) {
        const sa = -Math.PI / 2 + (i - 1) * 0.6;
        const sx = x + Math.cos(sa) * s * 0.45;
        const sy = y + Math.sin(sa) * s * 0.45;
        const tx = x + Math.cos(sa) * s * 1.3;
        const ty = y + Math.sin(sa) * s * 1.3;
        // Spire shaft
        ctx.lineWidth = s * 0.08;
        ctx.strokeStyle = flash ? '#ccc' : '#475569';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // Spire tip (glowing)
        ctx.fillStyle = flash ? '#eee' : '#c4b5fd';
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(tx, ty, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Mini arcs from tips
        const sparkAlpha = 0.3 + Math.sin(time * 5 + i) * 0.3;
        ctx.strokeStyle = `rgba(196,181,253,${sparkAlpha})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + (Math.random() - 0.5) * s * 0.4, ty + (Math.random() - 0.5) * s * 0.4);
        ctx.stroke();
      }
    }

    // Pulsing energy core (innermost)
    const corePulse = 0.5 + Math.sin(Date.now() / 150) * 0.3;
    ctx.fillStyle = `rgba(196,181,253,${corePulse})`;
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.25 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Core inner bright ring
    ctx.strokeStyle = `rgba(255,255,255,${corePulse * 0.6})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.18, 0, Math.PI * 2);
    ctx.stroke();

    if (!this.dying) {
      // Central eye/sensor (weak spot)
      ctx.fillStyle = this.weakSpotActive ? '#fbbf24' : '#e0e7ff';
      if (this.weakSpotActive) { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 15; }
      ctx.beginPath();
      ctx.arc(x, y, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Pupil
      ctx.fillStyle = this.weakSpotActive ? '#fff' : '#4c1d95';
      ctx.beginPath();
      ctx.arc(x, y, s * 0.06, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting energy spheres (6 smaller orbs)
      for (let i = 0; i < 6; i++) {
        const oa = time * 1.5 + (Math.PI * 2 * i) / 6;
        const od = s * 0.35;
        const ox = x + Math.cos(oa) * od;
        const oy = y + Math.sin(oa) * od;
        ctx.fillStyle = `rgba(167,139,250,${0.5 + Math.sin(oa * 2) * 0.3})`;
        ctx.beginPath();
        ctx.arc(ox, oy, s * 0.04, 0, Math.PI * 2);
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
