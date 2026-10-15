// =============================================================================
// VIV Fitness - Компонент барабанного выбора чисел (Wheel / Drum Number Picker)
// =============================================================================
// Назначение: Интерактивное мобильное колесо прокрутки (drum picker) с поддержкой
// scroll-snap, быстрых кнопок изменения шага (+/-), тактильного виброотклика
// и возможностью прямого ввода числа с клавиатуры при нажатии на центральное значение.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. Внутреннее состояние и кэш элементов барабанного селектора
  // ---------------------------------------------------------------------------
  let _pickerOverlay = null;
  let _pickerContainer = null;
  let _activeOptions = null;
  let _currentValue = 0;
  let _itemHeight = 44;
  let _isManualEditing = false;
  let _scrollTimeout = null;
  let _lastScrolledIndex = -1;
  let _isInitializing = false;

  /**
   * Получение корневого оверлея пикера
   * @returns {HTMLElement|null}
   */
  function getOverlay() {
    if (!_pickerOverlay) {
      _pickerOverlay = document.getElementById('picker-overlay');
    }
    return _pickerOverlay;
  }

  /**
   * Получение контейнера разметки пикера
   * @returns {HTMLElement|null}
   */
  function getContainer() {
    if (!_pickerContainer) {
      _pickerContainer = document.getElementById('picker-container');
    }
    return _pickerContainer;
  }

  // ---------------------------------------------------------------------------
  // БЛОК 2. Математические и вспомогательные утилиты форматирования
  // ---------------------------------------------------------------------------

  /**
   * Ограничение числового значения диапазоном [min, max]
   * @param {number|string} val - Исходное значение
   * @param {number} min - Нижняя граница
   * @param {number} max - Верхняя граница
   * @returns {number}
   */
  function clamp(val, min, max) {
    let num = Number(val);
    if (isNaN(num)) num = min;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Форматирование числа под шаг барабана (целое или с десятыми долями)
   * @param {number} val - Число
   * @param {number} step - Шаг сетки
   * @returns {string}
   */
  function formatValue(val, step) {
    const isInt = step >= 1 && Number.isInteger(step);
    if (isInt) return String(Math.round(val));
    return Number(val.toFixed(1)).toString();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 3. Открытие и инициализация барабанного селектора (Open Picker)
  // ---------------------------------------------------------------------------
  /**
   * Открытие барабанного модального селектора
   * @param {Object} options - Конфигурация пикера (title, value, min, max, step, deltas, onConfirm, onCancel)
   */
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
    _isInitializing = true;
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

    // Находим точный стартовый индекс соответствующий _currentValue
    let initialIdx = items.findIndex(v => Math.abs(v - _currentValue) < (step / 2));
    if (initialIdx === -1) {
      let minDiff = Infinity;
      items.forEach((v, idx) => {
        const diff = Math.abs(v - _currentValue);
        if (diff < minDiff) {
          minDiff = diff;
          initialIdx = idx;
        }
      });
    }
    if (initialIdx === -1) initialIdx = 0;
    _lastScrolledIndex = initialIdx;

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
        <button type="button" class="wheel-picker-btn-cancel" id="picker-cancel-btn">Отмена</button>
        <div class="wheel-picker-title">${window.escapeHtml ? window.escapeHtml(_activeOptions.title) : _activeOptions.title}</div>
        <button type="button" class="wheel-picker-btn-confirm" id="picker-confirm-btn">Готово</button>
      </div>

      <div class="wheel-picker-framed-box">
        <input type="number" 
               id="picker-manual-input" 
               class="wheel-picker-framed-input" 
               inputmode="decimal"
               step="${step}" 
               min="${min}" 
               max="${max}" 
               value="${formatValue(_currentValue, step)}"
               autocomplete="off">
      </div>



      <div class="wheel-picker-wheel-wrap">
        <div class="wheel-picker-lens"></div>
        <div class="wheel-picker-drum" id="picker-drum">
          <div class="wheel-picker-spacer"></div>
          ${items.map((val, idx) => `
            <div class="wheel-picker-item ${idx === initialIdx ? 'selected' : ''}" data-idx="${idx}" data-val="${val}">
              ${formatValue(val, step)}
            </div>
          `).join('')}
          <div class="wheel-picker-spacer"></div>
        </div>
      </div>
    `;

    // Синхронно позиционируем барабан ДО показа и навешивания скролла
    const drum = document.getElementById('picker-drum');
    if (drum) {
      drum.scrollTop = initialIdx * _itemHeight;
    }

    // Показываем оверлей
    overlay.classList.remove('hidden');
    overlay.classList.remove('closing');

    // Навешиваем слушатели
    bindPickerEvents();

    // Прокручиваем к выбранному значению и снимаем блокировку инициализации
    requestAnimationFrame(() => {
      scrollToValue(_currentValue, false);
      setTimeout(() => {
        _isInitializing = false;
      }, 120);
    });
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4. Регистрация событий, кликов, ввода и вертикальных тач-жестов
  // ---------------------------------------------------------------------------

  /**
   * Привязка обработчиков событий кнопок отмены/подтверждения, дельт и барабана
   */
  function bindPickerEvents() {
    const overlay = getOverlay();
    const container = getContainer();
    const drum = document.getElementById('picker-drum');
    const cancelBtn = document.getElementById('picker-cancel-btn');
    const confirmBtn = document.getElementById('picker-confirm-btn');
    const manualInput = document.getElementById('picker-manual-input');

    const handleCancel = () => {
      if (_activeOptions?.onCancel) _activeOptions.onCancel();
      closeNumberPicker();
    };

    const handleConfirm = () => {
      if (manualInput) {
        const parsed = parseFloat(manualInput.value);
        if (!isNaN(parsed)) {
          _currentValue = clamp(parsed, _activeOptions.min, _activeOptions.max);
        }
      }
      if (_activeOptions?.onConfirm) {
        _activeOptions.onConfirm(_currentValue);
      }
      if (window.triggerHaptic) window.triggerHaptic('success');
      closeNumberPicker();
    };

    if (cancelBtn) cancelBtn.onclick = handleCancel;
    if (confirmBtn) confirmBtn.onclick = handleConfirm;

    // Закрытие по клику на фон оверлея
    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          handleConfirm();
        }
      };
    }

    // Слушатели прямого ввода в рамку
    if (manualInput) {
      manualInput.addEventListener('input', () => {
        const parsed = parseFloat(manualInput.value);
        if (!isNaN(parsed)) {
          _currentValue = clamp(parsed, _activeOptions.min, _activeOptions.max);
          scrollToValue(_currentValue, false);
        }
      });

      manualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirm();
        }
      });

      manualInput.addEventListener('focus', () => {
        manualInput.select();
      });
    }

    // Дельта-кнопки
    container.querySelectorAll('.wheel-picker-delta-chip').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (manualInput && document.activeElement === manualInput) {
          const parsed = parseFloat(manualInput.value);
          if (!isNaN(parsed)) _currentValue = clamp(parsed, _activeOptions.min, _activeOptions.max);
          manualInput.blur();
        }
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

      // Строгая блокировка горизонтальных жестов и смещений
      let touchStartX = 0;
      let touchStartY = 0;
      drum.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      drum.addEventListener('touchmove', (e) => {
        if (drum.scrollLeft !== 0) drum.scrollLeft = 0;
        if (e.touches && e.touches.length) {
          const dx = Math.abs(e.touches[0].clientX - touchStartX);
          const dy = Math.abs(e.touches[0].clientY - touchStartY);
          if (dx > dy && dx > 5) {
            // Предотвращаем горизонтальное смещение
            e.preventDefault();
          }
        }
      }, { passive: false });

      // Скролл барабана
      drum.addEventListener('scroll', () => {
        if (drum.scrollLeft !== 0) drum.scrollLeft = 0;
        onDrumScroll();
      }, { passive: true });
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 5. Синхронизация скролла, позиционирование и тактильный виброотклик
  // ---------------------------------------------------------------------------

  /**
   * Обработчик прокрутки барабана: вычисление индекса по scrollTop и haptic-тик
   */
  function onDrumScroll() {
    if (_isInitializing) return;
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

  /**
   * Точная синхронизация текущего значения по завершении скролла
   */
  function syncValueFromScroll() {
    if (_isInitializing) return;
    const drum = document.getElementById('picker-drum');
    if (!drum || !_activeOptions?._items) return;
    const idx = Math.max(0, Math.min(_activeOptions._items.length - 1, Math.round(drum.scrollTop / _itemHeight)));
    _currentValue = _activeOptions._items[idx];
    updateDisplayNum(_currentValue);
    highlightActiveDrumItem(idx);
  }

  /**
   * Подсветка активного центрального элемента барабана классом .selected
   * @param {number} activeIdx - Индекс выбранного элемента
   */
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

  // ---------------------------------------------------------------------------
  // БЛОК 6. Программная прокрутка, установка и шаговое изменение значений
  // ---------------------------------------------------------------------------

  /**
   * Плавная или мгновенная прокрутка барабана к заданному числу
   * @param {number} val - Целевое число
   * @param {boolean} smooth - Использовать ли плавную анимацию scroll
   */
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

  /**
   * Обновление числового значения в поле ручного ввода
   * @param {number} val - Число для отображения
   */
  function updateDisplayNum(val) {
    const manualInput = document.getElementById('picker-manual-input');
    if (manualInput && document.activeElement !== manualInput && _activeOptions) {
      manualInput.value = formatValue(val, _activeOptions.step);
    }
  }

  /**
   * Программная установка значения с синхронизацией барабана
   * @param {number} val - Новое значение
   * @param {boolean} smooth - Плавная прокрутка барабана
   */
  function setValue(val, smooth = true) {
    _currentValue = clamp(val, _activeOptions.min, _activeOptions.max);
    updateDisplayNum(_currentValue);
    scrollToValue(_currentValue, smooth);
    if (window.triggerHaptic) window.triggerHaptic('light');
  }

  /**
   * Шаговое изменение значения на дельту (+1, -5 и т.д.)
   * @param {number} delta - Шаг смещения
   */
  function stepValue(delta) {
    const nextVal = clamp(_currentValue + delta, _activeOptions.min, _activeOptions.max);
    setValue(nextVal, true);
    const manualInput = document.getElementById('picker-manual-input');
    if (manualInput) {
      manualInput.value = formatValue(_currentValue, _activeOptions.step);
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 7. Закрытие барабанного пикера и очистка DOM (Close Picker)
  // ---------------------------------------------------------------------------

  /**
   * Закрытие барабанного пикера с анимацией затухания оверлея
   */
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

  // ---------------------------------------------------------------------------
  // БЛОК 8. Экспорт функций барабанного пикера в глобальную область (window)
  // ---------------------------------------------------------------------------
  window.openNumberPicker = openNumberPicker;
  window.closeNumberPicker = closeNumberPicker;
})();
