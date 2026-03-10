/**
 * Universal Game Ads Module
 * H5 Games Ads (Ad Placement API) wrapper for web games.
 *
 * Usage:
 *   <script src="/_common/js/game-ads.js"></script>
 *   // On page load (after adsbygoogle.js):
 *   GameAds.init();
 *   // On game over (every Nth time, shows interstitial):
 *   GameAds.showInterstitial({ onComplete: () => showResult() });
 *   // Rewarded ad button:
 *   GameAds.showRewarded({
 *     onReward: () => doubleScore(),
 *     onSkip: () => showResult()
 *   });
 */
const GameAds = (() => {
  let initialized = false;
  let gameCount = 0;
  const INTERSTITIAL_INTERVAL = 3; // Show interstitial every N games

  // Ad Placement API bootstrap
  function bootstrap() {
    if (initialized) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      if (typeof window.adBreak !== 'function') {
        window.adBreak = window.adConfig = function(o) {
          window.adsbygoogle.push(o);
        };
      }
      adConfig({ preloadAdBreaks: 'on', sound: 'on' });
      initialized = true;
    } catch (e) { /* AdSense not loaded — silent */ }
  }

  return {
    init() {
      bootstrap();
    },

    /**
     * Show interstitial ad at natural break points.
     * Only triggers every INTERSTITIAL_INTERVAL games.
     * @param {Object} opts
     * @param {Function} opts.onComplete - Called after ad finishes or is not available
     */
    showInterstitial(opts = {}) {
      gameCount++;
      const onComplete = opts.onComplete || (() => {});

      if (!initialized || gameCount % INTERSTITIAL_INTERVAL !== 0) {
        onComplete();
        return;
      }

      try {
        adBreak({
          type: 'next',
          name: 'game-over',
          beforeAd: () => { /* pause audio if needed */ },
          afterAd: () => { onComplete(); },
          adBreakDone: (info) => {
            // info.breakStatus: 'viewed', 'notReady', 'timeout', 'error', 'dismissed', 'frequencyCapped'
            if (info.breakStatus !== 'viewed') onComplete();
          }
        });
      } catch (e) {
        onComplete();
      }
    },

    /**
     * Show rewarded ad (e.g., "Watch ad to revive" or "Watch ad for 2x score").
     * @param {Object} opts
     * @param {Function} opts.onReward - Called when user watches full ad
     * @param {Function} opts.onSkip - Called when ad is skipped, unavailable, or dismissed
     */
    showRewarded(opts = {}) {
      const onReward = opts.onReward || (() => {});
      const onSkip = opts.onSkip || (() => {});

      if (!initialized) {
        onSkip();
        return;
      }

      try {
        adBreak({
          type: 'reward',
          name: 'reward-continue',
          beforeReward: (showAdFn) => { showAdFn(); },
          adViewed: () => { onReward(); },
          adDismissed: () => { onSkip(); },
          adBreakDone: (info) => {
            if (info.breakStatus !== 'viewed') onSkip();
          }
        });
      } catch (e) {
        onSkip();
      }
    },

    /**
     * Check if ads are likely available (best-effort).
     * Always returns true since we can't reliably detect ad availability.
     */
    isAvailable() {
      return initialized;
    },

    /**
     * Reset game counter (e.g., on page reload).
     */
    reset() {
      gameCount = 0;
    },

    /**
     * Inject a rewarded ad button into a game-over container.
     * Auto-creates a pulsing "Watch Ad for 2x" button.
     * @param {Object} opts
     * @param {string|Element} opts.container - Selector or element to append button to
     * @param {string} opts.label - Button text (default: "Watch Ad for 2x Score")
     * @param {Function} opts.onReward - Called when user completes ad
     * @param {Function} [opts.onSkip] - Called when ad is skipped/unavailable
     * @returns {HTMLElement|null} The created button, or null if already exists
     */
    injectRewardButton(opts = {}) {
      const container = typeof opts.container === 'string'
        ? document.querySelector(opts.container)
        : opts.container;
      if (!container) return null;

      // Don't duplicate
      if (container.querySelector('.ga-reward-btn')) return null;

      const btn = document.createElement('button');
      btn.className = 'ga-reward-btn';
      btn.innerHTML = '\uD83C\uDFA5 ' + (opts.label || 'Watch Ad for 2x Score');
      btn.setAttribute('aria-label', opts.label || 'Watch Ad for 2x Score');
      Object.assign(btn.style, {
        display: 'block', width: '90%', maxWidth: '320px', margin: '10px auto',
        padding: '12px 20px', border: 'none', borderRadius: '10px',
        background: 'linear-gradient(135deg, #d97706, #f59e0b)',
        color: '#fff', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit',
        cursor: 'pointer', animation: 'ga-pulse 2s infinite',
        boxShadow: '0 4px 15px rgba(217,119,6,0.4)', minHeight: '44px'
      });

      // Add pulse animation if not exists
      if (!document.getElementById('ga-reward-style')) {
        const style = document.createElement('style');
        style.id = 'ga-reward-style';
        style.textContent = '@keyframes ga-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}';
        document.head.appendChild(style);
      }

      let claimed = false;
      btn.addEventListener('click', () => {
        if (claimed) return;
        this.showRewarded({
          onReward: () => {
            claimed = true;
            btn.style.opacity = '0.5';
            btn.style.animation = 'none';
            btn.textContent = '\u2713 ' + (opts.claimedLabel || 'Claimed!');
            btn.style.cursor = 'default';
            if (opts.onReward) opts.onReward();
          },
          onSkip: () => {
            if (opts.onSkip) opts.onSkip();
          }
        });
      });

      // Insert before retry/menu buttons if possible
      const buttons = container.querySelector('.go-buttons, .game-over-buttons, .result-buttons, .buttons, [class*="btn"]');
      if (buttons) {
        buttons.parentNode.insertBefore(btn, buttons);
      } else {
        container.appendChild(btn);
      }

      return btn;
    },

    /**
     * Remove any injected reward button from container.
     * Call on game restart to reset for next game over.
     */
    removeRewardButton(container) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;
      const btn = el.querySelector('.ga-reward-btn');
      if (btn) btn.remove();
    }
  };
})();
