// Road Shooter - Combat System
class CombatSystem {
  constructor() {
    this.bulletPool = new BulletPool(200);
  }

  // Squad auto-fire: at enemies if available, else straight forward
  squadFire(squad, enemies, boss, dmgMul = 1, rapidFire = false) {
    const firers = squad.getFirers();
    const targets = [];

    // Collect valid targets
    if (boss && boss.active && !boss.dying && boss.entered) {
      targets.push({ x: boss.x, y: boss.y, entity: boss, isBoss: true });
    }
    for (const e of enemies) {
      if (e.active && !e.dying) {
        targets.push({ x: e.x, y: e.y, entity: e, isBoss: false });
      }
    }

    const speed = CONFIG.BULLET_SPEED;

    for (const char of firers) {
      if (targets.length > 0) {
        // Find nearest target in range
        let nearest = null;
        let minDist = char.config.range;
        for (const t of targets) {
          const dx = t.x - char.x;
          const dy = t.y - char.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            nearest = t;
          }
        }

        if (nearest) {
          char.fire();
          if (rapidFire) char.fireTimer *= 0.5; // Half cooldown
          const dx = nearest.x - char.x;
          const dy = nearest.y - char.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const vx = (dx / dist) * speed;
          const vy = (dy / dist) * speed;
          this.bulletPool.spawn(char.x, char.y - 3, vx, vy, Math.ceil(char.config.dmg * dmgMul), false, char.config.aoe || 0);
          if (rapidFire) {
            // Second bullet with slight offset
            this.bulletPool.spawn(char.x + 2, char.y - 3, vx, vy, Math.ceil(char.config.dmg * dmgMul), false, char.config.aoe || 0);
          }
          if (Math.random() < 0.15) Sound.shoot();
        } else {
          // No target in range — fire straight forward
          char.fire();
          const spread = (Math.random() - 0.5) * 0.6;
          this.bulletPool.spawn(char.x, char.y - 3, spread, -speed, Math.ceil(char.config.dmg * dmgMul), false, char.config.aoe || 0);
          if (Math.random() < 0.05) Sound.shoot();
        }
      } else {
        // No enemies at all — always fire forward
        char.fire();
        const spread = (Math.random() - 0.5) * 0.8;
        this.bulletPool.spawn(char.x, char.y - 3, spread, -speed, Math.ceil(char.config.dmg * dmgMul), false, char.config.aoe || 0);
        if (Math.random() < 0.05) Sound.shoot();
      }
    }
  }

  // Enemy fire at squad
  enemyFire(enemies, squadX, squadY) {
    for (const e of enemies) {
      if (e.canFire()) {
        e.fire();
        const dx = squadX - e.x;
        const dy = squadY - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const speed = 3;
          if (e.type === 'elite') {
            // Elite fires 3-bullet spread
            const baseAngle = Math.atan2(dy, dx);
            for (let i = -1; i <= 1; i++) {
              const a = baseAngle + i * 0.25;
              this.bulletPool.spawn(
                e.x, e.y + e.size,
                Math.cos(a) * speed, Math.sin(a) * speed,
                e.dmg, true
              );
            }
          } else {
            this.bulletPool.spawn(
              e.x, e.y + e.size,
              (dx / dist) * speed, (dy / dist) * speed,
              e.dmg, true
            );
          }
        }
      }
    }
  }

  // Check bullet-enemy collisions
  checkBulletHits(enemies, boss, particles) {
    let kills = 0;
    let gold = 0;
    const bullets = this.bulletPool.active;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (b.isEnemy) continue;

      // Check boss
      if (boss && boss.active && !boss.dying) {
        const dx = b.x - boss.x;
        const dy = b.y - boss.y;
        if (dx * dx + dy * dy < boss.size * boss.size) {
          const killed = boss.takeDamage(b.dmg);
          b.active = false;
          particles.emit(b.x, b.y, '#fbbf24', 2, 2, 0.2, 2);
          Sound.bossHit();
          if (killed) {
            particles.emitBossDeath(boss.x, boss.y);
            gold += CONFIG.BOSS_GOLD;
            Sound.bossDeath();
          }
          continue;
        }
      }

      // Check enemies
      for (const e of enemies) {
        if (!e.active || e.dying) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (dx * dx + dy * dy < (e.size + b.size) * (e.size + b.size)) {
          const killed = e.takeDamage(b.dmg);
          b.active = false;
          if (killed) {
            kills++;
            gold += e.reward;
            particles.emitDeath(e.x, e.y);
            Sound.enemyDeath();
          } else {
            Sound.enemyHit();
          }
          break;
        }
      }
    }
    return { kills, gold };
  }

  // Check enemy bullets hitting squad
  checkEnemyBulletHits(squad, particles) {
    const bullets = this.bulletPool.active;
    const alive = squad.alive;
    let losses = 0;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.isEnemy) continue;

      for (const char of alive) {
        if (char.dying) continue;
        const dx = b.x - char.x;
        const dy = b.y - char.y;
        if (dx * dx + dy * dy < 100) { // 10px radius
          const died = char.takeDamage(b.dmg);
          b.active = false;
          if (died) {
            losses++;
            particles.emitDeath(char.x, char.y);
            Sound.damageTaken();
          }
          break;
        }
      }
    }
    return losses;
  }

  // Check rusher collision with squad
  checkRusherCollisions(enemies, squad, particles) {
    let losses = 0;
    for (const e of enemies) {
      if (!e.active || e.dying || e.type !== 'rusher') continue;
      const alive = squad.alive;
      for (const char of alive) {
        if (char.dying) continue;
        const dx = e.x - char.x;
        const dy = e.y - char.y;
        if (dx * dx + dy * dy < (e.size + 6) * (e.size + 6)) {
          const died = char.takeDamage(e.dmg);
          e.takeDamage(999); // Rusher dies on contact
          if (died) {
            losses++;
            particles.emitDeath(char.x, char.y);
          }
          particles.emitDeath(e.x, e.y);
          break;
        }
      }
    }
    return losses;
  }

  // Check boss shockwave
  checkBossShockwave(boss, squad, particles) {
    if (!boss || !boss.shockwaveActive) return 0;
    let losses = 0;
    const alive = squad.alive;
    for (const char of alive) {
      if (char.dying) continue;
      const dx = char.x - boss.x;
      const dy = char.y - boss.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const shockDist = Math.abs(dist - boss.shockwaveRadius);
      if (shockDist < 15) {
        const died = char.takeDamage(1);
        if (died) {
          losses++;
          particles.emitDeath(char.x, char.y);
          Sound.damageTaken();
        }
      }
    }
    return losses;
  }

  update() {
    this.bulletPool.update();
  }

  draw(ctx) {
    this.bulletPool.draw(ctx);
  }

  clear() {
    this.bulletPool.clear();
  }
}
