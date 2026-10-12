// =============================================================================
// VIV Fitness - Главный контроллер приложения и маршрутизатор экранов
// =============================================================================
// Назначение: Управление глобальным состоянием (state), переключение табов хотбара,
// синхронизация заголовков и управление жизненным циклом PWA.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. Интеграция с Telegram WebApp SDK
  // ---------------------------------------------------------------------------
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.colorScheme === 'dark') {
      document.body.classList.add('telegram-theme');
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 2. Глобальное состояние приложения (Application State Store)
  // ---------------------------------------------------------------------------
  const todayLocal = window.getLocalDateStr ? window.getLocalDateStr() : new Date().toISOString().substring(0, 10);

  const state = {
    currentTab: 'work', // Стартовый активный экран: 'work' (Тренировки)
    habits: {
      selectedDate: todayLocal
    },
    work: {
      routines: [],
      activeWorkout: window.Storage ? window.Storage.getActiveDraft() : null
    },
    stats: {
      activeSubTab: 'progress', // 'progress' | 'calendar'
      routines: [],
      selectedRoutine: null,
      exercises: [],
      selectedExercise: null,
      chartPoints: [],
      calYear: new Date().getFullYear(),
      calMonth: new Date().getMonth()
    },
    profile: window.Storage ? window.Storage.getProfile() : {},
  };

  window.state = state;

  // ---------------------------------------------------------------------------
  // БЛОК 3. Управление навигацией и шапкой экрана (Header & Navigation)
  // ---------------------------------------------------------------------------
  function setHeader(title, showBack = false, actionsHtml = '') {
    const screenTitle = document.getElementById('screen-title');
    const backBtn = document.getElementById('back-btn');
    const headerActions = document.getElementById('header-actions');

    if (screenTitle) screenTitle.textContent = title;
    if (backBtn) backBtn.classList.toggle('hidden', !showBack);
    if (headerActions) headerActions.innerHTML = actionsHtml;
  }

  function switchTab(tab) {
    // Защита от случайной потери несохраненной тренировки при уходе на другую вкладку
    if (tab !== 'work' && state.work.activeWorkout) {
      if (!confirm('Прервать текущую активную тренировку?')) return;
      state.work.activeWorkout = null;
      if (window.Storage) window.Storage.clearActiveDraft();
      if (window.stopRestTimer) window.stopRestTimer();
    }

    state.currentTab = tab;
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    render();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4. Центральный диспетчер рендера экранов (View Router)
  // ---------------------------------------------------------------------------
  function render() {
    switch (state.currentTab) {
      case 'habits':
        if (window.renderHabits) window.renderHabits();
        break;
      case 'work':
        if (window.renderWork) window.renderWork();
        break;
      case 'stats':
        if (window.renderStats) window.renderStats();
        break;
      case 'profile':
        if (window.renderProfile) window.renderProfile();
        break;
      case 'shop':
        if (window.renderShop) window.renderShop();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 5. Инициализация слушателей событий и регистрация Service Worker
  // ---------------------------------------------------------------------------
  function initApp() {
    // Слушатели переключения табов нижней панели (5 вкладок)
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Обработчик системной кнопки "Назад" в шапке
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (state.currentTab === 'work' && state.work.activeWorkout) {
          if (confirm('Прервать текущую тренировку без сохранения?')) {
            state.work.activeWorkout = null;
            if (window.Storage) window.Storage.clearActiveDraft();
            if (window.stopRestTimer) window.stopRestTimer();
            render();
          }
        }
      });
    }

    // Регистрация Service Worker для PWA и полного автономного режима
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('VIV ServiceWorker успешно зарегистрирован:', reg.scope))
          .catch(err => console.warn('Ошибка регистрации ServiceWorker:', err));
      });
    }

    // Первичный рендер активного экрана
    render();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 6. Экспорт публичных функций в глобальную область видимости (window)
  // ---------------------------------------------------------------------------
  window.setHeader = setHeader;
  window.switchTab = switchTab;
  window.render = render;

  // Безопасный запуск после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
