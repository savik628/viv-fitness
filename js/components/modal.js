// VIV Fitness - Modal Dialog Component
// Централизованное управление всплывающими окнами (модалками)

(function () {
  'use strict';

      function getOverlay() {
    return document.getElementById('modal-overlay');
  }

  function getContainer() {
    return document.getElementById('modal-container');
  }

  function openModal(content) {
    const container = getContainer();
    const overlay = getOverlay();
    if (container) container.innerHTML = content;
    if (overlay) overlay.classList.remove('hidden');
  }

  function closeModal() {
    if (window.state && window.state.animTimer) {
      clearInterval(window.state.animTimer);
      window.state.animTimer = null;
    }
    const overlay = getOverlay();
    if (overlay) overlay.classList.add('hidden');
  }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalListeners);
  } else {
    initModalListeners();
  }

  
    window.openModal = openModal;
  window.closeModal = closeModal;
})();
