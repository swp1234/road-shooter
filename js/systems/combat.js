// Road Shooter - Combat System
class CombatSystem {
  constructor() {
    this.bulletPool = new BulletPool(200);
  }

  // Squad auto-fire: at enemies if available, else straight forward
  // weapon: optional WEAPONS[id] object for player-selected weapon override
  squadFire(squad, enemies, boss, dmgMul = 1, rapidFire = false, particles = null, weapon = null) {
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

    const baseSpeed = CONFIG.BULLET_SPEED;

    for (const char of firers) {
      // Apply weapon overrides if selected
      const wRange = weapon ? weapon.range : char.config.range;
      const wDmgMul = weapon ? weapon.dmgMul : 1;
      const wSpread = weapon ? weapon.spread : (char.config.spread || 0);
      const wPierce = weapon ? weapon.pierce : !!char.config.pierce;
      const wAoe = weapon ? weapon.aoe : (char.config.aoe || 0);
      const wBulletSpeed = weapon ? weapon.bulletSpeed : baseSpeed;
      const wAccuracy = weapon && weapon.accuracy ? weapon.accuracy : 1;

      if (targets.length > 0) {
        // Find nearest target in range (healers get priority)
        let nearest = null;
        let minDist = wRange;
        let nearestHealer = null;
        let minHealerDist = char.config.range;
        for (const t of targets) {
          const dx = t.x - char.x;
          const dy = t.y - char.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            nearest = t;
          }
          if (!t.isBoss && t.entity && t.entity.type === 'healer' && dist < minHealerDist) {
            minHealerDist = dist;
            nearestHealer = t;
          }
        }
        if (nearestHealer) nearest = nearestHealer;

        if (nearest) {
          char.fire();
          if (particles && Math.random() < 0.3) particles.emitMuzzleFlash(char.x, char.y - 3);
          if (rapidFire) char.fireTimer *= 0.6; // Rapid fire: 40% faster, not double bullets

          // Lead prediction
          let tx = nearest.x;
          let ty = nearest.y;
          const e = nearest.entity;
          if (e && !nearest.isBoss && e.speed) {
            const rawDist = Math.sqrt((tx - char.x) ** 2 + (ty - char.y) ** 2);
            const flightTime = rawDist / speed;
            if (e.type === 'rusher' || e.type === 'detonator' || e.type === 'tank' || e.type === 'brute') {
              const edx = char.x - tx;
              const edy = char.y - ty;
              const eDist = Math.sqrt(edx * edx + edy * edy) || 1;
              tx += (edx / eDist) * e.speed * flightTime * 0.6;
              ty += (edy / eDist) * e.speed * flightTime * 0.6;
            } else if (e.type === 'flanker') {
              tx += (e.flankerSide || 1) * e.speed * 0.7 * flightTime * 0.7;
            } else if (e.type === 'shooter') {
              ty += e.speed * 0.5 * flightTime * 0.7;
              const drift = char.x > e.x + 5 ? 0.5 : char.x < e.x - 5 ? -0.5 : 0;
              tx += drift * flightTime * 0.5;
            } else if (e.type === 'thief') {
              if (e.stealTarget && e.stealTarget.active) {
                const stx = e.stealTarget.x - e.x;
                const sty = e.stealTarget.y - e.y;
                const std = Math.sqrt(stx * stx + sty * sty) || 1;
                tx += (stx / std) * e.speed * flightTime * 0.5;
                ty += (sty / std) * e.speed * flightTime * 0.5;
              } else {
                ty += e.speed * flightTime * 0.5;
              }
            } else {
              ty += e.speed * flightTime * 0.6;
            }
          }

          const dx = tx - char.x;
          const dy = ty - char.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const vx = (dx / dist) * wBulletSpeed;
          const vy = (dy / dist) * wBulletSpeed;
          const bulletDmg = Math.ceil(char.config.dmg * dmgMul * wDmgMul);

          // Determine weapon type for visual effects
          const wType = weapon ? (weapon.id || '') : (char.type || '');

          // Spread weapon (shotgun): fires multiple bullets
          if (wSpread > 0) {
            const baseAngle = Math.atan2(dy, dx);
            for (let s = 0; s < wSpread; s++) {
              const a = baseAngle + (s - (wSpread - 1) / 2) * 0.15;
              this.bulletPool.spawn(char.x, char.y - 3, Math.cos(a) * wBulletSpeed, Math.sin(a) * wBulletSpeed, Math.ceil(bulletDmg * 0.6), false, 0, false, wType);
            }
          }
          // Pierce weapon (sniper/laser)
          else if (wPierce) {
            this.bulletPool.spawn(char.x, char.y - 3, vx, vy, bulletDmg, false, 0, true, wType);
          }
          // AOE weapon (rocket)
          else if (wAoe > 0) {
            this.bulletPool.spawn(char.x, char.y - 3, vx, vy, bulletDmg, false, wAoe, false, wType);
          }
          // Normal fire (with accuracy jitter for minigun)
          else {
            let fvx = vx, fvy = vy;
            if (wAccuracy < 1) {
              const jitter = (1 - wAccuracy) * 0.5;
              fvx += (Math.random() - 0.5) * wBulletSpeed * jitter;
              fvy += (Math.random() - 0.5) * wBulletSpeed * jitter;
            }
            this.bulletPool.spawn(char.x, char.y - 3, fvx, fvy, bulletDmg, false, 0, false, wType);
          }
          if (Math.random() < 0.15) Sound.shoot();
        } else {
          // No target in range — fire straight forward with tighter spread
          char.fire();
          if (particles && Math.random() < 0.3) particles.emitMuzzleFlash(char.x, char.y - 3);
          const spread = (Math.random() - 0.5) * 0.3;
          this.bulletPool.spawn(char.x, char.y - 3, spread, -wBulletSpeed, Math.ceil(char.config.dmg * dmgMul * wDmgMul), false, wAoe);
          if (Math.random() < 0.05) Sound.shoot();
        }
      } else {
        // No enemies at all — always fire forward
        char.fire();
        if (particles && Math.random() < 0.3) particles.emitMuzzleFlash(char.x, char.y - 3);
        const spread = (Math.random() - 0.5) * 0.4;
        this.bulletPool.spawn(char.x, char.y - 3, spread, -wBulletSpeed, Math.ceil(char.config.dmg * dmgMul * wDmgMul), false, wAoe);
        if (Math.random() < 0.05) Sound.shoot();
      }
    }
  }

  // Enemy fire at squad
  enemyFire(enemies, squadX, squadY) {
    for (const e of enemies) {
      if (e.active && !e.dying && e.canFire()) {
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
  checkBulletHits(enemies, boss, particles, bossGoldMul = 1) {
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
          particles.emitWeaponHit(b.x, b.y, b.weaponType);
          particles.emitDamage(b.x, b.y, b.dmg);
          Sound.bossHit();
          if (killed) {
            particles.emitBossDeath(boss.x, boss.y);
            particles.startShake(8, 0.5);
            gold += Math.floor(CONFIG.BOSS_GOLD * bossGoldMul);
            Sound.bossDeath();
          }
          continue;
        }
      }

      // Check enemies (generous hitbox for gameplay feel)
      for (const e of enemies) {
        if (!e.active || e.dying) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const hitR = e.size + b.size + 2;
        if (dx * dx + dy * dy < hitR * hitR) {
          const killed = e.takeDamage(b.dmg, b.x, b.y);
          // Pierce bullets go through enemies (up to 4 hits)
          if (b.pierce) {
            b.pierceHits++;
            if (b.pierceHits >= 4) b.active = false;
          } else {
            b.active = false;
          }
          particles.emitWeaponHit(b.x, b.y, b.weaponType);
          particles.emitDamage(b.x, b.y, b.dmg);
          if (killed) {
            kills++;
            gold += e.reward;
            particles.emitEnemyDeath(e.x, e.y, e.type);
            Sound.enemyDeath();
          } else {
            Sound.enemyHit();
          }
          // AOE splash damage
          if (b.aoe > 0) {
            for (const e2 of enemies) {
              if (e2 === e || !e2.active || e2.dying) continue;
              const adx = b.x - e2.x;
              const ady = b.y - e2.y;
              if (adx * adx + ady * ady < b.aoe * b.aoe) {
                const splashKill = e2.takeDamage(Math.ceil(b.dmg * 0.5), b.x, b.y);
                if (splashKill) {
                  kills++;
                  gold += e2.reward;
                  particles.emitEnemyDeath(e2.x, e2.y, e2.type);
                  Sound.enemyDeath();
                }
              }
            }
            particles.emit(b.x, b.y, '#f97316', 6, 4, 0.3, 3);
          }
          if (!b.pierce) break; // Non-pierce stops at first hit
        }
      }
    }
    return { kills, gold };
  }

  // Check enemy bullets hitting squad (shield absorbs hits)
  checkEnemyBulletHits(squad, particles, shieldCharges = 0) {
    const bullets = this.bulletPool.active;
    const alive = squad.alive;
    let losses = 0;
    let shieldUsed = 0;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.isEnemy) continue;

      for (const char of alive) {
        if (char.dying) continue;
        const dx = b.x - char.x;
        const dy = b.y - char.y;
        if (dx * dx + dy * dy < 100) { // 10px radius
          b.active = false;
          if (shieldCharges > shieldUsed) {
            shieldUsed++;
            particles.emit(b.x, b.y, '#60a5fa', 3, 3, 0.2, 2);
          } else {
            const died = char.takeDamage(b.dmg);
            if (died) {
              losses++;
              particles.emitDeath(char.x, char.y);
              Sound.damageTaken();
            }
          }
          break;
        }
      }
    }
    return { losses, shieldUsed };
  }

  // Check contact collisions (rusher dies on contact, tank/brute survive)
  checkRusherCollisions(enemies, squad, particles) {
    let losses = 0;
    for (const e of enemies) {
      if (!e.active || e.dying) continue;
      const isContact = e.type === 'rusher' || e.type === 'tank' || e.type === 'brute' || e.type === 'splitter' || e.type === 'splitterMini';
      if (!isContact) continue;
      const alive = squad.alive;
      for (const char of alive) {
        if (char.dying) continue;
        const dx = e.x - char.x;
        const dy = e.y - char.y;
        const hitDist = e.type === 'brute' ? (e.size + 10) : (e.size + 6);
        if (dx * dx + dy * dy < hitDist * hitDist) {
          if (e.type === 'rusher' || e.type === 'splitter' || e.type === 'splitterMini') {
            const died = char.takeDamage(e.dmg);
            e.takeDamage(999);
            particles.emitEnemyDeath(e.x, e.y, e.type);
            if (died) { losses++; particles.emitDeath(char.x, char.y); }
          } else if (e.type === 'tank') {
            // Tank: damage on cooldown (0.5s between hits)
            if (!e.contactCooldown || e.contactCooldown <= 0) {
              const died = char.takeDamage(e.dmg);
              e.takeDamage(2);
              e.contactCooldown = 0.5;
              if (died) { losses++; particles.emitDeath(char.x, char.y); }
            }
          } else if (e.type === 'brute') {
            // Brute: heavy damage on cooldown (0.4s between hits)
            if (!e.bruteContactTimer || e.bruteContactTimer <= 0) {
              const died = char.takeDamage(e.dmg);
              e.bruteContactTimer = 0.4;
              if (died) { losses++; particles.emitDeath(char.x, char.y); }
            }
          }
          break;
        }
      }
      // Decrement contact cooldowns (dt-based via 1/60 approximation)
      if (e.contactCooldown > 0) e.contactCooldown -= 1/60;
      if (e.bruteContactTimer > 0) e.bruteContactTimer -= 1/60;
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
