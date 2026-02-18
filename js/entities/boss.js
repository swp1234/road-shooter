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
    this.targetY = 300;
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

    // Shockwave (centered on boss position, should be perspective-scaled)
    if (this.shockwaveActive) {
      ctx.strokeStyle = `rgba(239,68,68,${1 - this.shockwaveRadius / 300})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.shockwaveRadius, 0, Math.PI * 2);
      ctx.stroke();
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

  drawEffects(ctx) {
    if (!this.active) return;
    const alpha = this.dying ? this.deathTimer / 1.5 : 1;

    // Missile warnings
    for (const m of this.missileWarnings) {
      const a = Math.sin(Date.now() / 100) * 0.3 + 0.4;
      ctx.globalAlpha = a * alpha;
      ctx.fillStyle = `rgba(239,68,68,1)`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;

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
    }
    ctx.globalAlpha = alpha;

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
    }
    ctx.globalAlpha = alpha;

    // Storm overlay
    if (this.stormActive) {
      const sa = Math.min(this.stormTimer / 0.5, 1) * 0.15;
      ctx.fillStyle = `rgba(124,58,237,${sa})`;
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }

    ctx.globalAlpha = 1;
  }

  drawZombieTitan(ctx, s) {
    const x = this.x;
    const y = this.y;
    const flash = this.flashTimer > 0;

    // --- Ground shadow ---
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 1.2, s * 1.1, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Legs (massive, volumetric with gradient) ---
    for (const side of [-1, 1]) {
      const lx = side < 0 ? x - s * 0.55 : x + s * 0.2;
      const lg = ctx.createLinearGradient(lx, y + s * 0.45, lx + s * 0.35, y + s * 1.1);
      lg.addColorStop(0, flash ? '#ddd' : '#7a1414');
      lg.addColorStop(0.5, flash ? '#ccc' : '#5c1010');
      lg.addColorStop(1, flash ? '#aaa' : '#3a0808');
      ctx.fillStyle = lg;
      ctx.fillRect(lx, y + s * 0.45, s * 0.35, s * 0.65);
      // Edge shadow (right/bottom)
      ctx.fillStyle = flash ? '#bbb' : 'rgba(30,5,5,0.4)';
      ctx.fillRect(lx + s * 0.28, y + s * 0.45, s * 0.07, s * 0.65);
      ctx.fillRect(lx, y + s * 1.03, s * 0.35, s * 0.07);
      // Rim light (top-left)
      ctx.fillStyle = flash ? '#eee' : 'rgba(180,50,50,0.35)';
      ctx.fillRect(lx, y + s * 0.45, s * 0.05, s * 0.5);
    }
    // Torn cloth strips with depth
    const clothG = ctx.createLinearGradient(x - s * 0.5, y + s * 0.7, x - s * 0.38, y + s * 1.0);
    clothG.addColorStop(0, flash ? '#ccc' : '#4a0b0b');
    clothG.addColorStop(1, flash ? '#999' : '#1f0505');
    ctx.fillStyle = clothG;
    ctx.fillRect(x - s * 0.5, y + s * 0.7, s * 0.12, s * 0.3);
    ctx.fillRect(x + s * 0.4, y + s * 0.65, s * 0.1, s * 0.35);
    // Exposed bone/muscle on left leg (shiny bone highlight)
    const boneG = ctx.createLinearGradient(x - s * 0.42, y + s * 0.55, x - s * 0.3, y + s * 0.75);
    boneG.addColorStop(0, flash ? '#fff' : '#f5e0c8');
    boneG.addColorStop(0.4, flash ? '#eee' : '#e8c8a8');
    boneG.addColorStop(1, flash ? '#ccc' : '#c4a080');
    ctx.fillStyle = boneG;
    ctx.fillRect(x - s * 0.42, y + s * 0.55, s * 0.12, s * 0.2);

    // --- Massive torso (volumetric gradient, lit from top-left) ---
    ctx.beginPath();
    ctx.moveTo(x - s * 0.8, y - s * 0.1);
    ctx.lineTo(x - s * 0.85, y + s * 0.55);
    ctx.lineTo(x + s * 0.85, y + s * 0.55);
    ctx.lineTo(x + s * 0.8, y - s * 0.1);
    ctx.arc(x, y - s * 0.1, s * 0.8, 0, -Math.PI, true);
    ctx.closePath();
    const torsoG = ctx.createLinearGradient(x - s * 0.6, y - s * 0.6, x + s * 0.8, y + s * 0.6);
    torsoG.addColorStop(0, flash ? '#fff' : '#dc3535');
    torsoG.addColorStop(0.35, flash ? '#f5f5f5' : '#b91c1c');
    torsoG.addColorStop(0.7, flash ? '#ddd' : '#8b1414');
    torsoG.addColorStop(1, flash ? '#bbb' : '#5c0e0e');
    ctx.fillStyle = torsoG;
    ctx.fill();
    // Torso edge shadow (bottom-right)
    ctx.save();
    ctx.clip();
    ctx.fillStyle = flash ? 'rgba(150,150,150,0.15)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + s * 0.3, y + s * 0.1, s * 0.6, s * 0.5);
    ctx.restore();
    // Torso rim light (top-left edge)
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(220,80,80,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.1, s * 0.79, -Math.PI, -Math.PI * 0.3);
    ctx.stroke();

    // --- Exposed ribcage (right side, bone with highlight) ---
    for (let i = 0; i < 4; i++) {
      // Shadow rib
      ctx.strokeStyle = flash ? '#bbb' : '#c4a080';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.25, y + i * s * 0.1 + 0.5);
      ctx.quadraticCurveTo(x + s * 0.55, y + i * s * 0.1 + s * 0.04, x + s * 0.65, y + i * s * 0.1);
      ctx.stroke();
      // Bright rib
      ctx.strokeStyle = flash ? '#eee' : '#f0dcc0';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.25, y + i * s * 0.1 - 0.5);
      ctx.quadraticCurveTo(x + s * 0.55, y + i * s * 0.1 + s * 0.02, x + s * 0.65, y + i * s * 0.1 - s * 0.03);
      ctx.stroke();
    }

    // --- Rusted shoulder armor plates (metallic gradient) ---
    for (const side of [-1, 1]) {
      const sx0 = side < 0 ? x - s * 1.1 : x + s * 0.65;
      const sx1 = side < 0 ? x - s * 0.65 : x + s * 1.1;
      const armG = ctx.createLinearGradient(sx0, y - s * 0.3, sx1, y + s * 0.15);
      armG.addColorStop(0, flash ? '#eee' : (side < 0 ? '#a82828' : '#7f1d1d'));
      armG.addColorStop(0.4, flash ? '#ddd' : '#7f1d1d');
      armG.addColorStop(0.7, flash ? '#bbb' : '#5c1010');
      armG.addColorStop(1, flash ? '#999' : '#3a0808');
      ctx.fillStyle = armG;
      ctx.beginPath();
      if (side < 0) {
        ctx.moveTo(x - s * 0.9, y - s * 0.25);
        ctx.lineTo(x - s * 1.1, y + s * 0.1);
        ctx.lineTo(x - s * 0.7, y + s * 0.15);
        ctx.lineTo(x - s * 0.65, y - s * 0.2);
      } else {
        ctx.moveTo(x + s * 0.9, y - s * 0.25);
        ctx.lineTo(x + s * 1.1, y + s * 0.1);
        ctx.lineTo(x + s * 0.7, y + s * 0.15);
        ctx.lineTo(x + s * 0.65, y - s * 0.2);
      }
      ctx.closePath();
      ctx.fill();
      // Specular highlight on top of shoulder
      const hlX = side < 0 ? x - s * 0.85 : x + s * 0.78;
      const hlG = ctx.createRadialGradient(hlX, y - s * 0.2, 0, hlX, y - s * 0.2, s * 0.15);
      hlG.addColorStop(0, flash ? 'rgba(255,255,255,0.5)' : 'rgba(255,120,120,0.35)');
      hlG.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hlG;
      ctx.fill();
    }
    // Bolts on armor (metallic sphere)
    for (const side of [-1, 1]) {
      const bx = side < 0 ? x - s * 0.85 : x + s * 0.85;
      const boltG = ctx.createRadialGradient(bx - s * 0.015, y - s * 0.065, 0, bx, y - s * 0.05, s * 0.05);
      boltG.addColorStop(0, flash ? '#eee' : '#c45050');
      boltG.addColorStop(0.6, flash ? '#ccc' : '#991b1b');
      boltG.addColorStop(1, flash ? '#999' : '#5c1010');
      ctx.fillStyle = boltG;
      ctx.beginPath(); ctx.arc(bx, y - s * 0.05, s * 0.05, 0, Math.PI * 2); ctx.fill();
    }

    // --- Long arms with clawed hands (cylindrical gradient) ---
    for (const side of [-1, 1]) {
      const ax = side < 0 ? x - s * 1.05 : x + s * 0.83;
      const armBodyG = ctx.createLinearGradient(ax, y, ax + s * 0.22, y);
      armBodyG.addColorStop(0, flash ? '#f5f5f5' : (side < 0 ? '#b82828' : '#991b1b'));
      armBodyG.addColorStop(0.3, flash ? '#eee' : '#991b1b');
      armBodyG.addColorStop(0.7, flash ? '#ccc' : '#701515');
      armBodyG.addColorStop(1, flash ? '#aaa' : '#4a0e0e');
      ctx.fillStyle = armBodyG;
      ctx.fillRect(ax, y - s * 0.15, s * 0.22, s * 0.65);
      // Rim light
      ctx.fillStyle = flash ? 'rgba(255,255,255,0.25)' : 'rgba(200,70,70,0.25)';
      ctx.fillRect(ax, y - s * 0.15, s * 0.03, s * 0.5);
    }
    // Claws (bone gradient)
    if (!this.dying) {
      for (const side of [-1, 1]) {
        const cx = side < 0 ? x - s * 0.95 : x + s * 0.94;
        for (let i = -1; i <= 1; i++) {
          const clawG = ctx.createLinearGradient(cx + i * s * 0.06, y + s * 0.5, cx + i * s * 0.04, y + s * 0.65);
          clawG.addColorStop(0, flash ? '#eee' : '#f0dcc0');
          clawG.addColorStop(1, flash ? '#bbb' : '#c4a070');
          ctx.fillStyle = clawG;
          ctx.beginPath();
          ctx.moveTo(cx + i * s * 0.06, y + s * 0.5);
          ctx.lineTo(cx + i * s * 0.04, y + s * 0.65);
          ctx.lineTo(cx + i * s * 0.08, y + s * 0.5);
          ctx.fill();
        }
      }
    }

    // --- Chains dangling from wrists (metallic sheen) ---
    for (const side of [-1, 1]) {
      const wx = side < 0 ? x - s * 0.95 : x + s * 0.94;
      // Chain shadow
      ctx.strokeStyle = flash ? '#999' : '#4a2008';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      let cy = y + s * 0.45;
      ctx.moveTo(wx + 0.5, cy + 0.5);
      for (let i = 0; i < 4; i++) {
        cy += s * 0.08;
        ctx.lineTo(wx + (i % 2 === 0 ? s * 0.06 : -s * 0.06) + 0.5, cy + 0.5);
      }
      ctx.stroke();
      // Chain bright
      ctx.strokeStyle = flash ? '#ddd' : '#a06828';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      cy = y + s * 0.45;
      ctx.moveTo(wx, cy);
      for (let i = 0; i < 4; i++) {
        cy += s * 0.08;
        ctx.lineTo(wx + (i % 2 === 0 ? s * 0.06 : -s * 0.06), cy);
      }
      ctx.stroke();
    }

    // --- Head (volumetric skull with gradient) ---
    const headG = ctx.createRadialGradient(x - s * 0.12, y - s * 0.65, s * 0.08, x, y - s * 0.55, s * 0.5);
    headG.addColorStop(0, flash ? '#fff' : '#a83030');
    headG.addColorStop(0.5, flash ? '#eee' : '#7f1d1d');
    headG.addColorStop(1, flash ? '#bbb' : '#4a1010');
    ctx.fillStyle = headG;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.55, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Skull helmet (cracked dome, metallic gradient)
    const helmetG = ctx.createLinearGradient(x - s * 0.4, y - s * 1.15, x + s * 0.4, y - s * 0.6);
    helmetG.addColorStop(0, flash ? '#eee' : '#8a1818');
    helmetG.addColorStop(0.3, flash ? '#ddd' : '#5c1010');
    helmetG.addColorStop(0.7, flash ? '#bbb' : '#3a0808');
    helmetG.addColorStop(1, flash ? '#999' : '#250606');
    ctx.fillStyle = helmetG;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, s * 0.55, -Math.PI, 0);
    ctx.fill();
    // Specular highlight on helmet dome
    const helmetHL = ctx.createRadialGradient(x - s * 0.15, y - s * 0.95, 0, x - s * 0.15, y - s * 0.95, s * 0.2);
    helmetHL.addColorStop(0, flash ? 'rgba(255,255,255,0.6)' : 'rgba(255,150,150,0.4)');
    helmetHL.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = helmetHL;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, s * 0.55, -Math.PI, 0);
    ctx.fill();
    // Rim light on helmet
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.35)' : 'rgba(220,80,80,0.3)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.6, s * 0.54, -Math.PI * 0.9, -Math.PI * 0.3);
    ctx.stroke();
    // Crack lines on helmet (glowing red)
    ctx.strokeStyle = flash ? '#ccc' : '#ef4444';
    ctx.shadowColor = flash ? '#ccc' : '#ef4444';
    ctx.shadowBlur = 3;
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
    ctx.shadowBlur = 0;

    if (!this.dying) {
      // --- Glowing eye sockets (intense radial glow) ---
      for (const side of [-1, 1]) {
        const ex = x + side * s * 0.2;
        const ey = y - s * 0.5;
        // Outer glow halo
        const eyeOuter = ctx.createRadialGradient(ex, ey, 0, ex, ey, s * 0.18);
        eyeOuter.addColorStop(0, 'rgba(251,191,36,0.7)');
        eyeOuter.addColorStop(0.5, 'rgba(251,191,36,0.25)');
        eyeOuter.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.fillStyle = eyeOuter;
        ctx.beginPath();
        ctx.arc(ex, ey, s * 0.18, 0, Math.PI * 2);
        ctx.fill();
        // Eye socket
        const eyeG = ctx.createRadialGradient(ex - s * 0.02, ey - s * 0.02, 0, ex, ey, s * 0.1);
        eyeG.addColorStop(0, '#fff8e0');
        eyeG.addColorStop(0.4, '#fbbf24');
        eyeG.addColorStop(1, '#b8860b');
        ctx.fillStyle = eyeG;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(ex, ey, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Pupil
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(ex, ey, s * 0.04, 0, Math.PI * 2); ctx.fill();
        // Pupil specular
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(ex - s * 0.02, ey - s * 0.02, s * 0.015, 0, Math.PI * 2); ctx.fill();
      }

      // --- Exposed lower jaw (bone gradient) ---
      const jawG = ctx.createLinearGradient(x - s * 0.25, y - s * 0.3, x + s * 0.25, y - s * 0.15);
      jawG.addColorStop(0, flash ? '#f0f0f0' : '#f5e0c8');
      jawG.addColorStop(0.5, flash ? '#ddd' : '#e8c8a8');
      jawG.addColorStop(1, flash ? '#bbb' : '#c4a080');
      ctx.fillStyle = jawG;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.25, y - s * 0.3);
      ctx.lineTo(x - s * 0.2, y - s * 0.15);
      ctx.lineTo(x + s * 0.2, y - s * 0.15);
      ctx.lineTo(x + s * 0.25, y - s * 0.3);
      ctx.closePath();
      ctx.fill();

      // --- Mouth weak spot (between jaw bones, glowing) ---
      if (this.weakSpotActive) {
        const wsG = ctx.createRadialGradient(x, y - s * 0.22, 0, x, y - s * 0.22, s * 0.12);
        wsG.addColorStop(0, '#fff8e0');
        wsG.addColorStop(0.4, '#fbbf24');
        wsG.addColorStop(1, '#b8860b');
        ctx.fillStyle = wsG;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 18;
      } else {
        const wsG = ctx.createRadialGradient(x, y - s * 0.22, 0, x, y - s * 0.22, s * 0.12);
        wsG.addColorStop(0, flash ? '#999' : '#600808');
        wsG.addColorStop(1, flash ? '#666' : '#300404');
        ctx.fillStyle = wsG;
      }
      ctx.beginPath();
      ctx.arc(x, y - s * 0.22, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // --- Jagged teeth (bone with highlight) ---
      for (let i = -2; i <= 2; i++) {
        const tG = ctx.createLinearGradient(x + i * s * 0.08, y - s * 0.3, x + i * s * 0.08, y - s * 0.23);
        tG.addColorStop(0, flash ? '#f5f5f5' : '#f0dcc0');
        tG.addColorStop(1, flash ? '#ccc' : '#c4a070');
        ctx.fillStyle = tG;
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

    // --- Ground shadow ---
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 1.15, s * 1.25, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Heavy treads (metallic sheen: dark->light->dark) ---
    for (const side of [-1, 1]) {
      const tx = side < 0 ? x - s * 1.15 : x + s * 0.8;
      const treadG = ctx.createLinearGradient(tx, y + s * 0.1, tx + s * 0.35, y + s * 0.1);
      treadG.addColorStop(0, flash ? '#ccc' : (side < 0 ? '#2a3a50' : '#141e2e'));
      treadG.addColorStop(0.35, flash ? '#eee' : '#334155');
      treadG.addColorStop(0.65, flash ? '#ddd' : '#283848');
      treadG.addColorStop(1, flash ? '#aaa' : (side < 0 ? '#141e2e' : '#0e1620'));
      ctx.fillStyle = treadG;
      ctx.fillRect(tx, y + s * 0.1, s * 0.35, s * 0.9);
      // Bottom edge shadow
      ctx.fillStyle = flash ? '#999' : 'rgba(0,0,0,0.3)';
      ctx.fillRect(tx, y + s * 0.9, s * 0.35, s * 0.1);
    }
    // Track wheels (metallic spheres)
    for (let i = 0; i < 3; i++) {
      const ty = y + s * 0.25 + i * s * 0.28;
      for (const side of [-1, 1]) {
        const wx = side < 0 ? x - s * 0.97 : x + s * 0.97;
        const wG = ctx.createRadialGradient(wx - s * 0.03, ty - s * 0.03, 0, wx, ty, s * 0.1);
        wG.addColorStop(0, flash ? '#f0f0f0' : '#5a6a7a');
        wG.addColorStop(0.5, flash ? '#ccc' : '#334155');
        wG.addColorStop(1, flash ? '#999' : '#1a2535');
        ctx.fillStyle = wG;
        ctx.beginPath(); ctx.arc(wx, ty, s * 0.1, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Track segments (metallic lines)
    for (let i = 0; i < 6; i++) {
      const ty = y + s * 0.15 + i * s * 0.14;
      ctx.strokeStyle = flash ? '#ddd' : '#5a6a7a';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(x - s * 1.15, ty); ctx.lineTo(x - s * 0.8, ty);
      ctx.moveTo(x + s * 0.8, ty); ctx.lineTo(x + s * 1.15, ty);
      ctx.stroke();
      // Thinner highlight line offset
      ctx.strokeStyle = flash ? '#eee' : '#6a7a8a';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(x - s * 1.15, ty - 0.8); ctx.lineTo(x - s * 0.8, ty - 0.8);
      ctx.moveTo(x + s * 0.8, ty - 0.8); ctx.lineTo(x + s * 1.15, ty - 0.8);
      ctx.stroke();
    }

    // --- Hull body (sloped armor with gradient, top-left lit) ---
    ctx.beginPath();
    ctx.moveTo(x - s * 0.75, y - s * 0.3);
    ctx.lineTo(x - s * 0.85, y + s * 0.65);
    ctx.lineTo(x + s * 0.85, y + s * 0.65);
    ctx.lineTo(x + s * 0.75, y - s * 0.3);
    ctx.closePath();
    const hullG = ctx.createLinearGradient(x - s * 0.7, y - s * 0.3, x + s * 0.7, y + s * 0.65);
    hullG.addColorStop(0, flash ? '#fff' : '#6a7a8a');
    hullG.addColorStop(0.3, flash ? '#f0f0f0' : '#546878');
    hullG.addColorStop(0.6, flash ? '#ddd' : '#475569');
    hullG.addColorStop(1, flash ? '#bbb' : '#2a3848');
    ctx.fillStyle = hullG;
    ctx.fill();
    // Hull bottom edge shadow
    ctx.save();
    ctx.clip();
    ctx.fillStyle = flash ? 'rgba(150,150,150,0.15)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(x - s * 0.85, y + s * 0.45, s * 1.7, s * 0.25);
    ctx.restore();
    // Hull rim light (top-left)
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.3)' : 'rgba(140,180,220,0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.75, y - s * 0.3);
    ctx.lineTo(x - s * 0.82, y + s * 0.3);
    ctx.stroke();

    // --- Reactive armor blocks (metallic panels with gradient) ---
    for (const side of [-1, 1]) {
      const px = side < 0 ? x - s * 0.7 : x + s * 0.4;
      const panelG = ctx.createLinearGradient(px, y - s * 0.15, px + s * 0.3, y + s * 0.35);
      panelG.addColorStop(0, flash ? '#f5f5f5' : (side < 0 ? '#8090a0' : '#64748b'));
      panelG.addColorStop(0.4, flash ? '#eee' : '#64748b');
      panelG.addColorStop(0.8, flash ? '#ccc' : '#4a5a6a');
      panelG.addColorStop(1, flash ? '#aaa' : '#364555');
      ctx.fillStyle = panelG;
      ctx.fillRect(px, y - s * 0.15, s * 0.3, s * 0.5);
      // Panel edge shadow (right+bottom)
      ctx.fillStyle = flash ? '#bbb' : 'rgba(0,0,0,0.2)';
      ctx.fillRect(px + s * 0.25, y - s * 0.15, s * 0.05, s * 0.5);
      ctx.fillRect(px, y + s * 0.3, s * 0.3, s * 0.05);
    }
    // Panel rivets (metallic spheres)
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        for (const side of [-1, 1]) {
          const rx = side < 0 ? x - s * 0.6 + j * s * 0.15 : x + s * 0.5 + j * s * 0.15;
          const ry = y + i * s * 0.2;
          const rvG = ctx.createRadialGradient(rx - s * 0.008, ry - s * 0.008, 0, rx, ry, s * 0.025);
          rvG.addColorStop(0, flash ? '#fff' : '#8a9ab0');
          rvG.addColorStop(1, flash ? '#aaa' : '#283848');
          ctx.fillStyle = rvG;
          ctx.beginPath(); ctx.arc(rx, ry, s * 0.025, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // --- Hull detail lines (welding seams with subtle highlight) ---
    ctx.strokeStyle = flash ? '#ccc' : '#3a4a5a';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y + s * 0.2); ctx.lineTo(x + s * 0.6, y + s * 0.2);
    ctx.moveTo(x - s * 0.5, y + s * 0.45); ctx.lineTo(x + s * 0.5, y + s * 0.45);
    ctx.stroke();
    ctx.strokeStyle = flash ? '#eee' : '#5a6a7a';
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y + s * 0.195); ctx.lineTo(x + s * 0.6, y + s * 0.195);
    ctx.stroke();

    // --- Turret base (circular platform with gradient) ---
    const tBaseG = ctx.createLinearGradient(x - s * 0.55, y - s * 0.5, x + s * 0.55, y - s * 0.1);
    tBaseG.addColorStop(0, flash ? '#f0f0f0' : '#4a5a6a');
    tBaseG.addColorStop(0.5, flash ? '#ddd' : '#334155');
    tBaseG.addColorStop(1, flash ? '#bbb' : '#1e2e3e');
    ctx.fillStyle = tBaseG;
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.3, s * 0.55, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Turret base rim
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.25)' : 'rgba(100,140,180,0.2)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.3, s * 0.54, s * 0.19, 0, -Math.PI, 0);
    ctx.stroke();

    // --- Turret dome (spherical gradient, specular highlight) ---
    const domeG = ctx.createRadialGradient(x - s * 0.12, y - s * 0.62, s * 0.08, x, y - s * 0.5, s * 0.45);
    domeG.addColorStop(0, flash ? '#fff' : '#8a9ab0');
    domeG.addColorStop(0.35, flash ? '#eee' : '#6a7a8a');
    domeG.addColorStop(0.7, flash ? '#ccc' : '#4a5a6a');
    domeG.addColorStop(1, flash ? '#999' : '#2a3848');
    ctx.fillStyle = domeG;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.45, 0, Math.PI * 2);
    ctx.fill();
    // Turret dome specular highlight
    const domeHL = ctx.createRadialGradient(x - s * 0.15, y - s * 0.7, 0, x - s * 0.15, y - s * 0.7, s * 0.18);
    domeHL.addColorStop(0, flash ? 'rgba(255,255,255,0.7)' : 'rgba(180,210,240,0.45)');
    domeHL.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = domeHL;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.44, 0, Math.PI * 2);
    ctx.fill();
    // Turret armor ring
    ctx.strokeStyle = flash ? '#bbb' : '#3a4a5a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    // Rim light on dome (upper-left arc)
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(140,180,220,0.3)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.43, -Math.PI * 0.85, -Math.PI * 0.2);
    ctx.stroke();

    if (!this.dying) {
      // --- Twin gatling barrels (metallic cylindrical sheen) ---
      for (const side of [-1, 1]) {
        const bx = side < 0 ? x - s * 0.22 : x + s * 0.1;
        const barrelG = ctx.createLinearGradient(bx, y + s * 0.3, bx + s * 0.12, y + s * 0.3);
        barrelG.addColorStop(0, flash ? '#ddd' : '#7a8a9a');
        barrelG.addColorStop(0.3, flash ? '#f0f0f0' : '#b0bec8');
        barrelG.addColorStop(0.6, flash ? '#ddd' : '#94a3b8');
        barrelG.addColorStop(1, flash ? '#aaa' : '#5a6a7a');
        ctx.fillStyle = barrelG;
        ctx.fillRect(bx, y + s * 0.3, s * 0.12, s * 0.8);
      }
      // Barrel tips (hot glow)
      for (const side of [-1, 1]) {
        const tipX = side < 0 ? x - s * 0.16 : x + s * 0.16;
        const tipG = ctx.createRadialGradient(tipX, y + s * 1.1, 0, tipX, y + s * 1.1, s * 0.08);
        tipG.addColorStop(0, flash ? '#fff' : '#ff6b6b');
        tipG.addColorStop(0.5, flash ? '#eee' : '#ef4444');
        tipG.addColorStop(1, flash ? '#ccc' : '#b91c1c');
        ctx.fillStyle = tipG;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = flash ? 0 : 6;
        ctx.beginPath(); ctx.arc(tipX, y + s * 1.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      // Barrel shroud (metallic gradient)
      const shroudG = ctx.createLinearGradient(x - s * 0.28, y + s * 0.3, x + s * 0.28, y + s * 0.42);
      shroudG.addColorStop(0, flash ? '#ddd' : '#5a6a7a');
      shroudG.addColorStop(0.3, flash ? '#eee' : '#6a7a8a');
      shroudG.addColorStop(0.7, flash ? '#ccc' : '#475569');
      shroudG.addColorStop(1, flash ? '#aaa' : '#334155');
      ctx.fillStyle = shroudG;
      ctx.fillRect(x - s * 0.28, y + s * 0.3, s * 0.56, s * 0.12);

      // --- Missile launchers (gradient pods with depth) ---
      for (const side of [-1, 1]) {
        const mx = side < 0 ? x - s * 0.8 : x + s * 0.6;
        const missG = ctx.createLinearGradient(mx, y - s * 0.7, mx + s * 0.2, y - s * 0.3);
        missG.addColorStop(0, flash ? '#ddd' : (side < 0 ? '#4a5a6a' : '#334155'));
        missG.addColorStop(0.4, flash ? '#ccc' : '#334155');
        missG.addColorStop(1, flash ? '#999' : '#1e2e3e');
        ctx.fillStyle = missG;
        ctx.fillRect(mx, y - s * 0.7, s * 0.2, s * 0.4);
        // Pod edge shadow
        ctx.fillStyle = flash ? '#aaa' : 'rgba(0,0,0,0.2)';
        ctx.fillRect(mx + s * 0.16, y - s * 0.7, s * 0.04, s * 0.4);
      }
      // Missile tube openings (deep holes)
      for (const side of [-1, 1]) {
        const tubeX = side < 0 ? x - s * 0.7 : x + s * 0.7;
        for (const off of [-s * 0.6, -s * 0.45]) {
          const tubeG = ctx.createRadialGradient(tubeX, y + off, 0, tubeX, y + off, s * 0.06);
          tubeG.addColorStop(0, flash ? '#888' : '#0a1018');
          tubeG.addColorStop(0.7, flash ? '#aaa' : '#1a2535');
          tubeG.addColorStop(1, flash ? '#ccc' : '#2a3848');
          ctx.fillStyle = tubeG;
          ctx.beginPath(); ctx.arc(tubeX, y + off, s * 0.06, 0, Math.PI * 2); ctx.fill();
        }
      }

      // --- Commander hatch (spherical metallic) ---
      const hatchG = ctx.createRadialGradient(x + s * 0.17, y - s * 0.73, 0, x + s * 0.2, y - s * 0.7, s * 0.1);
      hatchG.addColorStop(0, flash ? '#fff' : '#7a8a9a');
      hatchG.addColorStop(0.5, flash ? '#ddd' : '#475569');
      hatchG.addColorStop(1, flash ? '#aaa' : '#2a3848');
      ctx.fillStyle = hatchG;
      ctx.beginPath();
      ctx.arc(x + s * 0.2, y - s * 0.7, s * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // --- Antenna array (back) ---
      const antG = ctx.createLinearGradient(x - s * 0.16, y - s * 0.9, x - s * 0.14, y - s * 1.2);
      antG.addColorStop(0, flash ? '#bbb' : '#6a7a8a');
      antG.addColorStop(0.5, flash ? '#ddd' : '#b0bec8');
      antG.addColorStop(1, flash ? '#bbb' : '#6a7a8a');
      ctx.strokeStyle = antG;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.15, y - s * 0.9);
      ctx.lineTo(x - s * 0.15, y - s * 1.2);
      ctx.stroke();
      // Antenna tip (glowing red)
      const antTipG = ctx.createRadialGradient(x - s * 0.15, y - s * 1.2, 0, x - s * 0.15, y - s * 1.2, s * 0.05);
      antTipG.addColorStop(0, flash ? '#fff' : '#ff6b6b');
      antTipG.addColorStop(1, flash ? '#ddd' : '#b91c1c');
      ctx.fillStyle = antTipG;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = flash ? 0 : 5;
      ctx.beginPath(); ctx.arc(x - s * 0.15, y - s * 1.2, s * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // --- Sensor viewport (weak spot with glow) ---
      if (this.weakSpotActive) {
        const sensorG = ctx.createLinearGradient(x - s * 0.25, y - s * 0.55, x + s * 0.25, y - s * 0.45);
        sensorG.addColorStop(0, '#fde68a');
        sensorG.addColorStop(0.5, '#fbbf24');
        sensorG.addColorStop(1, '#d4a017');
        ctx.fillStyle = sensorG;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
      } else {
        const sensorG = ctx.createLinearGradient(x - s * 0.25, y - s * 0.55, x + s * 0.25, y - s * 0.45);
        sensorG.addColorStop(0, flash ? '#f5f5f5' : '#ff6b6b');
        sensorG.addColorStop(0.5, flash ? '#eee' : '#ef4444');
        sensorG.addColorStop(1, flash ? '#ccc' : '#b91c1c');
        ctx.fillStyle = sensorG;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = flash ? 0 : 4;
      }
      ctx.fillRect(x - s * 0.25, y - s * 0.55, s * 0.5, s * 0.1);
      ctx.shadowBlur = 0;
      // Sensor sub-lenses (glowing spheres)
      for (const side of [-1, 1]) {
        const lx = x + side * s * 0.12;
        const ly = y - s * 0.5;
        const lensG = ctx.createRadialGradient(lx - s * 0.01, ly - s * 0.01, 0, lx, ly, s * 0.04);
        lensG.addColorStop(0, this.weakSpotActive ? '#fff' : (flash ? '#fff' : '#fff8e0'));
        lensG.addColorStop(1, this.weakSpotActive ? '#fbbf24' : (flash ? '#ddd' : '#fbbf24'));
        ctx.fillStyle = lensG;
        ctx.beginPath(); ctx.arc(lx, ly, s * 0.04, 0, Math.PI * 2); ctx.fill();
      }

      // --- Exhaust vents (deep recesses) ---
      for (const side of [-1, 1]) {
        const vx = side < 0 ? x - s * 0.35 : x + s * 0.25;
        const ventG = ctx.createLinearGradient(vx, y - s * 0.25, vx + s * 0.1, y - s * 0.17);
        ventG.addColorStop(0, flash ? '#999' : '#0a1018');
        ventG.addColorStop(0.5, flash ? '#aaa' : '#1a2535');
        ventG.addColorStop(1, flash ? '#bbb' : '#283848');
        ctx.fillStyle = ventG;
        ctx.fillRect(vx, y - s * 0.25, s * 0.1, s * 0.08);
      }
    }
  }

  drawStormColossus(ctx, s) {
    const x = this.x;
    const y = this.y;
    const flash = this.flashTimer > 0;
    const time = Date.now() / 300;
    const pulse = Math.sin(Date.now() / 200) * 0.15 + 0.85;

    // --- Ground shadow (floating, so slightly faded) ---
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 1.0, s * 0.9, s * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Floating armor plates (3 segments orbiting the core, metallic gradient) ---
    for (let i = 0; i < 3; i++) {
      const angle = time * 0.5 + (Math.PI * 2 * i) / 3;
      const dist = s * 0.85 * pulse;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist * 0.7;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle + Math.PI / 2);

      // Armor plate body (metallic gradient dark->light->dark)
      const plateG = ctx.createLinearGradient(-s * 0.28, 0, s * 0.28, 0);
      plateG.addColorStop(0, flash ? '#ddd' : '#7a3abf');
      plateG.addColorStop(0.3, flash ? '#f5f5f5' : '#8b4fd0');
      plateG.addColorStop(0.5, flash ? '#eee' : '#5b21b6');
      plateG.addColorStop(0.8, flash ? '#ccc' : '#3c1580');
      plateG.addColorStop(1, flash ? '#aaa' : '#2a0e5c');
      ctx.fillStyle = plateG;
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, -s * 0.4);
      ctx.lineTo(-s * 0.22, s * 0.4);
      ctx.lineTo(s * 0.22, s * 0.4);
      ctx.lineTo(s * 0.28, -s * 0.4);
      ctx.closePath();
      ctx.fill();
      // Edge shadow (right side)
      ctx.fillStyle = flash ? 'rgba(150,150,150,0.15)' : 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.moveTo(s * 0.15, -s * 0.38);
      ctx.lineTo(s * 0.12, s * 0.38);
      ctx.lineTo(s * 0.22, s * 0.4);
      ctx.lineTo(s * 0.28, -s * 0.4);
      ctx.closePath();
      ctx.fill();
      // Rim light (left edge)
      ctx.strokeStyle = flash ? 'rgba(255,255,255,0.35)' : 'rgba(180,140,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, -s * 0.4);
      ctx.lineTo(-s * 0.22, s * 0.35);
      ctx.stroke();
      // Circuit/rune pattern (glowing)
      ctx.strokeStyle = flash ? '#ddd' : '#a78bfa';
      ctx.shadowColor = flash ? '#ddd' : '#a78bfa';
      ctx.shadowBlur = 3;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.lineTo(0, s * 0.3);
      ctx.moveTo(-s * 0.15, 0);
      ctx.lineTo(s * 0.15, 0);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Energy dots at intersections (glowing sphere)
      const dotG = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.05);
      dotG.addColorStop(0, flash ? '#fff' : '#e8e0ff');
      dotG.addColorStop(0.5, flash ? '#eee' : '#c4b5fd');
      dotG.addColorStop(1, flash ? '#ccc' : '#8b6fdf');
      ctx.fillStyle = dotG;
      ctx.shadowColor = '#c4b5fd';
      ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    // --- Electric arcs between floating plates (brighter glow) ---
    if (!this.dying) {
      const arcAlpha = 0.4 + Math.sin(time * 3) * 0.25;
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = `rgba(180,155,255,${arcAlpha})`;
      ctx.lineWidth = 1.2;
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
        const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * s * 0.3;
        const my = (y1 + y2) / 2 + (Math.random() - 0.5) * s * 0.2;
        ctx.lineTo(mx, my);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      // Bright white core line along arcs
      ctx.strokeStyle = `rgba(255,255,255,${arcAlpha * 0.4})`;
      ctx.lineWidth = 0.5;
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
        ctx.lineTo((x1 + x2) / 2, (y1 + y2) / 2);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    // --- Central hexagonal reactor core (main body, gradient) ---
    // Outer hex - deep purple gradient
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const px2 = x + Math.cos(angle) * s * 0.65;
      const py2 = y + Math.sin(angle) * s * 0.65;
      if (i === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
    }
    ctx.closePath();
    const outerHexG = ctx.createRadialGradient(x - s * 0.15, y - s * 0.15, s * 0.1, x, y, s * 0.65);
    outerHexG.addColorStop(0, flash ? '#fff' : '#6d28d9');
    outerHexG.addColorStop(0.4, flash ? '#eee' : '#5520b0');
    outerHexG.addColorStop(0.8, flash ? '#ccc' : '#4c1d95');
    outerHexG.addColorStop(1, flash ? '#aaa' : '#2e1065');
    ctx.fillStyle = outerHexG;
    ctx.fill();
    // Edge shadow on outer hex (bottom-right)
    ctx.save();
    ctx.clip();
    ctx.fillStyle = flash ? 'rgba(150,150,150,0.1)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(x, y, s * 0.7, s * 0.7);
    ctx.restore();

    // Inner hexagonal shell (brighter, lit gradient)
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const px2 = x + Math.cos(angle) * s * 0.45;
      const py2 = y + Math.sin(angle) * s * 0.45;
      if (i === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
    }
    ctx.closePath();
    const innerHexG = ctx.createRadialGradient(x - s * 0.1, y - s * 0.1, 0, x, y, s * 0.45);
    innerHexG.addColorStop(0, flash ? '#fff' : '#9d6eff');
    innerHexG.addColorStop(0.4, flash ? '#f0f0f0' : '#8b5cf6');
    innerHexG.addColorStop(0.8, flash ? '#ddd' : '#7c3aed');
    innerHexG.addColorStop(1, flash ? '#bbb' : '#5b21b6');
    ctx.fillStyle = innerHexG;
    ctx.fill();
    // Specular highlight on inner hex (top-left)
    const hexHL = ctx.createRadialGradient(x - s * 0.15, y - s * 0.18, 0, x - s * 0.15, y - s * 0.18, s * 0.2);
    hexHL.addColorStop(0, flash ? 'rgba(255,255,255,0.5)' : 'rgba(200,180,255,0.35)');
    hexHL.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hexHL;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.44, 0, Math.PI * 2);
    ctx.fill();

    // Reactor panel lines (subtle glowing seams)
    ctx.strokeStyle = flash ? '#ccc' : '#6d28d9';
    ctx.shadowColor = flash ? '#ccc' : '#7c3aed';
    ctx.shadowBlur = 2;
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * s * 0.6, y + Math.sin(angle) * s * 0.6);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // --- Lightning conductor spires (3 extending upward/outward, metallic with glow) ---
    if (!this.dying) {
      for (let i = 0; i < 3; i++) {
        const sa = -Math.PI / 2 + (i - 1) * 0.6;
        const sx = x + Math.cos(sa) * s * 0.45;
        const sy = y + Math.sin(sa) * s * 0.45;
        const tx = x + Math.cos(sa) * s * 1.3;
        const ty = y + Math.sin(sa) * s * 1.3;
        // Spire shaft (metallic gradient along length)
        const spireG = ctx.createLinearGradient(sx, sy, tx, ty);
        spireG.addColorStop(0, flash ? '#bbb' : '#5a6a7a');
        spireG.addColorStop(0.3, flash ? '#ddd' : '#8090a0');
        spireG.addColorStop(0.6, flash ? '#ccc' : '#5a6a7a');
        spireG.addColorStop(1, flash ? '#aaa' : '#3a4a5a');
        ctx.lineWidth = s * 0.08;
        ctx.strokeStyle = spireG;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // Thinner bright center line (rim)
        ctx.lineWidth = s * 0.02;
        ctx.strokeStyle = flash ? '#eee' : 'rgba(140,180,220,0.3)';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // Spire tip (intense glowing orb)
        const tipG = ctx.createRadialGradient(tx, ty, 0, tx, ty, s * 0.1);
        tipG.addColorStop(0, flash ? '#fff' : '#e8e0ff');
        tipG.addColorStop(0.3, flash ? '#eee' : '#c4b5fd');
        tipG.addColorStop(0.7, flash ? '#ccc' : '#a78bfa');
        tipG.addColorStop(1, 'rgba(167,139,250,0)');
        ctx.fillStyle = tipG;
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(tx, ty, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        // Bright core of tip
        ctx.fillStyle = flash ? '#fff' : '#e8e0ff';
        ctx.beginPath();
        ctx.arc(tx, ty, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Mini arcs from tips (brighter)
        const sparkAlpha = 0.4 + Math.sin(time * 5 + i) * 0.35;
        ctx.strokeStyle = `rgba(210,195,255,${sparkAlpha})`;
        ctx.shadowColor = `rgba(167,139,250,${sparkAlpha})`;
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + (Math.random() - 0.5) * s * 0.4, ty + (Math.random() - 0.5) * s * 0.4);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // --- Pulsing energy core (innermost, intense radial glow) ---
    const corePulse = 0.5 + Math.sin(Date.now() / 150) * 0.3;
    const coreR = s * 0.25 * pulse;
    // Outer glow halo
    const coreOuterG = ctx.createRadialGradient(x, y, coreR * 0.3, x, y, coreR * 1.8);
    coreOuterG.addColorStop(0, `rgba(196,181,253,${corePulse * 0.5})`);
    coreOuterG.addColorStop(1, 'rgba(167,139,250,0)');
    ctx.fillStyle = coreOuterG;
    ctx.beginPath();
    ctx.arc(x, y, coreR * 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Core body
    const coreG = ctx.createRadialGradient(x - coreR * 0.2, y - coreR * 0.2, 0, x, y, coreR);
    coreG.addColorStop(0, `rgba(240,230,255,${corePulse})`);
    coreG.addColorStop(0.3, `rgba(210,195,255,${corePulse})`);
    coreG.addColorStop(0.7, `rgba(196,181,253,${corePulse * 0.8})`);
    coreG.addColorStop(1, `rgba(167,139,250,${corePulse * 0.4})`);
    ctx.fillStyle = coreG;
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(x, y, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Core inner bright ring (specular)
    ctx.strokeStyle = `rgba(255,255,255,${corePulse * 0.7})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    // Core specular dot (top-left highlight)
    const coreHL = ctx.createRadialGradient(x - s * 0.06, y - s * 0.06, 0, x - s * 0.06, y - s * 0.06, s * 0.08);
    coreHL.addColorStop(0, `rgba(255,255,255,${corePulse * 0.6})`);
    coreHL.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = coreHL;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.18, 0, Math.PI * 2);
    ctx.fill();

    if (!this.dying) {
      // --- Central eye/sensor (weak spot, intense glow) ---
      if (this.weakSpotActive) {
        // Weak spot active: golden glow halo
        const wsHalo = ctx.createRadialGradient(x, y, 0, x, y, s * 0.22);
        wsHalo.addColorStop(0, 'rgba(251,191,36,0.5)');
        wsHalo.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.fillStyle = wsHalo;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.22, 0, Math.PI * 2);
        ctx.fill();
        // Eye body
        const eyeG = ctx.createRadialGradient(x - s * 0.03, y - s * 0.03, 0, x, y, s * 0.14);
        eyeG.addColorStop(0, '#fff8e0');
        eyeG.addColorStop(0.4, '#fde68a');
        eyeG.addColorStop(0.8, '#fbbf24');
        eyeG.addColorStop(1, '#d4a017');
        ctx.fillStyle = eyeG;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 20;
      } else {
        const eyeG = ctx.createRadialGradient(x - s * 0.03, y - s * 0.03, 0, x, y, s * 0.14);
        eyeG.addColorStop(0, flash ? '#fff' : '#f0f4ff');
        eyeG.addColorStop(0.4, flash ? '#eee' : '#e0e7ff');
        eyeG.addColorStop(0.8, flash ? '#ccc' : '#c4d0f0');
        eyeG.addColorStop(1, flash ? '#aaa' : '#a0b0d0');
        ctx.fillStyle = eyeG;
        ctx.shadowColor = '#e0e7ff';
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      ctx.arc(x, y, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Pupil (deep sphere)
      const pupilG = ctx.createRadialGradient(x - s * 0.015, y - s * 0.015, 0, x, y, s * 0.06);
      pupilG.addColorStop(0, this.weakSpotActive ? '#fff' : (flash ? '#ddd' : '#7c3aed'));
      pupilG.addColorStop(1, this.weakSpotActive ? '#fbbf24' : (flash ? '#999' : '#2e1065'));
      ctx.fillStyle = pupilG;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      // Pupil specular highlight
      ctx.fillStyle = `rgba(255,255,255,${this.weakSpotActive ? 0.8 : 0.5})`;
      ctx.beginPath();
      ctx.arc(x - s * 0.02, y - s * 0.02, s * 0.018, 0, Math.PI * 2);
      ctx.fill();

      // --- Orbiting energy spheres (6 smaller orbs, radial glow each) ---
      for (let i = 0; i < 6; i++) {
        const oa = time * 1.5 + (Math.PI * 2 * i) / 6;
        const od = s * 0.35;
        const ox = x + Math.cos(oa) * od;
        const oy = y + Math.sin(oa) * od;
        const orbAlpha = 0.5 + Math.sin(oa * 2) * 0.3;
        // Orb glow halo
        const orbHalo = ctx.createRadialGradient(ox, oy, 0, ox, oy, s * 0.08);
        orbHalo.addColorStop(0, `rgba(180,160,255,${orbAlpha * 0.4})`);
        orbHalo.addColorStop(1, 'rgba(167,139,250,0)');
        ctx.fillStyle = orbHalo;
        ctx.beginPath();
        ctx.arc(ox, oy, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
        // Orb body
        const orbG = ctx.createRadialGradient(ox - s * 0.01, oy - s * 0.01, 0, ox, oy, s * 0.04);
        orbG.addColorStop(0, `rgba(230,220,255,${orbAlpha})`);
        orbG.addColorStop(0.5, `rgba(167,139,250,${orbAlpha})`);
        orbG.addColorStop(1, `rgba(124,58,237,${orbAlpha * 0.5})`);
        ctx.fillStyle = orbG;
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
