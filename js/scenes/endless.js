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
    const hpBonus = (ups.baseHP || 0) * CONFIG.UPGRADES.baseHP.perLevel;
    this.squad = new Squad(startSize, hpBonus);

    // Upgrade multipliers
    this._baseDmgMul = 1 + (ups.baseDamage || 0) * CONFIG.UPGRADES.baseDamage.perLevel;
    this.dmgMul = this._baseDmgMul;
    this.waveDmgBonus = 0;
    this.goldMul = 1 + (ups.goldBonus || 0) * CONFIG.UPGRADES.goldBonus.perLevel;
    this.speedMul = 1 + (ups.moveSpeed || 0) * CONFIG.UPGRADES.moveSpeed.perLevel;
    this.magnetMul = 1 + (ups.magnetRange || 0) * CONFIG.UPGRADES.magnetRange.perLevel;

    // Buffs (power-up timers)
    this.buffs = { dmg: 0, shield: 0, fireRate: 0, magnet: 0 };

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

    // Kill combo system
    this.killCombo = 0;
    this.killComboTimer = 0;
    this.killComboDecay = 2.5;
    this.bestCombo = 0;

    // Hit freeze
    this.hitFreezeTimer = 0;

    // Death sequence
    this.deathSequence = false;
    this.deathTimer = 0;

    // Transition
    this.transitionText = this.game.i18n('endless_start') || 'ENDLESS MODE';
    this.transitionTimer = 2;
    Sound.stageIntro();
  }

  update(dt) {
    if (this.finished) return;

    // Hit freeze stagger
    if (this.hitFreezeTimer > 0) {
      this.hitFreezeTimer -= dt;
      this.particles.update(dt);
      return;
    }

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

    // Kill combo decay
    if (this.killComboTimer > 0) {
      this.killComboTimer -= dt;
      if (this.killComboTimer <= 0) this.killCombo = 0;
    }

    // Danger indicator
    const squadPct = this.squad.size / Math.max(this.startSquad, 10);
    this.dangerAlpha = squadPct < 0.25 ? 0.3 + Math.sin(Date.now() / 200) * 0.2 : 0;

    // Update squad
    this.squad.update(dt);
    this.maxSquad = Math.max(this.maxSquad, this.squad.size);

    // Game over (with death burst effect)
    if (this.squad.size <= 0 && !this.deathSequence) {
      this.deathSequence = true;
      this.deathTimer = 1.0;
      this.game.slowMotion(0.6);
      this.game.shake(10, 0.5);
      this.particles.emit(this.squad.x, this.squad.y, '#ef4444', 30, 8, 0.8, 6);
      this.particles.emit(this.squad.x, this.squad.y, '#fbbf24', 15, 5, 0.6, 4);
      Sound.explosion();
    }
    if (this.deathSequence) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.endRun();
        return;
      }
      this.particles.update(dt);
      return;
    }

    // Update buffs
    if (this.buffs.dmg > 0) this.buffs.dmg -= dt;
    if (this.buffs.fireRate > 0) this.buffs.fireRate -= dt;
    if (this.buffs.magnet > 0) this.buffs.magnet -= dt;

    // Spawn items continuously
    this.itemSpawnTimer -= dt;
    if (this.itemSpawnTimer <= 0) {
      this.spawnItem();
      this.itemSpawnTimer = CONFIG.ITEM_SPAWN_INTERVAL * (0.8 + Math.random() * 0.4);
    }

    // Magnet effect
    const magnetRange = 120 * this.magnetMul;
    if (this.buffs.magnet > 0) {
      for (const item of this.items) {
        if (item.collected) continue;
        const dx = this.squad.x - item.x;
        const dy = this.squad.y - item.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < magnetRange && dist > 5) {
          item.x += (dx / dist) * 3;
          item.y += (dy / dist) * 2;
        }
      }
    }

    // Item collection
    this.checkItemCollision();

    // Combat firing handled per-segment (updateCombatWave / updateBossWave)
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
        this.transitionText = `${this.game.i18n('run_boss') || 'BOSS'} - ${this.boss.name}`;
        this.transitionTimer = 1.5;
        this.waveTimer = 9999; // Prevent re-trigger
        Sound.stageIntro();
        return;
      }

      this.spawnEnemyWave();
      this.transitionText = `${this.game.i18n('hud_wave') || 'Wave'} ${this.wave}`;
      this.transitionTimer = 1;
      Sound.stageIntro();
      this.waveCooldown = true;
    }

    // Combat always runs (regardless of waveCooldown)
    const dmg = this.dmgMul * (this.buffs.dmg > 0 ? 1.3 : 1);
    const rapid = this.buffs.fireRate > 0;
    this.combat.squadFire(this.squad, this.enemies, null, dmg, rapid);

    const hitResult = this.combat.checkBulletHits(this.enemies, null, this.particles);
    this.kills += hitResult.kills;
    this.gold += hitResult.gold;
    this.processKills(hitResult.kills);

    const waveHit = this.combat.checkEnemyBulletHits(this.squad, this.particles, this.buffs.shield);
    this.buffs.shield = Math.max(0, this.buffs.shield - waveHit.shieldUsed);
    this.combat.checkRusherCollisions(this.enemies, this.squad, this.particles);
    this.checkDetonatorExplosions();
    this.assignThiefTargets();

    // Wave cleared check (only when in wave)
    if (this.waveCooldown) {
      const alive = this.enemies.filter(e => e.active && !e.dying).length;
      if (alive === 0) {
        this.waveCooldown = false;
        this.waveTimer = 2;
        // Wave clear celebration + mid-run dmg bonus
        this.particles.emitText(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT * 0.3, `${this.game.i18n('hud_wave') || 'Wave'} ${this.wave} ${this.game.i18n('hud_wave_clear') || 'CLEAR!'}`, '#fbbf24', 20);
        Sound.waveClear();
        this.game.shake(3, 0.15);
        // Mid-run progression: +8% dmg per wave cleared
        this.waveDmgBonus = (this.waveDmgBonus || 0) + 0.08;
        this.dmgMul = this._baseDmgMul * (1 + this.waveDmgBonus);
        this.particles.emitText(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT * 0.36, `DMG +${Math.round(this.waveDmgBonus * 100)}%`, '#10b981', 12);
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

    // Combat with buffs
    const dmg = this.dmgMul * (this.buffs.dmg > 0 ? 1.3 : 1);
    const rapid = this.buffs.fireRate > 0;
    this.combat.squadFire(this.squad, this.enemies, this.boss, dmg, rapid);

    const hitResult = this.combat.checkBulletHits(this.enemies, this.boss, this.particles);
    this.kills += hitResult.kills;
    this.gold += hitResult.gold;
    this.processKills(hitResult.kills);

    const bossHit = this.combat.checkEnemyBulletHits(this.squad, this.particles, this.buffs.shield);
    this.buffs.shield = Math.max(0, this.buffs.shield - bossHit.shieldUsed);
    this.combat.checkRusherCollisions(this.enemies, this.squad, this.particles);
    this.checkDetonatorExplosions();
    this.combat.checkBossShockwave(this.boss, this.squad, this.particles);

    // Boss defeated
    if (this.boss.dying || !this.boss.active) {
      if (!this.boss._counted) {
        this.boss._counted = true;
        this.bossesDefeated++;
        this.game.shake(12, 0.8);
        this.game.slowMotion(0.5);
        Sound.bossDeath();
        Sound.bigKill();
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
    const speedScale = 1 + (this.wave - 1) * 0.04;
    const count = 6 + this.wave * 2; // enemies per wave
    const available = [];
    for (const [type, cfg] of Object.entries(CONFIG.ENEMIES)) {
      if (type === 'rusher') continue;
      const reqStage = cfg.minStage || 0;
      if (this.wave >= Math.ceil(reqStage / 2)) available.push(type);
    }

    for (let i = 0; i < count; i++) {
      let type;
      const roll = Math.random();
      if (roll < 0.2) {
        type = 'rusher';
      } else if (roll < 0.35) {
        type = 'tank';
      } else if (available.length > 0) {
        type = available[Math.floor(Math.random() * available.length)];
      } else {
        type = 'shooter';
      }
      const x = this.road.getRandomX(40);
      const y = -20 - Math.random() * 150;
      const e = new Enemy(x, y, type, this.stageMul);
      e.speed *= speedScale;
      this.enemies.push(e);
    }
    // Brute every 3rd wave (after wave 4)
    if (this.wave >= 4 && this.wave % 3 === 0) {
      const x = this.road.getRandomX(50);
      const e = new Enemy(x, -40, 'brute', this.stageMul);
      e.speed *= speedScale;
      this.enemies.push(e);
    }
  }

  spawnItem() {
    const items = CONFIG.ITEMS;
    const types = Object.keys(items);
    const totalWeight = types.reduce((sum, t) => sum + (items[t].weight || 10), 0);
    let roll = Math.random() * totalWeight;
    let type = types[0];
    for (const t of types) {
      roll -= items[t].weight || 10;
      if (roll <= 0) { type = t; break; }
    }
    const x = this.road.getRandomX();
    this.items.push(new Item(x, -20, type));
  }

  collectItem(item) {
    const cfg = item.collect();
    if (!cfg) return;
    if (cfg.isBuff) {
      this.applyBuff(cfg);
    } else if (cfg.isPercent) {
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

  applyBuff(cfg) {
    switch (cfg.buffType) {
      case 'dmg':
        this.buffs.dmg = cfg.duration || 8;
        break;
      case 'shield':
        this.buffs.shield += cfg.value || 5;
        break;
      case 'fireRate':
        this.buffs.fireRate = cfg.duration || 8;
        break;
      case 'magnet':
        this.buffs.magnet = cfg.duration || 6;
        break;
      case 'nuke':
        for (const e of this.enemies) {
          if (e.active && !e.dying) {
            e.takeDamage(250);
            this.kills++;
            this.gold += e.reward;
            this.particles.emitDeath(e.x, e.y);
          }
        }
        Sound.explosion();
        this.game.shake(10, 0.5);
        this.particles.emit(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, '#ff6b35', 25, 8, 0.5, 6);
        break;
    }
  }

  checkItemCollision() {
    const alive = this.squad.alive;
    const collectR = 30 * this.magnetMul;
    for (const item of this.items) {
      if (item.collected) continue;
      // Squad center check with projected X (visual-accurate)
      const itemProjX = this.road.projectX(item.x, item.y);
      const squadProjX = this.road.projectX(this.squad.x, this.squad.y);
      const vdx = itemProjX - squadProjX;
      const gdy = item.y - this.squad.y;
      if (vdx * vdx + gdy * gdy < (item.size + collectR) * (item.size + collectR)) {
        this.collectItem(item);
        continue;
      }
      // Individual member check
      for (const char of alive) {
        const dx = item.x - char.x;
        const dy = item.y - char.y;
        if (dx * dx + dy * dy < (item.size + 18) * (item.size + 18)) {
          this.collectItem(item);
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

  processKills(killCount) {
    if (killCount <= 0) return;
    this.killCombo += killCount;
    this.killComboTimer = this.killComboDecay;
    this.bestCombo = Math.max(this.bestCombo, this.killCombo);

    if (killCount >= 3) {
      this.game.shake(3, 0.15);
      Sound.comboKill(this.killCombo);
    } else if (killCount >= 1) {
      this.game.shake(1, 0.08);
    }

    if (this.killCombo >= 5 && this.killCombo % 5 === 0) {
      const cw = CONFIG.CANVAS_WIDTH;
      this.particles.emitText(cw / 2, CONFIG.CANVAS_HEIGHT * 0.35, `${this.killCombo}x ${this.game.i18n('hud_combo') || 'COMBO'}!`, '#fbbf24', 22);
      Sound.comboKill(this.killCombo);
      this.game.shake(4, 0.2);
      const bonus = Math.floor(this.killCombo / 5) * 5;
      this.gold += bonus;
      this.particles.emitText(cw / 2, CONFIG.CANVAS_HEIGHT * 0.4, `+${bonus} ${this.game.i18n('hud_gold') || 'GOLD'}`, '#fbbf24', 14);
    }

    if (killCount >= 4) {
      this.hitFreezeTimer = 0.04;
    }
  }

  showCombo(text) {
    this.comboText = text;
    this.comboTimer = 1;
  }

  endRun() {
    this.finished = true;
    this.gold = Math.floor(this.gold * this.goldMul);
    const oldHighWave = this.game.saveData.progress.endlessHighWave || 0;

    const result = {
      wave: this.wave,
      kills: this.kills,
      gold: this.gold,
      maxSquad: this.maxSquad,
      bestCombo: this.bestCombo,
      bossesDefeated: this.bossesDefeated,
      time: Math.floor(this.totalTimer),
      isNewRecord: this.wave > oldHighWave
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

  drawScaled(ctx, obj) {
    const scale = this.road.getScale(obj.y);
    if (scale < 0.15) return;
    const projX = this.road.projectX(obj.x, obj.y);
    ctx.save();
    ctx.translate(projX, obj.y);
    ctx.scale(scale, scale);
    ctx.translate(-obj.x, -obj.y);
    obj.draw(ctx, scale);
    ctx.restore();
  }

  // Returns all game entity references for 3D renderer
  get3DState() {
    return {
      squad: this.squad,
      enemies: this.enemies,
      boss: this.boss,
      items: this.items,
      gates: [],
      bulletPool: this.combat.bulletPool,
      road: this.road,
      buffs: this.buffs || { dmg: 0, shield: 0, fireRate: 0, magnet: 0 },
      segment: 'endless',
      traps: [],
      particles: this.particles
    };
  }

  // Draws ONLY HUD overlay on transparent canvas (for 3D mode)
  // No background, no road, no world entities — just UI elements
  drawHUD(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;
    const ch = CONFIG.CANVAS_HEIGHT;

    // --- Top bar (semi-transparent for 3D readability) ---
    ctx.fillStyle = 'rgba(5,5,16,0.6)';
    ctx.fillRect(0, 0, cw, 50);

    // ENDLESS label
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 14px Outfit';
    ctx.textAlign = 'left';
    ctx.fillText(this.game.i18n('hud_endless') || 'ENDLESS', 10, 20);

    // Wave
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Outfit';
    ctx.fillText(`${this.game.i18n('hud_wave') || 'Wave'} ${this.wave}`, 10, 38);

    // Gold
    ctx.fillStyle = CONFIG.COLORS.gold;
    ctx.font = 'bold 14px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.gold}`, cw / 2, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Outfit';
    ctx.fillText(this.game.i18n('hud_gold') || 'GOLD', cw / 2, 35);

    // Timer
    const mins = Math.floor(this.totalTimer / 60);
    const secs = Math.floor(this.totalTimer % 60);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Outfit';
    ctx.textAlign = 'right';
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, cw - 10, 20);

    // Kills + wave dmg bonus
    ctx.fillStyle = '#ef4444';
    ctx.font = '11px Outfit';
    const dmgBonusStr = this.waveDmgBonus > 0 ? ` | +${Math.round(this.waveDmgBonus * 100)}%` : '';
    ctx.fillText(`${this.kills} ${this.game.i18n('hud_kills_suffix') || 'kills'}${dmgBonusStr}`, cw - 10, 38);

    // Kill combo indicator (bottom-left)
    if (this.killCombo >= 3) {
      const comboAlpha = Math.min(1, this.killComboTimer / 0.5);
      ctx.globalAlpha = comboAlpha;
      const pulse = 1 + Math.sin(Date.now() / 80) * 0.05;
      const comboSize = Math.min(18, 12 + this.killCombo / 5);
      ctx.font = `bold ${Math.round(comboSize * pulse)}px Outfit`;
      ctx.textAlign = 'left';
      ctx.fillStyle = this.killCombo >= 20 ? '#ef4444' : this.killCombo >= 10 ? '#f97316' : '#fbbf24';
      ctx.fillText(`${this.killCombo}x`, 10, ch - 24);
      ctx.font = '9px Outfit';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(this.game.i18n('hud_combo') || 'COMBO', 10, ch - 12);
      ctx.globalAlpha = 1;
    }

    // Squad count
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px Outfit';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.squad.size}`, cw - 8, ch - 14);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px Outfit';
    ctx.fillText(this.game.i18n('hud_squad') || 'SQUAD', cw - 8, ch - 26);

    // Squad bar
    const barY = ch - 6;
    const pct = Math.min(this.squad.size / CONFIG.SOFT_CAP, 1);
    ctx.fillStyle = 'rgba(30,41,59,0.7)';
    ctx.fillRect(0, barY, cw, 6);
    const gradient = ctx.createLinearGradient(0, barY, cw * pct, barY);
    gradient.addColorStop(0, '#a78bfa');
    gradient.addColorStop(1, '#7c3aed');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, barY, cw * pct, 6);

    // --- Buff bar ---
    this.drawBuffBar(ctx);

    // --- Boss HP bar ---
    if (this.boss && this.boss.active && !this.boss.dying) {
      const bossBarW = cw * 0.6;
      const bossBarH = 8;
      const bossBarX = (cw - bossBarW) / 2;
      const bossBarY = 56;
      const bossHpPct = Math.max(0, this.boss.hp / this.boss.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bossBarX - 1, bossBarY - 1, bossBarW + 2, bossBarH + 2);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bossBarX, bossBarY, bossBarW, bossBarH);
      const bossGrad = ctx.createLinearGradient(bossBarX, bossBarY, bossBarX + bossBarW * bossHpPct, bossBarY);
      bossGrad.addColorStop(0, '#ef4444');
      bossGrad.addColorStop(1, '#dc2626');
      ctx.fillStyle = bossGrad;
      ctx.fillRect(bossBarX, bossBarY, bossBarW * bossHpPct, bossBarH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(this.boss.name || 'BOSS', cw / 2, bossBarY + bossBarH + 12);
    }

    // --- Danger overlay ---
    if (this.dangerAlpha > 0) {
      ctx.fillStyle = `rgba(239,68,68,${this.dangerAlpha})`;
      ctx.fillRect(0, 0, cw, ch);
    }

    // Particles (floating effects, damage numbers)
    this.particles.draw(ctx);

    // --- Transition text ---
    if (this.transitionTimer > 0) {
      const alpha = this.transitionTimer > 1 ? 1 : this.transitionTimer;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 28px Syne';
      ctx.textAlign = 'center';
      ctx.fillText(this.transitionText, cw / 2, ch / 2);
      ctx.globalAlpha = 1;
    }

    // --- Combo / floating text ---
    if (this.comboTimer > 0) {
      ctx.globalAlpha = this.comboTimer;
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 24px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(this.comboText, cw / 2, ch * 0.4 - (1 - this.comboTimer) * 30);
      ctx.globalAlpha = 1;
    }

    // --- Death sequence overlay ---
    if (this.deathSequence && !this.finished) {
      const pct = 1 - (this.deathTimer / 1.0);
      ctx.fillStyle = `rgba(239,68,68,${pct * 0.4})`;
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Syne';
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, pct * 2);
      ctx.fillText(this.game.i18n('run_gameover') || 'GAME OVER', cw / 2, ch / 2);
      ctx.globalAlpha = 1;
    }

    // --- Wave cooldown timer ---
    if (!this.waveCooldown && !this.bossWave && this.waveTimer > 0 && this.waveTimer < 5 && this.transitionTimer <= 0) {
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 20px Outfit';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.7;
      ctx.fillText(Math.ceil(this.waveTimer).toString(), cw / 2, ch * 0.25);
      ctx.globalAlpha = 1;
    }
  }

  draw(ctx) {
    // If 3D renderer is active, only draw HUD
    if (this.game.renderer3d) {
      this.drawHUD(ctx);
      return;
    }

    const cw = CONFIG.CANVAS_WIDTH;
    this.road.draw(ctx);

    // Items (depth-scaled)
    for (const item of this.items) this.drawScaled(ctx, item);

    // Enemies (depth-scaled)
    for (const e of this.enemies) this.drawScaled(ctx, e);

    // Boss (depth-scaled)
    if (this.boss) {
      this.drawScaled(ctx, this.boss);
      this.boss.drawEffects(ctx);
    }

    // Bullets (depth-scaled with X projection)
    const bullets = this.combat.bulletPool.active;
    for (const b of bullets) {
      if (!b.active) continue;
      const scale = this.road.getScale(b.y);
      if (scale < 0.15) continue;
      const sz = CONFIG.BULLET_SIZE * scale;
      const projBx = this.road.projectX(b.x, b.y);
      if (b.isEnemy) {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
      } else {
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
      }
      ctx.shadowBlur = 4 * scale;
      ctx.beginPath();
      ctx.arc(projBx, b.y, Math.max(1, sz), 0, Math.PI * 2);
      ctx.fill();
      if (b.prevX !== undefined) {
        const projPrevX = this.road.projectX(b.prevX, b.prevY);
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(projPrevX, b.prevY);
        ctx.lineTo(projBx, b.y);
        ctx.strokeStyle = b.isEnemy ? '#ef4444' : '#00e5ff';
        ctx.lineWidth = Math.max(0.5, sz * 0.6);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.shadowBlur = 0;
    }

    // Squad (depth-scaled with X projection)
    const sqScale = this.road.getScale(this.squad.y);
    const sqProjX = this.road.projectX(this.squad.x, this.squad.y);
    ctx.save();
    ctx.translate(sqProjX, this.squad.y);
    ctx.scale(sqScale, sqScale);
    ctx.translate(-this.squad.x, -this.squad.y);
    this.squad.draw(ctx);
    ctx.restore();

    // Particles (no scaling — effects)
    this.particles.draw(ctx);

    this.drawTopBar(ctx);
    this.drawBuffBar(ctx);

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

    // Death sequence overlay (2D mode)
    if (this.deathSequence && !this.finished) {
      const pct = 1 - (this.deathTimer / 1.0);
      ctx.fillStyle = `rgba(239,68,68,${pct * 0.4})`;
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Syne';
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, pct * 2);
      ctx.fillText(this.game.i18n('run_gameover') || 'GAME OVER', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
      ctx.globalAlpha = 1;
    }
  }

  drawTopBar(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;

    // Top bar
    ctx.fillStyle = CONFIG.COLORS.hudBg;
    ctx.fillRect(0, 0, cw, 50);

    // ENDLESS label
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 14px Outfit';
    ctx.textAlign = 'left';
    ctx.fillText(this.game.i18n('hud_endless') || 'ENDLESS', 10, 20);

    // Wave
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Outfit';
    ctx.fillText(`${this.game.i18n('hud_wave') || 'Wave'} ${this.wave}`, 10, 38);

    // Gold
    ctx.fillStyle = CONFIG.COLORS.gold;
    ctx.font = 'bold 14px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.gold}`, cw / 2, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Outfit';
    ctx.fillText(this.game.i18n('hud_gold') || 'GOLD', cw / 2, 35);

    // Timer
    const mins = Math.floor(this.totalTimer / 60);
    const secs = Math.floor(this.totalTimer % 60);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Outfit';
    ctx.textAlign = 'right';
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, cw - 10, 20);

    // Kills + wave dmg bonus
    ctx.fillStyle = '#ef4444';
    ctx.font = '11px Outfit';
    const dmgBonusStr = this.waveDmgBonus > 0 ? ` | +${Math.round(this.waveDmgBonus * 100)}%` : '';
    ctx.fillText(`${this.kills} ${this.game.i18n('hud_kills_suffix') || 'kills'}${dmgBonusStr}`, cw - 10, 38);

    // Kill combo indicator (bottom-left)
    if (this.killCombo >= 3) {
      const comboAlpha = Math.min(1, this.killComboTimer / 0.5);
      ctx.globalAlpha = comboAlpha;
      const pulse = 1 + Math.sin(Date.now() / 80) * 0.05;
      const comboSize = Math.min(18, 12 + this.killCombo / 5);
      ctx.font = `bold ${Math.round(comboSize * pulse)}px Outfit`;
      ctx.textAlign = 'left';
      ctx.fillStyle = this.killCombo >= 20 ? '#ef4444' : this.killCombo >= 10 ? '#f97316' : '#fbbf24';
      ctx.fillText(`${this.killCombo}x`, 10, CONFIG.CANVAS_HEIGHT - 24);
      ctx.font = '9px Outfit';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(this.game.i18n('hud_combo') || 'COMBO', 10, CONFIG.CANVAS_HEIGHT - 12);
      ctx.globalAlpha = 1;
    }

    // Squad count
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px Outfit';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.squad.size}`, cw - 8, CONFIG.CANVAS_HEIGHT - 14);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px Outfit';
    ctx.fillText(this.game.i18n('hud_squad') || 'SQUAD', cw - 8, CONFIG.CANVAS_HEIGHT - 26);

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
    const gameX = this.road.unprojectX(x, this.squad.y);
    this.squad.moveTo(gameX, this.speedMul);
  }

  drawBuffBar(ctx) {
    let x = 8;
    const y = 54;
    const draw = (label, color, val) => {
      if (val <= 0) return;
      ctx.font = 'bold 9px Outfit';
      ctx.textAlign = 'left';
      const text = typeof val === 'number' && val > 1 ? `${label} ${Math.ceil(val)}s` : label;
      const tw = ctx.measureText(text).width + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y, tw, 14);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 2, 14);
      ctx.fillText(text, x + 5, y + 10);
      x += tw + 4;
    };
    draw('DMG+', '#f43f5e', this.buffs.dmg);
    draw('SHIELD ' + Math.ceil(this.buffs.shield), '#60a5fa', this.buffs.shield);
    draw('RAPID', '#eab308', this.buffs.fireRate);
    draw('MAGNET', '#a855f7', this.buffs.magnet);
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
    this.isNewRecord = result.isNewRecord;
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
    ctx.fillText(this.game.i18n('hud_endless_over') || 'ENDLESS OVER', cw / 2, ch * 0.1);
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
      { label: this.game.i18n('endless_wave_reached') || 'Wave Reached', value: this.counters.wave, color: '#a78bfa' },
      { label: this.game.i18n('result_kills') || 'Kills', value: this.counters.kills, color: '#ef4444' },
      { label: this.game.i18n('result_max_squad') || 'Max Squad', value: this.result.maxSquad, color: '#10b981' },
      { label: this.game.i18n('endless_bosses') || 'Bosses Defeated', value: this.counters.bosses, color: '#7c3aed' },
      { label: this.game.i18n('result_gold') || 'Gold', value: this.counters.gold, color: CONFIG.COLORS.gold },
      { label: this.game.i18n('result_time') || 'Time', value: `${Math.floor(this.result.time / 60)}:${(this.result.time % 60).toString().padStart(2, '0')}`, color: '#94a3b8' },
    ];
    if (this.result.bestCombo > 0) {
      stats.push({ label: this.game.i18n('result_best_combo') || 'Best Combo', value: `${this.result.bestCombo}x`, color: '#fbbf24' });
    }

    const rowHeight = stats.length > 5 ? 36 : 48;
    stats.forEach((stat, i) => {
      const sy = panelY + 35 + i * rowHeight;
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
