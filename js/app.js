// Road Shooter - Entry Point & Game Loop
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.saveData = SaveManager.load();
    this.scene = null;
    this.lastTime = 0;
    this.running = false;

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
      const intW = CONFIG.CANVAS_WIDTH;
      const intH = CONFIG.CANVAS_HEIGHT;
      const aspect = intW / intH;
      // Fill screen height, maintain aspect ratio
      let h = window.innerHeight;
      let w = h * aspect;
      if (w > window.innerWidth) {
        w = window.innerWidth;
        h = w / aspect;
      }
      this.canvas.style.width = Math.floor(w) + 'px';
      this.canvas.style.height = Math.floor(h) + 'px';
      this.canvas.width = intW;
      this.canvas.height = intH;
      this.scaleX = intW / w;
      this.scaleY = intH / h;
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

    // Touch/Mouse down
    const onDown = (e) => {
      e.preventDefault();
      const pos = getPos(e);
      this.isDragging = true;
      this.dragStartX = pos.x;

      // Click handling for menus
      if (this.scene && this.scene.handleClick) {
        this.scene.handleClick(pos.x, pos.y);
      }
      // Drag handling for run
      if (this.scene && this.scene.handleDrag) {
        this.scene.handleDrag(pos.x);
      }
    };

    const onMove = (e) => {
      e.preventDefault();
      const pos = getPos(e);
      // Always track mouse for squad movement (no drag required)
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

    // Keyboard (A/D or ArrowLeft/ArrowRight)
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
    } catch (e) {
      // Fallback to empty (will use defaults in code)
    }
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
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // Cap at 50ms
    this.lastTime = timestamp;

    // Keyboard input
    this.processKeyboard(dt);

    // Update
    if (this.scene) this.scene.update(dt);

    // Draw
    this.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
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
  // Hide loader
  const loader = document.getElementById('app-loader');
  if (loader) loader.style.display = 'none';

  window.game = new Game();
});
