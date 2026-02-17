// Road Shooter - Endless Mode Scene
class EndlessScene {
  constructor(game) {
    this.game = game;

    // Systems
    this.road = new Road();
    this.combat = new CombatSystem();
    this.particles = new ParticleSystem();

    // Squad
    const ups = game.saveData.upgrades;
    const startSize = CONFIG.START_SQUAD + (ups.startSquad || 0) + 3; // Bonus start for endless
    this.squad = new Squad(startSize);

    // Upgrade multipliers
    this.dmgMul = 1 + (ups.baseDamage || 0) * CONFIG.UPGRADES.baseDamage.perLevel;
    this.goldMul = 1 + (ups.goldBonus || 0) * CONFIG.UPGRADES.goldBonus.perLevel;

    // Entities
    this.items = [];
    this.enemies = [];
    this.boss = null;

    // Wave system
    this.wave = 0;
    this.waveTimer = 3; // Countdown before first wave
    this.waveCooldown = false;
    this.itemSpawnTimer = 0;
    this.bossWave = false;
    this.finished = false;
    this.totalTimer = 0;

    // Stats
    this.kills = 0;
    this.gold = 0;
    this.maxSquad = startSize;
    this.startSquad = startSize;
    this.bossesDefeated = 0;

    // Difficulty ramp
    this.stageMul = 1;

    // HUD
    this.comboText = '';
    this.comboTimer = 0;
    this.dangerAlpha = 0;

    // Transition
    this.transitionText = this.game.i18n('endless_start') || 'ENDLESS MODE';
    this.transitionTimer = 2;
    Sound.stageIntro();
  }

  update(dt) {
    if (this.finished) return;

    this.totalTimer += dt;

    // Transition
    if (this.transitionTimer > 0) {
      this.transitionTimer -= dt;
      if (this.transitionTimer > 1) return;
    }

    // Road scrolls
    this.road.update();

    // Combo text fade
    if (this.comboTimer > 0) this.comboTimer -= dt;

    // Danger indicator
    const squadPct = this.squad.size / Math.max(this.startSquad, 10);
    this.dangerAlpha = squadPct < 0.25 ? 0.3 + Math.sin(Date.now() / 200) * 0.2 : 0;

    // Update squad
    this.squad.update(dt);
    this.maxSquad = Math.max(this.maxSquad, this.squad.size);

    // Game over check
    if (this.squad.size <= 0) {
      this.endRun();
      return;
    }

    // Spawn items continuously
    this.itemSpawnTimer -= 1;
    if (this.itemSpawnTimer <= 0) {
      this.spawnItem();
      this.itemSpawnTimer = CONFIG.ITEM_SPAWN_INTERVAL * (0.8 + Math.random() * 0.4);
    }

    // Item collection
    this.checkItemCollision();

    // Always run combat (squad should always shoot if targets exist)
    if (!this.bossWave) {
      this.combat.squadFire(this.squad, this.enemies, null, this.dmgMul);
    }
    this.combat.enemyFire(this.enemies, this.squad.x, this.squad.y);

    // Wave logic
    if (this.bossWave) {
      this.updateBossWave(dt);
    } else {
      this.updateCombatWave(dt);
    }

    // Update entities
    for (let i = this.items.length - 1; i >= 0; i--) {
      this.items[i].update(this.road.speed);
      if (!this.items[i].active) this.items.splice(i, 1);
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].update(dt, this.squad.x, this.squad.y);
      if (!this.enemies[i].active) this.enemies.splice(i, 1);
    }

