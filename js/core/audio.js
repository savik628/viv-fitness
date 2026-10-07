// VIV Fitness - Audio & Haptic Utilities (100% Offline Synthesizer)
// Не требует аудиофайлов, генерирует звук через Web Audio API Oscillator

(function () {
  'use strict';

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
      console.warn('AudioContext not available:', e);
    }
  }

  function playTimerFinishSequence() {
    playTimerBeep(784, 0.15); // G5
    setTimeout(() => playTimerBeep(784, 0.15), 180);
    setTimeout(() => playTimerBeep(1046, 0.35), 360); // C6
  }

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

  
    window.playTimerBeep = playTimerBeep;
  window.playTimerFinishSequence = playTimerFinishSequence;
  window.triggerHaptic = triggerHaptic;
})();
