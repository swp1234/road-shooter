// Road Shooter - Bullet/Projectile System (Enhanced Visuals)
class Bullet {
  constructor(x, y, vx, vy, dmg, isEnemy = false, aoe = 0, pierce = false, weaponType = '') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.dmg = dmg;
    this.isEnemy = isEnemy;
    this.aoe = aoe;
    this.pierce = pierce;
    this.pierceHits = 0;
    this.active = true;
    this.size = pierce ? CONFIG.BULLET_SIZE * 1.5 : CONFIG.BULLET_SIZE;
    this.weaponType = weaponType;
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
      // Player bullet: weapon-specific visuals
      const trailLen = 8;
      const dx = this.x - this.prevX;
      const dy = this.y - this.prevY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : -1;
      const wt = this.weaponType;

      // Weapon-specific colors and effects
      let glowColor, trailColor, headColor, trailWidth, glowStrength;
      switch (wt) {
        case 'sniper':
          glowColor = '#8b5cf6'; trailColor = 'rgba(139,92,246,0.8)'; headColor = '#a78bfa';
          trailWidth = 2.5; glowStrength = 10;
          break;
        case 'laser':
          glowColor = '#06b6d4'; trailColor = 'rgba(6,182,212,0.7)'; headColor = '#22d3ee';
          trailWidth = 3; glowStrength = 8;
          break;
        case 'shotgun':
          glowColor = '#dc2626'; trailColor = 'rgba(220,38,38,0.5)'; headColor = '#f87171';
          trailWidth = 1; glowStrength = 3;
          break;
        case 'rocket':
          glowColor = '#f97316'; trailColor = 'rgba(249,115,22,0.6)'; headColor = '#fb923c';
          trailWidth = 2; glowStrength = 6;
          break;
        case 'minigun':
          glowColor = '#eab308'; trailColor = 'rgba(234,179,8,0.4)'; headColor = '#fbbf24';
          trailWidth = 1; glowStrength = 2;
          break;
        default: // assault
          glowColor = '#00e5ff'; trailColor = 'rgba(0,229,255,0.5)'; headColor = '#fbbf24';
          trailWidth = 1.5; glowStrength = 4;
      }

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glowStrength;

      // Laser draws a long beam
      if (wt === 'laser') {
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = trailWidth;
        ctx.beginPath();
        ctx.moveTo(this.x - nx * 16, this.y - ny * 16);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
      }
      // Rocket draws a wider trail with ember
      else if (wt === 'rocket') {
        ctx.strokeStyle = 'rgba(255,100,0,0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x - nx * 12, this.y - ny * 12);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = trailWidth;
        ctx.beginPath();
        ctx.moveTo(this.x - nx * trailLen, this.y - ny * trailLen);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
      }
      // Sniper draws a thin sharp line
      else if (wt === 'sniper') {
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = trailWidth;
        ctx.beginPath();
        ctx.moveTo(this.x - nx * 14, this.y - ny * 14);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
      }
      else {
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = trailWidth;
        ctx.beginPath();
        ctx.moveTo(this.x - nx * trailLen, this.y - ny * trailLen);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
      }

      // Bullet head
      ctx.fillStyle = headColor;
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

  spawn(x, y, vx, vy, dmg, isEnemy = false, aoe = 0, pierce = false, weaponType = '') {
    let bullet;
    if (this.pool.length > 0) {
      bullet = this.pool.pop();
      bullet.x = x; bullet.y = y;
      bullet.vx = vx; bullet.vy = vy;
      bullet.dmg = dmg; bullet.isEnemy = isEnemy;
      bullet.aoe = aoe; bullet.pierce = pierce;
      bullet.pierceHits = 0; bullet.active = true;
      bullet.size = pierce ? CONFIG.BULLET_SIZE * 1.5 : CONFIG.BULLET_SIZE;
      bullet.weaponType = weaponType;
      bullet.prevX = x; bullet.prevY = y;
    } else {
      bullet = new Bullet(x, y, vx, vy, dmg, isEnemy, aoe, pierce, weaponType);
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