    this.particles.update(dt);
    this.combat.update();
  }

  updateCombatWave(dt) {
    this.waveTimer -= dt;

    // Spawn next wave
    if (this.waveTimer <= 0 && !this.waveCooldown) {
      this.wave++;
      this.stageMul = 1 + (this.wave - 1) * 0.15;

      // Every 5th wave is a boss wave
      if (this.wave % 5 === 0) {
        this.bossWave = true;
        const rot = CONFIG.BOSS_ROTATION;
        const bossType = rot[(this.wave / 5 - 1) % rot.length];
        this.boss = new Boss(bossType, this.stageMul);
        this.transitionText = `BOSS - ${this.boss.name}`;
        this.transitionTimer = 1.5;
        Sound.stageIntro();
        return;
      }

      this.spawnEnemyWave();
      this.transitionText = `Wave ${this.wave}`;
      this.transitionTimer = 1;
      Sound.stageIntro();
      this.waveCooldown = true;
    }

    // Combat during wave
    if (this.waveCooldown) {
      this.combat.squadFire(this.squad, this.enemies, null, this.dmgMul);
      this.combat.enemyFire(this.enemies, this.squad.x, this.squad.y);

      const hitResult = this.combat.checkBulletHits(this.enemies, null, this.particles);
      this.kills += hitResult.kills;
      this.gold += hitResult.gold;

      this.combat.checkEnemyBulletHits(this.squad, this.particles);
      this.combat.checkRusherCollisions(this.enemies, this.squad, this.particles);
      this.checkDetonatorExplosions();
      this.assignThiefTargets();

      // Wave cleared?
      const alive = this.enemies.filter(e => e.active && !e.dying).length;
      if (alive === 0) {
        this.waveCooldown = false;
        this.waveTimer = 2; // Cooldown before next wave
      }
    }
  }

  updateBossWave(dt) {
    if (!this.boss || !this.boss.active) return;

    this.boss.update(dt, this.squad.x, this.squad.y);

    // Summon minions
    if (this.boss.summonQueue > 0) {
      this.boss.summonQueue--;
      const ex = this.boss.x + (Math.random() - 0.5) * 60;
      const ey = this.boss.y + 30;
      this.enemies.push(new Enemy(ex, ey, 'rusher', this.stageMul));
    }

    // Process boss bullets
    for (let i = this.boss.bulletQueue.length - 1; i >= 0; i--) {
      const bq = this.boss.bulletQueue[i];
      bq.delay -= dt * 1000;
      if (bq.delay <= 0) {
        this.combat.bulletPool.spawn(bq.x, bq.y, bq.vx, bq.vy, bq.dmg, true);
        this.boss.bulletQueue.splice(i, 1);
      }
    }

    // Missile warnings
    for (const m of this.boss.missileWarnings) {
      if (m.timer <= 0.05 && !m.hit) {
        m.hit = true;
        const alive = this.squad.alive;
        for (const char of alive) {
          if (char.dying) continue;
          const dx = char.x - m.x;
          const dy = char.y - m.y;
          if (dx * dx + dy * dy < m.radius * m.radius) {
            const died = char.takeDamage(m.dmg);
            if (died) this.particles.emitDeath(char.x, char.y);
          }
        }
        this.particles.emit(m.x, m.y, '#f97316', 15, 6, 0.4, 4);
        Sound.explosion();
        this.game.shake(5, 0.25);
      }
    }

    // Lightning
    for (const l of this.boss.lightningStrikes) {
      if (l.timer <= 0.5 && !l.hit) {
        l.hit = true;
        const alive = this.squad.alive;
        for (const char of alive) {
          if (char.dying) continue;
          if (Math.abs(char.x - l.x) < l.width) {
            const died = char.takeDamage(l.dmg);
            if (died) this.particles.emitDeath(char.x, char.y);
          }
        }
        this.particles.emit(l.x, 400, '#a78bfa', 10, 5, 0.3, 3);
        Sound.explosion();
        this.game.shake(6, 0.2);
      }
    }

    // Tornado
    if (this.boss.tornadoActive) {
      const alive = this.squad.alive;
      for (const char of alive) {
        if (char.dying) continue;
        const dx = char.x - this.boss.tornadoX;
        if (Math.abs(dx) < 30) {
          char.targetX += dx > 0 ? 8 : -8;
          if (Math.random() < 0.02) {
            const died = char.takeDamage(1);
            if (died) this.particles.emitDeath(char.x, char.y);
          }
        }
      }
    }

    // Combat
    this.combat.squadFire(this.squad, this.enemies, this.boss, this.dmgMul);
    this.combat.enemyFire(this.enemies, this.squad.x, this.squad.y);

    const hitResult = this.combat.checkBulletHits(this.enemies, this.boss, this.particles);
    this.kills += hitResult.kills;
    this.gold += hitResult.gold;

    this.combat.checkEnemyBulletHits(this.squad, this.particles);
    this.combat.checkRusherCollisions(this.enemies, this.squad, this.particles);
    this.checkDetonatorExplosions();
    this.combat.checkBossShockwave(this.boss, this.squad, this.particles);

    // Boss defeated
    if (this.boss.dying || !this.boss.active) {
      if (!this.boss._counted) {
        this.boss._counted = true;
        this.bossesDefeated++;
        this.gold += CONFIG.BOSS_GOLD;
        this.game.shake(12, 0.8);
        Sound.bossDeath();
        this.particles.emitBossDeath(this.boss.x, this.boss.y);
      }
      if (!this.boss.active) {
        this.bossWave = false;
        this.boss = null;
        this.waveCooldown = false;
        this.waveTimer = 3;
      }
    }
  }

  spawnEnemyWave() {
    const count = 5 + this.wave * 2;
    const available = [];
    for (const [type, cfg] of Object.entries(CONFIG.ENEMIES)) {
      if (type === 'rusher') continue;
      const reqStage = cfg.minStage || 0;
      if (this.wave >= Math.ceil(reqStage / 2)) available.push(type);
    }

    for (let i = 0; i < count; i++) {
      let type;
      if (Math.random() < 0.4) {
        type = 'rusher';
      } else if (available.length > 0) {
        type = available[Math.floor(Math.random() * available.length)];
      } else {
        type = 'shooter';
      }
      const x = this.road.getRandomX(40);
      const y = -20 - Math.random() * 150;
      this.enemies.push(new Enemy(x, y, type, this.stageMul));
    }
  }

  spawnItem() {
    const types = Object.keys(CONFIG.ITEMS);
    const type = types[Math.floor(Math.random() * types.length)];
    const x = this.road.getRandomX();
    this.items.push(new Item(x, -20, type));
  }

  checkItemCollision() {
    const alive = this.squad.alive;
    for (const item of this.items) {
      if (item.collected) continue;
      for (const char of alive) {
        const dx = item.x - char.x;
        const dy = item.y - char.y;
        if (dx * dx + dy * dy < (item.size + 8) * (item.size + 8)) {
          const cfg = item.collect();
          if (cfg) {
            if (cfg.isPercent) {
              this.squad.addByPercent(cfg.value);
            } else if (cfg.charType === 'random') {
              const types = Object.keys(CONFIG.CHAR_TYPES);
              for (let j = 0; j < cfg.value; j++) {
                this.squad.addMember(types[Math.floor(Math.random() * types.length)]);
              }
            } else if (cfg.charType === 'mixed') {
              this.squad.addMember('rifleman', Math.ceil(cfg.value / 2));
              this.squad.addMember('tanker', Math.floor(cfg.value / 4));
              this.squad.addMember('sniper', 1);
              if (cfg.value >= 6) this.squad.addMember('bomber', 1);
            } else {
              this.squad.addMember(cfg.charType || 'rifleman', cfg.value);
            }
            this.gold += CONFIG.GOLD_PER_ITEM;
            this.particles.emitCollect(item.x, item.y);
            Sound.itemCollect();
            this.showCombo(cfg.label);
          }
          break;
        }
      }
    }
  }

  checkDetonatorExplosions() {
    for (const e of this.enemies) {
      if (!e.explode) continue;
      e.explode = false;
      const alive = this.squad.alive;
      for (const char of alive) {
        if (char.dying) continue;
        const dx = char.x - e.x;
        const dy = char.y - e.y;
        if (dx * dx + dy * dy < 3600) {
          const died = char.takeDamage(e.dmg);
          if (died) this.particles.emitDeath(char.x, char.y);
        }
      }
      this.particles.emit(e.x, e.y, '#ef4444', 20, 8, 0.5, 5);
      Sound.explosion();
      this.game.shake(6, 0.3);
    }
  }

  assignThiefTargets() {
    for (const e of this.enemies) {
      if (e.type !== 'thief' || e.dying || e.stealTarget) continue;
      let nearest = null;
      let minDist = Infinity;
      for (const item of this.items) {
        if (item.collected) continue;
        const dx = item.x - e.x;
        const dy = item.y - e.y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) { minDist = dist; nearest = item; }
      }
      e.stealTarget = nearest;
    }
  }

  showCombo(text) {
    this.comboText = text;
    this.comboTimer = 1;
  }

  endRun() {
    this.finished = true;
    this.gold = Math.floor(this.gold * this.goldMul);

    const result = {
      wave: this.wave,
      kills: this.kills,
      gold: this.gold,
      maxSquad: this.maxSquad,
      bossesDefeated: this.bossesDefeated,
      time: Math.floor(this.totalTimer)
    };

    // Save
    const save = this.game.saveData;
    save.stats.totalRuns++;
    save.stats.totalKills += result.kills;
    save.stats.maxSquadSize = Math.max(save.stats.maxSquadSize, result.maxSquad);
    save.stats.bossesDefeated += result.bossesDefeated;
    save.currency.gold += result.gold;
    save.progress.endlessHighWave = Math.max(save.progress.endlessHighWave || 0, result.wave);
    save.progress.endlessHighScore = Math.max(save.progress.endlessHighScore || 0, result.kills);
    SaveManager.save(save);

    Sound.gameOver();
    this.game.shake(10, 0.4);

    setTimeout(() => {
      this.game.showEndlessResult(result);
    }, 800);
  }

  draw(ctx) {
    this.road.draw(ctx);

    for (const item of this.items) item.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    if (this.boss) this.boss.draw(ctx);

    this.combat.draw(ctx);
    this.squad.draw(ctx);
    this.particles.draw(ctx);

    this.drawHUD(ctx);

    // Danger overlay
    if (this.dangerAlpha > 0) {
      ctx.fillStyle = `rgba(239,68,68,${this.dangerAlpha})`;
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }

    // Transition text
    if (this.transitionTimer > 0) {
      const alpha = this.transitionTimer > 1 ? 1 : this.transitionTimer;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 28px Syne';
      ctx.textAlign = 'center';
      ctx.fillText(this.transitionText, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
      ctx.globalAlpha = 1;
    }

    // Combo text
    if (this.comboTimer > 0) {
      ctx.globalAlpha = this.comboTimer;
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 24px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(this.comboText, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT * 0.4 - (1 - this.comboTimer) * 30);
      ctx.globalAlpha = 1;
    }
  }

  drawHUD(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;

    // Top bar
    ctx.fillStyle = CONFIG.COLORS.hudBg;
    ctx.fillRect(0, 0, cw, 50);

    // ENDLESS label
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 14px Outfit';
    ctx.textAlign = 'left';
    ctx.fillText('ENDLESS', 10, 20);

    // Wave
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Outfit';
    ctx.fillText(`Wave ${this.wave}`, 10, 38);

    // Gold
    ctx.fillStyle = CONFIG.COLORS.gold;
    ctx.font = 'bold 14px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.gold}`, cw / 2, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Outfit';
    ctx.fillText('GOLD', cw / 2, 35);

    // Timer
    const mins = Math.floor(this.totalTimer / 60);
    const secs = Math.floor(this.totalTimer % 60);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Outfit';
    ctx.textAlign = 'right';
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, cw - 10, 20);

    // Kills
    ctx.fillStyle = '#ef4444';
    ctx.font = '11px Outfit';
    ctx.fillText(`${this.kills} kills`, cw - 10, 38);

    // Squad count
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px Outfit';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.squad.size}`, cw - 8, CONFIG.CANVAS_HEIGHT - 14);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px Outfit';
    ctx.fillText('SQUAD', cw - 8, CONFIG.CANVAS_HEIGHT - 26);

    // Squad bar
    const barY = CONFIG.CANVAS_HEIGHT - 6;
    const pct = Math.min(this.squad.size / CONFIG.SOFT_CAP, 1);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, barY, cw, 6);
    const gradient = ctx.createLinearGradient(0, barY, cw * pct, barY);
    gradient.addColorStop(0, '#a78bfa');
    gradient.addColorStop(1, '#7c3aed');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, barY, cw * pct, 6);
  }

  handleClick(x, y) {
    return false;
  }

  handleDrag(x) {
    this.squad.moveTo(x);
  }
}

