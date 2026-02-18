// Road Shooter - Entry Point & Game Loop
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.saveData = SaveManager.load();
    this.scene = null;
    this.lastTime = 0;
    this.running = false;
    this.renderScale = 1;

    // Screen shake
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    // i18n
    this.translations = {};
    this.lang = this.saveData.settings.language || 'ko';

    // Input
    this.isDragging = false;
    this.dragStartX = 0;

    // Restore sound setting
    Sound.enabled = this.saveData.settings.sound !== false;

    this.setupCanvas();
    this.setupInput();
    this.loadI18n().then(() => {
      this.showMenu();
      this.start();
    });
  }

  setupCanvas() {
    const resize = () => {
      const gameW = CONFIG.CANVAS_WIDTH;  // 400 - game logic coordinates
      const gameH = CONFIG.CANVAS_HEIGHT; // 700
      const aspect = gameW / gameH;
      const dpr = window.devicePixelRatio || 1;

      // CSS display size: fill screen height
      let cssH = window.innerHeight;
      let cssW = cssH * aspect;
      if (cssW > window.innerWidth) {
        cssW = window.innerWidth;
        cssH = cssW / aspect;
      }

      // Set CSS display size
      this.canvas.style.width = Math.floor(cssW) + 'px';
      this.canvas.style.height = Math.floor(cssH) + 'px';

      // Set high-res pixel buffer
      this.canvas.width = Math.floor(cssW * dpr);
      this.canvas.height = Math.floor(cssH * dpr);

      // Scale factor: game coords (400x700) → pixel buffer
      this.renderScale = (cssW * dpr) / gameW;

      // Input: screen coords → game coords
      this.scaleX = gameW / cssW;
      this.scaleY = gameH / cssH;
    };
    resize();
    window.addEventListener('resize', resize);
  }

  setupInput() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * this.scaleX,
        y: (clientY - rect.top) * this.scaleY
      };
    };

    const onDown = (e) => {
      e.preventDefault();
      // Init sound on first interaction
      Sound.init();
      Sound.resume();
      const pos = getPos(e);
      this.isDragging = true;
      this.dragStartX = pos.x;
      if (this.scene && this.scene.handleClick) {
        this.scene.handleClick(pos.x, pos.y);
      }
      if (this.scene && this.scene.handleDrag) {
        this.scene.handleDrag(pos.x);
      }
    };

    const onMove = (e) => {
      e.preventDefault();
      const pos = getPos(e);
      if (this.scene && this.scene.handleDrag) {
        if (this.isDragging || this.scene instanceof RunScene || this.scene instanceof EndlessScene) {
          this.scene.handleDrag(pos.x);
        }
      }
    };

    const onUp = () => {
      this.isDragging = false;
    };

    this.canvas.addEventListener('mousedown', onDown);
    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('mouseleave', onUp);
    this.canvas.addEventListener('touchstart', onDown, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    this.canvas.addEventListener('touchend', onUp);

    this.keys = {};
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', ' '].includes(e.key)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
  }

  async loadI18n() {
    try {
      const resp = await fetch(`js/locales/${this.lang}.json`);
      if (resp.ok) this.translations = await resp.json();
    } catch (e) {}
  }

  i18n(key) {
    return this.translations[key] || '';
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.processKeyboard(dt);
    if (this.scene) this.scene.update(dt);

    // Update screen shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= 0.92;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    // Clear at native resolution
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply scale + shake: game coordinates (400x700) → high-res pixel buffer
    const sx = this.shakeX * this.renderScale;
    const sy = this.shakeY * this.renderScale;
    this.ctx.setTransform(this.renderScale, 0, 0, this.renderScale, sx, sy);
    if (this.scene) this.scene.draw(this.ctx);

    requestAnimationFrame((t) => this.loop(t));
  }

  processKeyboard(dt) {
    if (!this.scene || !this.scene.handleDrag) return;
    const speed = CONFIG.SQUAD_MOVE_SPEED;
    if (this.scene instanceof RunScene || this.scene instanceof EndlessScene) {
      const speedMul = this.scene.speedMul || 1;
      if (this.keys['ArrowLeft'] || this.keys['a']) {
        this.scene.squad.moveTo(this.scene.squad.targetX - speed * speedMul, speedMul);
      }
      if (this.keys['ArrowRight'] || this.keys['d']) {
        this.scene.squad.moveTo(this.scene.squad.targetX + speed * speedMul, speedMul);
      }
    }
  }

  shake(intensity = 4, duration = 0.2) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  showMenu() {
    this.scene = new MenuScene(this);
  }

  startRun(stage) {
    if (!stage) stage = (this.saveData.progress.maxStage || 0) + 1;
    this.scene = new RunScene(this, stage);
  }

  showResult(result) {
    this.scene = new ResultScene(this, result);
  }

  showUpgrade() {
    this.scene = new UpgradeScene(this);
  }

  startEndless() {
    this.scene = new EndlessScene(this);
  }

  showEndlessResult(result) {
    this.scene = new EndlessResultScene(this, result);
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('app-loader');
  if (loader) loader.style.display = 'none';
  window.game = new Game();
});
