// Road Shooter - Particle System
class Particle {
  constructor(x, y, vx, vy, color, life = 0.5, size = 3) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.active = true;
  }

  update(dt) {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= dt;
    this.vy += 0.1; // gravity
    if (this.life <= 0) this.active = false;
  }

  draw(ctx) {
    if (!this.active) return;
    const alpha = this.life / this.maxLife;
    const r = this.size * alpha;
    ctx.globalAlpha = alpha;
    // Glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = r * 2;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    // Bright center
    if (r > 1.5) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

// Floating damage/text numbers
class FloatingText {
  constructor(x, y, text, color, size = 14) {
    this.x = x + (Math.random() - 0.5) * 12;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 0.7;
    this.maxLife = 0.7;
    this.vy = -2;
    this.active = true;
  }

  update(dt) {
    this.y += this.vy;
    this.vy *= 0.97;
    this.life -= dt;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx) {
    if (!this.active) return;
    const t = 1 - this.life / this.maxLife;
    const alpha = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
    const scale = t < 0.15 ? 0.6 + t / 0.15 * 0.4 : 1;
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.round(this.size * scale)}px Outfit`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(this.text, this.x + 1, this.y + 1);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

class ParticleSystem {
  constructor(maxParticles = 400) {
    this.particles = [];
    this.texts = [];
    this.max = maxParticles;
  }

  emit(x, y, color, count = 5, spread = 3, life = 0.5, size = 3) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.max) {
        this.particles.shift();
      }
      const vx = (Math.random() - 0.5) * spread * 2;
      const vy = (Math.random() - 0.5) * spread * 2;
      this.particles.push(new Particle(x, y, vx, vy, color, life, size));
    }
  }

  // Floating damage number
  emitDamage(x, y, dmg, isCrit = false) {
    const color = isCrit ? '#fbbf24' : '#fff';
    const size = isCrit ? 18 : Math.min(20, 11 + dmg / 4);
    const text = isCrit ? `${dmg}!` : `${dmg}`;
    this.texts.push(new FloatingText(x, y - 5, text, color, size));
    if (this.texts.length > 40) this.texts.shift();
  }

  // Floating text (combo, wave clear, etc.)
  emitText(x, y, text, color = '#fff', size = 16) {
    this.texts.push(new FloatingText(x, y, text, color, size));
    if (this.texts.length > 40) this.texts.shift();
  }

  // Bullet hit spark
  emitHitSpark(x, y) {
    this.emit(x, y, '#fff', 2, 2, 0.12, 1.5);
  }

  // Special effects
  emitCollect(x, y) {
    this.emit(x, y, '#fbbf24', 8, 4, 0.4, 2);
  }

  emitDeath(x, y) {
    this.emit(x, y, '#ef4444', 6, 3, 0.3, 2);
  }

  emitGatePass(x, y, color) {
    this.emit(x, y, color, 15, 6, 0.6, 4);
  }

  emitBossDeath(x, y) {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.emit(
          x + (Math.random() - 0.5) * 60,
          y + (Math.random() - 0.5) * 60,
          ['#ef4444', '#f97316', '#fbbf24'][i % 3],
          20, 8, 1, 5
        );
      }, i * 200);
    }
  }

  // Shield absorb burst
  emitShieldBreak(x, y) {
    this.emit(x, y, '#60a5fa', 10, 5, 0.4, 3);
    this.emitText(x, y - 10, 'BLOCKED', '#60a5fa', 12);
  }

  // Muzzle flash on bullet fire
  emitMuzzleFlash(x, y) {
    this.emit(x, y, '#ffe566', 3, 2.5, 0.07, 1.2);
    this.emit(x, y, '#fff', 1, 1.5, 0.05, 0.8);
  }

  // Enemy death with color by type
  emitEnemyDeath(x, y, type) {
    const colors = {
      rusher: '#f87171', shooter: '#60a5fa', tank: '#a78bfa',
      elite: '#f59e0b', flanker: '#34d399', thief: '#e879f9',
      detonator: '#ff6b35', brute: '#dc2626', sniper: '#38bdf8'
    };
    const color = colors[type] || '#ef4444';
    this.emit(x, y, color, 8, 4, 0.38, 2.5);
    this.emit(x, y, '#fff', 2, 2, 0.15, 1.5);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (!this.particles[i].active) {
        this.particles.splice(i, 1);
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      this.texts[i].update(dt);
      if (!this.texts[i].active) {
        this.texts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const p of this.particles) p.draw(ctx);
    for (const t of this.texts) t.draw(ctx);
  }

  clear() {
    this.particles.length = 0;
    this.texts.length = 0;
  }
}
