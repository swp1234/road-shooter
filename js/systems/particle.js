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
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class ParticleSystem {
  constructor(maxParticles = 150) {
    this.particles = [];
    this.max = maxParticles;
  }

  emit(x, y, color, count = 5, spread = 3, life = 0.5, size = 3) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.max) {
        // Remove oldest
        this.particles.shift();
      }
      const vx = (Math.random() - 0.5) * spread * 2;
      const vy = (Math.random() - 0.5) * spread * 2;
      this.particles.push(new Particle(x, y, vx, vy, color, life, size));
    }
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

  emitNumber(x, y, text, color = '#fff') {
    // Floating number effect handled by items themselves
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (!this.particles[i].active) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const p of this.particles) p.draw(ctx);
  }

  clear() {
    this.particles.length = 0;
  }
}
