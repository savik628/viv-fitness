// =============================================================================
// VIV Fitness - Компонент всплывающих модальных окон (Modal Manager)
// =============================================================================
// Назначение: Отображение шторки диалоговых окон, блокировка фона, закрытие
// по клику на overlay или нажатию клавиши Escape, а также очистка таймеров анимаций.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. Селекторы элементов модального контейнера в DOM
  // ---------------------------------------------------------------------------

  /**
   * Получение корневого оверлея модальных окон
   * @returns {HTMLElement|null}
   */
  function getOverlay() {
    return document.getElementById('modal-overlay');
  }

  /**
   * Получение внутреннего контейнера для динамического контента модалки
   * @returns {HTMLElement|null}
   */
  function getContainer() {
    return document.getElementById('modal-container');
  }

  // ---------------------------------------------------------------------------
  // БЛОК 2. Управление показом и анимацией открытия/закрытия
  // ---------------------------------------------------------------------------
  let _closeTimeout = null;

  /**
   * Открытие модального окна с инжекцией произвольного HTML-контента
   * @param {string} content - HTML-разметка внутреннего содержимого диалога
   */
  function openModal(content) {
    if (_closeTimeout) {
      clearTimeout(_closeTimeout);
      _closeTimeout = null;
    }
    const container = getContainer();
    const overlay = getOverlay();
    const wasAlreadyOpen = overlay && !overlay.classList.contains('hidden') && !overlay.classList.contains('closing');
    if (container) {
      container.style.animation = wasAlreadyOpen ? 'none' : '';
      container.innerHTML = content;
    }
    if (overlay) {
      overlay.classList.remove('closing');
      overlay.classList.remove('hidden');
    }
  }

  /**
   * Закрытие активного модального окна с плавной анимацией затухания
   */
  function closeModal() {
    const overlay = getOverlay();
    const container = getContainer();
    if (!overlay || overlay.classList.contains('hidden')) return;
    overlay.classList.add('closing');
    if (_closeTimeout) clearTimeout(_closeTimeout);
    _closeTimeout = setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('closing');
      if (container) {
        container.style.animation = '';
        container.innerHTML = '';
      }
      _closeTimeout = null;
    }, 180);
  }

  // ---------------------------------------------------------------------------
  // БЛОК 3. Обработчики событий закрытия (Клик по оверлею и клавиша Escape)
  // ---------------------------------------------------------------------------

  /**
   * Привязка глобальных слушателей событий (overlay click и Esc)
   */
  function initModalListeners() {
    const overlay = getOverlay();
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4. Инициализация при монтировании DOM-дерева
  // ---------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalListeners);
  } else {
    initModalListeners();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 5. Экспорт функций модального окна в глобальную область (window)
  // ---------------------------------------------------------------------------
  window.openModal = openModal;
  window.showModal = openModal;
  window.closeModal = closeModal;
})();
