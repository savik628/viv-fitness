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
  // БЛОК 2. Централизованный модуль управления логотипом VIV (App Logo)
  // ---------------------------------------------------------------------------
  window.AppLogo = {
    mode: 'icon', // Везде используется официальный логотип (иконка приложения icon.svg)
    iconSrc: 'icon.svg',

    /**
     * Рендеринг HTML-разметки логотипа VIV
     * @param {Object} [options] - Параметры рендера (className, style, height, small)
     * @returns {string} HTML-тег <img> с логотипом
     */
    render(options = {}) {
      const cls = options.className || '';
      const style = options.style || '';
      const height = options.small ? '14px' : (options.height || '24px');
      return `<img src="${this.iconSrc}" alt="VIV" class="app-logo-badge ${cls}" style="display:inline-block; vertical-align:middle; height:${height}; width:auto; border:none; outline:none; background:transparent; ${style}">`;
    },

    /**
     * Получение текстового названия бренда
     * @returns {string} 'VIV'
     */
    getText() {
      return 'VIV';
    },

    setMode(mode) {
      this.mode = 'icon';
    },

    toggleMode() {},

    /**
     * Синхронизация всех мест вывода логотипа в активном DOM
     */
    syncAll() {
      document.querySelectorAll('.viv-logo-target').forEach(el => {
        const isSmall = el.dataset.logoSmall === 'true';
        el.innerHTML = this.render({ small: isSmall });
      });
      if (window.renderStats && window.state?.currentTab === 'stats') {
        window.renderStats();
      }
      if (window.renderProfile && window.state?.currentTab === 'profile') {
        window.renderProfile();
      }
      if (window.renderShop && window.state?.currentTab === 'shop') {
        window.renderShop();
      }
    }
  };

  // ---------------------------------------------------------------------------
  // БЛОК 3. Глобальное состояние приложения (Application State Store)
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
      activeSubTab: 'progress', // 'progress' | 'calendar' | 'report'
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
  // БЛОК 4. Управление заголовком и кнопками верхней панели (Header Component)
  // ---------------------------------------------------------------------------

  /**
   * Обновление заголовка экрана, видимости кнопки "Назад" и кнопок действий
   * @param {string} title - Текст заголовка экрана
   * @param {boolean} [showBack=false] - Показывать ли кнопку "Назад"
   * @param {string} [actionsHtml=''] - Дополнительный HTML для правой части шапки
   */
  function setHeader(title, showBack = false, actionsHtml = '') {
    const screenTitle = document.getElementById('screen-title');
    const backBtn = document.getElementById('back-btn');
    const headerActions = document.getElementById('header-actions');

    if (screenTitle) screenTitle.textContent = title;
    if (backBtn) backBtn.classList.toggle('hidden', !showBack);
    if (headerActions) headerActions.innerHTML = actionsHtml;
  }

  // ---------------------------------------------------------------------------
  // БЛОК 5. Переключение основных экранов хотбара (Tab Navigation)
  // ---------------------------------------------------------------------------

  /**
   * Смена активной вкладки с подтверждением прерывания незавершенной тренировки
   * @param {'habits'|'work'|'stats'|'profile'|'shop'} tab - Идентификатор вкладки
   */
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
  // БЛОК 6. Центральный маршрутизатор экранов (View Router)
  // ---------------------------------------------------------------------------

  /**
   * Вызов соответствующей функции рендера для текущей активной вкладки
   */
  function render() {
    switch (state.currentTab) {
      case 'habits':
        if (window.renderHabits) window.renderHabits();
        break;
      case 'work':
        if (window.renderWork) window.renderWork();
        break;
      case 'stats':
        if (typeof window.renderStats === 'function') {
          window.renderStats();
        } else {
          console.warn('window.renderStats еще не инициализирован');
        }
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
  // БЛОК 7. Инициализация приложения, событий и Service Worker (PWA Lifecycle)
  // ---------------------------------------------------------------------------

  /**
   * Первичный монтаж слушателей кнопок навигации, Service Worker и старт
   */
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
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            reg.update();
            console.log('VIV ServiceWorker успешно зарегистрирован:', reg.scope);
          })
          .catch(err => console.warn('Ошибка регистрации ServiceWorker:', err));
      });
    }

    // Синхронизация брендинга VIV и первичный рендер активного экрана
    if (window.AppLogo && window.AppLogo.syncAll) {
      window.AppLogo.syncAll();
    }
    render();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 8. Безопасный запуск приложения при готовности DOM (Bootstrap)
  // ---------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 9. Экспорт публичных функций в глобальную область видимости (window)
  // ---------------------------------------------------------------------------
  window.setHeader = setHeader;
  window.switchTab = switchTab;
  window.render = render;
})();
