// VIV Fitness - Client Application Controller & Router
// Модуль управления состоянием, навигацией и жизненным циклом PWA

(function () {
  'use strict';

  // Telegram WebApp Setup
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.colorScheme === 'dark') document.body.classList.add('telegram-theme');
  }

  // App State
  const state = {
    currentTab: 'work', // Стартовый экран: Тренировки
    work: {
      routines: [],
      activeWorkout: null
    },
    stats: {
      activeSubTab: 'progress', // 'progress', 'calendar', 'habits'
      selectedHabitDate: new Date().toISOString().substring(0, 10),
      routines: [],
      selectedRoutine: null,
      exercises: [],
      selectedExercise: null,
      chartPoints: [],
      historyRecords: [],
      selectedMetric: 'maxWeight',
      calYear: new Date().getFullYear(),
      calMonth: new Date().getMonth()
    },
    profile: window.Storage ? window.Storage.getProfile() : {},
    animTimer: null,
  };

  window.state = state;

  // Navigation Helpers
  function setHeader(title, showBack = false, actionsHtml = '') {
    const screenTitle = document.getElementById('screen-title');
    const backBtn = document.getElementById('back-btn');
    const headerActions = document.getElementById('header-actions');

    if (screenTitle) screenTitle.textContent = title;
    if (backBtn) backBtn.classList.toggle('hidden', !showBack);
    if (headerActions) headerActions.innerHTML = actionsHtml;
  }

  function switchTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });

    if (tab !== 'work' && state.work.activeWorkout) {
      if (!confirm('Прервать текущую активную тренировку?')) return;
      state.work.activeWorkout = null;
      if (window.stopRestTimer) window.stopRestTimer();
    }
    render();
  }

  // Main Render Router
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

  function initApp() {
    // Nav Items Listeners
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Back Button Handler
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (state.currentTab === 'work' && state.work.activeWorkout) {
          if (confirm('Прервать текущую тренировку без сохранения?')) {
            state.work.activeWorkout = null;
            if (window.stopRestTimer) window.stopRestTimer();
            render();
          }
        }
      });
    }

    // Register Service Worker for PWA & 100% Offline Support
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('VIV ServiceWorker registered successfully:', reg.scope))
          .catch(err => console.warn('VIV ServiceWorker registration failed:', err));
      });
    }

    render();
  }

  // Exports
  window.setHeader = setHeader;
  window.switchTab = switchTab;
  window.render = render;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
