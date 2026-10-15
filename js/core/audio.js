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
  let _sharedAudioCtx = null;

  /**
   * Ленивая инициализация и возобновление общего AudioContext
   * @returns {AudioContext|null}
   */
  function getAudioContext() {
    try {
      if (!_sharedAudioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          _sharedAudioCtx = new AudioCtx();
        }
      }
      if (_sharedAudioCtx && _sharedAudioCtx.state === 'suspended') {
        _sharedAudioCtx.resume().catch(() => {});
      }
      return _sharedAudioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Воспроизведение синусоидального звукового бипа заданной частоты и длительности
   * @param {number} [freq=880] - Частота сигнала в Гц
   * @param {number} [duration=0.18] - Длительность звучания в секундах
   */
  function playTimerBeep(freq = 880, duration = 0.18) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
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

  /**
   * Тройной аккорд завершения отдыха: G5 -> G5 -> C6
   */
  function playTimerFinishSequence() {
    playTimerBeep(784, 0.15); // Нота G5
    setTimeout(() => playTimerBeep(784, 0.15), 180);
    setTimeout(() => playTimerBeep(1046, 0.35), 360); // Нота C6 (финал)
  }

  // ---------------------------------------------------------------------------
  // БЛОК 3. Тактильный виброотклик (Telegram Haptic / Vibration API)
  // ---------------------------------------------------------------------------

  /**
   * Запуск тактильной отдачи устройства с поддержкой Telegram WebApp и W3C Vibration API
   * @param {'impact'|'light'|'medium'|'heavy'|'success'} [type='impact'] - Характер вибрации
   */
  function triggerHaptic(type = 'impact') {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        if (type === 'success') {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        } else if (type === 'light') {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        } else {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
      } else if (navigator.vibrate) {
        if (type === 'success') {
          navigator.vibrate([150, 80, 150]);
        } else if (type === 'light') {
          navigator.vibrate(10);
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
