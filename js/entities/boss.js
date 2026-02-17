// Road Shooter - Boss Entity
class Boss {
  constructor(type = 'zombieTitan', stageMul = 1) {
    const cfg = CONFIG.BOSS[type];
    this.type = type;
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
    this.attackTimer = 2000; // ms before first attack
    this.flashTimer = 0;
    this.weakSpotTimer = 0;
    this.weakSpotActive = false;

    // Attack state
    this.currentAttack = null;
    this.attackProgress = 0;
    this.shockwaveRadius = 0;
    this.shockwaveActive = false;
    this.summonQueue = 0;
    this.chargeSpeed = 0;
    this.charging = false;
    this.moveDir = 1;
    this.moveTimer = 0;
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

    // Update phase based on HP
    this.updatePhase();

    // Side-to-side movement
    this.moveTimer += dt;
    this.x += Math.sin(this.moveTimer * 1.5) * 1.5;

    // Attack timer
    this.attackTimer -= dt * 1000;
    if (this.attackTimer <= 0) {
      this.performAttack(squadX, squadY);
    }

    // Shockwave
    if (this.shockwaveActive) {
      this.shockwaveRadius += 4;
      if (this.shockwaveRadius > 300) this.shockwaveActive = false;
    }

    // Charge
    if (this.charging) {
      this.y += this.chargeSpeed;
      if (this.y > CONFIG.CANVAS_HEIGHT * 0.6) {
        this.charging = false;
        this.y = this.targetY;
        this.weakSpotActive = true;
        this.weakSpotTimer = 3;
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

    switch (phase.attack) {
      case 'shockwave':
        this.shockwaveActive = true;
        this.shockwaveRadius = 0;
        this.currentAttack = 'shockwave';
        break;
      case 'summon':
        this.summonQueue = 3;
        this.currentAttack = 'summon';
        // After summon, show weakness
        setTimeout(() => {
          this.weakSpotActive = true;
          this.weakSpotTimer = 3;
        }, 2000);
        break;
      case 'charge':
        this.charging = true;
        this.chargeSpeed = 4;
        this.currentAttack = 'charge';
        break;
    }
  }

  takeDamage(dmg) {
    if (this.dying) return false;
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

    // Boss body
    const s = this.size;
    ctx.fillStyle = this.flashTimer > 0 ? '#fff' : this.color;

    // Main body - large circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
    ctx.fill();

    // X eyes (zombie)
    if (!this.dying) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      // Left eye
      ctx.beginPath();
      ctx.moveTo(this.x - s * 0.35 - 5, this.y - s * 0.2 - 5);
      ctx.lineTo(this.x - s * 0.35 + 5, this.y - s * 0.2 + 5);
      ctx.moveTo(this.x - s * 0.35 + 5, this.y - s * 0.2 - 5);
      ctx.lineTo(this.x - s * 0.35 - 5, this.y - s * 0.2 + 5);
      ctx.stroke();
      // Right eye
      ctx.beginPath();
      ctx.moveTo(this.x + s * 0.35 - 5, this.y - s * 0.2 - 5);
      ctx.lineTo(this.x + s * 0.35 + 5, this.y - s * 0.2 + 5);
      ctx.moveTo(this.x + s * 0.35 + 5, this.y - s * 0.2 - 5);
      ctx.lineTo(this.x + s * 0.35 - 5, this.y - s * 0.2 + 5);
      ctx.stroke();

      // Mouth weak spot (glows when vulnerable)
      if (this.weakSpotActive) {
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
      } else {
        ctx.fillStyle = '#7f1d1d';
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y + s * 0.3, s * 0.2, 0, Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // HP Bar
    if (!this.dying) {
      const barW = s * 2.5;
      const barH = 6;
      const bx = this.x - barW / 2;
      const by = this.y - s - 15;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, barW, barH);
      // HP gradient
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
      ctx.fillText('ZOMBIE TITAN', this.x, by - 5);
    }

    ctx.globalAlpha = 1;
  }
}
