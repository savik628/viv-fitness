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
  function getOverlay() {
    return document.getElementById('modal-overlay');
  }

  function getContainer() {
    return document.getElementById('modal-container');
  }

  // ---------------------------------------------------------------------------
  // БЛОК 2. Методы управления показом и скрытием (Open / Close)
  // ---------------------------------------------------------------------------
  function openModal(content) {
    const container = getContainer();
    const overlay = getOverlay();
    if (container) container.innerHTML = content;
    if (overlay) overlay.classList.remove('hidden');
  }

  function closeModal() {
    // Безопасная остановка активных интервалов анимаций при закрытии окна
    if (window.state && window.state.animTimer) {
      clearInterval(window.state.animTimer);
      window.state.animTimer = null;
    }
    const overlay = getOverlay();
    if (overlay) overlay.classList.add('hidden');
  }

  // ---------------------------------------------------------------------------
  // БЛОК 3. Обработчики событий закрытия (Клик по оверлею и клавиша Escape)
  // ---------------------------------------------------------------------------
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

  // Инициализация после загрузки разметки
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalListeners);
  } else {
    initModalListeners();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4. Экспорт функций модального окна в глобальную область (window)
  // ---------------------------------------------------------------------------
  window.openModal = openModal;
  window.showModal = openModal;
  window.closeModal = closeModal;
})();