// Endless Result Scene
class EndlessResultScene {
  constructor(game, result) {
    this.game = game;
    this.result = result;
    this.animTimer = 0;
    this.shown = false;
    this.counters = { wave: 0, kills: 0, gold: 0, bosses: 0 };
    this.isNewRecord = result.wave >= (game.saveData.progress.endlessHighWave || 0);
  }

  update(dt) {
    this.animTimer += dt;
    const t = Math.min(this.animTimer / 1.5, 1);
    this.counters.wave = Math.floor(this.result.wave * t);
    this.counters.kills = Math.floor(this.result.kills * t);
    this.counters.gold = Math.floor(this.result.gold * t);
    this.counters.bosses = Math.floor(this.result.bossesDefeated * t);
    this.shown = this.animTimer > 2;
  }

  draw(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;
    const ch = CONFIG.CANVAS_HEIGHT;

    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, cw, ch);

    // Header
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 32px Syne, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 15;
    ctx.fillText('ENDLESS OVER', cw / 2, ch * 0.1);
    ctx.shadowBlur = 0;

    // New record
    if (this.isNewRecord && this.animTimer > 1) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 16px Outfit';
      ctx.fillText(this.game.i18n('endless_record') || 'NEW RECORD!', cw / 2, ch * 0.16);
    }

    // Stats
    const panelY = ch * 0.22;
    const panelH = ch * 0.42;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(30, panelY, cw - 60, panelH, 12);
    ctx.fill();

    const stats = [
      { label: 'Wave Reached', value: this.counters.wave, color: '#a78bfa' },
      { label: this.game.i18n('result_kills') || 'Kills', value: this.counters.kills, color: '#ef4444' },
      { label: 'Max Squad', value: this.result.maxSquad, color: '#10b981' },
      { label: 'Bosses Defeated', value: this.counters.bosses, color: '#7c3aed' },
      { label: this.game.i18n('result_gold') || 'Gold', value: this.counters.gold, color: CONFIG.COLORS.gold },
    ];

    stats.forEach((stat, i) => {
      const sy = panelY + 35 + i * 48;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Outfit';
      ctx.textAlign = 'left';
      ctx.fillText(stat.label, 50, sy);
      ctx.fillStyle = stat.color;
      ctx.font = 'bold 20px Outfit';
      ctx.textAlign = 'right';
      ctx.fillText(stat.value.toString(), cw - 50, sy);
    });

    // Buttons
    if (this.shown) {
      const btnW = 150;
      const btnH = 44;

      // Retry
      const retryX = cw / 2 - btnW - 10;
      const retryY = ch * 0.78;
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.roundRect(retryX, retryY, btnW, btnH, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(this.game.i18n('result_retry') || 'RETRY', retryX + btnW / 2, retryY + btnH / 2 + 1);
      this.retryBtn = { x: retryX, y: retryY, w: btnW, h: btnH };

      // Menu
      const menuX = cw / 2 + 10;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(menuX, retryY, btnW, btnH, 10);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(this.game.i18n('result_menu') || 'MENU', menuX + btnW / 2, retryY + btnH / 2 + 1);
      this.menuBtn = { x: menuX, y: retryY, w: btnW, h: btnH };

      // Upgrade
      const upgW = 140;
      const upgH = 36;
      const upgX = (cw - upgW) / 2;
      const upgY = retryY + btnH + 16;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(upgX, upgY, upgW, upgH, 8);
      ctx.fill();
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 13px Outfit';
      ctx.fillText(this.game.i18n('menu_upgrade') || 'UPGRADE', cw / 2, upgY + upgH / 2 + 1);
      this.upgradeBtn = { x: upgX, y: upgY, w: upgW, h: upgH };
    }
  }

  handleClick(x, y) {
    if (!this.shown) return false;
    if (this.retryBtn) {
      const b = this.retryBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        Sound.uiClick();
        this.game.startEndless();
        return true;
      }
    }
    if (this.menuBtn) {
      const b = this.menuBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        Sound.uiClick();
        this.game.showMenu();
        return true;
      }
    }
    if (this.upgradeBtn) {
      const b = this.upgradeBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        Sound.uiClick();
        this.game.showUpgrade();
        return true;
      }
    }
    return false;
  }
}
