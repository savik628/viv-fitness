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
          <div class="plate-weight-display-box">
            <button class="stepper-btn" style="width:34px; height:34px; border:1px solid var(--border-color); border-radius:8px;" onclick="changePlateTargetWeight(-5)">-5</button>
            <button class="stepper-btn" style="width:34px; height:34px; border:1px solid var(--border-color); border-radius:8px;" onclick="changePlateTargetWeight(-2.5)">-2.5</button>
            <div id="plate-calc-val" class="plate-weight-val">${plateCalcTargetWeight} кг</div>
            <button class="stepper-btn" style="width:34px; height:34px; border:1px solid var(--border-color); border-radius:8px;" onclick="changePlateTargetWeight(2.5)">+2.5</button>
            <button class="stepper-btn" style="width:34px; height:34px; border:1px solid var(--border-color); border-radius:8px;" onclick="changePlateTargetWeight(5)">+5</button>
          </div>

          <!-- Быстрый выбор популярных весов -->
          <div class="plate-quick-chips">
            ${[40, 60, 80, 100, 120, 140].map(w => `
              <button class="plate-quick-chip ${plateCalcTargetWeight === w ? 'active' : ''}" onclick="setPlateQuickWeight(${w})">${w} кг</button>
            `).join('')}
          </div>

          <!-- Выбор веса грифа (мужской 20 кг / женский 15 кг) -->
          <div style="display:flex; justify-content:center; gap:6px; margin-bottom:12px;">
            <button id="plate-bar-20" class="filter-chip ${plateCalcBarWeight === 20 ? 'active' : ''}" onclick="setPlateBarWeight(20)">Гриф 20 кг</button>
            <button id="plate-bar-15" class="filter-chip ${plateCalcBarWeight === 15 ? 'active' : ''}" onclick="setPlateBarWeight(15)">Гриф 15 кг</button>
          </div>

          <!-- Визуализация грифа и надетых блинов -->
          <div class="barbell-visual">
            <div class="barbell-shaft"></div>
            <div class="barbell-sleeve-wrap">
              <div class="barbell-collar"></div>
              <div id="plate-calc-stack" class="barbell-plates-stack"></div>
            </div>
          </div>

          <!-- Сводка блинов на каждую сторону -->
          <div id="plate-calc-summary" class="plate-summary-card"></div>

          <div style="display:flex; gap:8px; margin-top:14px;">
            ${plateCalcTargetExIdx !== null ? `
              <button id="plate-calc-apply-btn" class="btn btn-green" style="flex:1;" onclick="applyPlateWeightToExercise()">Применить к подходам</button>
            ` : ''}
            <button class="btn btn-secondary" style="flex:1;" onclick="closeModal()">Закрыть</button>
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

    // Отрисовка цветных дисков на втулке
    const stackEl = document.getElementById('plate-calc-stack');
    if (stackEl) {
      const plateClassMap = {
        25: 'plate-25',
        20: 'plate-20',
        15: 'plate-15',
        10: 'plate-10',
        5: 'plate-5',
        2.5: 'plate-2_5',
        1.25: 'plate-1_25'
      };

      const discsHtml = [];
      res.perSide.forEach(p => {
        for (let i = 0; i < p.count; i++) {
          const cls = plateClassMap[p.weight] || 'plate-10';
          discsHtml.push(`<div class="plate-disc ${cls}"></div>`);
        }
      });

      stackEl.innerHTML = discsHtml.join('');
    }

    // Текстовая сводка
    const sumEl = document.getElementById('plate-calc-summary');
    if (sumEl) {
      sumEl.innerHTML = `
        <div style="font-weight:700; font-size:12.5px; margin-bottom:8px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">
          С каждой стороны надеть:
        </div>
        ${res.perSide.length ? `
          <div style="display:flex; flex-direction:column; gap:5px;">
            ${res.perSide.map(p => `
              <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                <span><strong>${p.count} × ${p.weight} кг</strong></span>
                <span style="color:var(--text-secondary)">${p.count * p.weight} кг</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="color:var(--text-secondary); font-size:13px;">Только гриф</div>
        `}
        ${res.remainder > 0 ? `
          <div style="color:#eab308; font-size:12px; margin-top:8px;">
            Остаток: ${res.remainder * 2} кг
          </div>
        ` : ''}
      `;
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

  // ---------------------------------------------------------------------------
  // БЛОК 5. Экспорт функций калькулятора блинов в глобальную область (window)
  // ---------------------------------------------------------------------------
  window.openPlateCalculatorModal = openPlateCalculatorModal;
  window.updatePlateCalculatorUI = updatePlateCalculatorUI;
  window.changePlateTargetWeight = changePlateTargetWeight;
  window.setPlateQuickWeight = setPlateQuickWeight;
  window.setPlateBarWeight = setPlateBarWeight;
  window.applyPlateWeightToExercise = applyPlateWeightToExercise;
})();
