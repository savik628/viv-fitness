// =============================================================================
// VIV Fitness - Компонент таймера отдыха между подходами (Rest Timer)
// =============================================================================
// Назначение: Плавающий неблокирующий виджет таймера в нижней части экрана.
// Обеспечивает обратный отсчет, паузу, добавление времени (+30с), звуковые сигналы
// и тактильный отклик при окончании времени отдыха.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. Состояние активного таймера отдыха (Timer State)
  // ---------------------------------------------------------------------------
  const restTimerState = {
    totalSeconds: 90,
    remainingSeconds: 0,
    endTime: 0,
    intervalId: null,
    isPaused: false,
  };

  // ---------------------------------------------------------------------------
  // БЛОК 2. Форматирование времени (Секунды -> MM:SS)
  // ---------------------------------------------------------------------------
  function formatTimerSeconds(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // ---------------------------------------------------------------------------
  // БЛОК 3. Управление обратным отсчетом (Start / Stop / Pause / Add Time)
  // ---------------------------------------------------------------------------
  function startRestTimer(seconds) {
    const sec = seconds !== undefined ? seconds : (window.Storage ? window.Storage.getRestTimerSeconds() : 90);
    restTimerState.totalSeconds = sec;
    restTimerState.remainingSeconds = sec;
    restTimerState.endTime = Date.now() + sec * 1000;
    restTimerState.isPaused = false;

    if (restTimerState.intervalId) {
      clearInterval(restTimerState.intervalId);
    }

    updateRestTimerWidget();

    restTimerState.intervalId = setInterval(() => {
      if (restTimerState.isPaused) return;

      const now = Date.now();
      const left = Math.max(0, Math.ceil((restTimerState.endTime - now) / 1000));
      restTimerState.remainingSeconds = left;

      if (left <= 0) {
        clearInterval(restTimerState.intervalId);
        restTimerState.intervalId = null;
        restTimerState.remainingSeconds = 0;
        updateRestTimerWidget();
        if (window.playTimerFinishSequence) window.playTimerFinishSequence();
        if (window.triggerHaptic) window.triggerHaptic('success');
      } else {
        updateRestTimerWidget();
        if (left <= 3) {
          if (window.playTimerBeep) window.playTimerBeep(659, 0.1);
        }
      }
    }, 500);
  }

  function stopRestTimer() {
    if (restTimerState.intervalId) {
      clearInterval(restTimerState.intervalId);
      restTimerState.intervalId = null;
    }
    restTimerState.remainingSeconds = 0;
    restTimerState.endTime = 0;
    updateRestTimerWidget();
  }

  function togglePauseRestTimer() {
    if (!restTimerState.intervalId && restTimerState.remainingSeconds === 0) return;
    restTimerState.isPaused = !restTimerState.isPaused;
    if (!restTimerState.isPaused) {
      restTimerState.endTime = Date.now() + restTimerState.remainingSeconds * 1000;
    }
    updateRestTimerWidget();
  }

  function addRestTimerTime(secs = 30) {
    restTimerState.remainingSeconds += secs;
    restTimerState.endTime += secs * 1000;
    restTimerState.totalSeconds = Math.max(restTimerState.totalSeconds, restTimerState.remainingSeconds);
    updateRestTimerWidget();
  }

  function getPauseIcon(isPaused) {
    return isPaused
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"></polygon></svg>`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>`;
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4. Отрисовка и точечное обновление DOM виджета (Widget Renderer)
  // ---------------------------------------------------------------------------
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
      // Первичный монтаж виджета в DOM
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

    // Точечное обновление без мерцания и скачков прозрачности
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

  // ---------------------------------------------------------------------------
  // БЛОК 5. Синхронизация при возвращении приложения из фона (Visibility Sync)
  // ---------------------------------------------------------------------------
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && restTimerState.intervalId && !restTimerState.isPaused) {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((restTimerState.endTime - now) / 1000));
      restTimerState.remainingSeconds = left;
      updateRestTimerWidget();
      if (left <= 0) {
        clearInterval(restTimerState.intervalId);
        restTimerState.intervalId = null;
        if (window.playTimerFinishSequence) window.playTimerFinishSequence();
        if (window.triggerHaptic) window.triggerHaptic('success');
      }
    }
  });

  // ---------------------------------------------------------------------------
  // БЛОК 6. Экспорт функций таймера в глобальную область (window)
  // ---------------------------------------------------------------------------
  window.restTimerState = restTimerState;
  window.formatTimerSeconds = formatTimerSeconds;
  window.startRestTimer = startRestTimer;
  window.stopRestTimer = stopRestTimer;
  window.togglePauseRestTimer = togglePauseRestTimer;
  window.addRestTimerTime = addRestTimerTime;
  window.updateRestTimerWidget = updateRestTimerWidget;
})();
