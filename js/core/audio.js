// =============================================================================
// VIV Fitness - Звуковой синтезатор и тактильный отклик (Audio & Haptic)
// =============================================================================
// Назначение: Офлайн-генерация звуковых сигналов через Web Audio API Oscillator
// (без внешних аудиофайлов) и виброотклик через Telegram WebApp HapticFeedback / navigator.vibrate.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. Синтезатор звукового сигнала (Web Audio Oscillator Beep)
  // ---------------------------------------------------------------------------
  function playTimerBeep(freq = 880, duration = 0.18) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('AudioContext недоступен:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 2. Мелодия завершения таймера отдыха (Final Gong Sequence)
  // ---------------------------------------------------------------------------
  function playTimerFinishSequence() {
    playTimerBeep(784, 0.15); // Нота G5
    setTimeout(() => playTimerBeep(784, 0.15), 180);
    setTimeout(() => playTimerBeep(1046, 0.35), 360); // Нота C6 (финал)
  }

  // ---------------------------------------------------------------------------
  // БЛОК 3. Тактильный виброотклик (Telegram Haptic / Vibration API)
  // ---------------------------------------------------------------------------
  function triggerHaptic(type = 'impact') {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        if (type === 'success') {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        } else {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
      } else if (navigator.vibrate) {
        if (type === 'success') {
          navigator.vibrate([150, 80, 150]);
        } else {
          navigator.vibrate(60);
        }
      }
    } catch (_) {}
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4. Экспорт звуковых и вибро-функций в глобальную область (window)
  // ---------------------------------------------------------------------------
  window.playTimerBeep = playTimerBeep;
  window.playTimerFinishSequence = playTimerFinishSequence;
  window.triggerHaptic = triggerHaptic;
})();
