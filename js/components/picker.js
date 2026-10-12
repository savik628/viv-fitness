// =============================================================================
// VIV Fitness - Компонент барабанного выбора чисел (Wheel / Drum Number Picker)
// =============================================================================
// Назначение: Интерактивное мобильное колесо прокрутки (drum picker) с поддержкой
// scroll-snap, быстрых кнопок изменения шага (+/-), тактильного виброотклика
// и возможностью прямого ввода числа с клавиатуры при нажатии на центральное значение.
// =============================================================================

(function () {
  'use strict';

  let _pickerOverlay = null;
  let _pickerContainer = null;
  let _activeOptions = null;
  let _currentValue = 0;
  let _itemHeight = 44;
  let _isManualEditing = false;
  let _scrollTimeout = null;
  let _lastScrolledIndex = -1;

  function getOverlay() {
    if (!_pickerOverlay) {
      _pickerOverlay = document.getElementById('picker-overlay');
    }
    return _pickerOverlay;
  }

  function getContainer() {
    if (!_pickerContainer) {
      _pickerContainer = document.getElementById('picker-container');
    }
    return _pickerContainer;
  }

  function clamp(val, min, max) {
    let num = Number(val);
    if (isNaN(num)) num = min;
    return Math.max(min, Math.min(max, num));
  }

  function formatValue(val, step) {
    const isInt = step >= 1 && Number.isInteger(step);
    if (isInt) return String(Math.round(val));
    return Number(val.toFixed(1)).toString();
  }

  // ---------------------------------------------------------------------------
  // Открытие барабанного пикера
  // ---------------------------------------------------------------------------
  function openNumberPicker(options) {
    _activeOptions = Object.assign({
      title: 'Выберите число',
      value: 0,
      min: 0,
      max: 300,
      step: 1,
      unit: '',
      deltas: [-10, -2.5, -1, 1, 2.5, 10],
      onConfirm: null,
      onCancel: null
    }, options);

    const step = _activeOptions.step;
    const min = _activeOptions.min;
    const max = _activeOptions.max;

    _currentValue = clamp(parseFloat(_activeOptions.value) || 0, min, max);
    _isManualEditing = false;
    _lastScrolledIndex = -1;

    // Генерируем массив значений для барабана
    const items = [];
    const precisionMultiplier = step < 1 ? 10 : 1;
    const minInt = Math.round(min * precisionMultiplier);
    const maxInt = Math.round(max * precisionMultiplier);
    const stepInt = Math.round(step * precisionMultiplier);

    for (let i = minInt; i <= maxInt; i += stepInt) {
      items.push(i / precisionMultiplier);
    }
    _activeOptions._items = items;

    // Фильтруем быстрые дельты под шаг
    let deltas = _activeOptions.deltas;
    if (step >= 1) {
      deltas = deltas.filter(d => Number.isInteger(d) && Math.abs(d) >= step);
    }

    const overlay = getOverlay();
    const container = getContainer();
    if (!overlay || !container) {
      console.warn('Picker overlay elements not found');
      return;
    }

    container.innerHTML = `
      <div class="wheel-picker-header">
        <button type="button" class="wheel-picker-btn-text" id="picker-cancel-btn">Отмена</button>
        <div class="wheel-picker-title">${window.escapeHtml ? window.escapeHtml(_activeOptions.title) : _activeOptions.title}</div>
        <button type="button" class="wheel-picker-btn-done" id="picker-confirm-btn">Готово</button>
      </div>

      <div class="wheel-picker-display-card" id="picker-display-card" title="Нажмите, чтобы ввести число вручную">
        <div class="wheel-picker-display-val" id="picker-display-val">
          <span class="wheel-picker-num" id="picker-display-num">${formatValue(_currentValue, step)}</span>
          ${_activeOptions.unit ? `<span class="wheel-picker-unit">${window.escapeHtml ? window.escapeHtml(_activeOptions.unit) : _activeOptions.unit}</span>` : ''}
          <svg class="wheel-picker-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </div>
        <div class="wheel-picker-manual-box hidden" id="picker-manual-box">
          <input type="number" 
                 id="picker-manual-input" 
                 class="wheel-picker-manual-input" 
                 step="${step}" 
                 min="${min}" 
                 max="${max}" 
                 value="${_currentValue}">
          ${_activeOptions.unit ? `<span class="wheel-picker-manual-unit">${window.escapeHtml ? window.escapeHtml(_activeOptions.unit) : _activeOptions.unit}</span>` : ''}
        </div>
        <div class="wheel-picker-hint" id="picker-hint">Нажмите на значение для ручного ввода с клавиатуры</div>
      </div>

      ${deltas && deltas.length ? `
        <div class="wheel-picker-deltas-row">
          ${deltas.map(d => `
            <button type="button" class="wheel-picker-delta-chip" data-delta="${d}">
              ${d > 0 ? `+${d}` : d}
            </button>
          `).join('')}
        </div>
      ` : ''}

      <div class="wheel-picker-wheel-wrap">
        <div class="wheel-picker-lens"></div>
        <div class="wheel-picker-drum" id="picker-drum">
          <div class="wheel-picker-spacer"></div>
          ${items.map((val, idx) => `
            <div class="wheel-picker-item" data-idx="${idx}" data-val="${val}">
              ${formatValue(val, step)}
            </div>
          `).join('')}
          <div class="wheel-picker-spacer"></div>
        </div>
      </div>
    `;

    // Показываем оверлей
    overlay.classList.remove('hidden');
    overlay.classList.remove('closing');

    // Навешиваем слушатели
    bindPickerEvents();

    // Прокручиваем к выбранному значению
    requestAnimationFrame(() => {
      scrollToValue(_currentValue, false);
    });
  }

  // ---------------------------------------------------------------------------
  // Привязка обработчиков событий
  // ---------------------------------------------------------------------------
  function bindPickerEvents() {
    const overlay = getOverlay();
    const container = getContainer();
    const drum = document.getElementById('picker-drum');
    const cancelBtn = document.getElementById('picker-cancel-btn');
    const confirmBtn = document.getElementById('picker-confirm-btn');
    const displayCard = document.getElementById('picker-display-card');
    const manualInput = document.getElementById('picker-manual-input');
    const manualBox = document.getElementById('picker-manual-box');
    const displayVal = document.getElementById('picker-display-val');
    const hintEl = document.getElementById('picker-hint');

    // Кнопка Отмена
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        if (_activeOptions?.onCancel) _activeOptions.onCancel();
        closeNumberPicker();
      };
    }

    // Кнопка Готово
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        applyManualInputIfActive();
        if (_activeOptions?.onConfirm) {
          _activeOptions.onConfirm(_currentValue);
        }
        if (window.triggerHaptic) window.triggerHaptic('success');
        closeNumberPicker();
      };
    }

    // Закрытие по клику на фон оверлея
    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          applyManualInputIfActive();
          if (_activeOptions?.onConfirm) {
            _activeOptions.onConfirm(_currentValue);
          }
          closeNumberPicker();
        }
      };
    }

    // Переключение в режим ручного ввода по тапу на плашку
    if (displayCard) {
      displayCard.onclick = (e) => {
        if (e.target === manualInput) return;
        switchToManualInput();
      };
    }

    function switchToManualInput() {
      if (_isManualEditing) return;
      _isManualEditing = true;
      if (displayVal) displayVal.classList.add('hidden');
      if (manualBox) manualBox.classList.remove('hidden');
      if (hintEl) hintEl.textContent = 'Введите число и нажмите "Готово"';
      if (manualInput) {
        manualInput.value = _currentValue;
        manualInput.focus();
        manualInput.select();
      }
    }

    function applyManualInputIfActive() {
      if (_isManualEditing && manualInput) {
        const parsed = parseFloat(manualInput.value);
        if (!isNaN(parsed)) {
          _currentValue = clamp(parsed, _activeOptions.min, _activeOptions.max);
          updateDisplayNum(_currentValue);
          scrollToValue(_currentValue, false);
        }
        _isManualEditing = false;
        if (displayVal) displayVal.classList.remove('hidden');
        if (manualBox) manualBox.classList.add('hidden');
        if (hintEl) hintEl.textContent = 'Нажмите на значение для ручного ввода с клавиатуры';
      }
    }

    if (manualInput) {
      manualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyManualInputIfActive();
          if (confirmBtn) confirmBtn.click();
        }
      });
      manualInput.addEventListener('blur', () => {
        applyManualInputIfActive();
      });
    }

    // Дельта-кнопки
    container.querySelectorAll('.wheel-picker-delta-chip').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        applyManualInputIfActive();
        const delta = parseFloat(btn.getAttribute('data-delta')) || 0;
        stepValue(delta);
      };
    });

    // Клик по элементам барабана
    if (drum) {
      drum.addEventListener('click', (e) => {
        const item = e.target.closest('.wheel-picker-item');
        if (!item) return;
        const val = parseFloat(item.getAttribute('data-val'));
        if (!isNaN(val)) {
          applyManualInputIfActive();
          setValue(val, true);
        }
      });

      // Скролл барабана
      drum.addEventListener('scroll', onDrumScroll, { passive: true });
    }
  }

  // ---------------------------------------------------------------------------
  // Скролл и позиционирование барабана
  // ---------------------------------------------------------------------------
  function onDrumScroll() {
    const drum = document.getElementById('picker-drum');
    if (!drum || !_activeOptions?._items) return;

    clearTimeout(_scrollTimeout);
    _scrollTimeout = setTimeout(() => {
      syncValueFromScroll();
    }, 60);

    // Легкий виброотклик во время вращения при смене индекса
    const idx = Math.round(drum.scrollTop / _itemHeight);
    if (idx !== _lastScrolledIndex && idx >= 0 && idx < _activeOptions._items.length) {
      _lastScrolledIndex = idx;
      _currentValue = _activeOptions._items[idx];
      updateDisplayNum(_currentValue);
      highlightActiveDrumItem(idx);
      if (window.triggerHaptic) window.triggerHaptic('light');
    }
  }

  function syncValueFromScroll() {
    const drum = document.getElementById('picker-drum');
    if (!drum || !_activeOptions?._items) return;
    const idx = Math.max(0, Math.min(_activeOptions._items.length - 1, Math.round(drum.scrollTop / _itemHeight)));
    _currentValue = _activeOptions._items[idx];
    updateDisplayNum(_currentValue);
    highlightActiveDrumItem(idx);
  }

  function highlightActiveDrumItem(activeIdx) {
    const drum = document.getElementById('picker-drum');
    if (!drum) return;
    const items = drum.querySelectorAll('.wheel-picker-item');
    items.forEach((it, i) => {
      if (i === activeIdx) {
        it.classList.add('selected');
      } else {
        it.classList.remove('selected');
      }
    });
  }

  function scrollToValue(val, smooth = true) {
    const drum = document.getElementById('picker-drum');
    if (!drum || !_activeOptions?._items) return;

    let targetIdx = _activeOptions._items.findIndex(v => Math.abs(v - val) < (_activeOptions.step / 2));
    if (targetIdx === -1) {
      // Ищем ближайший
      let minDiff = Infinity;
      _activeOptions._items.forEach((v, idx) => {
        const diff = Math.abs(v - val);
        if (diff < minDiff) {
          minDiff = diff;
          targetIdx = idx;
        }
      });
    }

    if (targetIdx !== -1) {
      const top = targetIdx * _itemHeight;
      if (smooth) {
        drum.scrollTo({ top, behavior: 'smooth' });
      } else {
        drum.scrollTop = top;
      }
      _lastScrolledIndex = targetIdx;
      highlightActiveDrumItem(targetIdx);
    }
  }

  function updateDisplayNum(val) {
    const numEl = document.getElementById('picker-display-num');
    if (numEl && _activeOptions) {
      numEl.textContent = formatValue(val, _activeOptions.step);
    }
    const manualInput = document.getElementById('picker-manual-input');
    if (manualInput && !_isManualEditing) {
      manualInput.value = val;
    }
  }

  function setValue(val, smooth = true) {
    _currentValue = clamp(val, _activeOptions.min, _activeOptions.max);
    updateDisplayNum(_currentValue);
    scrollToValue(_currentValue, smooth);
    if (window.triggerHaptic) window.triggerHaptic('light');
  }

  function stepValue(delta) {
    const nextVal = clamp(_currentValue + delta, _activeOptions.min, _activeOptions.max);
    setValue(nextVal, true);
  }

  // ---------------------------------------------------------------------------
  // Закрытие барабанного пикера
  // ---------------------------------------------------------------------------
  function closeNumberPicker() {
    const overlay = getOverlay();
    if (!overlay) return;

    overlay.classList.add('closing');
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('closing');
      const container = getContainer();
      if (container) container.innerHTML = '';
      _activeOptions = null;
    }, 180);
  }

  // Экспорт в глобальную область
  window.openNumberPicker = openNumberPicker;
  window.closeNumberPicker = closeNumberPicker;
})();
