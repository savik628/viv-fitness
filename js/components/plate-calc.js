// =============================================================================
// VIV Fitness - Компонент калькулятора блинов на гриф (Plate Calculator)
// =============================================================================
// Назначение: Модальное окно расчета распределения олимпийских блинов (25, 20, 15,
// 10, 5, 2.5, 1.25 кг) на гриф (20 или 15 кг) с визуализацией и возможностью
// применения выбранного веса сразу ко всем подходам упражнения.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. Локальное состояние калькулятора блинов
  // ---------------------------------------------------------------------------
  let plateCalcTargetWeight = 60;
  let plateCalcBarWeight = 20;
  let plateCalcTargetExIdx = null;

  // ---------------------------------------------------------------------------
  // БЛОК 2. Открытие модального окна калькулятора (Modal Layout)
  // ---------------------------------------------------------------------------
  function openPlateCalculatorModal(targetWeight = null, targetExIdx = null) {
    let resolvedWeight = parseFloat(targetWeight);
    if ((!resolvedWeight || isNaN(resolvedWeight)) && targetExIdx !== null && window.state?.work?.activeWorkout) {
      const ex = window.state.work.activeWorkout.exercises[targetExIdx];
      if (ex && Array.isArray(ex.sets)) {
        const activeSet = ex.sets.find(s => !s.completed && parseFloat(s.weight) > 0) || ex.sets.find(s => parseFloat(s.weight) > 0);
        if (activeSet) resolvedWeight = parseFloat(activeSet.weight);
      }
    }
    plateCalcTargetWeight = resolvedWeight > 0 ? resolvedWeight : 60;
    plateCalcBarWeight = 20;
    plateCalcTargetExIdx = targetExIdx;

    if (window.openModal) {
      window.openModal(`
        <div class="modal-header">
          <div class="modal-title">Калькулятор блинов</div>
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
        </div>
        <div class="plate-calc-container">
          <!-- Интерактивная плашка выбора веса (барабанное колесо / ввод) -->
          <div class="plate-wheel-trigger-card" onclick="openPlateTargetWeightPicker()" role="button" tabindex="0" title="Нажмите для вращения колеса или ввода с клавиатуры">
            <div style="font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:var(--text-secondary);">Целевой вес штанги</div>
            <div id="plate-calc-val" class="plate-weight-val">${plateCalcTargetWeight} кг</div>
            <div class="plate-wheel-hint">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>Крутить колесо прокрутки</span>
            </div>
          </div>

          <!-- Быстрые дельты без стрелок -->
          <div class="wheel-picker-deltas-row" style="margin-bottom:10px;">
            ${[-10, -5, -2.5, 2.5, 5, 10].map(d => `
              <button type="button" class="wheel-picker-delta-chip" onclick="changePlateTargetWeight(${d})">
                ${d > 0 ? `+${d}` : d}
              </button>
            `).join('')}
          </div>

          <!-- Быстрый выбор популярных весов -->
          <div class="plate-quick-chips">
            ${[40, 60, 80, 100, 120, 140].map(w => `
              <button class="plate-quick-chip ${plateCalcTargetWeight === w ? 'active' : ''}" onclick="setPlateQuickWeight(${w})">${w} кг</button>
            `).join('')}
          </div>

          <!-- Выбор веса грифа (мужской 20 кг / женский 15 кг) -->
          <div style="display:flex; justify-content:center; gap:8px; margin-bottom:12px;">
            <button id="plate-bar-20" class="filter-chip ${plateCalcBarWeight === 20 ? 'active' : ''}" onclick="setPlateBarWeight(20)">Гриф 20 кг</button>
            <button id="plate-bar-15" class="filter-chip ${plateCalcBarWeight === 15 ? 'active' : ''}" onclick="setPlateBarWeight(15)">Гриф 15 кг</button>
          </div>

          <!-- Визуализация грифа и надетых блинов С ДВУХ СТОРОН -->
          <div class="barbell-visual barbell-visual-symmetrical">
            <div class="barbell-shaft"></div>
            <!-- Левая втулка -->
            <div class="barbell-sleeve-side sleeve-left">
              <div id="plate-calc-stack-left" class="barbell-plates-stack stack-left"></div>
              <div class="barbell-collar collar-left"></div>
            </div>
            <!-- Центр грифа -->
            <div class="barbell-center-knurl"></div>
            <!-- Правая втулка -->
            <div class="barbell-sleeve-side sleeve-right">
              <div class="barbell-collar collar-right"></div>
              <div id="plate-calc-stack-right" class="barbell-plates-stack stack-right"></div>
            </div>
          </div>

          <!-- Компактные бейджи надетых блинов на сторону -->
          <div id="plate-calc-loaded-summary" class="plate-loaded-chips-row"></div>

          <!-- Инфо-гид: какой цвет соответствует какому весу -->
          <div class="plate-legend-box">
            <div class="plate-legend-header">Номиналы олимпийских блинов</div>
            <div class="plate-legend-grid">
              <div class="plate-legend-chip"><span class="plate-disc-dot dot-25"></span><strong>25 кг</strong> Красный</div>
              <div class="plate-legend-chip"><span class="plate-disc-dot dot-20"></span><strong>20 кг</strong> Синий</div>
              <div class="plate-legend-chip"><span class="plate-disc-dot dot-15"></span><strong>15 кг</strong> Жёлтый</div>
              <div class="plate-legend-chip"><span class="plate-disc-dot dot-10"></span><strong>10 кг</strong> Зелёный</div>
              <div class="plate-legend-chip"><span class="plate-disc-dot dot-5"></span><strong>5 кг</strong> Белый</div>
              <div class="plate-legend-chip"><span class="plate-disc-dot dot-2_5"></span><strong>2.5 кг</strong> Чёрный</div>
              <div class="plate-legend-chip"><span class="plate-disc-dot dot-1_25"></span><strong>1.25 кг</strong> Серый</div>
            </div>
          </div>

          <div style="display:flex; gap:8px; margin-top:14px;">
            ${plateCalcTargetExIdx !== null ? `
              <button id="plate-calc-apply-btn" class="btn btn-green" style="flex:1.4;" onclick="applyPlateWeightToExercise()">Применить к подходам</button>
            ` : ''}
            <button class="btn btn-outline" style="flex:1;" onclick="closeModal()">Закрыть</button>
          </div>
        </div>
      `);

      updatePlateCalculatorUI();
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 3. Обновление графического интерфейса и стека блинов (UI Update)
  // ---------------------------------------------------------------------------
  function updatePlateCalculatorUI() {
    if (!window.Storage || !window.Storage.calculatePlates) return;
    const res = window.Storage.calculatePlates(plateCalcTargetWeight, plateCalcBarWeight);
    const valEl = document.getElementById('plate-calc-val');
    if (valEl) valEl.textContent = `${plateCalcTargetWeight} кг`;

    // Обновление подсветки чипов быстрого выбора
    document.querySelectorAll('.plate-quick-chip').forEach(ch => {
      const w = parseFloat(ch.textContent);
      ch.classList.toggle('active', w === plateCalcTargetWeight);
    });

    // Обновление подсветки веса грифа
    const b20 = document.getElementById('plate-bar-20');
    const b15 = document.getElementById('plate-bar-15');
    if (b20) b20.classList.toggle('active', plateCalcBarWeight === 20);
    if (b15) b15.classList.toggle('active', plateCalcBarWeight === 15);

    const plateClassMap = {
      25: 'plate-25',
      20: 'plate-20',
      15: 'plate-15',
      10: 'plate-10',
      5: 'plate-5',
      2.5: 'plate-2_5',
      1.25: 'plate-1_25'
    };

    // Отрисовка цветных дисков С ДВУХ СТОРОН
    // Правая сторона: от воротника наружу (тяжелые блины прижаты к collar-right)
    const rightDiscs = [];
    // Левая сторона: зеркально (тяжелые блины прижаты к collar-left)
    const leftDiscs = [];

    res.perSide.forEach(p => {
      for (let i = 0; i < p.count; i++) {
        const cls = plateClassMap[p.weight] || 'plate-10';
        rightDiscs.push(`<div class="plate-disc ${cls}"></div>`);
        leftDiscs.unshift(`<div class="plate-disc ${cls}"></div>`);
      }
    });

    const stackRight = document.getElementById('plate-calc-stack-right');
    const stackLeft = document.getElementById('plate-calc-stack-left');
    if (stackRight) stackRight.innerHTML = rightDiscs.join('');
    if (stackLeft) stackLeft.innerHTML = leftDiscs.join('');

    // Сводка надетых блинов в виде цветных бейджей
    const loadedSummary = document.getElementById('plate-calc-loaded-summary');
    if (loadedSummary) {
      if (res.perSide.length) {
        loadedSummary.innerHTML = `
          <div style="font-size:11.5px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; width:100%; text-align:center; margin-bottom:4px;">
            На каждой стороне:
          </div>
          <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:6px;">
            ${res.perSide.map(p => `
              <span class="badge" style="display:inline-flex; align-items:center; gap:5px; padding:3px 8px; font-size:12px;">
                <span class="plate-disc-dot dot-${String(p.weight).replace('.', '_')}"></span>
                <strong>${p.count} × ${p.weight} кг</strong>
              </span>
            `).join('')}
          </div>
          ${res.remainder > 0 ? `
            <div style="color:#eab308; font-size:11.5px; margin-top:4px; text-align:center;">
              Остаток: +${res.remainder * 2} кг
            </div>
          ` : ''}
        `;
      } else {
        loadedSummary.innerHTML = `
          <div style="font-size:12px; color:var(--text-secondary); text-align:center;">
            Только пустой гриф (${plateCalcBarWeight} кг)
          </div>
        `;
      }
    }

    const applyBtn = document.getElementById('plate-calc-apply-btn');
    if (applyBtn) {
      applyBtn.textContent = `Применить ${plateCalcTargetWeight} кг`;
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4. Обработчики изменения веса и пересчета (Controls & Actions)
  // ---------------------------------------------------------------------------
  function changePlateTargetWeight(delta) {
    plateCalcTargetWeight = Math.max(plateCalcBarWeight, Math.round((plateCalcTargetWeight + delta) * 10) / 10);
    updatePlateCalculatorUI();
  }

  function setPlateQuickWeight(w) {
    plateCalcTargetWeight = Math.max(plateCalcBarWeight, parseFloat(w) || 20);
    updatePlateCalculatorUI();
  }

  function setPlateBarWeight(w) {
    plateCalcBarWeight = w;
    plateCalcTargetWeight = Math.max(plateCalcBarWeight, plateCalcTargetWeight);
    updatePlateCalculatorUI();
  }

  function applyPlateWeightToExercise() {
    if (plateCalcTargetExIdx !== null && window.state && window.state.work && window.state.work.activeWorkout) {
      const ex = window.state.work.activeWorkout.exercises[plateCalcTargetExIdx];
      if (ex) {
        ex.sets.forEach((s, sIdx) => {
          s.weight = plateCalcTargetWeight;
          const inp = document.getElementById(`set-input-${plateCalcTargetExIdx}-${sIdx}-weight`);
          if (inp) inp.value = plateCalcTargetWeight;
        });
        if (window.Storage) window.Storage.saveActiveDraft(window.state.work.activeWorkout);
      }
    }
    if (window.closeModal) window.closeModal();
  }

  function openPlateTargetWeightPicker() {
    if (window.openNumberPicker) {
      window.openNumberPicker({
        title: 'Целевой вес штанги',
        value: plateCalcTargetWeight,
        min: 20,
        max: 400,
        step: 2.5,
        unit: 'кг',
        deltas: [-10, -5, -2.5, 2.5, 5, 10],
        onConfirm: (newW) => {
          plateCalcTargetWeight = Math.max(plateCalcBarWeight, newW);
          updatePlateCalculatorUI();
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 5. Экспорт функций калькулятора блинов в глобальную область (window)
  // ---------------------------------------------------------------------------
  window.openPlateCalculatorModal = openPlateCalculatorModal;
  window.openPlateTargetWeightPicker = openPlateTargetWeightPicker;
  window.updatePlateCalculatorUI = updatePlateCalculatorUI;
  window.changePlateTargetWeight = changePlateTargetWeight;
  window.setPlateQuickWeight = setPlateQuickWeight;
  window.setPlateBarWeight = setPlateBarWeight;
  window.applyPlateWeightToExercise = applyPlateWeightToExercise;
})();
