// Road Shooter - Road Items (Enhanced Visuals)
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
      // Collection animation - scale up and fade
      const t = this.collectTimer / 0.3;
      ctx.globalAlpha = t;
      ctx.fillStyle = cfg.color;
      ctx.font = 'bold 16px Outfit';
      ctx.textAlign = 'center';
      const floatY = y - 15 + (1 - t) * 40;
      ctx.fillText(cfg.label, this.x, floatY);
      // Burst ring
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2 * t;
      ctx.beginPath();
      ctx.arc(this.x, y, s * (2 - t), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

    // Outer glow ring (pulsing)
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = cfg.color;
    ctx.globalAlpha = 0.2 + Math.sin(this.pulseTimer) * 0.1;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, y, s * 1.3 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Orbiting particles (2 small dots)
    const orbitR = s * 1.1;
    for (let i = 0; i < 2; i++) {
      const a = this.orbitAngle + i * Math.PI;
      const ox = this.x + Math.cos(a) * orbitR;
      const oy = y + Math.sin(a) * orbitR * 0.6;
      ctx.fillStyle = cfg.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(ox, oy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw item based on type
    ctx.fillStyle = cfg.color;
    const ps = s * pulse;

    if (this.type === 'scoutToken') {
      // Green soldier silhouette
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.arc(this.x, y, ps * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cfg.color;
      // Helmet
      ctx.beginPath();
      ctx.arc(this.x, y - ps * 0.15, ps * 0.45, -Math.PI, 0);
      ctx.fill();
      // Person icon
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x, y - ps * 0.1, ps * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(this.x - ps * 0.08, y + ps * 0.1, ps * 0.16, ps * 0.25);
    } else if (this.type === 'rallyFlag') {
      // Waving flag on pole
      ctx.fillStyle = '#92400e';
      ctx.fillRect(this.x - 0.8, y - ps * 0.7, 1.6, ps * 1.4);
      // Flag cloth (waving)
      const wave = Math.sin(this.bobTimer * 2) * 2;
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.moveTo(this.x + 1, y - ps * 0.65);
      ctx.quadraticCurveTo(this.x + ps * 0.5 + wave, y - ps * 0.45, this.x + ps * 0.6, y - ps * 0.3);
      ctx.lineTo(this.x + 1, y - ps * 0.15);
      ctx.closePath();
      ctx.fill();
      // Star on flag
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x + ps * 0.25, y - ps * 0.4, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'mercenary') {
      // Gold-bordered scroll/contract
      ctx.fillStyle = '#1a1207';
      ctx.beginPath();
      ctx.arc(this.x, y, ps * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.arc(this.x, y, ps * 0.5, 0, Math.PI * 2);
      ctx.fill();
      // Sword cross icon
      ctx.strokeStyle = '#1a1207';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x, y - ps * 0.3);
      ctx.lineTo(this.x, y + ps * 0.3);
      ctx.moveTo(this.x - ps * 0.2, y - ps * 0.1);
      ctx.lineTo(this.x + ps * 0.2, y - ps * 0.1);
      ctx.stroke();
    } else if (this.type === 'clonePod') {
      // Cyan capsule with DNA helix
      ctx.fillStyle = '#0e4059';
      ctx.beginPath();
      ctx.ellipse(this.x, y, ps * 0.4, ps * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.ellipse(this.x, y, ps * 0.3, ps * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // Inner glow
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.3 + Math.sin(this.pulseTimer * 2) * 0.2;
      ctx.beginPath();
      ctx.ellipse(this.x, y, ps * 0.15, ps * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Glass highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.ellipse(this.x - ps * 0.1, y - ps * 0.2, ps * 0.08, ps * 0.15, -0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'conscription') {
      // Red military envelope with seal
      const ew = ps * 0.7;
      const eh = ps * 0.55;
      ctx.fillStyle = '#991b1c';
      ctx.fillRect(this.x - ew, y - eh, ew * 2, eh * 2);
      // Envelope flap
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.moveTo(this.x - ew, y - eh);
      ctx.lineTo(this.x, y + eh * 0.2);
      ctx.lineTo(this.x + ew, y - eh);
      ctx.closePath();
      ctx.fill();
      // Wax seal
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(this.x, y + eh * 0.3, ps * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(this.x, y + eh * 0.3, ps * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label below
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.8;
    ctx.fillText(cfg.label, this.x, y + s + 12);
    ctx.globalAlpha = 1;
  }
}

// Trap items (Enhanced Visuals)
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
      // Swirling sand pit
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
      // Spiral pattern
      ctx.strokeStyle = 'rgba(120,53,15,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.5, this.animTimer, this.animTimer + Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.3, this.animTimer + Math.PI, this.animTimer + Math.PI * 2.2);
      ctx.stroke();
    } else if (this.type === 'mine') {
      // Blinking mine with danger ring
      const flash = Math.sin(Date.now() / 80) > 0;
      // Danger ring
      ctx.strokeStyle = `rgba(239,68,68,${flash ? 0.3 : 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 1.3, 0, Math.PI * 2);
      ctx.stroke();
      // Mine body
      ctx.fillStyle = '#3f0d0d';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      // Spikes
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const sx = this.x + Math.cos(a) * this.size * 0.7;
        const sy = this.y + Math.sin(a) * this.size * 0.7;
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Blink light
      ctx.fillStyle = flash ? '#ef4444' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      if (flash) {
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
