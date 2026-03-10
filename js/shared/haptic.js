/**
 * Haptic Feedback Utility
 * Provides vibration feedback on mobile devices.
 * Falls back silently on unsupported devices.
 *
 * Usage:
 *   <script src="/_common/js/haptic.js"></script>
 *   Haptic.light();   // subtle tap
 *   Haptic.medium();  // impact
 *   Haptic.heavy();   // game over, explosion
 *   Haptic.success(); // win, achievement
 */
const Haptic = {
  _ok: typeof navigator !== 'undefined' && 'vibrate' in navigator,
  light()   { if (this._ok) try { navigator.vibrate(12); } catch {} },
  medium()  { if (this._ok) try { navigator.vibrate(35); } catch {} },
  heavy()   { if (this._ok) try { navigator.vibrate([30, 15, 50]); } catch {} },
  success() { if (this._ok) try { navigator.vibrate([15, 30, 15, 30, 15]); } catch {} }
};
