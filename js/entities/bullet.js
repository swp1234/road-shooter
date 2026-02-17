// Road Shooter - Bullet/Projectile System
class Bullet {
  constructor(x, y, vx, vy, dmg, isEnemy = false, aoe = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.dmg = dmg;
    this.isEnemy = isEnemy;
    this.aoe = aoe;
    this.active = true;
    this.size = CONFIG.BULLET_SIZE;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    // Remove if off screen
    if (this.y < -20 || this.y > CONFIG.CANVAS_HEIGHT + 20 ||
        this.x < -20 || this.x > CONFIG.CANVAS_WIDTH + 20) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.fillStyle = this.isEnemy ? '#ef4444' : '#fbbf24';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

class BulletPool {
  constructor(maxSize = 200) {
    this.pool = [];
    this.active = [];
    this.maxSize = maxSize;
  }

  spawn(x, y, vx, vy, dmg, isEnemy = false, aoe = 0) {
    let bullet;
    if (this.pool.length > 0) {
      bullet = this.pool.pop();
      bullet.x = x; bullet.y = y;
      bullet.vx = vx; bullet.vy = vy;
      bullet.dmg = dmg; bullet.isEnemy = isEnemy;
      bullet.aoe = aoe; bullet.active = true;
      bullet.size = CONFIG.BULLET_SIZE;
    } else {
      bullet = new Bullet(x, y, vx, vy, dmg, isEnemy, aoe);
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
