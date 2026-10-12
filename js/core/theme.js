// =============================================================================
// VIV Fitness - Модуль управления темами оформления (Theme Manager)
// =============================================================================
// Назначение: Переключение тем ('dark', 'light', 'auto'), синхронизация
// атрибута data-theme на <html>, обновление метатега theme-color и реакция
// на системные изменения цветовой схемы устройства (prefers-color-scheme).
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. Объект ThemeManager с логикой определения эффективной темы
  // ---------------------------------------------------------------------------
  const ThemeManager = {
    currentTheme: 'dark',

    getEffectiveTheme(pref) {
      if (pref === 'auto') {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      return pref === 'light' ? 'light' : 'dark';
    },

    // -------------------------------------------------------------------------
    // БЛОК 2. Применение темы к DOM и оповещение компонентов (Apply Theme)
    // -------------------------------------------------------------------------
    applyTheme(theme) {
      const effective = this.getEffectiveTheme(theme);
      document.documentElement.setAttribute('data-theme', effective);

      // Обновление цвета статус-бара iOS и адресной строки браузера
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.name = 'theme-color';
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute('content', effective === 'dark' ? '#000000' : '#f8fafc');

      // Подсветка активной кнопки выбора темы в настройках профиля
      const buttons = document.querySelectorAll('[data-theme-btn]');
      buttons.forEach(btn => {
        const val = btn.getAttribute('data-theme-btn');
        btn.classList.toggle('theme-active', val === theme);
      });

      // Событие для Canvas-графиков и других слушателей
      window.dispatchEvent(new CustomEvent('viv-theme-changed', { detail: { theme, effective } }));
    },

    // -------------------------------------------------------------------------
    // БЛОК 3. Чтение и сохранение пользовательского выбора (Persistence)
    // -------------------------------------------------------------------------
    setTheme(newTheme) {
      if (!['dark', 'light', 'auto'].includes(newTheme)) newTheme = 'dark';
      this.currentTheme = newTheme;
      if (window.Storage && window.Storage.setTheme) {
        window.Storage.setTheme(newTheme);
      }
      this.applyTheme(newTheme);
    },

    getTheme() {
      if (window.Storage && window.Storage.getTheme) {
        return window.Storage.getTheme();
      }
      return this.currentTheme || 'dark';
    },

    // -------------------------------------------------------------------------
    // БЛОК 4. Инициализация и системный слушатель смены темы ОС (Init & Media)
    // -------------------------------------------------------------------------
    init() {
      const saved = this.getTheme();
      this.currentTheme = saved;
      this.applyTheme(saved);

      if (window.matchMedia) {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = () => {
          if (this.currentTheme === 'auto') {
            this.applyTheme('auto');
          }
        };
        if (media.addEventListener) {
          media.addEventListener('change', listener);
        } else if (media.addListener) {
          media.addListener(listener);
        }
      }
    }
  };

  // ---------------------------------------------------------------------------
  // БЛОК 5. Экспорт функций темы в глобальную область (window)
  // ---------------------------------------------------------------------------
  window.ThemeManager = ThemeManager;
  window.setAppTheme = (t) => ThemeManager.setTheme(t);

  // Мгновенная инициализация без моргания темы при загрузке
  ThemeManager.init();
})();
