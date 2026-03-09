// Road Shooter - Achievement Scene
class AchievementScene {
  constructor(game) {
    this.game = game;
    this.scrollY = 0;
    this.maxScroll = 0;
    this.lastDragY = null;
    this.backBtn = null;
  }

  update(dt) {
    if (typeof Achievements !== 'undefined') {
      Achievements.updateToast(dt);
    }
  }

  draw(ctx) {
    if (typeof Achievements === 'undefined') return;
    const result = Achievements.drawScreen(
      ctx, this.game.saveData,
      (k) => this.game.i18n(k),
      this.scrollY
    );
    this.backBtn = result.backBtn;
    this.maxScroll = Math.max(0, result.contentH - CONFIG.CANVAS_HEIGHT + 60);
  }

  handleClick(x, y) {
    if (this.backBtn) {
      const b = this.backBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        Sound.uiClick();
        this.game.showMenu();
        return true;
      }
    }
    this.lastDragY = y;
    return false;
  }

  handleDrag(x, y) {
    if (this.lastDragY !== null && y !== undefined) {
      const dy = this.lastDragY - y;
      this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + dy));
      this.lastDragY = y;
    }
  }
}
