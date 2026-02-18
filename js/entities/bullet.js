// Road Shooter - Bullet/Projectile System (Enhanced Visuals)
class Bullet {
  constructor(x, y, vx, vy, dmg, isEnemy = false, aoe = 0, pierce = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.dmg = dmg;
    this.isEnemy = isEnemy;
    this.aoe = aoe;
    this.pierce = pierce;
    this.pierceHits = 0; // track how many enemies pierced
    this.active = true;
    this.size = pierce ? CONFIG.BULLET_SIZE * 1.5 : CONFIG.BULLET_SIZE;
    // Trail
    this.prevX = x;
    this.prevY = y;
  }

  update() {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx;
    this.y += this.vy;
    if (this.y < -20 || this.y > CONFIG.CANVAS_HEIGHT + 20 ||
        this.x < -20 || this.x > CONFIG.CANVAS_WIDTH + 20) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;

    if (this.isEnemy) {
      // Enemy bullet: red tracer
      ctx.strokeStyle = 'rgba(239,68,68,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.prevX, this.prevY);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Player bullet: cyan/yellow tracer with glow
      const trailLen = 8;
      const dx = this.x - this.prevX;
      const dy = this.y - this.prevY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : -1;

      // Trail glow
      const isLaser = this.pierce;
      const isShotgun = !this.aoe && !isLaser && this.size < CONFIG.BULLET_SIZE;
      const glowColor = isLaser ? '#06b6d4' : this.aoe > 0 ? '#f97316' : '#00e5ff';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isLaser ? 8 : 4;

      ctx.strokeStyle = isLaser ? 'rgba(6,182,212,0.7)' : this.aoe > 0 ? 'rgba(249,115,22,0.5)' : 'rgba(0,229,255,0.5)';
      ctx.lineWidth = isLaser ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x - nx * trailLen, this.y - ny * trailLen);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();

      // Bullet head
      ctx.fillStyle = isLaser ? '#06b6d4' : this.aoe > 0 ? '#f97316' : '#fbbf24';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();

      // Bright center
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    }
  }
}

class BulletPool {
  constructor(maxSize = 200) {
    this.pool = [];
    this.active = [];
    this.maxSize = maxSize;
  }

  spawn(x, y, vx, vy, dmg, isEnemy = false, aoe = 0, pierce = false) {
    let bullet;
    if (this.pool.length > 0) {
      bullet = this.pool.pop();
      bullet.x = x; bullet.y = y;
      bullet.vx = vx; bullet.vy = vy;
      bullet.dmg = dmg; bullet.isEnemy = isEnemy;
      bullet.aoe = aoe; bullet.pierce = pierce;
      bullet.pierceHits = 0; bullet.active = true;
      bullet.size = pierce ? CONFIG.BULLET_SIZE * 1.5 : CONFIG.BULLET_SIZE;
      bullet.prevX = x; bullet.prevY = y;
    } else {
      bullet = new Bullet(x, y, vx, vy, dmg, isEnemy, aoe, pierce);
    }
    this.active.push(bullet);
    return bullet;
  }

  update() {
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.active[i].update();
      if (!this.active[i].active) {
        this.pool.push(this.active[i]);
        this.active.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const b of this.active) b.draw(ctx);
  }

  clear() {
    this.pool.push(...this.active);
    this.active.length = 0;
  }
}
