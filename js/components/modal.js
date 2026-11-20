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
  /**
   * Элегантный диалог подтверждения (замена нативного confirm в стиле VIV)
   */
  function showConfirmModal({ title = 'Подтверждение', message = 'Вы уверены?', confirmText = 'Подтвердить', cancelText = 'Отмена', isDanger = true, onConfirm, onCancel }) {
    const escFn = window.esc || window.escapeHtml || (s => s);
    openModal(`
      <div style="padding:4px 0; text-align:center;">
        <div style="font-size:18px; font-weight:800; color:var(--text-primary); margin-bottom:8px;">${escFn(title)}</div>
        <div style="font-size:13.5px; color:var(--text-secondary); line-height:1.45; margin-bottom:18px;">${escFn(message)}</div>
        <div style="display:flex; gap:10px;">
          <button id="modal-cancel-btn" class="btn btn-secondary" style="flex:1;">${escFn(cancelText)}</button>
          <button id="modal-confirm-btn" class="btn ${isDanger ? 'btn-outline' : 'btn-green'}" style="flex:1; font-weight:700; ${isDanger ? 'color:#ef4444; border-color:rgba(239,68,68,0.4);' : ''}">${escFn(confirmText)}</button>
        </div>
      </div>
    `);

    setTimeout(() => {
      const cBtn = document.getElementById('modal-cancel-btn');
      const okBtn = document.getElementById('modal-confirm-btn');
      if (cBtn) {
        cBtn.onclick = () => {
          closeModal();
          if (typeof onCancel === 'function') onCancel();
        };
      }
      if (okBtn) {
        okBtn.onclick = () => {
          closeModal();
          if (typeof onConfirm === 'function') onConfirm();
        };
      }
    }, 10);
  }

  /**
   * Элегантный диалог уведомления (замена нативного alert в стиле VIV)
   */
  function showAlertModal({ title = 'Внимание', message = '', buttonText = 'Понятно', onConfirm }) {
    const escFn = window.esc || window.escapeHtml || (s => s);
    openModal(`
      <div style="padding:4px 0; text-align:center;">
        <div style="font-size:18px; font-weight:800; color:var(--text-primary); margin-bottom:8px;">${escFn(title)}</div>
        <div style="font-size:13.5px; color:var(--text-secondary); line-height:1.45; margin-bottom:18px;">${escFn(message)}</div>
        <button id="modal-alert-ok-btn" class="btn btn-secondary" style="width:100%; font-weight:700;">${escFn(buttonText)}</button>
      </div>
    `);

    setTimeout(() => {
      const okBtn = document.getElementById('modal-alert-ok-btn');
      if (okBtn) {
        okBtn.onclick = () => {
          closeModal();
          if (typeof onConfirm === 'function') onConfirm();
        };
      }
    }, 10);
  }

  window.openModal = openModal;
  window.showModal = openModal;
  window.closeModal = closeModal;
  window.showConfirmModal = showConfirmModal;
  window.showAlertModal = showAlertModal;
})();
