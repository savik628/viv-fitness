// VIV Fitness - Barbell Plate Calculator Component
// Расчет распределения блинов на гриф с интерактивной визуализацией

(function () {
  'use strict';

      let plateCalcTargetWeight = 60;
  let plateCalcBarWeight = 20;
  let plateCalcTargetExIdx = null;

  function openPlateCalculatorModal(targetWeight = 60, targetExIdx = null) {
    plateCalcTargetWeight = parseFloat(targetWeight) || 60;
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

          <!-- Quick Preset Weights -->
          <div class="plate-quick-chips">
            ${[40, 60, 80, 100, 120, 140].map(w => `
              <button class="plate-quick-chip ${plateCalcTargetWeight === w ? 'active' : ''}" onclick="setPlateQuickWeight(${w})">${w} кг</button>
            `).join('')}
          </div>

          <!-- Bar Weight Toggle -->
          <div style="display:flex; justify-content:center; gap:6px; margin-bottom:12px;">
            <button id="plate-bar-20" class="filter-chip ${plateCalcBarWeight === 20 ? 'active' : ''}" onclick="setPlateBarWeight(20)">Гриф 20 кг</button>
            <button id="plate-bar-15" class="filter-chip ${plateCalcBarWeight === 15 ? 'active' : ''}" onclick="setPlateBarWeight(15)">Гриф 15 кг</button>
          </div>

          <!-- Olympic Barbell Visual -->
          <div class="barbell-visual">
            <div class="barbell-shaft"></div>
            <div class="barbell-sleeve-wrap">
              <div class="barbell-collar"></div>
              <div id="plate-calc-stack" class="barbell-plates-stack"></div>
            </div>
          </div>

          <!-- Breakdown Summary -->
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

  
    function updatePlateCalculatorUI() {
    if (!window.Storage || !window.Storage.calculatePlates) return;
    const res = window.Storage.calculatePlates(plateCalcTargetWeight, plateCalcBarWeight);
    const valEl = document.getElementById('plate-calc-val');
    if (valEl) valEl.textContent = `${plateCalcTargetWeight} кг`;

    // Update quick chips active state
    document.querySelectorAll('.plate-quick-chip').forEach(ch => {
      const w = parseFloat(ch.textContent);
      ch.classList.toggle('active', w === plateCalcTargetWeight);
    });

    // Update bar chips
    const b20 = document.getElementById('plate-bar-20');
    const b15 = document.getElementById('plate-bar-15');
    if (b20) b20.classList.toggle('active', plateCalcBarWeight === 20);
    if (b15) b15.classList.toggle('active', plateCalcBarWeight === 15);

    // Update stack
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

    // Update summary
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
        ex.sets.forEach(s => (s.weight = plateCalcTargetWeight));
      }
    }
    if (window.closeModal) window.closeModal();
    if (window.renderActiveWorkoutScreen) window.renderActiveWorkoutScreen();
  }

  
    window.openPlateCalculatorModal = openPlateCalculatorModal;
  window.updatePlateCalculatorUI = updatePlateCalculatorUI;
  window.changePlateTargetWeight = changePlateTargetWeight;
  window.setPlateQuickWeight = setPlateQuickWeight;
  window.setPlateBarWeight = setPlateBarWeight;
  window.applyPlateWeightToExercise = applyPlateWeightToExercise;
})();
