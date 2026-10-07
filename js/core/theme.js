// VIV Fitness - Theme Manager (Core)
// Поддержка тем: 'dark' (тёмная по умолчанию), 'light' (светлая премиум), 'auto' (системная)

(function () {
  'use strict';

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

    applyTheme(theme) {
      const effective = this.getEffectiveTheme(theme);
      document.documentElement.setAttribute('data-theme', effective);

      // Обновляем метатег theme-color для браузеров и PWA
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.name = 'theme-color';
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute('content', effective === 'dark' ? '#000000' : '#f8fafc');

      // Обновляем подсветку кнопок выбора темы в профиле, если экран открыт
      const buttons = document.querySelectorAll('[data-theme-btn]');
      buttons.forEach(btn => {
        const val = btn.getAttribute('data-theme-btn');
        if (val === theme) {
          btn.classList.add('theme-active');
        } else {
          btn.classList.remove('theme-active');
        }
      });

      // Оповещаем другие модули (например, графики прогресса для перерисовки цветов)
      window.dispatchEvent(new CustomEvent('viv-theme-changed', { detail: { theme, effective } }));
    },

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

    init() {
      const saved = this.getTheme();
      this.currentTheme = saved;
      this.applyTheme(saved);

      // Слушатель системной смены темы OS
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

  // Экспорт в глобальную область видимости
  
    window.ThemeManager = ThemeManager;
  window.setAppTheme = (t) => ThemeManager.setTheme(t);

  // Инициализируем тему сразу при загрузке скрипта, чтобы избежать моргания
  ThemeManager.init();
})();
