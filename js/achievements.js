// Road Shooter - Achievement System
const Achievements = (() => {
  const DEFS = [
    // Runs
    { id: 'run_1',      cat: 'run',   stat: 'totalRuns',      target: 1,     icon: '\u{1F3C3}', reward: 50 },
    { id: 'run_25',     cat: 'run',   stat: 'totalRuns',      target: 25,    icon: '\u{1F3C3}', reward: 200 },
    { id: 'run_100',    cat: 'run',   stat: 'totalRuns',      target: 100,   icon: '\u{1F3C3}', reward: 500 },
    { id: 'run_500',    cat: 'run',   stat: 'totalRuns',      target: 500,   icon: '\u{1F3C3}', reward: 2000 },
    // Kills
    { id: 'kill_50',    cat: 'kill',  stat: 'totalKills',     target: 50,    icon: '\u{1F480}', reward: 100 },
    { id: 'kill_500',   cat: 'kill',  stat: 'totalKills',     target: 500,   icon: '\u{1F480}', reward: 300 },
    { id: 'kill_2k',    cat: 'kill',  stat: 'totalKills',     target: 2000,  icon: '\u{1F480}', reward: 1000 },
    { id: 'kill_10k',   cat: 'kill',  stat: 'totalKills',     target: 10000, icon: '\u{1F480}', reward: 5000 },
    // Squad
    { id: 'squad_20',   cat: 'squad', stat: 'maxSquadSize',   target: 20,    icon: '\u{1F46A}', reward: 100 },
    { id: 'squad_50',   cat: 'squad', stat: 'maxSquadSize',   target: 50,    icon: '\u{1F46A}', reward: 300 },
    { id: 'squad_100',  cat: 'squad', stat: 'maxSquadSize',   target: 100,   icon: '\u{1F46A}', reward: 800 },
    { id: 'squad_200',  cat: 'squad', stat: 'maxSquadSize',   target: 200,   icon: '\u{1F46A}', reward: 3000 },
    // Bosses
    { id: 'boss_1',     cat: 'boss',  stat: 'bossesDefeated', target: 1,     icon: '\u{1F47E}', reward: 150 },
    { id: 'boss_10',    cat: 'boss',  stat: 'bossesDefeated', target: 10,    icon: '\u{1F47E}', reward: 500 },
    { id: 'boss_50',    cat: 'boss',  stat: 'bossesDefeated', target: 50,    icon: '\u{1F47E}', reward: 2000 },
    // Stages & Endless
    { id: 'stage_3',    cat: 'prog',  stat: 'maxStage',       target: 3,     icon: '\u2B50',    reward: 200 },
    { id: 'stage_7',    cat: 'prog',  stat: 'maxStage',       target: 7,     icon: '\u2B50',    reward: 1000 },
    { id: 'endless_10', cat: 'prog',  stat: 'endlessHighWave', target: 10,   icon: '\u267E\uFE0F', reward: 500 },
    { id: 'endless_30', cat: 'prog',  stat: 'endlessHighWave', target: 30,   icon: '\u267E\uFE0F', reward: 2000 },
    { id: 'gold_10k',   cat: 'prog',  stat: 'totalGoldEarned', target: 10000, icon: '\u{1F4B0}', reward: 1000 },
  ];

  // Toast queue for in-game notifications
  let toastQueue = [];
  let activeToast = null;
  let toastTimer = 0;
  const TOAST_DURATION = 3;

  function getStat(save, statKey) {
    if (statKey === 'maxStage') return save.progress.maxStage || 0;
    if (statKey === 'endlessHighWave') return save.progress.endlessHighWave || 0;
    return save.stats[statKey] || 0;
  }

  return {
    DEFS,

    // Check all achievements, return newly unlocked ones
    check(save) {
      if (!save.achievements) save.achievements = {};
      if (!save.stats.totalGoldEarned) save.stats.totalGoldEarned = 0;
      const newlyUnlocked = [];

      for (const def of DEFS) {
        if (save.achievements[def.id]) continue;
        const val = getStat(save, def.stat);
        if (val >= def.target) {
          save.achievements[def.id] = Date.now();
          save.currency.gold += def.reward;
          newlyUnlocked.push(def);
        }
      }

      if (newlyUnlocked.length > 0) {
        toastQueue.push(...newlyUnlocked);
        SaveManager.save(save);
      }
      return newlyUnlocked;
    },

    // Get progress info for display
    getProgress(save) {
      if (!save.achievements) save.achievements = {};
      let unlocked = 0;
      for (const def of DEFS) {
        if (save.achievements[def.id]) unlocked++;
      }
      return { unlocked, total: DEFS.length };
    },

    // Get detailed list for trophy screen
    getList(save) {
      if (!save.achievements) save.achievements = {};
      return DEFS.map(def => ({
        ...def,
        current: getStat(save, def.stat),
        done: !!save.achievements[def.id]
      }));
    },

    // Update toast animation (call in game loop)
    updateToast(dt) {
      if (activeToast) {
        toastTimer -= dt;
        if (toastTimer <= 0) activeToast = null;
      }
      if (!activeToast && toastQueue.length > 0) {
        activeToast = toastQueue.shift();
        toastTimer = TOAST_DURATION;
      }
    },

    // Draw toast notification overlay
    drawToast(ctx, i18nFn) {
      if (!activeToast) return;
      const cw = CONFIG.CANVAS_WIDTH;
      const progress = toastTimer / TOAST_DURATION;

      // Slide in/out
      let slideY = 0;
      if (progress > 0.85) slideY = (1 - (progress - 0.85) / 0.15) * 1; // slide in
      else if (progress < 0.15) slideY = (0.15 - progress) / 0.15; // slide out
      const baseY = 50 + slideY * -60;

      const alpha = progress < 0.15 ? progress / 0.15 : progress > 0.85 ? (1 - progress) / 0.15 : 1;
      ctx.globalAlpha = Math.min(alpha, 1);

      // Toast background
      const tw = 280;
      const th = 48;
      const tx = (cw - tw) / 2;
      ctx.fillStyle = 'rgba(16,185,129,0.9)';
      ctx.beginPath();
      ctx.roundRect(tx, baseY, tw, th, 10);
      ctx.fill();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Icon
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(activeToast.icon, tx + 12, baseY + th / 2);

      // Title
      const name = i18nFn('ach_' + activeToast.id) || activeToast.id;
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(name, tx + 44, baseY + 17);

      // Reward
      ctx.font = '11px Outfit, sans-serif';
      ctx.fillStyle = '#d1fae5';
      ctx.fillText(`+${activeToast.reward} Gold`, tx + 44, baseY + 34);

      // Trophy label
      ctx.font = 'bold 10px Outfit';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText(i18nFn('ach_unlocked') || 'UNLOCKED!', tx + tw - 12, baseY + th / 2 + 1);

      ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic';
    },

    // Draw trophy screen (standalone scene)
    drawScreen(ctx, save, i18nFn, scrollY) {
      const cw = CONFIG.CANVAS_WIDTH;
      const ch = CONFIG.CANVAS_HEIGHT;
      const list = this.getList(save);
      const prog = this.getProgress(save);

      // Background
      ctx.fillStyle = CONFIG.COLORS.bg;
      ctx.fillRect(0, 0, cw, ch);

      // Header
      ctx.fillStyle = CONFIG.COLORS.primary;
      ctx.font = 'bold 24px Syne, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = CONFIG.COLORS.primary;
      ctx.shadowBlur = 12;
      ctx.fillText(i18nFn('ach_title') || 'ACHIEVEMENTS', cw / 2, 40);
      ctx.shadowBlur = 0;

      // Progress bar
      const barW = 200;
      const barH = 8;
      const barX = (cw - barW) / 2;
      const barY = 55;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 4);
      ctx.fill();
      ctx.fillStyle = CONFIG.COLORS.primary;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * (prog.unlocked / prog.total), barH, 4);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Outfit';
      ctx.fillText(`${prog.unlocked} / ${prog.total}`, cw / 2, barY + 22);

      // Achievement cards
      const cardW = cw - 50;
      const cardH = 56;
      const startY = 90 - scrollY;
      const gap = 6;

      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        const cy = startY + i * (cardH + gap);

        // Skip if off-screen
        if (cy + cardH < 0 || cy > ch) continue;

        // Card background
        ctx.fillStyle = a.done ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)';
        ctx.beginPath();
        ctx.roundRect(25, cy, cardW, cardH, 8);
        ctx.fill();
        if (a.done) {
          ctx.strokeStyle = 'rgba(16,185,129,0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Icon
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = a.done ? 1 : 0.3;
        ctx.fillStyle = '#fff';
        ctx.fillText(a.icon, 38, cy + cardH / 2);

        // Name
        ctx.font = 'bold 13px Outfit, sans-serif';
        ctx.fillStyle = a.done ? '#fff' : '#64748b';
        ctx.fillText(i18nFn('ach_' + a.id) || a.id, 70, cy + 20);

        // Progress or Done
        if (a.done) {
          ctx.font = '11px Outfit';
          ctx.fillStyle = '#10b981';
          ctx.fillText('\u2713 ' + (i18nFn('ach_done') || 'Complete'), 70, cy + 38);
        } else {
          const pct = Math.min(a.current / a.target, 1);
          // Mini progress bar
          const pbW = 100;
          const pbH = 5;
          const pbX = 70;
          const pbY = cy + 38;
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.beginPath();
          ctx.roundRect(pbX, pbY, pbW, pbH, 2);
          ctx.fill();
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.roundRect(pbX, pbY, pbW * pct, pbH, 2);
          ctx.fill();

          ctx.font = '10px Outfit';
          ctx.fillStyle = '#64748b';
          ctx.fillText(`${a.current} / ${a.target}`, pbX + pbW + 8, pbY + 4);
        }

        // Reward
        ctx.textAlign = 'right';
        ctx.font = 'bold 11px Outfit';
        ctx.fillStyle = a.done ? '#475569' : CONFIG.COLORS.gold;
        ctx.fillText(`${a.reward} G`, cw - 35, cy + cardH / 2 + 1);

        ctx.globalAlpha = 1;
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
      }

      // Back button
      const backW = 120;
      const backH = 38;
      const backX = (cw - backW) / 2;
      const backY = ch - 50;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(backX, backY, backW, backH, 8);
      ctx.fill();
      ctx.strokeStyle = CONFIG.COLORS.primary;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = CONFIG.COLORS.primary;
      ctx.font = 'bold 14px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(i18nFn('upgrade_back') || 'BACK', cw / 2, backY + backH / 2 + 5);

      return { backBtn: { x: backX, y: backY, w: backW, h: backH }, contentH: list.length * (cardH + gap) + 100 };
    }
  };
})();
