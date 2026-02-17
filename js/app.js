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

    // i18n
    this.translations = {};
    this.lang = this.saveData.settings.language || 'ko';

    // Input
    this.isDragging = false;
    this.dragStartX = 0;

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
        if (this.isDragging || this.scene instanceof RunScene) {
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

    // Clear at native resolution
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply scale: game coordinates (400x700) → high-res pixel buffer
    this.ctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
    if (this.scene) this.scene.draw(this.ctx);

    requestAnimationFrame((t) => this.loop(t));
  }

  processKeyboard(dt) {
    if (!this.scene || !this.scene.handleDrag) return;
    const speed = CONFIG.SQUAD_MOVE_SPEED;
    if (this.scene instanceof RunScene) {
      if (this.keys['ArrowLeft'] || this.keys['a']) {
        this.scene.squad.moveTo(this.scene.squad.targetX - speed);
      }
      if (this.keys['ArrowRight'] || this.keys['d']) {
        this.scene.squad.moveTo(this.scene.squad.targetX + speed);
      }
    }
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
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('app-loader');
  if (loader) loader.style.display = 'none';
  window.game = new Game();
});
