// Road Shooter - Core Run Gameplay Scene
class RunScene {
  constructor(game, stage = 1) {
    this.game = game;
    this.stage = stage;
    this.stageMul = 1 + (stage - 1) * CONFIG.DIFFICULTY_SCALE.enemyHpMul;

    // Systems
    this.road = new Road();
    this.combat = new CombatSystem();
    this.particles = new ParticleSystem();

    // Squad
    const ups = game.saveData.upgrades;
    const startSize = CONFIG.START_SQUAD + (ups.startSquad || 0);
    this.squad = new Squad(startSize);

    // Upgrade multipliers
    this.dmgMul = 1 + (ups.baseDamage || 0) * CONFIG.UPGRADES.baseDamage.perLevel;
    this.goldMul = 1 + (ups.goldBonus || 0) * CONFIG.UPGRADES.goldBonus.perLevel;

    // Entities
    this.items = [];
    this.gates = [];
    this.enemies = [];
    this.traps = [];
    this.boss = null;

    // Run state
    this.segment = 0; // 0-4 road, 0-4 combat (10 total segments + boss)
    this.segmentType = 'road'; // 'road' | 'combat' | 'boss'
    this.segmentTimer = CONFIG.ROAD_DURATION;
    this.totalTimer = 0;
    this.paused = false;
    this.finished = false;

    // Stats
    this.kills = 0;
    this.gold = 0;
    this.maxSquad = startSize;
    this.startSquad = startSize;
    this.bossDefeated = false;

    // Spawn timers
    this.itemSpawnTimer = 0;
    this.gateSpawnTimer = CONFIG.GATE_SPAWN_INTERVAL / 2;
    this.enemySpawnTimer = 0;
    this.waveCount = 0;

    // HUD
    this.comboText = '';
    this.comboTimer = 0;
    this.dangerAlpha = 0;

    // Transition
    this.transitionText = '';
    this.transitionTimer = 0;
    this.showSegmentIntro(`${this.game.i18n('run_road') || 'Road'} 1`);
  }

  showSegmentIntro(text) {
    this.transitionText = text;
    this.transitionTimer = 1.5;
  }

  nextSegment() {
    if (this.segmentType === 'road') {
      this.segmentType = 'combat';
      this.segmentTimer = CONFIG.COMBAT_DURATION;
      this.waveCount = 0;
      this.enemySpawnTimer = 0.5;
      this.showSegmentIntro(`${this.game.i18n('run_combat') || 'Combat'} ${this.segment + 1}`);
      // Clear items and gates
      this.items = this.items.filter(i => !i.collected);
      this.gates = [];
    } else if (this.segmentType === 'combat') {
      this.segment++;
      if (this.segment >= CONFIG.ROAD_SEGMENTS) {
        // Boss time!
        this.segmentType = 'boss';
        this.segmentTimer = CONFIG.BOSS_DURATION;
        const rot = CONFIG.BOSS_ROTATION;
        const bossType = rot[(this.stage - 1) % rot.length];
        this.boss = new Boss(bossType, this.stageMul);
        this.showSegmentIntro(`${this.game.i18n('run_boss') || 'BOSS'}`);
        this.enemies = [];
      } else {
        this.segmentType = 'road';
        this.segmentTimer = CONFIG.ROAD_DURATION;
        this.showSegmentIntro(`${this.game.i18n('run_road') || 'Road'} ${this.segment + 1}`);
      }
    }
  }

