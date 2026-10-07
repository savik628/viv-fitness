// VIV Fitness - Rest Timer Component
// Виджет таймера отдыха между подходами

(function () {
  'use strict';

      const restTimerState = {
    totalSeconds: 90,
    remainingSeconds: 0,
    intervalId: null,
    isPaused: false,
  };

  function formatTimerSeconds(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function startRestTimer(seconds) {
    const sec = seconds !== undefined ? seconds : (window.Storage ? window.Storage.getRestTimerSeconds() : 90);
    restTimerState.totalSeconds = sec;
    restTimerState.remainingSeconds = sec;
    restTimerState.isPaused = false;

    if (restTimerState.intervalId) {
      clearInterval(restTimerState.intervalId);
    }

    updateRestTimerWidget();

    restTimerState.intervalId = setInterval(() => {
      if (restTimerState.isPaused) return;

      restTimerState.remainingSeconds--;
      if (restTimerState.remainingSeconds <= 0) {
        clearInterval(restTimerState.intervalId);
        restTimerState.intervalId = null;
        restTimerState.remainingSeconds = 0;
        updateRestTimerWidget();
        if (window.playTimerFinishSequence) window.playTimerFinishSequence();
        if (window.triggerHaptic) window.triggerHaptic('success');
      } else {
        updateRestTimerWidget();
        if (restTimerState.remainingSeconds <= 3) {
          if (window.playTimerBeep) window.playTimerBeep(659, 0.1);
        }
      }
    }, 1000);
  }

  function stopRestTimer() {
    if (restTimerState.intervalId) {
      clearInterval(restTimerState.intervalId);
      restTimerState.intervalId = null;
    }
    restTimerState.remainingSeconds = 0;
    updateRestTimerWidget();
  }

  function togglePauseRestTimer() {
    if (!restTimerState.intervalId && restTimerState.remainingSeconds === 0) return;
    restTimerState.isPaused = !restTimerState.isPaused;
    updateRestTimerWidget();
  }

  function addRestTimerTime(secs = 30) {
    restTimerState.remainingSeconds += secs;
    restTimerState.totalSeconds = Math.max(restTimerState.totalSeconds, restTimerState.remainingSeconds);
    updateRestTimerWidget();
  }

  function getPauseIcon(isPaused) {
    return isPaused
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"></polygon></svg>`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>`;
  }

  
    function updateRestTimerWidget() {
    const root = document.getElementById('rest-timer-root');
    if (!root) return;

    if (restTimerState.remainingSeconds <= 0) {
      root.innerHTML = '';
      return;
    }

    const timeStr = formatTimerSeconds(restTimerState.remainingSeconds);
    const existingBar = root.querySelector('.rest-timer-bar');

    if (!existingBar) {
      // Первичная отрисовка: монтируем виджет один раз
      root.innerHTML = `
        <div class="rest-timer-bar">
          <div class="rest-timer-info">
            <div class="rest-timer-pulse ${restTimerState.isPaused ? 'paused' : ''}"></div>
            <div>
              <div style="font-size:11px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">Отдых</div>
              <div class="rest-timer-time">${timeStr}</div>
            </div>
          </div>
          <div class="rest-timer-controls">
            <button class="rest-timer-btn" onclick="addRestTimerTime(30)">+30с</button>
            <button id="rest-timer-pause-toggle" class="rest-timer-btn" onclick="togglePauseRestTimer()" title="${restTimerState.isPaused ? 'Продолжить' : 'Пауза'}">
              ${getPauseIcon(restTimerState.isPaused)}
            </button>
            <button class="rest-timer-btn rest-timer-stop-btn" onclick="stopRestTimer()" title="Остановить таймер">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>
              <span>Стоп</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Точечное обновление в существующем DOM без пересоздания виджета (без скачков и мерцания прозрачности)
    const timeEl = existingBar.querySelector('.rest-timer-time');
    if (timeEl && timeEl.textContent !== timeStr) {
      timeEl.textContent = timeStr;
    }

    const pulseEl = existingBar.querySelector('.rest-timer-pulse');
    if (pulseEl) {
      pulseEl.classList.toggle('paused', restTimerState.isPaused);
    }

    const pauseBtn = existingBar.querySelector('#rest-timer-pause-toggle');
    if (pauseBtn) {
      const currentTitle = restTimerState.isPaused ? 'Продолжить' : 'Пауза';
      if (pauseBtn.title !== currentTitle) {
        pauseBtn.title = currentTitle;
        pauseBtn.innerHTML = getPauseIcon(restTimerState.isPaused);
      }
    }
  }

  // Экспорт в глобальную область видимости
  
    window.restTimerState = restTimerState;
  window.formatTimerSeconds = formatTimerSeconds;
  window.startRestTimer = startRestTimer;
  window.stopRestTimer = stopRestTimer;
  window.togglePauseRestTimer = togglePauseRestTimer;
  window.addRestTimerTime = addRestTimerTime;
  window.updateRestTimerWidget = updateRestTimerWidget;
})();
