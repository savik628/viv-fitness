// =============================================================================
// VIV Fitness - Экран тренировок и активной сессии (Workout Screen)
// =============================================================================
// Назначение: Управление программами тренировок (создание, редактирование, удаление),
// проведение активной тренировки с таблицей подходов, таймером отдыха, вызовом
// калькулятора блинов, авто-детекцией личных рекордов (PR) и сохранением в статистику.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. ТИПЫ УПРАЖНЕНИЙ И ВСПОМОГАТЕЛЬНЫЙ СТЕППЕР (Types & Stepper Component)
  // ---------------------------------------------------------------------------
  const TYPE_LABELS = {
    weight_reps: 'С весом',
    bodyweight: 'Свой вес',
    distance: 'Дистанция',
    duration: 'Время'
  };

  const getExerciseTypeLabel = (t) => TYPE_LABELS[t] || 'С весом';

  function esc(str) {
    return window.escapeHtml ? window.escapeHtml(str) : (str || '');
  }

  function syncActiveDraft() {
    if (!window.Storage) return;
    if (window.state?.work?.activeWorkout) {
      window.Storage.saveActiveDraft(window.state.work.activeWorkout);
    } else {
      window.Storage.clearActiveDraft();
    }
  }

  function renderStepper(value, onMinus, onPlus, onChange, step = 1, inputId = '') {
    const valDisplay = (value !== 0 && value !== '0' && value !== null && value !== undefined && !isNaN(value)) ? value : '';
    return `
      <div class="stepper-container col-stepper">
        <button class="stepper-btn" onclick="${onMinus}">-</button>
        <input ${inputId ? `id="${inputId}"` : ''} class="stepper-input" type="number" step="${step}" value="${valDisplay}" placeholder="0" onchange="${onChange}">
        <button class="stepper-btn" onclick="${onPlus}">+</button>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // БЛОК 2. СПИСОК СОХРАНЕННЫХ ПРОГРАММ (Routines List Screen)
  // ---------------------------------------------------------------------------
  function renderWork() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    if (window.state.work.activeWorkout) {
      renderActiveWorkoutScreen();
      return;
    }

    if (window.setHeader) {
      window.setHeader('Мои тренировки', false, `
        <button class="header-icon-btn" onclick="openCreateWorkoutModal()" title="Создать">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      `);
    }

    const routines = window.Storage ? window.Storage.getRoutines() : [];
    window.state.work.routines = routines;

    if (!routines.length) {
      mainContent.innerHTML = `
        <div style="text-align:center; padding:40px 16px;">
          <div style="font-size:18px; font-weight:bold; margin-bottom:16px;">Нет созданных программ</div>
          <button class="btn btn-primary" onclick="openCreateWorkoutModal()">+ Создать тренировку</button>
        </div>`;
      return;
    }

    mainContent.innerHTML = `
      <div class="item-list">
        ${routines.map(r => `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:8px;">
              <div style="min-width:0; flex:1;">
                <div style="font-size:17px; font-weight:bold; word-break:break-word;">${esc(r.name)}</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${r.exercises.length} упражнений</div>
              </div>
              <div style="display:flex; gap:6px; flex-shrink:0;">
                <button class="btn btn-outline btn-sm" onclick="openEditWorkoutModal(${r.id})">Изменить</button>
                <button class="btn btn-danger btn-sm" onclick="deleteRoutine(${r.id})">Удалить</button>
              </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px;">
              ${r.exercises.slice(0, 4).map(e => `<span class="badge">${esc(e.name)}</span>`).join('')}
              ${r.exercises.length > 4 ? `<span style="font-size:11px; color:var(--text-secondary)">+ еще ${r.exercises.length - 4}</span>` : ''}
            </div>
            <button class="btn btn-green" onclick="startWorkout(${r.id})" style="width:100%;">Начать тренировку</button>
          </div>
        `).join('')}
      </div>`;
  }

  function startWorkout(routineId) {
    const routine = window.state.work.routines.find(r => r.id === routineId);
    if (!routine) return;

    window.state.work.activeWorkout = {
      routineName: routine.name,
      startTime: Date.now(),
      exercises: routine.exercises.map(e => ({
        name: e.name,
        type: e.type || 'weight_reps',
        primaryMuscle: e.primaryMuscle || 'chest',
        sets: [{ setNumber: 1, reps: 0, weight: 0, distance: 0, duration: 0, completed: false }]
      }))
    };
    syncActiveDraft();
    renderActiveWorkoutScreen();
  }

  function deleteRoutine(id) {
    if (!confirm('Вы действительно хотите удалить эту программу?')) return;
    if (window.Storage) window.Storage.deleteRoutine(id);
    renderWork();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 3. АКТИВНАЯ ТРЕНИРОВОЧНАЯ СЕССИЯ (Active Workout Screen & Sets Table)
  // ---------------------------------------------------------------------------
  function renderActiveWorkoutScreen() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const aw = window.state.work.activeWorkout;
    if (!aw) {
      renderWork();
      return;
    }

    syncActiveDraft();

    if (window.setHeader) {
      window.setHeader(aw.routineName, true, `<button class="btn btn-green btn-sm" onclick="finishWorkout()">Завершить</button>`);
    }

    mainContent.innerHTML = `
      <div class="item-list">
        ${aw.exercises.map((ex, exIdx) => {
          const isWeight = ex.type === 'weight_reps';
          const isBodyweight = ex.type === 'bodyweight';
          const isDist = ex.type === 'distance';
          const isDur = ex.type === 'duration';

          return `
            <div class="card">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                  <div class="active-ex-reorder">
                    <button class="reorder-btn ${exIdx === 0 ? 'disabled' : ''}" 
                            onclick="moveActiveWorkoutEx(${exIdx}, -1)" 
                            ${exIdx === 0 ? 'disabled' : ''} 
                            title="Переместить выше">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    </button>
                    <button class="reorder-btn ${exIdx === aw.exercises.length - 1 ? 'disabled' : ''}" 
                            onclick="moveActiveWorkoutEx(${exIdx}, 1)" 
                            ${exIdx === aw.exercises.length - 1 ? 'disabled' : ''} 
                            title="Переместить ниже">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                  </div>
                  <strong style="font-size:15.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(ex.name)}</strong>
                </div>
                <div style="display:flex; gap:6px; align-items:center; flex-shrink:0;">
                  ${isWeight ? `
                    <button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:11.5px;" onclick="openPlateCalculatorModal(null, ${exIdx})">
                      Блины
                    </button>
                  ` : ''}
                  <span class="badge">${getExerciseTypeLabel(ex.type)}</span>
                </div>
              </div>
              <div class="sets-table-header">
                <div class="col-check">✓</div>
                <div class="col-set-num">Сет</div>
                ${isWeight ? '<div class="col-stepper">Вес (кг)</div><div class="col-stepper">Повторы</div>' : ''}
                ${isBodyweight ? '<div class="col-stepper">Повторы</div>' : ''}
                ${isDist ? '<div class="col-stepper">Дистанция (км)</div>' : ''}
                ${isDur ? '<div class="col-stepper">Время (сек)</div>' : ''}
                <div class="col-action"></div>
              </div>
              ${ex.sets.map((s, sIdx) => `
                <div id="set-row-${exIdx}-${sIdx}" class="sets-table-row ${s.completed ? 'completed' : ''}">
                  <div class="col-check">
                    <button id="set-check-${exIdx}-${sIdx}" class="set-check-btn ${s.completed ? 'checked' : ''}" onclick="toggleSetComplete(${exIdx}, ${sIdx})" title="Отметить подход">✓</button>
                  </div>
                  <div class="col-set-num">${s.setNumber}</div>
                  ${isWeight ? `
                    ${renderStepper(s.weight, `stepVal(${exIdx},${sIdx},'weight',-2.5)`, `stepVal(${exIdx},${sIdx},'weight',2.5)`, `setVal(${exIdx},${sIdx},'weight',this.value)`, 0.5, `set-input-${exIdx}-${sIdx}-weight`)}
                    ${renderStepper(s.reps, `stepVal(${exIdx},${sIdx},'reps',-1)`, `stepVal(${exIdx},${sIdx},'reps',1)`, `setVal(${exIdx},${sIdx},'reps',this.value)`, 1, `set-input-${exIdx}-${sIdx}-reps`)}
                  ` : ''}
                  ${isBodyweight ? renderStepper(s.reps, `stepVal(${exIdx},${sIdx},'reps',-1)`, `stepVal(${exIdx},${sIdx},'reps',1)`, `setVal(${exIdx},${sIdx},'reps',this.value)`, 1, `set-input-${exIdx}-${sIdx}-reps`) : ''}
                  ${isDist ? renderStepper(s.distance, `stepVal(${exIdx},${sIdx},'distance',-0.5)`, `stepVal(${exIdx},${sIdx},'distance',0.5)`, `setVal(${exIdx},${sIdx},'distance',this.value)`, 0.1, `set-input-${exIdx}-${sIdx}-distance`) : ''}
                  ${isDur ? renderStepper(s.duration, `stepVal(${exIdx},${sIdx},'duration',-10)`, `stepVal(${exIdx},${sIdx},'duration',10)`, `setVal(${exIdx},${sIdx},'duration',this.value)`, 5, `set-input-${exIdx}-${sIdx}-duration`) : ''}
                  <div class="col-action">
                    <button class="modal-close-btn" style="width:24px; height:24px; font-size:14px;" onclick="removeSet(${exIdx}, ${sIdx})">✕</button>
                  </div>
                </div>
              `).join('')}
              <button class="btn btn-secondary btn-sm" onclick="addSet(${exIdx})" style="margin-top:6px;">+ Добавить подход</button>
            </div>
          `;
        }).join('')}
        <button class="btn btn-green" onclick="finishWorkout()" style="width:100%; margin-top:14px; padding:14px; font-weight:700;">
          Завершить тренировку
        </button>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4. УПРАВЛЕНИЕ ПОДХОДАМИ И ПЕРЕМЕЩЕНИЕ (Sets Manipulation & Reordering)
  // ---------------------------------------------------------------------------
  function rerenderActiveWorkoutPreservingScroll() {
    const mainContent = document.getElementById('main-content');
    const prevScroll = mainContent ? mainContent.scrollTop : 0;
    renderActiveWorkoutScreen();
    if (mainContent) mainContent.scrollTop = prevScroll;
  }

  function moveActiveWorkoutEx(idx, dir) {
    const aw = window.state.work.activeWorkout;
    if (!aw || !aw.exercises) return;
    const targetIdx = idx + dir;
    if (idx < 0 || idx >= aw.exercises.length || targetIdx < 0 || targetIdx >= aw.exercises.length) return;
    const temp = aw.exercises[idx];
    aw.exercises[idx] = aw.exercises[targetIdx];
    aw.exercises[targetIdx] = temp;
    rerenderActiveWorkoutPreservingScroll();
  }

  function toggleSetComplete(exIdx, sIdx) {
    const set = window.state.work.activeWorkout.exercises[exIdx].sets[sIdx];
    set.completed = !set.completed;
    if (window.triggerHaptic) window.triggerHaptic('impact');

    if (set.completed && window.startRestTimer) {
      window.startRestTimer();
    }

    const rowEl = document.getElementById(`set-row-${exIdx}-${sIdx}`);
    const btnEl = document.getElementById(`set-check-${exIdx}-${sIdx}`);
    if (rowEl && btnEl) {
      rowEl.classList.toggle('completed', set.completed);
      btnEl.classList.toggle('checked', set.completed);
      syncActiveDraft();
    } else {
      rerenderActiveWorkoutPreservingScroll();
    }
  }

  function stepVal(exIdx, sIdx, field, delta) {
    const set = window.state.work.activeWorkout.exercises[exIdx].sets[sIdx];
    let cur = Math.max(0, (parseFloat(set[field]) || 0) + delta);
    const nextVal = (field === 'reps' || field === 'duration') ? Math.round(cur) : parseFloat(cur.toFixed(1));
    set[field] = nextVal;

    const inpEl = document.getElementById(`set-input-${exIdx}-${sIdx}-${field}`);
    if (inpEl) {
      inpEl.value = nextVal !== 0 ? nextVal : '';
      syncActiveDraft();
    } else {
      rerenderActiveWorkoutPreservingScroll();
    }
  }

  function setVal(exIdx, sIdx, field, val) {
    const set = window.state.work.activeWorkout.exercises[exIdx].sets[sIdx];
    const num = Math.max(0, parseFloat(val) || 0);
    set[field] = (field === 'reps' || field === 'duration') ? Math.round(num) : num;
    syncActiveDraft();
  }

  function addSet(exIdx) {
    const sets = window.state.work.activeWorkout.exercises[exIdx].sets;
    const last = sets[sets.length - 1] || { reps: 0, weight: 0, distance: 0, duration: 0 };
    sets.push({ ...last, setNumber: sets.length + 1, completed: false });
    rerenderActiveWorkoutPreservingScroll();
  }

  function removeSet(exIdx, sIdx) {
    const sets = window.state.work.activeWorkout.exercises[exIdx].sets;
    if (sets.length <= 1) return alert('Тренировка должна содержать хотя бы 1 подход');
    sets.splice(sIdx, 1);
    sets.forEach((s, idx) => s.setNumber = idx + 1);
    rerenderActiveWorkoutPreservingScroll();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 5. ЗАВЕРШЕНИЕ ТРЕНИРОВКИ И РЕКОРДЫ (Finish Workout & PR Detection)
  // ---------------------------------------------------------------------------
  function isSetMeaningful(s) {
    const w = parseFloat(s.weight) || 0;
    const r = parseInt(s.reps, 10) || 0;
    const dist = parseFloat(s.distance) || 0;
    const dur = parseInt(s.duration, 10) || 0;
    return w > 0 || r > 0 || dist > 0 || dur > 0;
  }

  function finishWorkout() {
    const aw = window.state.work.activeWorkout;
    if (!aw) return;

    const durationMin = Math.max(1, Math.round((Date.now() - (aw.startTime || Date.now())) / 60000));
    let totalVolume = 0;
    let totalSetsCount = 0;

    const record = {
      id: Date.now(),
      routineName: aw.routineName,
      date: window.getLocalDateStr ? window.getLocalDateStr() : new Date().toISOString().substring(0, 10),
      duration: durationMin,
      sets: []
    };

    aw.exercises.forEach(ex => {
      let validSetIdx = 0;
      ex.sets.forEach(s => {
        if (!isSetMeaningful(s)) return;
        validSetIdx++;
        totalSetsCount++;
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        if (ex.type === 'weight_reps') {
          totalVolume += w * r;
        }
        record.sets.push({
          exerciseName: ex.name,
          exerciseType: ex.type,
          primaryMuscle: ex.primaryMuscle || 'chest',
          setNumber: validSetIdx,
          weight: w,
          reps: r,
          distance: parseFloat(s.distance) || 0,
          duration: parseInt(s.duration, 10) || 0,
        });
      });
    });

    if (record.sets.length === 0) {
      alert('Заполните хотя бы один подход (вес, повторы, дистанцию или время) перед сохранением тренировки.');
      return;
    }

    const prs = window.Storage ? window.Storage.checkWorkoutPRs(record) : [];

    if (window.openModal) {
      window.openModal(`
        <div style="text-align:center; padding:6px 0;">
          <div style="font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:var(--green-btn); margin-bottom:6px;">
            Успешно завершено
          </div>
          <div class="modal-title" style="font-size:20px; margin-bottom:4px; letter-spacing:0.3px;">
            ${esc(aw.routineName.toUpperCase())}
          </div>
          <div style="color:var(--text-secondary); font-size:12.5px; margin-bottom:14px;">
            Результаты зафиксированы
          </div>

          <div class="finish-stat-grid">
            <div class="finish-stat-box">
              <div class="finish-stat-val">${Math.round(totalVolume)} кг</div>
              <div class="finish-stat-lbl">Тоннаж</div>
            </div>
            <div class="finish-stat-box">
              <div class="finish-stat-val">${durationMin} мин</div>
              <div class="finish-stat-lbl">Время</div>
            </div>
            <div class="finish-stat-box">
              <div class="finish-stat-val">${totalSetsCount}</div>
              <div class="finish-stat-lbl">Подходов</div>
            </div>
          </div>

          ${prs.length ? `
            <div class="pr-banner">
              <div class="pr-badge">ЛИЧНЫЙ РЕКОРД</div>
              <div style="font-size:13px; color:var(--text-primary); margin-top:4px;">
                ${prs.map(p => `<div><strong>${esc(p.exerciseName)}</strong>: ${p.weight} кг <span style="color:#eab308; font-weight:700;">(+${p.diff} кг)</span></div>`).join('')}
              </div>
            </div>
          ` : ''}

          <button class="btn btn-green" style="width:100%; padding:14px; margin-top:14px; font-weight:700;" onclick="confirmSaveWorkoutRecord()">
            Сохранить в статистику
          </button>
        </div>
      `);
    }

    window._pendingWorkoutRecord = record;
  }

  function confirmSaveWorkoutRecord() {
    if (window._pendingWorkoutRecord && window.Storage) {
      window.Storage.addWorkoutRecord(window._pendingWorkoutRecord);
      window._pendingWorkoutRecord = null;
    }
    if (window.stopRestTimer) window.stopRestTimer();
    window.state.work.activeWorkout = null;
    syncActiveDraft();
    if (window.closeModal) window.closeModal();
    if (window.triggerHaptic) window.triggerHaptic('success');
    if (window.switchTab) window.switchTab('stats');
  }

  // ---------------------------------------------------------------------------
  // БЛОК 6. МОДАЛЬНЫЙ РЕДАКТОР ПРОГРАММ (Workout Routine Creator & Editor)
  // ---------------------------------------------------------------------------
  let editorState = { id: null, name: '', exercises: [] };

  function openCreateWorkoutModal() {
    editorState = { id: null, name: '', exercises: [] };
    renderWorkoutEditorModal();
  }

  function openEditWorkoutModal(id) {
    const r = window.state.work.routines.find(item => item.id === id);
    if (!r) return;
    editorState = {
      id: r.id,
      name: r.name,
      exercises: r.exercises.map(e => ({
        name: e.name,
        type: e.type || 'weight_reps'
      }))
    };
    renderWorkoutEditorModal();
  }

  function syncEditorFormValues() {
    const nameInput = document.getElementById('we-name');
    if (nameInput) editorState.name = nameInput.value;
    editorState.exercises.forEach((ex, idx) => {
      const sel = document.getElementById(`we-type-${idx}`);
      if (sel) ex.type = sel.value;
    });
  }

  function getEditorExercisesHtml() {
    return editorState.exercises.map((e, idx) => `
      <div class="list-card" style="padding:10px 12px; display:flex; align-items:center; gap:8px;">
        <div class="reorder-controls">
          <button class="reorder-btn ${idx === 0 ? 'disabled' : ''}" 
                  onclick="moveEditorEx(${idx}, -1)" 
                  ${idx === 0 ? 'disabled' : ''} 
                  title="Переместить выше">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
          </button>
          <button class="reorder-btn ${idx === editorState.exercises.length - 1 ? 'disabled' : ''}" 
                  onclick="moveEditorEx(${idx}, 1)" 
                  ${idx === editorState.exercises.length - 1 ? 'disabled' : ''} 
                  title="Переместить ниже">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:12px; font-weight:700; color:var(--text-secondary);">${idx + 1}.</span>
            <div style="font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(e.name)}</div>
          </div>
          <select id="we-type-${idx}" class="form-select" style="padding:4px 8px; font-size:12px; margin-top:4px;" onchange="editorState.exercises[${idx}].type = this.value">
            <option value="weight_reps" ${e.type === 'weight_reps' ? 'selected' : ''}>С весом (кг + повторения)</option>
            <option value="bodyweight" ${e.type === 'bodyweight' ? 'selected' : ''}>Свой вес (только повторения)</option>
            <option value="distance" ${e.type === 'distance' ? 'selected' : ''}>Дистанция (км)</option>
            <option value="duration" ${e.type === 'duration' ? 'selected' : ''}>Время (сек)</option>
          </select>
        </div>
        <button class="modal-close-btn" style="width:28px; height:28px; flex-shrink:0;" onclick="removeEditorEx(${idx})" title="Удалить">✕</button>
      </div>
    `).join('');
  }

  function updateWorkoutEditorListDOM() {
    const listEl = document.getElementById('we-exercises-list');
    const countEl = document.getElementById('we-exercises-count');
    if (listEl && countEl) {
      countEl.textContent = `Упражнения (${editorState.exercises.length})`;
      listEl.innerHTML = getEditorExercisesHtml();
    } else {
      renderWorkoutEditorModal();
    }
  }

  function moveEditorEx(idx, dir) {
    syncEditorFormValues();
    const targetIdx = idx + dir;
    if (idx < 0 || idx >= editorState.exercises.length || targetIdx < 0 || targetIdx >= editorState.exercises.length) return;
    const temp = editorState.exercises[idx];
    editorState.exercises[idx] = editorState.exercises[targetIdx];
    editorState.exercises[targetIdx] = temp;
    updateWorkoutEditorListDOM();
  }

  function renderWorkoutEditorModal() {
    const isEdit = editorState.id !== null;
    if (window.openModal) {
      window.openModal(`
        <div class="modal-header">
          <div class="modal-title">${isEdit ? 'Редактировать программу' : 'Новая программа'}</div>
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
        </div>
        <div class="form-group">
          <label class="form-label">Название программы</label>
          <input id="we-name" class="form-input" placeholder="Название программы" value="${esc(editorState.name)}">
        </div>
        <div style="margin-bottom:8px;">
          <div id="we-exercises-count" style="font-size:13px; font-weight:bold; text-transform:uppercase; color:var(--text-secondary); letter-spacing:0.5px;">
            Упражнения (${editorState.exercises.length})
          </div>
        </div>
        <div id="we-exercises-list" class="item-list" style="margin-bottom:16px;">
          ${getEditorExercisesHtml()}
        </div>
        <button class="btn btn-outline" style="width:100%; margin-bottom:16px;" onclick="promptAddExercise()">+ Добавить упражнение</button>
        <button class="btn btn-green" style="width:100%;" onclick="saveEditorRoutine()">Сохранить программу</button>
      `);
    }
  }

  function promptAddExercise() {
    const name = prompt('Введите название упражнения:');
    if (name?.trim()) {
      syncEditorFormValues();
      editorState.exercises.push({ name: name.trim(), type: 'weight_reps' });
      updateWorkoutEditorListDOM();
    }
  }

  function removeEditorEx(idx) {
    syncEditorFormValues();
    editorState.exercises.splice(idx, 1);
    updateWorkoutEditorListDOM();
  }

  function saveEditorRoutine() {
    syncEditorFormValues();
    const name = editorState.name.trim();
    if (!name) return alert('Введите название программы');
    if (!editorState.exercises.length) return alert('Добавьте хотя бы одно упражнение');

    if (window.Storage) {
      window.Storage.saveRoutine({ id: editorState.id, name, exercises: editorState.exercises });
    }
    if (window.closeModal) window.closeModal();
    renderWork();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 7. ЭКСПОРТ В GLOBAL WINDOW (Module Exports)
  // ---------------------------------------------------------------------------
  window.TYPE_LABELS = TYPE_LABELS;
  window.getExerciseTypeLabel = getExerciseTypeLabel;
  window.renderStepper = renderStepper;
  window.renderWork = renderWork;
  window.startWorkout = startWorkout;
  window.renderActiveWorkoutScreen = renderActiveWorkoutScreen;
  window.moveActiveWorkoutEx = moveActiveWorkoutEx;
  window.toggleSetComplete = toggleSetComplete;
  window.stepVal = stepVal;
  window.setVal = setVal;
  window.addSet = addSet;
  window.removeSet = removeSet;
  window.finishWorkout = finishWorkout;
  window.confirmSaveWorkoutRecord = confirmSaveWorkoutRecord;
  window.deleteRoutine = deleteRoutine;
  window.editorState = editorState;
  window.openCreateWorkoutModal = openCreateWorkoutModal;
  window.openEditWorkoutModal = openEditWorkoutModal;
  window.syncEditorFormValues = syncEditorFormValues;
  window.moveEditorEx = moveEditorEx;
  window.renderWorkoutEditorModal = renderWorkoutEditorModal;
  window.promptAddExercise = promptAddExercise;
  window.removeEditorEx = removeEditorEx;
  window.saveEditorRoutine = saveEditorRoutine;
})();
