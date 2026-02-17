// Road Shooter - Enemy Types (Enhanced Visuals)
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
    }

    if (this.y > CONFIG.CANVAS_HEIGHT + 50) this.active = false;
  }

  canFire() {
    if (this.dying || this.fireTimer > 0) return false;
    return this.type === 'shooter' || this.type === 'mortar' || this.type === 'flanker';
  }

  fire() {
    this.fireTimer = 1 / this.fireRate;
  }

  takeDamage(dmg) {
    if (this.dying) return false;
    this.hp -= dmg;
    this.flashTimer = 0.1;
    if (this.hp <= 0) {
      this.dying = true;
      this.deathTimer = 0.2;
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
      default:
        ctx.fillStyle = isFlash ? '#fff' : this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
        ctx.fill();
    }

    // HP bar for multi-HP enemies
    if (this.maxHp > 1 && !this.dying) {
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
    // Armored rushing figure with motion lines
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Motion lines behind
    if (!this.dying) {
      ctx.globalAlpha *= 0.3;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.3 * i, s * (0.5 + i * 0.3));
        ctx.lineTo(s * 0.3 * i, s * (0.5 + i * 0.3));
        ctx.stroke();
      }
      ctx.globalAlpha /= 0.3;
    }

    // Body (armored triangle)
    ctx.fillStyle = isFlash ? '#fff' : '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.1);
    ctx.lineTo(-s * 0.7, s * 0.6);
    ctx.lineTo(s * 0.7, s * 0.6);
    ctx.closePath();
    ctx.fill();

    // Inner armor plate
    ctx.fillStyle = isFlash ? '#eee' : '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6);
    ctx.lineTo(-s * 0.35, s * 0.3);
    ctx.lineTo(s * 0.35, s * 0.3);
    ctx.closePath();
    ctx.fill();

    // Eye (angry slit)
    if (!this.dying) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-s * 0.25, -s * 0.15, s * 0.5, 1.5);
    }

    ctx.restore();
  }

  drawShooter(ctx, s, isFlash) {
    // Turret with rotating barrel
    const baseColor = isFlash ? '#fff' : '#92400e';
    const topColor = isFlash ? '#eee' : '#f97316';

    // Base platform
    ctx.fillStyle = baseColor;
    ctx.fillRect(this.x - s * 0.8, this.y - s * 0.3, s * 1.6, s * 1.0);

    // Turret body
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y - s * 0.2, s * 0.6, 0, Math.PI * 2);
    ctx.fill();

    if (!this.dying) {
      // Barrel (pointing down toward player)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(this.x - 1.5, this.y + s * 0.3, 3, s * 0.8);
      // Muzzle
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(this.x, this.y + s * 1.1, 2, 0, Math.PI * 2);
      ctx.fill();

      // Viewport slit
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(this.x - s * 0.3, this.y - s * 0.3, s * 0.6, 1.5);

      // Side armor plates
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(this.x - s * 0.9, this.y - s * 0.1, 2, s * 0.6);
      ctx.fillRect(this.x + s * 0.9 - 2, this.y - s * 0.1, 2, s * 0.6);
    }
  }

  drawMortar(ctx, s, isFlash) {
    // Heavy artillery piece
    const baseColor = isFlash ? '#fff' : '#7c2d12';
    const tubeColor = isFlash ? '#eee' : '#ea580c';

    // Treads/base
    ctx.fillStyle = '#334155';
    ctx.fillRect(this.x - s * 0.9, this.y + s * 0.2, s * 1.8, s * 0.4);
    ctx.fillRect(this.x - s * 0.8, this.y + s * 0.6, s * 1.6, 2);

    // Body
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, s * 0.7, 0, Math.PI * 2);
    ctx.fill();

    if (!this.dying) {
      // Mortar tube (angled)
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(0.2 * Math.sin(this.animTimer));
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-2, -s * 1.5, 4, s * 1.2);
      ctx.fillStyle = tubeColor;
      ctx.beginPath();
      ctx.arc(0, -s * 1.5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Charge indicator (pulsing ring when charging)
      if (this.mortarChargeTimer > 0) {
        const chargePct = 1 - this.mortarChargeTimer / 2;
        ctx.strokeStyle = `rgba(249,115,22,${0.5 + chargePct * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, s + 4 + chargePct * 6, 0, Math.PI * 2 * chargePct);
        ctx.stroke();
      }

      // Center marker
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawDetonator(ctx, s, isFlash) {
    // Bomb with countdown ring
    const baseColor = isFlash ? '#fff' : '#7f1d1d';
    const bodyColor = isFlash ? '#eee' : '#dc2626';

    // Body (round bomb)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
    ctx.fill();

    // Dark inner
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, s * 0.65, 0, Math.PI * 2);
    ctx.fill();

    if (!this.dying) {
      // Skull/danger symbol
      ctx.fillStyle = '#fbbf24';
      ctx.font = `bold ${s}px Outfit`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', this.x, this.y + 1);
      ctx.textBaseline = 'alphabetic';

      // Fuse spark on top
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(this.x, this.y - s - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - s);
      ctx.quadraticCurveTo(this.x + 3, this.y - s - 4, this.x, this.y - s - 2);
      ctx.stroke();

      // Countdown ring (if fuse started)
      if (this.fuseStarted) {
        const fusePct = this.fuseTimer / 3;
        const flash = Math.sin(Date.now() / 80) > 0;
        ctx.strokeStyle = flash ? '#fbbf24' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, s + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fusePct);
        ctx.stroke();
      }
    }
  }

  drawThief(ctx, s, isFlash) {
    // Sneaky cloaked figure
    const cloakColor = isFlash ? '#fff' : '#1f2937';
    const innerColor = isFlash ? '#eee' : '#374151';

    // Cloak (wider triangle pointing down)
    ctx.fillStyle = cloakColor;
    ctx.beginPath();
    ctx.moveTo(this.x - s * 0.9, this.y - s * 0.6);
    ctx.lineTo(this.x + s * 0.9, this.y - s * 0.6);
    ctx.lineTo(this.x + s * 0.4, this.y + s);
    ctx.lineTo(this.x - s * 0.4, this.y + s);
    ctx.closePath();
    ctx.fill();

    // Hood
    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y - s * 0.4, s * 0.55, Math.PI, 0);
    ctx.fill();

    if (!this.dying) {
      // Glowing eyes (two dots)
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath();
      ctx.arc(this.x - s * 0.18, this.y - s * 0.35, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x + s * 0.18, this.y - s * 0.35, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Steal indicator (hand reaching)
      if (this.stealTarget) {
        ctx.strokeStyle = 'rgba(167,139,250,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.stealTarget.x, this.stealTarget.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  drawFlanker(ctx, s, isFlash) {
    // Fast diagonal unit with motion trail
    const bodyColor = isFlash ? '#fff' : '#991b1b';
    const accentColor = isFlash ? '#eee' : '#dc2626';

    // Motion trail (afterimages)
    if (!this.dying && this.trailX.length > 1) {
      for (let i = 0; i < this.trailX.length - 1; i++) {
        const a = (i + 1) / this.trailX.length * 0.2;
        ctx.globalAlpha *= a;
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(this.trailX[i], this.trailY[i] - s * 0.6);
        ctx.lineTo(this.trailX[i] - s * 0.5, this.trailY[i] + s * 0.4);
        ctx.lineTo(this.trailX[i] + s * 0.5, this.trailY[i] + s * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha /= a;
      }
    }

    // Diamond body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - s);
    ctx.lineTo(this.x + s * 0.7, this.y);
    ctx.lineTo(this.x, this.y + s);
    ctx.lineTo(this.x - s * 0.7, this.y);
    ctx.closePath();
    ctx.fill();

    // Inner diamond
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - s * 0.55);
    ctx.lineTo(this.x + s * 0.35, this.y);
    ctx.lineTo(this.x, this.y + s * 0.55);
    ctx.lineTo(this.x - s * 0.35, this.y);
    ctx.closePath();
    ctx.fill();

    if (!this.dying) {
      // Wing blades (sides)
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(this.x - s * 0.7, this.y);
      ctx.lineTo(this.x - s * 1.2, this.y - s * 0.2);
      ctx.lineTo(this.x - s * 0.5, this.y + s * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(this.x + s * 0.7, this.y);
      ctx.lineTo(this.x + s * 1.2, this.y - s * 0.2);
      ctx.lineTo(this.x + s * 0.5, this.y + s * 0.15);
      ctx.closePath();
      ctx.fill();

      // Direction indicator (barrel)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(this.x - 1, this.y + s * 0.6, 2, s * 0.4);
    }
  }
}
