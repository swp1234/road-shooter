// Road Shooter - Road Items
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

    if (this.collected) {
      // Collection animation - float up and fade
      ctx.globalAlpha = this.collectTimer / 0.3;
      ctx.fillStyle = cfg.color;
      ctx.font = 'bold 14px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(cfg.label, this.x, y - 15 + (0.3 - this.collectTimer) * 30);
      ctx.globalAlpha = 1;
      return;
    }

    // Glow
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = 8;

    // Draw item based on type
    ctx.fillStyle = cfg.color;

    if (this.type === 'scoutToken') {
      // Green circle with eye icon
      ctx.beginPath();
      ctx.arc(this.x, y, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x, y, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'rallyFlag') {
      // Yellow triangle flag
      ctx.beginPath();
      ctx.moveTo(this.x, y - s * 0.6);
      ctx.lineTo(this.x + s * 0.6, y);
      ctx.lineTo(this.x, y + s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#92400e';
      ctx.fillRect(this.x - 1, y - s * 0.6, 2, s * 1.2);
    } else if (this.type === 'mercenary') {
      // Gold scroll
      ctx.fillRect(this.x - s * 0.4, y - s * 0.5, s * 0.8, s);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - s * 0.4, y - s * 0.5, s * 0.8, s);
    } else if (this.type === 'clonePod') {
      // Cyan capsule
      ctx.beginPath();
      ctx.ellipse(this.x, y, s * 0.4, s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'conscription') {
      // Red envelope
      ctx.fillRect(this.x - s * 0.4, y - s * 0.4, s * 0.8, s * 0.8);
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(this.x - s * 0.4, y - s * 0.4);
      ctx.lineTo(this.x, y);
      ctx.lineTo(this.x + s * 0.4, y - s * 0.4);
      ctx.closePath();
      ctx.fill();
    }

    // Label
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(cfg.label, this.x, y + s + 10);
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
  }

  update(scrollSpeed) {
    this.y += scrollSpeed;
    if (this.y > CONFIG.CANVAS_HEIGHT + 30) this.active = false;
  }

  trigger() {
    if (this.triggered) return null;
    this.triggered = true;
    return this.type;
  }

  draw(ctx) {
    if (!this.active || this.triggered) return;
    // Quicksand: brown circle
    if (this.type === 'quicksand') {
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'mine') {
      // Red blinking circle
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = Date.now() % 500 < 250 ? '#ef4444' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
