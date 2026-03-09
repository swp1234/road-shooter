// Road Shooter - Skin System (Canvas Filter-Based)
const SkinManager = (() => {
  const SKINS = [
    { id: 'default', nameKey: 'skin_default', cost: 0, icon: '\uD83C\uDF96\uFE0F',
      filter: 'none', preview: '#10b981' },
    { id: 'desert', nameKey: 'skin_desert', cost: 800, icon: '\uD83C\uDFDC\uFE0F',
      filter: 'hue-rotate(35deg) saturate(0.7) brightness(1.05)', preview: '#c9985a' },
    { id: 'arctic', nameKey: 'skin_arctic', cost: 1500, icon: '\u2744\uFE0F',
      filter: 'hue-rotate(170deg) saturate(0.45) brightness(1.25)', preview: '#88b8d8' },
    { id: 'neon', nameKey: 'skin_neon', cost: 2500, icon: '\uD83D\uDC9C',
      filter: 'saturate(2.2) brightness(1.15) contrast(1.1)', preview: '#e040fb' },
    { id: 'shadow', nameKey: 'skin_shadow', cost: 4000, icon: '\uD83D\uDDA4',
      filter: 'saturate(0.15) brightness(0.55) contrast(1.4)', preview: '#4a5568' },
    { id: 'gold', nameKey: 'skin_gold', cost: 0, icon: '\uD83D\uDC51',
      achievement: 'run_100', filter: 'sepia(0.9) saturate(1.8) brightness(1.15)', preview: '#d4a017' }
  ];

  let _activeFilter = 'none';

  return {
    SKINS,

    init(saveData) {
      const id = (saveData.skin && saveData.skin.equipped) || 'default';
      const skin = SKINS.find(s => s.id === id) || SKINS[0];
      _activeFilter = skin.filter;
    },

    getFilter() {
      return _activeFilter;
    },

    getActive(saveData) {
      const id = (saveData && saveData.skin && saveData.skin.equipped) || 'default';
      return SKINS.find(s => s.id === id) || SKINS[0];
    },

    isOwned(saveData, skinId) {
      if (skinId === 'default') return true;
      const skin = SKINS.find(s => s.id === skinId);
      if (!skin) return false;
      if (skin.achievement) {
        return saveData.achievements && saveData.achievements[skin.achievement];
      }
      return saveData.skin && saveData.skin.owned && saveData.skin.owned.includes(skinId);
    },

    buy(saveData, skinId) {
      const skin = SKINS.find(s => s.id === skinId);
      if (!skin || this.isOwned(saveData, skinId)) return false;
      if (skin.achievement) return false;
      if (saveData.currency.gold < skin.cost) return false;
      saveData.currency.gold -= skin.cost;
      if (!saveData.skin) saveData.skin = { equipped: 'default', owned: [] };
      if (!saveData.skin.owned) saveData.skin.owned = [];
      saveData.skin.owned.push(skinId);
      SaveManager.save(saveData);
      return true;
    },

    equip(saveData, skinId) {
      if (!this.isOwned(saveData, skinId)) return false;
      if (!saveData.skin) saveData.skin = { equipped: 'default', owned: [] };
      saveData.skin.equipped = skinId;
      const skin = SKINS.find(s => s.id === skinId) || SKINS[0];
      _activeFilter = skin.filter;
      SaveManager.save(saveData);
      return true;
    }
  };
})();
