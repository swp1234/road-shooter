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

    // Ground shadow (ellipse below item)
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + s + 4, s * 0.8, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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

    // Label with subtle drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.85;
    ctx.fillText(cfg.label, this.x + 1, y + s + 13);
    ctx.fillStyle = '#fff';
    ctx.fillText(cfg.label, this.x, y + s + 12);
    ctx.globalAlpha = 1;
  }

  drawSquadItem(ctx, y, ps, cfg) {
    switch (this.type) {
      case 'scoutToken': {
        // 3D coin / badge with soldier silhouette
        const r = ps * 0.6;
        // Outer ring — dark-to-light metallic gradient (top-left light)
        const ringGrad = ctx.createLinearGradient(this.x - r, y - r, this.x + r, y + r);
        ringGrad.addColorStop(0, '#0d9468');
        ringGrad.addColorStop(0.4, '#065f46');
        ringGrad.addColorStop(1, '#032e23');
        ctx.fillStyle = ringGrad;
        ctx.beginPath();
        ctx.arc(this.x, y, r, 0, Math.PI * 2);
        ctx.fill();
        // Inner face — radial gradient for sphere look
        const faceGrad = ctx.createRadialGradient(this.x - r * 0.25, y - r * 0.25, r * 0.05, this.x, y, r * 0.85);
        faceGrad.addColorStop(0, '#34d399');
        faceGrad.addColorStop(0.6, cfg.color);
        faceGrad.addColorStop(1, '#065f46');
        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        ctx.arc(this.x, y, r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        // Helmet dome (top)
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.arc(this.x, y - ps * 0.15, ps * 0.4, -Math.PI, 0);
        ctx.fill();
        // Head
        const headGrad = ctx.createRadialGradient(this.x - ps * 0.04, y - ps * 0.14, ps * 0.02, this.x, y - ps * 0.1, ps * 0.15);
        headGrad.addColorStop(0, '#fff');
        headGrad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(this.x, y - ps * 0.1, ps * 0.15, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(this.x - ps * 0.08, y + ps * 0.1, ps * 0.16, ps * 0.25);
        // Specular highlight on coin edge
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x - r * 0.3, y - r * 0.35, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }

      case 'rallyFlag': {
        // Pole — metallic cylinder gradient
        const poleGrad = ctx.createLinearGradient(this.x - 2, y, this.x + 2, y);
        poleGrad.addColorStop(0, '#6b3a06');
        poleGrad.addColorStop(0.3, '#c68a3c');
        poleGrad.addColorStop(0.5, '#d4a44c');
        poleGrad.addColorStop(0.7, '#c68a3c');
        poleGrad.addColorStop(1, '#6b3a06');
        ctx.fillStyle = poleGrad;
        ctx.fillRect(this.x - 1.2, y - ps * 0.7, 2.4, ps * 1.4);
        // Pole tip sphere
        const tipGrad = ctx.createRadialGradient(this.x - 0.5, y - ps * 0.72, 0.5, this.x, y - ps * 0.7, 2.5);
        tipGrad.addColorStop(0, '#ffd700');
        tipGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = tipGrad;
        ctx.beginPath();
        ctx.arc(this.x, y - ps * 0.72, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Flag — gradient with wave
        const wave = Math.sin(this.bobTimer * 2) * 2;
        const flagGrad = ctx.createLinearGradient(this.x + 1, y - ps * 0.65, this.x + ps * 0.6, y - ps * 0.15);
        flagGrad.addColorStop(0, '#fde68a');
        flagGrad.addColorStop(0.4, cfg.color);
        flagGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = flagGrad;
        ctx.beginPath();
        ctx.moveTo(this.x + 1, y - ps * 0.65);
        ctx.quadraticCurveTo(this.x + ps * 0.5 + wave, y - ps * 0.45, this.x + ps * 0.6, y - ps * 0.3);
        ctx.lineTo(this.x + 1, y - ps * 0.15);
        ctx.closePath();
        ctx.fill();
        // Flag highlight fold
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(this.x + 1, y - ps * 0.65);
        ctx.lineTo(this.x + ps * 0.25 + wave * 0.5, y - ps * 0.52);
        ctx.lineTo(this.x + 1, y - ps * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        // Star emblem
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + ps * 0.25, y - ps * 0.4, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'mercenary': {
        // Gold coin with cross — metallic 3D sphere
        const r = ps * 0.6;
        // Outer ring
        const outerGrad = ctx.createRadialGradient(this.x - r * 0.3, y - r * 0.3, r * 0.05, this.x, y, r);
        outerGrad.addColorStop(0, '#f5d78e');
        outerGrad.addColorStop(0.5, '#d4a44c');
        outerGrad.addColorStop(0.8, '#8b6914');
        outerGrad.addColorStop(1, '#3d2e0a');
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(this.x, y, r, 0, Math.PI * 2);
        ctx.fill();
        // Inner face
        const innerGrad = ctx.createRadialGradient(this.x - r * 0.25, y - r * 0.25, r * 0.05, this.x, y, r * 0.82);
        innerGrad.addColorStop(0, '#ffe7a0');
        innerGrad.addColorStop(0.4, cfg.color);
        innerGrad.addColorStop(1, '#6b4c12');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(this.x, y, ps * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Cross emblem — embossed look
        ctx.strokeStyle = '#3d2e0a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, y - ps * 0.3);
        ctx.lineTo(this.x, y + ps * 0.3);
        ctx.moveTo(this.x - ps * 0.2, y - ps * 0.1);
        ctx.lineTo(this.x + ps * 0.2, y - ps * 0.1);
        ctx.stroke();
        ctx.strokeStyle = '#ffe7a0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x + 0.5, y - ps * 0.28);
        ctx.lineTo(this.x + 0.5, y + ps * 0.28);
        ctx.moveTo(this.x - ps * 0.18, y - ps * 0.08);
        ctx.lineTo(this.x + ps * 0.18, y - ps * 0.08);
        ctx.stroke();
        // Specular highlight
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(this.x - r * 0.2, y - r * 0.25, r * 0.22, r * 0.13, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }

      case 'clonePod': {
        // Glass capsule / pod — volumetric with refraction
        const rw = ps * 0.4;
        const rh = ps * 0.65;
        // Outer shell — dark metallic gradient
        const shellGrad = ctx.createLinearGradient(this.x - rw, y - rh, this.x + rw, y + rh);
        shellGrad.addColorStop(0, '#1a6b8a');
        shellGrad.addColorStop(0.3, '#0e4059');
        shellGrad.addColorStop(0.7, '#0e4059');
        shellGrad.addColorStop(1, '#072533');
        ctx.fillStyle = shellGrad;
        ctx.beginPath();
        ctx.ellipse(this.x, y, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();
        // Inner glow — radial gradient cyan sphere
        const innerGrad = ctx.createRadialGradient(this.x - rw * 0.2, y - rh * 0.15, rw * 0.05, this.x, y, rw * 0.9);
        innerGrad.addColorStop(0, '#67e8f9');
        innerGrad.addColorStop(0.5, cfg.color);
        innerGrad.addColorStop(1, '#0e4059');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.ellipse(this.x, y, ps * 0.3, ps * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pulsing core energy
        const corePulse = 0.3 + Math.sin(this.pulseTimer * 2) * 0.2;
        const coreGrad = ctx.createRadialGradient(this.x, y, 0, this.x, y, ps * 0.35);
        coreGrad.addColorStop(0, `rgba(103,232,249,${corePulse + 0.3})`);
        coreGrad.addColorStop(0.5, `rgba(6,182,212,${corePulse})`);
        coreGrad.addColorStop(1, 'rgba(6,182,212,0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.ellipse(this.x, y, ps * 0.15, ps * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Glass specular — curved highlight on upper-left
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(this.x - rw * 0.25, y - rh * 0.3, rw * 0.35, rh * 0.2, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Edge rim light on right side
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(this.x, y, rw * 0.95, rh * 0.95, 0, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }

      case 'conscription': {
        // Military envelope / call-to-arms badge — beveled 3D
        const ew = ps * 0.7;
        const eh = ps * 0.55;
        // Outer envelope — gradient top-left to bottom-right
        const envGrad = ctx.createLinearGradient(this.x - ew, y - eh, this.x + ew, y + eh);
        envGrad.addColorStop(0, '#c43a3b');
        envGrad.addColorStop(0.35, '#991b1c');
        envGrad.addColorStop(0.7, '#6b1213');
        envGrad.addColorStop(1, '#3d0a0b');
        ctx.fillStyle = envGrad;
        ctx.fillRect(this.x - ew, y - eh, ew * 2, eh * 2);
        // Top bevel highlight
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - ew, y - eh, ew * 2, 2);
        ctx.fillRect(this.x - ew, y - eh, 2, eh * 2);
        ctx.globalAlpha = 1;
        // Bottom/right shadow bevel
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - ew, y + eh - 2, ew * 2, 2);
        ctx.fillRect(this.x + ew - 2, y - eh, 2, eh * 2);
        ctx.globalAlpha = 1;
        // Arrow/chevron — gradient red
        const chevGrad = ctx.createLinearGradient(this.x - ew, y - eh, this.x, y + eh * 0.2);
        chevGrad.addColorStop(0, '#ff6b6b');
        chevGrad.addColorStop(0.5, cfg.color);
        chevGrad.addColorStop(1, '#991b1c');
        ctx.fillStyle = chevGrad;
        ctx.beginPath();
        ctx.moveTo(this.x - ew, y - eh);
        ctx.lineTo(this.x, y + eh * 0.2);
        ctx.lineTo(this.x + ew, y - eh);
        ctx.closePath();
        ctx.fill();
        // Seal / stamp — gold sphere with highlight
        const sealGrad = ctx.createRadialGradient(this.x - ps * 0.04, y + eh * 0.25, ps * 0.02, this.x, y + eh * 0.3, ps * 0.15);
        sealGrad.addColorStop(0, '#fde68a');
        sealGrad.addColorStop(0.6, '#fbbf24');
        sealGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = sealGrad;
        ctx.beginPath();
        ctx.arc(this.x, y + eh * 0.3, ps * 0.15, 0, Math.PI * 2);
        ctx.fill();
        // Specular on seal
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x - ps * 0.04, y + eh * 0.25, ps * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
    }
  }

  drawPowerUp(ctx, y, ps, cfg) {
    // Beveled hexagonal background — 3D badge effect
    const hexR = ps * 0.7;
    const hexPts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      hexPts.push({ x: this.x + Math.cos(a) * hexR, y: y + Math.sin(a) * hexR });
    }

    // Hex shadow (outer bevel — darker, shifted down-right)
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const p = hexPts[i];
      if (i === 0) ctx.moveTo(p.x + 1.5, p.y + 1.5);
      else ctx.lineTo(p.x + 1.5, p.y + 1.5);
    }
    ctx.closePath();
    ctx.fill();

    // Hex main face — gradient for depth
    const hexGrad = ctx.createLinearGradient(this.x - hexR, y - hexR, this.x + hexR, y + hexR);
    hexGrad.addColorStop(0, 'rgba(60,60,80,0.85)');
    hexGrad.addColorStop(0.45, 'rgba(20,20,35,0.9)');
    hexGrad.addColorStop(1, 'rgba(5,5,15,0.95)');
    ctx.fillStyle = hexGrad;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      if (i === 0) ctx.moveTo(hexPts[i].x, hexPts[i].y);
      else ctx.lineTo(hexPts[i].x, hexPts[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Inner hex highlight (top-left lit bevel)
    const innerR = hexR * 0.88;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = this.x + Math.cos(a) * innerR;
      const py = y + Math.sin(a) * innerR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const innerGrad = ctx.createLinearGradient(this.x - innerR, y - innerR, this.x + innerR, y + innerR);
    innerGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
    innerGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
    innerGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = innerGrad;
    ctx.fill();
    ctx.restore();

    // Colored glowing border
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      if (i === 0) ctx.moveTo(hexPts[i].x, hexPts[i].y);
      else ctx.lineTo(hexPts[i].x, hexPts[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Icon — per buff type with 3D treatment
    switch (cfg.buffType) {
      case 'dmg': {
        // Sword — metallic blade with gradient
        const bladeGrad = ctx.createLinearGradient(this.x - 2, y, this.x + 2, y);
        bladeGrad.addColorStop(0, '#8b1a2b');
        bladeGrad.addColorStop(0.3, '#f43f5e');
        bladeGrad.addColorStop(0.5, '#fda4af');
        bladeGrad.addColorStop(0.7, '#f43f5e');
        bladeGrad.addColorStop(1, '#8b1a2b');
        ctx.fillStyle = bladeGrad;
        ctx.fillRect(this.x - 1.2, y - ps * 0.45, 2.4, ps * 0.7);
        // Blade tip
        const tipGrad = ctx.createLinearGradient(this.x - ps * 0.15, y - ps * 0.45, this.x + ps * 0.15, y - ps * 0.3);
        tipGrad.addColorStop(0, '#f43f5e');
        tipGrad.addColorStop(0.5, '#fda4af');
        tipGrad.addColorStop(1, '#9f1239');
        ctx.fillStyle = tipGrad;
        ctx.beginPath();
        ctx.moveTo(this.x, y - ps * 0.48);
        ctx.lineTo(this.x - ps * 0.15, y - ps * 0.3);
        ctx.lineTo(this.x + ps * 0.15, y - ps * 0.3);
        ctx.closePath();
        ctx.fill();
        // Crossguard — gradient gold
        const guardGrad = ctx.createLinearGradient(this.x - ps * 0.2, y + ps * 0.05, this.x + ps * 0.2, y + ps * 0.05);
        guardGrad.addColorStop(0, '#92400e');
        guardGrad.addColorStop(0.5, '#fbbf24');
        guardGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = guardGrad;
        ctx.fillRect(this.x - ps * 0.22, y + ps * 0.03, ps * 0.44, 3.5);
        // Specular line on blade
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(this.x + 0.3, y - ps * 0.42);
        ctx.lineTo(this.x + 0.3, y + ps * 0.02);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }

      case 'shield': {
        // Shield — gradient surface with metallic rim
        const shieldGrad = ctx.createRadialGradient(this.x - ps * 0.08, y - ps * 0.08, ps * 0.02, this.x, y, ps * 0.42);
        shieldGrad.addColorStop(0, '#93c5fd');
        shieldGrad.addColorStop(0.4, cfg.color);
        shieldGrad.addColorStop(0.8, '#2563eb');
        shieldGrad.addColorStop(1, '#1e3a5f');
        ctx.fillStyle = shieldGrad;
        ctx.beginPath();
        ctx.moveTo(this.x, y - ps * 0.4);
        ctx.quadraticCurveTo(this.x + ps * 0.35, y - ps * 0.3, this.x + ps * 0.35, y);
        ctx.quadraticCurveTo(this.x + ps * 0.2, y + ps * 0.35, this.x, y + ps * 0.45);
        ctx.quadraticCurveTo(this.x - ps * 0.2, y + ps * 0.35, this.x - ps * 0.35, y);
        ctx.quadraticCurveTo(this.x - ps * 0.35, y - ps * 0.3, this.x, y - ps * 0.4);
        ctx.closePath();
        ctx.fill();
        // Rim / edge highlight
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, y - ps * 0.4);
        ctx.quadraticCurveTo(this.x - ps * 0.35, y - ps * 0.3, this.x - ps * 0.35, y);
        ctx.stroke();
        // Cross emblem
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 1, y - ps * 0.15, 2, ps * 0.25);
        ctx.fillRect(this.x - ps * 0.1, y - ps * 0.05, ps * 0.2, 2);
        // Specular gleam on upper-left
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(this.x - ps * 0.1, y - ps * 0.2, ps * 0.12, ps * 0.06, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }

      case 'fireRate': {
        // Lightning bolt — electric gradient with glow
        const boltGrad = ctx.createLinearGradient(this.x, y - ps * 0.45, this.x, y + ps * 0.45);
        boltGrad.addColorStop(0, '#fef08a');
        boltGrad.addColorStop(0.3, cfg.color);
        boltGrad.addColorStop(0.7, '#f59e0b');
        boltGrad.addColorStop(1, '#92400e');
        // Outer glow bolt
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 8;
        ctx.fillStyle = boltGrad;
        ctx.beginPath();
        ctx.moveTo(this.x + ps * 0.1, y - ps * 0.45);
        ctx.lineTo(this.x - ps * 0.15, y + ps * 0.05);
        ctx.lineTo(this.x + ps * 0.02, y + ps * 0.05);
        ctx.lineTo(this.x - ps * 0.1, y + ps * 0.45);
        ctx.lineTo(this.x + ps * 0.15, y - ps * 0.05);
        ctx.lineTo(this.x - ps * 0.02, y - ps * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        // Specular edge on left face
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(this.x + ps * 0.08, y - ps * 0.42);
        ctx.lineTo(this.x - ps * 0.12, y + ps * 0.02);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }

      case 'magnet': {
        // U-magnet — metallic gradient with 3D arms
        // Left arm
        const leftGrad = ctx.createLinearGradient(this.x - ps * 0.25, y - ps * 0.3, this.x - ps * 0.1, y - ps * 0.3);
        leftGrad.addColorStop(0, '#7e22ce');
        leftGrad.addColorStop(0.4, '#c084fc');
        leftGrad.addColorStop(1, '#7e22ce');
        ctx.fillStyle = leftGrad;
        ctx.fillRect(this.x - ps * 0.25, y - ps * 0.3, ps * 0.15, ps * 0.35);
        // Right arm
        const rightGrad = ctx.createLinearGradient(this.x + ps * 0.1, y - ps * 0.3, this.x + ps * 0.25, y - ps * 0.3);
        rightGrad.addColorStop(0, '#7e22ce');
        rightGrad.addColorStop(0.6, '#c084fc');
        rightGrad.addColorStop(1, '#7e22ce');
        ctx.fillStyle = rightGrad;
        ctx.fillRect(this.x + ps * 0.1, y - ps * 0.3, ps * 0.15, ps * 0.35);
        // U-curve — gradient arc
        const uGrad = ctx.createRadialGradient(this.x, y - ps * 0.05, ps * 0.05, this.x, y + ps * 0.05, ps * 0.28);
        uGrad.addColorStop(0, '#c084fc');
        uGrad.addColorStop(0.5, '#a855f7');
        uGrad.addColorStop(1, '#581c87');
        ctx.fillStyle = uGrad;
        ctx.beginPath();
        ctx.arc(this.x, y + ps * 0.05, ps * 0.25, 0, Math.PI);
        ctx.fill();
        // Pole tips (red / blue)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(this.x - ps * 0.25, y - ps * 0.32, ps * 0.15, 3);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(this.x + ps * 0.1, y - ps * 0.32, ps * 0.15, 3);
        // Attraction field arcs — glowing
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 4;
        ctx.strokeStyle = 'rgba(168,85,247,0.4)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
          ctx.globalAlpha = 0.5 - i * 0.12;
          ctx.beginPath();
          ctx.arc(this.x, y + ps * 0.05, ps * 0.25 + i * 4, Math.PI * 1.2, Math.PI * 1.8);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        // Specular on left arm
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - ps * 0.23, y - ps * 0.28, 1.5, ps * 0.2);
        ctx.globalAlpha = 1;
        break;
      }

      case 'nuke': {
        // Bomb — spherical with volumetric shading
        const bombR = ps * 0.3;
        const bombGrad = ctx.createRadialGradient(this.x - bombR * 0.35, y + ps * 0.05 - bombR * 0.3, bombR * 0.08, this.x, y + ps * 0.05, bombR);
        bombGrad.addColorStop(0, '#ffad80');
        bombGrad.addColorStop(0.35, '#ff6b35');
        bombGrad.addColorStop(0.7, '#cc4400');
        bombGrad.addColorStop(1, '#661a00');
        ctx.fillStyle = bombGrad;
        ctx.beginPath();
        ctx.arc(this.x, y + ps * 0.05, bombR, 0, Math.PI * 2);
        ctx.fill();
        // Bomb highlight ring (metallic rim)
        ctx.strokeStyle = 'rgba(255,180,130,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, y + ps * 0.05, bombR * 0.85, -Math.PI * 0.7, -Math.PI * 0.1);
        ctx.stroke();
        // Fuse — gradient rope
        const fuseGrad = ctx.createLinearGradient(this.x + ps * 0.15, y - ps * 0.2, this.x + ps * 0.1, y - ps * 0.45);
        fuseGrad.addColorStop(0, '#92400e');
        fuseGrad.addColorStop(0.5, '#fbbf24');
        fuseGrad.addColorStop(1, '#92400e');
        ctx.strokeStyle = fuseGrad;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(this.x + ps * 0.15, y - ps * 0.2);
        ctx.quadraticCurveTo(this.x + ps * 0.3, y - ps * 0.4, this.x + ps * 0.1, y - ps * 0.45);
        ctx.stroke();
        // Spark — pulsing glow
        const spark = Math.sin(this.pulseTimer * 4) > 0;
        if (spark) {
          const sparkGrad = ctx.createRadialGradient(this.x + ps * 0.1, y - ps * 0.45, 0, this.x + ps * 0.1, y - ps * 0.45, 4);
          sparkGrad.addColorStop(0, '#fff');
          sparkGrad.addColorStop(0.3, '#fde68a');
          sparkGrad.addColorStop(0.7, '#fbbf24');
          sparkGrad.addColorStop(1, 'rgba(251,191,36,0)');
          ctx.fillStyle = sparkGrad;
          ctx.beginPath();
          ctx.arc(this.x + ps * 0.1, y - ps * 0.45, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        // Exclamation mark (embossed)
        ctx.fillStyle = '#1a0a00';
        ctx.font = `bold ${ps * 0.35}px Outfit`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', this.x + 0.5, y + ps * 0.1);
        ctx.fillStyle = '#ffad80';
        ctx.globalAlpha = 0.5;
        ctx.fillText('!', this.x, y + ps * 0.08);
        ctx.globalAlpha = 1;
        ctx.textBaseline = 'alphabetic';
        // Specular spot
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(this.x - bombR * 0.3, y + ps * 0.05 - bombR * 0.25, bombR * 0.18, bombR * 0.1, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
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

    // Ground shadow for all traps
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.size * 0.7, this.size * 0.7, this.size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.type === 'quicksand') {
      const pulse = 1 + Math.sin(this.animTimer * 2) * 0.1;
      const r = this.size * 1.2 * pulse;
      // Outer pool — radial gradient (muddy volumetric look)
      const outerGrad = ctx.createRadialGradient(this.x - r * 0.2, this.y - r * 0.2, r * 0.05, this.x, this.y, r);
      outerGrad.addColorStop(0, '#b45e14');
      outerGrad.addColorStop(0.4, '#92400e');
      outerGrad.addColorStop(0.8, '#6b3006');
      outerGrad.addColorStop(1, 'rgba(107,48,6,0)');
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Inner mud core — darker sphere
      const innerR = this.size * 0.8;
      const innerGrad = ctx.createRadialGradient(this.x - innerR * 0.25, this.y - innerR * 0.25, innerR * 0.05, this.x, this.y, innerR);
      innerGrad.addColorStop(0, '#a0712e');
      innerGrad.addColorStop(0.4, '#78350f');
      innerGrad.addColorStop(0.8, '#451f06');
      innerGrad.addColorStop(1, '#2d1503');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, innerR, 0, Math.PI * 2);
      ctx.fill();

      // Swirl lines — slightly brighter
      ctx.strokeStyle = 'rgba(160,113,46,0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.5, this.animTimer, this.animTimer + Math.PI * 1.5);
      ctx.stroke();
      // Second swirl (opposite)
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.35, this.animTimer + Math.PI, this.animTimer + Math.PI * 2.2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Specular glint (wet surface)
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(this.x - innerR * 0.3, this.y - innerR * 0.3, innerR * 0.2, innerR * 0.1, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

    } else if (this.type === 'mine') {
      const flash = Math.sin(Date.now() / 80) > 0;

      // Danger ring — pulsing radial glow
      const dangerGrad = ctx.createRadialGradient(this.x, this.y, this.size * 0.7, this.x, this.y, this.size * 1.35);
      dangerGrad.addColorStop(0, `rgba(239,68,68,${flash ? 0.12 : 0.04})`);
      dangerGrad.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = dangerGrad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring stroke
      ctx.strokeStyle = `rgba(239,68,68,${flash ? 0.3 : 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 1.3, 0, Math.PI * 2);
      ctx.stroke();

      // Mine body — metallic sphere
      const bodyR = this.size * 0.7;
      const bodyGrad = ctx.createRadialGradient(this.x - bodyR * 0.3, this.y - bodyR * 0.3, bodyR * 0.08, this.x, this.y, bodyR);
      bodyGrad.addColorStop(0, '#6b2020');
      bodyGrad.addColorStop(0.3, '#3f0d0d');
      bodyGrad.addColorStop(0.7, '#2a0808');
      bodyGrad.addColorStop(1, '#150303');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, bodyR, 0, Math.PI * 2);
      ctx.fill();

      // Spikes / prongs — metallic 3D nubs
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const sx = this.x + Math.cos(a) * bodyR;
        const sy = this.y + Math.sin(a) * bodyR;
        const spikeGrad = ctx.createRadialGradient(sx - 0.5, sy - 0.5, 0.3, sx, sy, 2.5);
        spikeGrad.addColorStop(0, '#aaa');
        spikeGrad.addColorStop(0.5, '#666');
        spikeGrad.addColorStop(1, '#333');
        ctx.fillStyle = spikeGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center indicator — glowing LED
      const ledR = this.size * 0.25;
      const ledGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, ledR);
      if (flash) {
        ledGrad.addColorStop(0, '#fff');
        ledGrad.addColorStop(0.3, '#ff6b6b');
        ledGrad.addColorStop(0.7, '#ef4444');
        ledGrad.addColorStop(1, '#7f1d1d');
      } else {
        ledGrad.addColorStop(0, '#a04040');
        ledGrad.addColorStop(0.5, '#7f1d1d');
        ledGrad.addColorStop(1, '#3f0d0d');
      }
      ctx.fillStyle = ledGrad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ledR, 0, Math.PI * 2);
      ctx.fill();

      // Specular highlight on mine body
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(this.x - bodyR * 0.3, this.y - bodyR * 0.3, bodyR * 0.2, bodyR * 0.12, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
