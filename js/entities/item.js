// Road Shooter - Items & Power-ups
class Item {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.bobTimer = Math.random() * Math.PI * 2;
    this.collected = false;
    this.collectTimer = 0;
    this.size = CONFIG.ITEM_SIZE;
    this.pulseTimer = Math.random() * Math.PI * 2;
    this.orbitAngle = Math.random() * Math.PI * 2;
  }

  get config() { return CONFIG.ITEMS[this.type]; }

  update(scrollSpeed) {
    if (this.collected) {
      this.collectTimer -= 1 / 60;
      if (this.collectTimer <= 0) this.active = false;
      return;
    }
    this.y += scrollSpeed;
    this.bobTimer += 0.05;
    this.pulseTimer += 0.08;
    this.orbitAngle += 0.06;
    if (this.y > CONFIG.CANVAS_HEIGHT + 30) this.active = false;
  }

  collect() {
    if (this.collected) return null;
    this.collected = true;
    this.collectTimer = 0.3;
    return this.config;
  }

  draw(ctx) {
    if (!this.active) return;
    const cfg = this.config;
    const bob = Math.sin(this.bobTimer) * 3;
    const y = this.y + bob;
    const s = this.size;
    const pulse = 1 + Math.sin(this.pulseTimer) * 0.12;

    if (this.collected) {
      const t = this.collectTimer / 0.3;
      ctx.globalAlpha = t;
      ctx.fillStyle = cfg.color;
      ctx.font = 'bold 16px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(cfg.label, this.x, y - 15 + (1 - t) * 40);
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2 * t;
      ctx.beginPath();
      ctx.arc(this.x, y, s * (2 - t), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

    // Glow ring
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = cfg.isBuff ? 14 : 8;
    ctx.strokeStyle = cfg.color;
    ctx.globalAlpha = 0.25 + Math.sin(this.pulseTimer) * 0.1;
    ctx.lineWidth = cfg.isBuff ? 1.5 : 1;
    ctx.beginPath();
    ctx.arc(this.x, y, s * 1.2 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Orbiting dots
    const oR = s * 1.1;
    for (let i = 0; i < 2; i++) {
      const a = this.orbitAngle + i * Math.PI;
      ctx.fillStyle = cfg.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(this.x + Math.cos(a) * oR, y + Math.sin(a) * oR * 0.6, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    const ps = s * pulse;
    if (cfg.isBuff) {
      this.drawPowerUp(ctx, y, ps, cfg);
    } else {
      this.drawSquadItem(ctx, y, ps, cfg);
    }

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.85;
    ctx.fillText(cfg.label, this.x, y + s + 12);
    ctx.globalAlpha = 1;
  }

  drawSquadItem(ctx, y, ps, cfg) {
    switch (this.type) {
      case 'scoutToken':
        // Soldier silhouette
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.arc(this.x, y, ps * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        ctx.arc(this.x, y - ps * 0.15, ps * 0.4, -Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, y - ps * 0.1, ps * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(this.x - ps * 0.08, y + ps * 0.1, ps * 0.16, ps * 0.25);
        break;

      case 'rallyFlag':
        ctx.fillStyle = '#92400e';
        ctx.fillRect(this.x - 0.8, y - ps * 0.7, 1.6, ps * 1.4);
        const wave = Math.sin(this.bobTimer * 2) * 2;
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        ctx.moveTo(this.x + 1, y - ps * 0.65);
        ctx.quadraticCurveTo(this.x + ps * 0.5 + wave, y - ps * 0.45, this.x + ps * 0.6, y - ps * 0.3);
        ctx.lineTo(this.x + 1, y - ps * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + ps * 0.25, y - ps * 0.4, 2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'mercenary':
        ctx.fillStyle = '#1a1207';
        ctx.beginPath();
        ctx.arc(this.x, y, ps * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        ctx.arc(this.x, y, ps * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a1207';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.x, y - ps * 0.3);
        ctx.lineTo(this.x, y + ps * 0.3);
        ctx.moveTo(this.x - ps * 0.2, y - ps * 0.1);
        ctx.lineTo(this.x + ps * 0.2, y - ps * 0.1);
        ctx.stroke();
        break;

      case 'clonePod':
        ctx.fillStyle = '#0e4059';
        ctx.beginPath();
        ctx.ellipse(this.x, y, ps * 0.4, ps * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        ctx.ellipse(this.x, y, ps * 0.3, ps * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.3 + Math.sin(this.pulseTimer * 2) * 0.2;
        ctx.beginPath();
        ctx.ellipse(this.x, y, ps * 0.15, ps * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;

      case 'conscription':
        const ew = ps * 0.7;
        const eh = ps * 0.55;
        ctx.fillStyle = '#991b1c';
        ctx.fillRect(this.x - ew, y - eh, ew * 2, eh * 2);
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        ctx.moveTo(this.x - ew, y - eh);
        ctx.lineTo(this.x, y + eh * 0.2);
        ctx.lineTo(this.x + ew, y - eh);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(this.x, y + eh * 0.3, ps * 0.15, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  drawPowerUp(ctx, y, ps, cfg) {
    // Hexagonal background for all power-ups
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const hx = this.x + Math.cos(a) * ps * 0.7;
      const hy = y + Math.sin(a) * ps * 0.7;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();

    // Colored border
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Icon fill
    ctx.fillStyle = cfg.color;

    switch (cfg.buffType) {
      case 'dmg':
        // Sword icon
        ctx.fillRect(this.x - 1, y - ps * 0.45, 2, ps * 0.7);
        ctx.beginPath();
        ctx.moveTo(this.x, y - ps * 0.45);
        ctx.lineTo(this.x - ps * 0.15, y - ps * 0.3);
        ctx.lineTo(this.x + ps * 0.15, y - ps * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(this.x - ps * 0.2, y + ps * 0.05, ps * 0.4, 3);
        break;

      case 'shield':
        // Shield icon
        ctx.beginPath();
        ctx.moveTo(this.x, y - ps * 0.4);
        ctx.quadraticCurveTo(this.x + ps * 0.35, y - ps * 0.3, this.x + ps * 0.35, y);
        ctx.quadraticCurveTo(this.x + ps * 0.2, y + ps * 0.35, this.x, y + ps * 0.45);
        ctx.quadraticCurveTo(this.x - ps * 0.2, y + ps * 0.35, this.x - ps * 0.35, y);
        ctx.quadraticCurveTo(this.x - ps * 0.35, y - ps * 0.3, this.x, y - ps * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 1, y - ps * 0.15, 2, ps * 0.25);
        ctx.fillRect(this.x - ps * 0.1, y - ps * 0.05, ps * 0.2, 2);
        break;

      case 'fireRate':
        // Lightning bolt icon
        ctx.beginPath();
        ctx.moveTo(this.x + ps * 0.1, y - ps * 0.45);
        ctx.lineTo(this.x - ps * 0.15, y + ps * 0.05);
        ctx.lineTo(this.x + ps * 0.02, y + ps * 0.05);
        ctx.lineTo(this.x - ps * 0.1, y + ps * 0.45);
        ctx.lineTo(this.x + ps * 0.15, y - ps * 0.05);
        ctx.lineTo(this.x - ps * 0.02, y - ps * 0.05);
        ctx.closePath();
        ctx.fill();
        break;

      case 'magnet':
        // U-magnet icon
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(this.x, y + ps * 0.05, ps * 0.25, 0, Math.PI);
        ctx.fill();
        ctx.fillRect(this.x - ps * 0.25, y - ps * 0.3, ps * 0.15, ps * 0.35);
        ctx.fillRect(this.x + ps * 0.1, y - ps * 0.3, ps * 0.15, ps * 0.35);
        // Attraction lines
        ctx.strokeStyle = 'rgba(168,85,247,0.4)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(this.x, y + ps * 0.05, ps * 0.25 + i * 4, Math.PI * 1.2, Math.PI * 1.8);
          ctx.stroke();
        }
        break;

      case 'nuke':
        // Explosion/bomb icon
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.arc(this.x, y + ps * 0.05, ps * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Fuse
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.x + ps * 0.15, y - ps * 0.2);
        ctx.quadraticCurveTo(this.x + ps * 0.3, y - ps * 0.4, this.x + ps * 0.1, y - ps * 0.45);
        ctx.stroke();
        // Spark
        const spark = Math.sin(this.pulseTimer * 4) > 0;
        if (spark) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(this.x + ps * 0.1, y - ps * 0.45, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Skull
        ctx.fillStyle = '#1a0a00';
        ctx.font = `bold ${ps * 0.35}px Outfit`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', this.x, y + ps * 0.08);
        ctx.textBaseline = 'alphabetic';
        break;
    }
  }
}

// Trap items
class Trap {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.triggered = false;
    this.size = 14;
    this.animTimer = Math.random() * Math.PI * 2;
  }

  update(scrollSpeed) {
    this.y += scrollSpeed;
    this.animTimer += 0.05;
    if (this.y > CONFIG.CANVAS_HEIGHT + 30) this.active = false;
  }

  trigger() {
    if (this.triggered) return null;
    this.triggered = true;
    return this.type;
  }

  draw(ctx) {
    if (!this.active || this.triggered) return;

    if (this.type === 'quicksand') {
      const pulse = 1 + Math.sin(this.animTimer * 2) * 0.1;
      ctx.fillStyle = '#92400e';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 1.2 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,53,15,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.5, this.animTimer, this.animTimer + Math.PI * 1.5);
      ctx.stroke();
    } else if (this.type === 'mine') {
      const flash = Math.sin(Date.now() / 80) > 0;
      ctx.strokeStyle = `rgba(239,68,68,${flash ? 0.3 : 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 1.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#3f0d0d';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(this.x + Math.cos(a) * this.size * 0.7, this.y + Math.sin(a) * this.size * 0.7, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = flash ? '#ef4444' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