  update(dt) {
    if (this.paused || this.finished) return;

    this.totalTimer += dt;

    // Transition
    if (this.transitionTimer > 0) {
      this.transitionTimer -= dt;
      if (this.transitionTimer > 1) return; // Pause gameplay during intro
    }

    // Road always scrolls
    this.road.update();

    // Segment timer
    this.segmentTimer -= dt;

    // Combo text fade
    if (this.comboTimer > 0) this.comboTimer -= dt;

    // Danger indicator
    const squadPct = this.squad.size / Math.max(this.startSquad, 10);
    this.dangerAlpha = squadPct < 0.25 ? 0.3 + Math.sin(Date.now() / 200) * 0.2 : 0;

    // Update squad
    this.squad.update(dt);
    this.maxSquad = Math.max(this.maxSquad, this.squad.size);

    // Check game over
    if (this.squad.size <= 0) {
      this.endRun(false);
      return;
    }

    // Segment-specific logic
    switch (this.segmentType) {
      case 'road':
        this.updateRoadSegment(dt);
        break;
      case 'combat':
        this.updateCombatSegment(dt);
        break;
      case 'boss':
        this.updateBossSegment(dt);
        break;
    }

    // Update entities
    this.updateEntities(dt);

    // Particles
    this.particles.update(dt);

    // Combat
    this.combat.update();
  }

  updateRoadSegment(dt) {
    // Spawn items
    this.itemSpawnTimer -= 1;
    if (this.itemSpawnTimer <= 0) {
      this.spawnItem();
      this.itemSpawnTimer = CONFIG.ITEM_SPAWN_INTERVAL * (0.7 + Math.random() * 0.6);
    }

    // Spawn gates
    this.gateSpawnTimer -= 1;
    if (this.gateSpawnTimer <= 0) {
      this.spawnGate();
      this.gateSpawnTimer = CONFIG.GATE_SPAWN_INTERVAL;
    }

    // Spawn traps (occasionally)
    if (Math.random() < 0.003 && this.stage > 2) {
      this.spawnTrap();
    }

    // Check item collection
    this.checkItemCollision();
    this.checkGateCollision();
    this.checkTrapCollision();

    // Advance to combat when timer expires
    if (this.segmentTimer <= 0) {
      this.nextSegment();
    }
  }

  updateCombatSegment(dt) {
    // Spawn enemy waves
    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer <= 0 && this.waveCount < 2) {
      this.spawnWave();
      this.waveCount++;
      this.enemySpawnTimer = 5; // Next wave in 5s
    }

    // Auto combat
    this.combat.squadFire(this.squad, this.enemies, null, this.dmgMul);
    this.combat.enemyFire(this.enemies, this.squad.x, this.squad.y);

    // Check hits
    const hitResult = this.combat.checkBulletHits(this.enemies, null, this.particles);
    this.kills += hitResult.kills;
    this.gold += hitResult.gold;

    // Enemy bullet hits
    this.combat.checkEnemyBulletHits(this.squad, this.particles);

    // Rusher collisions
    this.combat.checkRusherCollisions(this.enemies, this.squad, this.particles);

    // Detonator explosions
    this.checkDetonatorExplosions();

    // Assign thief targets
    this.assignThiefTargets();

    // Advance when timer expires and enemies clear
    const aliveEnemies = this.enemies.filter(e => e.active && !e.dying).length;
    if (this.segmentTimer <= 0 && aliveEnemies === 0) {
      this.nextSegment();
    }
  }

  updateBossSegment(dt) {
    if (this.boss && this.boss.active) {
      this.boss.update(dt, this.squad.x, this.squad.y);

      // Summon minions
      if (this.boss.summonQueue > 0) {
        this.boss.summonQueue--;
        const ex = this.boss.x + (Math.random() - 0.5) * 60;
        const ey = this.boss.y + 30;
        this.enemies.push(new Enemy(ex, ey, 'rusher', this.stageMul));
      }

      // Process boss bullets (War Machine gatling)
      for (let i = this.boss.bulletQueue.length - 1; i >= 0; i--) {
        const bq = this.boss.bulletQueue[i];
        bq.delay -= dt * 1000;
        if (bq.delay <= 0) {
          this.combat.bulletPool.spawn(bq.x, bq.y, bq.vx, bq.vy, bq.dmg, true);
          this.boss.bulletQueue.splice(i, 1);
        }
      }

      // Check missile warnings (War Machine)
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

      // Boss defeated?
      if (this.boss.dying || !this.boss.active) {
        this.bossDefeated = true;
        // Wait for death animation then end
        if (!this.boss.active) {
          this.endRun(true);
        }
      }
    }
  }

  updateEntities(dt) {
    const speed = this.road.speed;

    // Items
    for (let i = this.items.length - 1; i >= 0; i--) {
      this.items[i].update(speed);
      if (!this.items[i].active) this.items.splice(i, 1);
    }

    // Gates
    for (let i = this.gates.length - 1; i >= 0; i--) {
      this.gates[i].update(speed);
      if (!this.gates[i].active) this.gates.splice(i, 1);
    }

    // Traps
    for (let i = this.traps.length - 1; i >= 0; i--) {
      this.traps[i].update(speed);
      if (!this.traps[i].active) this.traps.splice(i, 1);
    }

    // Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].update(dt, this.squad.x, this.squad.y);
      if (!this.enemies[i].active) this.enemies.splice(i, 1);
    }
  }

  // Spawning
  spawnItem() {
    const types = Object.keys(CONFIG.ITEMS);
    const type = types[Math.floor(Math.random() * types.length)];
    const x = this.road.getRandomX();
    this.items.push(new Item(x, -20, type));
  }

  spawnGate() {
    const types = ['classic', 'gambler', 'addLarge'];
    const type = types[Math.floor(Math.random() * types.length)];
    this.gates.push(new Gate(-CONFIG.GATE_HEIGHT, type));
  }

  spawnTrap() {
    const types = ['quicksand', 'mine'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = this.road.getRandomX();
    this.traps.push(new Trap(x, -20, type));
  }

  spawnWave() {
    const baseCount = 3 + this.segment * 2 + Math.floor(this.stage / 3);
    const count = baseCount + Math.floor(Math.random() * 3);
    const available = this.getAvailableEnemyTypes();
    for (let i = 0; i < count; i++) {
      let type;
      const roll = Math.random();
      if (roll < 0.5) {
        type = 'rusher';
      } else if (available.length > 0) {
        type = available[Math.floor(Math.random() * available.length)];
      } else {
        type = 'shooter';
      }
      const x = this.road.getRandomX(40);
      const y = -20 - Math.random() * 100;
      this.enemies.push(new Enemy(x, y, type, this.stageMul));
    }
  }

  getAvailableEnemyTypes() {
    const types = [];
    for (const [type, cfg] of Object.entries(CONFIG.ENEMIES)) {
      if (type === 'rusher') continue;
      if (!cfg.minStage || this.stage >= cfg.minStage) types.push(type);
    }
    return types;
  }

  // Collision checking
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
            this.showCombo(cfg.label);
          }
          break;
        }
      }
    }
  }

  checkGateCollision() {
    for (const gate of this.gates) {
      if (gate.chosen) continue;
      // Check if squad has reached gate Y position
      const squadTop = this.squad.y - 20;
      if (squadTop < gate.y + gate.height && squadTop > gate.y - 10) {
        const side = gate.checkCollision(this.squad.x);
        if (side) {
          const option = gate.choose(side);
          if (option) {
            this.squad.applyGateEffect(option);
            this.particles.emitGatePass(this.squad.x, this.squad.y, option.color);
            this.showCombo(option.label);
          }
        }
      }
    }
  }

  checkTrapCollision() {
    for (const trap of this.traps) {
      if (trap.triggered) continue;
      const dx = trap.x - this.squad.x;
      const dy = trap.y - this.squad.y;
      if (dx * dx + dy * dy < (trap.size + 15) * (trap.size + 15)) {
        const type = trap.trigger();
        if (type === 'mine') {
          this.squad.removeMember(Math.min(5, Math.ceil(this.squad.size * 0.15)));
          this.particles.emit(trap.x, trap.y, '#ef4444', 15, 6, 0.5, 4);
        } else if (type === 'quicksand') {
          this.road.speed = CONFIG.SCROLL_SPEED * 0.3;
          setTimeout(() => { this.road.speed = CONFIG.SCROLL_SPEED; }, 2000);
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

  endRun(cleared) {
    this.finished = true;
    this.gold = Math.floor(this.gold * this.goldMul);
    const survivalRate = this.squad.size / Math.max(this.maxSquad, 1);
    let stars = 0;
    if (cleared) {
      stars = 1;
      if (survivalRate >= CONFIG.STAR_THRESHOLDS.star2) stars = 2;
      if (survivalRate >= CONFIG.STAR_THRESHOLDS.star3) stars = 3;
    }

    const result = {
      stage: this.stage,
      cleared,
      kills: this.kills,
      gold: this.gold,
      maxSquad: this.maxSquad,
      bossDefeated: this.bossDefeated,
      starCoins: this.bossDefeated ? Math.floor(Math.random() * 3) + 1 : 0,
      stars,
      survivalRate,
      time: Math.floor(this.totalTimer)
    };

    // Save
    this.game.saveData = SaveManager.updateAfterRun(this.game.saveData, result);

    // Show result after delay
    setTimeout(() => {
      this.game.showResult(result);
    }, cleared ? 1500 : 500);
  }

  draw(ctx) {
    // Road
    this.road.draw(ctx);

    // Traps (below items)
    for (const trap of this.traps) trap.draw(ctx);

    // Items
    for (const item of this.items) item.draw(ctx);

    // Gates
    for (const gate of this.gates) gate.draw(ctx);

    // Enemies
    for (const e of this.enemies) e.draw(ctx);

    // Boss
    if (this.boss) this.boss.draw(ctx);

    // Bullets
    this.combat.draw(ctx);

    // Squad
    this.squad.draw(ctx);

    // Particles (on top)
    this.particles.draw(ctx);

    // HUD
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
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Syne';
      ctx.textAlign = 'center';
      ctx.fillText(this.transitionText, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
      ctx.globalAlpha = 1;
    }

    // Combo text
    if (this.comboTimer > 0) {
      ctx.globalAlpha = this.comboTimer;
      ctx.fillStyle = CONFIG.COLORS.primary;
      ctx.font = 'bold 24px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(this.comboText, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT * 0.4 - (1 - this.comboTimer) * 30);
      ctx.globalAlpha = 1;
    }
  }

  drawHUD(ctx) {
    const cw = CONFIG.CANVAS_WIDTH;

    // Top bar background
    ctx.fillStyle = CONFIG.COLORS.hudBg;
    ctx.fillRect(0, 0, cw, 50);

    // Stage
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Outfit';
    ctx.textAlign = 'left';
    ctx.fillText(`Stage ${this.stage}`, 10, 20);

    // Segment type
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Outfit';
    const segLabel = this.segmentType === 'road' ? `Road ${this.segment + 1}/5`
      : this.segmentType === 'combat' ? `Combat ${this.segment + 1}/5`
      : 'BOSS';
    ctx.fillText(segLabel, 10, 38);

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

    // Squad count (bottom-right above bar)
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px Outfit';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.squad.size}`, cw - 8, CONFIG.CANVAS_HEIGHT - 14);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px Outfit';
    ctx.fillText('SQUAD', cw - 8, CONFIG.CANVAS_HEIGHT - 26);

    // Squad size bar (bottom)
    const barY = CONFIG.CANVAS_HEIGHT - 6;
    const barW = cw;
    const pct = Math.min(this.squad.size / CONFIG.SOFT_CAP, 1);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, barY, barW, 6);
    const gradient = ctx.createLinearGradient(0, barY, barW * pct, barY);
    gradient.addColorStop(0, '#10b981');
    gradient.addColorStop(1, CONFIG.COLORS.primary);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, barY, barW * pct, 6);
  }

  handleClick(x, y) {
    // No click actions during run (drag only)
    return false;
  }

  handleDrag(x) {
    this.squad.moveTo(x);
  }
}
