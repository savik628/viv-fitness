// =============================================================================
// VIV Fitness - Экран тренировок и активной сессии (Workout Screen)
// =============================================================================
// Назначение: Комплексное управление тренировочным процессом атлета:
// - Каталог программ тренировок (создание, запуск, редактирование, удаление);
// - Активная тренировочная сессия с динамической таблицей сетов и подходов;
// - Ввод веса и повторов через мобильный ролик-пикер (Number Picker);
// - Автоматическое сохранение добавленных упражнений в шаблон программы;
// - Синхронизация с таймером отдыха и калькулятором блинов на штангу;
// - Автоматическая детекция личных рекордов (PR) и запись в журнал истории.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. СЛОВАРЬ ТИПОВ НАГРУЗКИ И ЭКРАНИРОВАНИЕ HTML (Exercise Types & Helpers)
  // ---------------------------------------------------------------------------
  // Реестр поддерживаемых типов упражнений: силовой вес, собственный вес,
  // циклические дистанции (км) и изометрическое время (сек).
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

  // ---------------------------------------------------------------------------
  // БЛОК 1.1. СИНХРОНИЗАЦИЯ ЧЕРНОВИКА ТРЕНИРОВКИ (Active Draft Autosave)
  // ---------------------------------------------------------------------------
  // Гарантирует сохранность тренировки при случайном закрытии или перезагрузке
  // браузера, мгновенно сбрасывая состояние в LocalStorage через Storage.
  function syncActiveDraft() {
    if (!window.Storage) return;
    if (window.state?.work?.activeWorkout) {
      window.Storage.saveActiveDraft(window.state.work.activeWorkout);
    } else {
      window.Storage.clearActiveDraft();
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 1.2. КОМПОНЕНТ ЯЧЕЕК ТАБЛИЦЫ ПОДХОДОВ (Set Pill Component)
  // ---------------------------------------------------------------------------
  // Минималистичная интерактивная ячейка для отображения веса/повторов/времени.
  // При тапе открывает нативный ролик барабанного ввода (Number Picker).
  function renderSetPill(value, inputId = '', onInputClick = '', placeholder = '0') {
    const valDisplay = (value !== 0 && value !== '0' && value !== null && value !== undefined && !isNaN(value)) ? value : '';
    return `
      <div class="set-val-box col-stepper" ${onInputClick ? `onclick="${onInputClick}"` : ''} role="button" tabindex="0">
        <span ${inputId ? `id="${inputId}"` : ''} class="set-val-text ${!valDisplay ? 'placeholder' : ''}">${valDisplay || placeholder}</span>
      </div>
    `;
  }

  function renderStepper(value, onMinus, onPlus, onChange, step = 1, inputId = '', onInputClick = '') {
    return renderSetPill(value, inputId, onInputClick);
  }

  // ---------------------------------------------------------------------------
  // БЛОК 1.3. БАРАБАННЫЙ ВЫБОР ЗНАЧЕНИЙ ПОДХОДА (Set Number Wheel Picker)
  // ---------------------------------------------------------------------------
  // Конфигурирует параметры диапазона, шага и быстрых дельт для барабана
  // в зависимости от редактируемого поля (вес, повторения, дистанция, время).
  function openSetPicker(exIdx, sIdx, field) {
    const aw = window.state.work.activeWorkout;
    if (!aw || !aw.exercises[exIdx] || !aw.exercises[exIdx].sets[sIdx]) return;
    const set = aw.exercises[exIdx].sets[sIdx];
    let val = parseFloat(set[field]);
    if (isNaN(val)) {
      const inpEl = document.getElementById(`set-input-${exIdx}-${sIdx}-${field}`);
      if (inpEl) {
        val = parseFloat(inpEl.tagName === 'INPUT' ? inpEl.value : inpEl.textContent) || 0;
      } else {
        val = 0;
      }
    }

    let cfg = null;
    if (window.PickerPresets && typeof window.PickerPresets[field] === 'function') {
      cfg = window.PickerPresets[field](val, (newVal) => {
        setVal(exIdx, sIdx, field, newVal);
        const inpEl = document.getElementById(`set-input-${exIdx}-${sIdx}-${field}`);
        if (inpEl) {
          const valDisplay = (newVal !== 0 && newVal !== '0' && newVal !== null && newVal !== undefined && !isNaN(newVal)) ? newVal : '';
          if (inpEl.tagName === 'INPUT') {
            inpEl.value = valDisplay;
          } else {
            inpEl.textContent = valDisplay || (field === 'distance' ? '0.0' : '0');
            inpEl.classList.toggle('placeholder', !valDisplay);
          }
        }
      });
    } else {
      cfg = {
        title: 'Значение',
        value: val,
        min: 0,
        max: 100,
        step: 1,
        unit: '',
        deltas: [-5, -1, 1, 5],
        onConfirm: (newVal) => {
          setVal(exIdx, sIdx, field, newVal);
        }
      };
    }

    if (window.openNumberPicker) {
      window.openNumberPicker(cfg);
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 2. СПИСОК ПРОГРАММ И СТАРТ ТРЕНИРОВКИ (Routines List & Session Launcher)
  // ---------------------------------------------------------------------------
  /**
   * Отображает главный экран вкладки «Тренировка»:
   * - Если тренировка уже запущена (активна в state), мгновенно направляет на экран активной сессии.
   * - Если активной тренировки нет, рендерит список доступных программ тренировок с кнопками действий.
   * - Настраивает динамический заголовок с кнопкой быстрого создания новой программы (+).
   */
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

  /**
   * Инициализирует и запускает новую тренировочную сессию по выбранному шаблону:
   * 1. Создает объект активной сессии с фиксацией времени старта.
   * 2. Автоматически подгружает последние рабочие веса и повторы атлета для каждого упражнения из истории.
   * 3. Сохраняет черновик в LocalStorage на случай случайного перезапуска приложения.
   * 4. Переключает экран на интерактивный журнал тренировки.
   */
  function startWorkout(routineId) {
    const routine = window.state.work.routines.find(r => r.id === routineId);
    if (!routine) return;

    window.state.work.activeWorkout = {
      routineId: routine.id,
      routineName: routine.name,
      startTime: Date.now(),
      exercises: routine.exercises.map(e => {
        const lastSets = window.Storage?.getLastExerciseSets ? window.Storage.getLastExerciseSets(e.name) : null;
        const sets = (lastSets && lastSets.length > 0)
          ? lastSets.map((s, idx) => ({
              setNumber: idx + 1,
              reps: s.reps || 0,
              weight: s.weight || 0,
              distance: s.distance || 0,
              duration: s.duration || 0,
              rpe: s.rpe || '',
              completed: false,
            }))
          : [{ setNumber: 1, reps: 0, weight: 0, distance: 0, duration: 0, completed: false }];

        return {
          name: e.name,
          type: e.type || 'weight_reps',
          primaryMuscle: e.primaryMuscle || 'chest',
          sets
        };
      })
    };
    syncActiveDraft();
    renderActiveWorkoutScreen();
  }

  /**
   * Удаляет программу тренировки из хранилища после подтверждения пользователем.
   */
  function deleteRoutine(id) {
    const doDelete = () => {
      if (window.Storage) window.Storage.deleteRoutine(id);
      renderWork();
    };
    if (window.showConfirmModal) {
      window.showConfirmModal({
        title: 'Удалить программу?',
        message: 'Вы действительно хотите удалить эту программу тренировок?',
        confirmText: 'Удалить',
        confirmStyle: 'btn-danger',
        onConfirm: doDelete
      });
    } else {
      if (confirm('Вы действительно хотите удалить эту программу?')) doDelete();
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 3. ЭКРАН АКТИВНОЙ ТРЕНИРОВОЧНОЙ СЕССИИ (Active Workout Interface)
  // ---------------------------------------------------------------------------
  /**
   * Рендерит интерактивный журнал выполняемой тренировки:
   * - Карточки упражнений со стрелками изменения порядка (выше/ниже).
   * - Таблицы подходов с чекбоксами выполнения, номерами сетов и плашками выбора значений.
   * - Кнопки быстрого вызова калькулятора блинов штанги для силовых упражнений.
   * - Кнопки добавления сета, добавления нового упражнения на лету и финиша сессии.
   */
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
      window.setHeader(aw.routineName, true);
    }

    mainContent.innerHTML = `
      <div class="item-list">
        ${aw.exercises.map((ex, exIdx) => {
          const isWeight = ex.type === 'weight_reps';
          const isBodyweight = ex.type === 'bodyweight';
          const isDist = ex.type === 'distance';
          const isDur = ex.type === 'duration';

          const lastSets = window.Storage?.getLastExerciseSets ? window.Storage.getLastExerciseSets(ex.name) : null;

          return `
            <div class="card">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;">
                <div style="display:flex; align-items:flex-start; gap:8px; min-width:0; flex:1;">
                  <div class="active-ex-reorder" style="margin-top:2px; flex-shrink:0;">
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
                  <strong style="font-size:15.5px; font-weight:700; line-height:1.35; word-break:break-word; color:var(--text-primary);">${esc(ex.name)}</strong>
                </div>
                <div style="display:flex; gap:6px; align-items:center; flex-shrink:0; margin-top:1px;">
                  ${isWeight ? `
                    <button class="btn btn-outline btn-sm" style="padding:4px 8px; font-size:11.5px;" onclick="openPlateCalculatorModal(${(ex.sets?.find(s => !s.completed && parseFloat(s.weight) > 0)?.weight) || (ex.sets?.[0]?.weight) || 'null'}, ${exIdx})">
                      Блины
                    </button>
                  ` : ''}
                  <span class="badge" style="font-size:10.5px; padding:3px 6px;">${getExerciseTypeLabel(ex.type)}</span>
                  <button class="modal-close-btn" style="width:24px; height:24px; font-size:13px; opacity:0.65; margin-left:2px;" onclick="removeActiveWorkoutEx(${exIdx})" title="Удалить упражнение">✕</button>
                </div>
              </div>

              <div class="sets-table-header">
                <div class="col-check">✓</div>
                <div class="col-set-num">Сет</div>
                ${isWeight ? '<div class="col-stepper">Вес</div><div class="col-stepper">Повторы</div>' : ''}
                ${isBodyweight ? '<div class="col-stepper">Повторы</div>' : ''}
                ${isDist ? '<div class="col-stepper">Дистанция (км)</div>' : ''}
                ${isDur ? '<div class="col-stepper">Время (сек)</div>' : ''}
                <div class="col-action"></div>
              </div>
              ${ex.sets.map((s, sIdx) => {
                const ghost = (lastSets && lastSets[sIdx]) ? lastSets[sIdx] : (lastSets && lastSets[0]) ? lastSets[0] : null;
                const ghostWeight = ghost && ghost.weight ? ghost.weight : '0';
                const ghostReps = ghost && ghost.reps ? ghost.reps : '0';
                const ghostDist = ghost && ghost.distance ? ghost.distance : '0.0';
                const ghostDur = ghost && ghost.duration ? ghost.duration : '0';

                return `
                  <div id="set-row-${exIdx}-${sIdx}" class="sets-table-row ${s.completed ? 'completed' : ''}">
                    <div class="col-check">
                      <button id="set-check-${exIdx}-${sIdx}" class="set-check-btn ${s.completed ? 'checked' : ''}" onclick="toggleSetComplete(${exIdx}, ${sIdx})" title="Отметить подход">✓</button>
                    </div>
                    <div class="col-set-num">${s.setNumber}</div>
                    ${isWeight ? `
                      ${renderSetPill(s.weight, `set-input-${exIdx}-${sIdx}-weight`, `openSetPicker(${exIdx},${sIdx},'weight')`, ghostWeight)}
                      ${renderSetPill(s.reps, `set-input-${exIdx}-${sIdx}-reps`, `openSetPicker(${exIdx},${sIdx},'reps')`, ghostReps)}
                    ` : ''}
                    ${isBodyweight ? renderSetPill(s.reps, `set-input-${exIdx}-${sIdx}-reps`, `openSetPicker(${exIdx},${sIdx},'reps')`, ghostReps) : ''}
                    ${isDist ? renderSetPill(s.distance, `set-input-${exIdx}-${sIdx}-distance`, `openSetPicker(${exIdx},${sIdx},'distance')`, ghostDist) : ''}
                    ${isDur ? renderSetPill(s.duration, `set-input-${exIdx}-${sIdx}-duration`, `openSetPicker(${exIdx},${sIdx},'duration')`, ghostDur) : ''}
                    <div class="col-action">
                      <button class="modal-close-btn" style="width:24px; height:24px; font-size:14px;" onclick="removeSet(${exIdx}, ${sIdx})">✕</button>
                    </div>
                  </div>
                `;
              }).join('')}
              <button class="btn btn-secondary btn-sm" onclick="addSet(${exIdx})" style="margin-top:6px;">+ Добавить подход</button>
            </div>
          `;
        }).join('')}
        <button class="btn btn-outline" onclick="openAddExerciseToActiveWorkoutModal()" style="width:100%; margin-top:10px; margin-bottom:10px; padding:13px; font-weight:700; border-style:dashed; display:flex; align-items:center; justify-content:center; gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Добавить упражнение
        </button>
        <button class="btn btn-green" onclick="finishWorkout()" style="width:100%; margin-top:4px; padding:14px; font-weight:700;">
          Завершить тренировку
        </button>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4. УПРАВЛЕНИЕ ПОДХОДАМИ И ПОРЯДКОМ УПРАЖНЕНИЙ (Sets Manipulation & Reordering)
  // ---------------------------------------------------------------------------
  /**
   * Перерисовывает экран активной тренировки с сохранением точного положения скролла.
   * Предотвращает дергание экрана при добавлении или удалении подходов.
   */
  function rerenderActiveWorkoutPreservingScroll() {
    const mainContent = document.getElementById('main-content');
    const prevScroll = mainContent ? mainContent.scrollTop : 0;
    renderActiveWorkoutScreen();
    if (mainContent) mainContent.scrollTop = prevScroll;
  }

  /**
   * Перемещает упражнение вверх (-1) или вниз (+1) в списке выполняемой тренировки.
   */
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

  /**
   * Переключает статус выполнения подхода (выполнен/не выполнен):
   * - Обеспечивает тактильный отклик (Haptic Feedback) на мобильных устройствах.
   * - При отметке подхода автоматически подставляет значения из подсказки (Ghost values), если поля пустые.
   * - Автоматически запускает таймер отдыха между сетами.
   * - Локально обновляет CSS-классы строки и синхронизирует черновик без полной перерисовки.
   */
  function toggleSetComplete(exIdx, sIdx) {
    const ex = window.state.work.activeWorkout.exercises[exIdx];
    const set = ex.sets[sIdx];
    set.completed = !set.completed;
    if (window.triggerHaptic) window.triggerHaptic('impact');

    // Если сет отмечается как выполненный и значения пусты, подставляем плейсхолдер/предыдущие значения
    if (set.completed) {
      const lastSets = window.Storage?.getLastExerciseSets ? window.Storage.getLastExerciseSets(ex.name) : null;
      const ghost = (lastSets && lastSets[sIdx]) ? lastSets[sIdx] : (lastSets && lastSets[0]) ? lastSets[0] : null;

      if ((!set.weight || set.weight === 0) && ghost && ghost.weight) {
        set.weight = ghost.weight;
      }
      if ((!set.reps || set.reps === 0) && ghost && ghost.reps) {
        set.reps = ghost.reps;
      }
      if ((!set.distance || set.distance === 0) && ghost && ghost.distance) {
        set.distance = ghost.distance;
      }
      if ((!set.duration || set.duration === 0) && ghost && ghost.duration) {
        set.duration = ghost.duration;
      }

      if (window.startRestTimer) {
        window.startRestTimer();
      }
    }

    const rowEl = document.getElementById(`set-row-${exIdx}-${sIdx}`);
    const btnEl = document.getElementById(`set-check-${exIdx}-${sIdx}`);
    if (rowEl && btnEl) {
      rowEl.classList.toggle('completed', set.completed);
      btnEl.classList.toggle('checked', set.completed);
      syncActiveDraft();
      // Обновляем ячейки веса и повторов, если они заполнились
      const wEl = document.getElementById(`set-input-${exIdx}-${sIdx}-weight`);
      if (wEl && set.weight) {
        wEl.textContent = set.weight;
        wEl.classList.remove('placeholder');
      }
      const rEl = document.getElementById(`set-input-${exIdx}-${sIdx}-reps`);
      if (rEl && set.reps) {
        rEl.textContent = set.reps;
        rEl.classList.remove('placeholder');
      }
    } else {
      rerenderActiveWorkoutPreservingScroll();
    }
  }

  /**
   * Записывает числовое значение поля подхода (вес, повторы, дистанция, время)
   * с валидацией неотрицательности и округлением повторений/секунд.
   */
  function setVal(exIdx, sIdx, field, val) {
    const set = window.state.work.activeWorkout.exercises[exIdx].sets[sIdx];
    const num = Math.max(0, parseFloat(val) || 0);
    set[field] = (field === 'reps' || field === 'duration') ? Math.round(num) : num;
    syncActiveDraft();
  }

  /**
   * Добавляет новый подход к упражнению, дублируя рабочие веса и повторы предыдущего сета.
   */
  function addSet(exIdx) {
    const sets = window.state.work.activeWorkout.exercises[exIdx].sets;
    const last = sets[sets.length - 1] || { reps: 0, weight: 0, distance: 0, duration: 0 };
    sets.push({ ...last, setNumber: sets.length + 1, completed: false });
    rerenderActiveWorkoutPreservingScroll();
  }

  /**
   * Удаляет выбранный подход и пересчитывает порядковые номера оставшихся сетов.
   */
  function removeSet(exIdx, sIdx) {
    const sets = window.state.work.activeWorkout.exercises[exIdx].sets;
    if (sets.length <= 1) {
      if (window.showAlertModal) {
        window.showAlertModal({
          title: 'Внимание',
          message: 'Тренировка должна содержать хотя бы 1 подход.'
        });
      } else {
        alert('Тренировка должна содержать хотя бы 1 подход');
      }
      return;
    }
    sets.splice(sIdx, 1);
    sets.forEach((s, idx) => s.setNumber = idx + 1);
    rerenderActiveWorkoutPreservingScroll();
  }

  /**
   * Удаляет упражнение из активной тренировки с защитой от случайного удаления выполненных сетов.
   */
  function removeActiveWorkoutEx(exIdx) {
    const aw = window.state.work.activeWorkout;
    if (!aw || !aw.exercises) return;
    if (aw.exercises.length <= 1) {
      if (window.showAlertModal) {
        window.showAlertModal({
          title: 'Внимание',
          message: 'Тренировка должна содержать хотя бы одно упражнение.'
        });
      } else {
        alert('Тренировка должна содержать хотя бы одно упражнение');
      }
      return;
    }
    const ex = aw.exercises[exIdx];
    const hasCompleted = ex.sets?.some(s => s.completed);
    const doRemove = () => {
      aw.exercises.splice(exIdx, 1);
      syncActiveDraft();
      if (window.triggerHaptic) window.triggerHaptic('light');
      rerenderActiveWorkoutPreservingScroll();
    };

    if (hasCompleted) {
      if (window.showConfirmModal) {
        window.showConfirmModal({
          title: 'Удалить упражнение?',
          message: `Удалить упражнение «${ex.name}» и его выполненные подходы?`,
          confirmText: 'Удалить',
          confirmStyle: 'btn-danger',
          onConfirm: doRemove
        });
      } else {
        if (confirm(`Удалить упражнение «${ex.name}» и его выполненные подходы?`)) {
          doRemove();
        }
      }
    } else {
      doRemove();
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4.1. ЕДИНЫЙ СЕЛЕКТОР УПРАЖНЕНИЙ И КАТАЛОГ (Unified Exercise Selector)
  // ---------------------------------------------------------------------------
  const BASE_EXERCISES = [
    { name: 'Жим лежа со штангой', type: 'weight_reps' },
    { name: 'Приседания со штангой', type: 'weight_reps' },
    { name: 'Становая тяга', type: 'weight_reps' },
    { name: 'Жим гантелей сидя', type: 'weight_reps' },
    { name: 'Подтягивания', type: 'bodyweight' },
    { name: 'Отжимания на брусьях', type: 'bodyweight' },
    { name: 'Тяга штанги в наклоне', type: 'weight_reps' },
    { name: 'Сгибания рук на бицепс', type: 'weight_reps' },
    { name: 'Французский жим', type: 'weight_reps' },
    { name: 'Разгибания на трицепс в блоке', type: 'weight_reps' },
    { name: 'Выпады с гантелями', type: 'weight_reps' },
    { name: 'Жим ногами в тренажере', type: 'weight_reps' },
    { name: 'Планка', type: 'duration' },
    { name: 'Скручивания на пресс', type: 'bodyweight' },
    { name: 'Бег', type: 'distance' },
    { name: 'Велотренажер', type: 'duration' },
    { name: 'Гиперэкстензия', type: 'bodyweight' }
  ];

  let _selectorSelectedCategory = 'all';

  function getAllAvailableExercises() {
    const map = new Map();
    const catalog = window.EXERCISE_CATALOG || BASE_EXERCISES;
    catalog.forEach(e => {
      map.set(e.name.toLowerCase().trim(), { 
        name: e.name, 
        type: e.type || 'weight_reps',
        category: e.category || 'other',
        categoryLabel: window.getCategoryLabel ? window.getCategoryLabel(e.category) : 'Другое'
      });
    });

    try {
      const routines = window.Storage?.getRoutines ? window.Storage.getRoutines() : [];
      routines.forEach(r => {
        if (Array.isArray(r.exercises)) {
          r.exercises.forEach(e => {
            if (e && e.name) {
              const key = e.name.toLowerCase().trim();
              if (!map.has(key)) {
                const meta = window.getExerciseMeta ? window.getExerciseMeta(e.name) : null;
                map.set(key, { 
                  name: e.name.trim(), 
                  type: e.type || (meta ? meta.type : 'weight_reps'),
                  category: meta ? meta.category : 'other',
                  categoryLabel: meta ? window.getCategoryLabel(meta.category) : 'Мои'
                });
              }
            }
          });
        }
      });
      const history = window.Storage?.getWorkoutHistory ? window.Storage.getWorkoutHistory() : [];
      history.forEach(h => {
        if (Array.isArray(h.sets)) {
          h.sets.forEach(s => {
            if (s && s.exerciseName) {
              const key = s.exerciseName.toLowerCase().trim();
              if (!map.has(key)) {
                const meta = window.getExerciseMeta ? window.getExerciseMeta(s.exerciseName) : null;
                map.set(key, { 
                  name: s.exerciseName.trim(), 
                  type: s.exerciseType || (meta ? meta.type : 'weight_reps'),
                  category: meta ? meta.category : 'other',
                  categoryLabel: meta ? window.getCategoryLabel(meta.category) : 'История'
                });
              }
            }
          });
        }
      });
    } catch (e) {
      console.warn('getAllAvailableExercises error:', e);
    }
    return Array.from(map.values());
  }

  let _selectorOnSelect = null;

  function renderSelectorExerciseListHTML(filteredList) {
    if (!filteredList.length) {
      return `<div style="text-align:center; padding:16px; font-size:12.5px; color:var(--text-secondary);">Упражнение не найдено в каталоге. Вы можете ввести своё название выше и добавить его.</div>`;
    }

    return filteredList.slice(0, 30).map(e => `
      <div class="selector-ex-item" 
           style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--card-bg, #14181c); border:1px solid var(--border-color, #1c2229); border-radius:10px; margin-bottom:6px; cursor:pointer;" 
           onclick="selectExerciseFromSuggestion('${esc(e.name)}', '${e.type}')">
        <div style="flex:1; min-width:0; padding-right:8px;">
          <div style="font-weight:600; font-size:14px; color:var(--text-primary); line-height:1.3; word-break:break-word;">${esc(e.name)}</div>
          <div style="font-size:10.5px; color:var(--text-secondary); text-transform:uppercase; margin-top:2px;">${esc(e.categoryLabel || '')}</div>
        </div>
        <span style="font-size:11px; color:var(--text-secondary); text-transform:uppercase; background:rgba(255,255,255,0.06); padding:3px 6px; border-radius:4px; flex-shrink:0;">
          ${getExerciseTypeLabel(e.type)}
        </span>
      </div>
    `).join('');
  }

  function openExerciseSelectorModal({ title = 'Выбор упражнения', onSelect } = {}) {
    _selectorOnSelect = onSelect;
    _selectorSelectedCategory = 'all';
    const all = getAllAvailableExercises();
    window._cachedSelectorExercises = all;

    const categories = window.EXERCISE_CATEGORIES || [
      { id: 'all', label: 'Все' },
      { id: 'chest', label: 'Грудь' },
      { id: 'back', label: 'Спина' },
      { id: 'shoulders', label: 'Плечи' },
      { id: 'legs', label: 'Ноги' },
      { id: 'arms', label: 'Руки' },
      { id: 'core', label: 'Кор' },
      { id: 'cardio', label: 'Кардио' }
    ];

    const categoryChipsHtml = `
      <div id="selector-category-chips" style="display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin-bottom:12px; -webkit-overflow-scrolling:touch; scrollbar-width:none;">
        ${categories.map(c => `
          <button type="button" class="chip-btn ${c.id === 'all' ? 'active' : ''}" 
                  data-cat="${c.id}"
                  onclick="filterSelectorModalCategory('${c.id}')"
                  style="padding:5px 12px; border-radius:18px; font-size:11.5px; font-weight:700; white-space:nowrap; border:1px solid ${c.id === 'all' ? 'var(--accent-color, #DFFF00)' : 'var(--border-color, #1c2229)'}; background:${c.id === 'all' ? 'var(--accent-color, #DFFF00)' : 'var(--card-bg, #14181c)'}; color:${c.id === 'all' ? '#000' : 'var(--text-secondary)'}; cursor:pointer;">
            ${esc(c.label)}
          </button>
        `).join('')}
      </div>
    `;

    const listHtml = renderSelectorExerciseListHTML(all);

    if (window.openModal) {
      window.openModal(`
        <div style="padding:4px 0;">
          <div style="font-size:18px; font-weight:800; margin-bottom:12px; text-align:center;">${esc(title)}</div>
          
          <div style="margin-bottom:10px;">
            <input id="selector-ex-search" class="form-input" placeholder="Поиск по 100+ упражнениям..." autocomplete="off" autofocus oninput="filterExerciseSelectorList()" onkeydown="if(event.key==='Enter'){event.preventDefault();confirmSelectorExercise();}">
          </div>

          ${categoryChipsHtml}

          <div style="margin-bottom:12px;">
            <label style="display:block; font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:4px;">Тип нагрузки</label>
            <select id="selector-ex-type" class="form-select" style="padding:8px 12px; font-size:13px;">
              <option value="weight_reps">С весом (вес × повторы)</option>
              <option value="bodyweight">Свой вес (повторы)</option>
              <option value="distance">Дистанция (км / метры)</option>
              <option value="duration">Время (секунды / мин)</option>
            </select>
          </div>

          <div style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:6px;">Каталог упражнений</div>
          <div id="selector-ex-list" style="max-height:200px; overflow-y:auto; margin-bottom:16px; padding-right:2px;">
            ${listHtml}
          </div>

          <div style="display:flex; gap:10px;">
            <button class="btn btn-secondary" style="flex:1;" onclick="if(window.closeModal)window.closeModal();">Отмена</button>
            <button class="btn btn-green" style="flex:1; font-weight:700;" onclick="confirmSelectorExercise()">+ Добавить</button>
          </div>
        </div>
      `);
    }

    setTimeout(() => {
      const inp = document.getElementById('selector-ex-search');
      if (inp) inp.focus();
    }, 100);
  }

  function filterSelectorModalCategory(catId) {
    _selectorSelectedCategory = catId;
    const chipsContainer = document.getElementById('selector-category-chips');
    if (chipsContainer) {
      const buttons = chipsContainer.querySelectorAll('button');
      buttons.forEach(btn => {
        const isCurrent = btn.getAttribute('data-cat') === catId;
        btn.style.borderColor = isCurrent ? 'var(--accent-color, #DFFF00)' : 'var(--border-color, #1c2229)';
        btn.style.backgroundColor = isCurrent ? 'var(--accent-color, #DFFF00)' : 'var(--card-bg, #14181c)';
        btn.style.color = isCurrent ? '#000' : 'var(--text-secondary)';
      });
    }
    filterExerciseSelectorList();
  }

  function filterExerciseSelectorList() {
    const container = document.getElementById('selector-ex-list');
    const searchInp = document.getElementById('selector-ex-search');
    if (!container) return;

    const q = (searchInp?.value || '').toLowerCase().trim();
    const cat = _selectorSelectedCategory || 'all';
    const all = window._cachedSelectorExercises || getAllAvailableExercises();

    const filtered = all.filter(e => {
      const matchCat = cat === 'all' || e.category === cat;
      const matchSearch = !q || e.name.toLowerCase().includes(q) || (e.categoryLabel && e.categoryLabel.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });

    container.innerHTML = renderSelectorExerciseListHTML(filtered);
  }

  function selectExerciseFromSuggestion(name, type) {
    const searchInp = document.getElementById('selector-ex-search');
    const typeSel = document.getElementById('selector-ex-type');
    if (searchInp) searchInp.value = name;
    if (typeSel && type) typeSel.value = type;
  }

  function confirmSelectorExercise() {
    const searchInp = document.getElementById('selector-ex-search');
    const typeSel = document.getElementById('selector-ex-type');
    const name = searchInp ? searchInp.value.trim() : '';
    const type = typeSel ? typeSel.value : 'weight_reps';

    if (!name) {
      if (window.showAlertModal) {
        window.showAlertModal({ title: 'Внимание', message: 'Введите название упражнения' });
      } else {
        alert('Введите название упражнения');
      }
      return;
    }

    if (window.closeModal) window.closeModal();

    if (typeof _selectorOnSelect === 'function') {
      _selectorOnSelect({ name, type });
      _selectorOnSelect = null;
    }
  }

  /**
   * Открывает единый селектор добавления упражнения в активную тренировку.
   */
  function openAddExerciseToActiveWorkoutModal() {
    openExerciseSelectorModal({
      title: 'Добавить в тренировку',
      onSelect: ({ name, type }) => {
        addExerciseToActiveWorkout({ name, type });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4.2. АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ УПРАЖНЕНИЙ С ШАБЛОНОМ (Routine Template Persistence)
  // ---------------------------------------------------------------------------
  /**
   * Навсегда сохраняет добавленное во время тренировки упражнение в исходную программу тренировок.
   * Если пользователь добавил упражнение на ходу, оно навсегда остается в шаблоне этой тренировки.
   */
  function persistExerciseToRoutine(routineId, routineName, newEx) {
    if (!window.Storage || !newEx || !newEx.name) return;
    try {
      const routines = window.Storage.getRoutines ? window.Storage.getRoutines() : [];
      const target = routines.find(r => (routineId && String(r.id) === String(routineId)) || (r.name && routineName && r.name.trim().toLowerCase() === routineName.trim().toLowerCase()));
      if (!target) return;
      if (!Array.isArray(target.exercises)) target.exercises = [];
      const exNameClean = newEx.name.trim().toLowerCase();
      const exists = target.exercises.some(e => e.name && e.name.trim().toLowerCase() === exNameClean);
      if (!exists) {
        target.exercises.push({
          name: newEx.name.trim(),
          type: newEx.type || 'weight_reps',
          primaryMuscle: newEx.primaryMuscle || 'chest',
          defaultSets: 3,
          defaultReps: 10
        });
        window.Storage.saveRoutine(target);
        if (window.state?.work?.routines) {
          const idx = window.state.work.routines.findIndex(r => String(r.id) === String(target.id));
          if (idx !== -1) window.state.work.routines[idx] = target;
          else window.state.work.routines.push(target);
        }
      }
    } catch (e) {
      console.warn('persistExerciseToRoutine error:', e);
    }
  }

  /**
   * Добавляет упражнение в активную тренировочную сессию с авто-подтягиванием весов из истории.
   */
  function addExerciseToActiveWorkout({ name, type = 'weight_reps' }) {
    const aw = window.state?.work?.activeWorkout;
    if (!aw) return;
    if (!aw.exercises) aw.exercises = [];

    const lastSets = window.Storage?.getLastExerciseSets ? window.Storage.getLastExerciseSets(name) : null;
    const sets = (lastSets && lastSets.length > 0)
      ? lastSets.map((s, idx) => ({
          setNumber: idx + 1,
          reps: s.reps || 0,
          weight: s.weight || 0,
          distance: s.distance || 0,
          duration: s.duration || 0,
          completed: false
        }))
      : [{ setNumber: 1, reps: 0, weight: 0, distance: 0, duration: 0, completed: false }];

    const newExerciseObj = {
      name,
      type: type || 'weight_reps',
      primaryMuscle: 'all',
      sets
    };
    aw.exercises.push(newExerciseObj);

    // Автоматически навсегда сохраняем упражнение в текущую программу тренировки
    persistExerciseToRoutine(aw.routineId, aw.routineName, newExerciseObj);

    syncActiveDraft();
    if (window.triggerHaptic) window.triggerHaptic('success');
    rerenderActiveWorkoutPreservingScroll();
  }

  /**
   * Подтверждает создание упражнения в активной сессии (для обратной совместимости).
   */
  function confirmAddActiveExercise() {
    const nameInp = document.getElementById('active-new-ex-name');
    const typeSel = document.getElementById('active-new-ex-type');
    const name = nameInp ? nameInp.value.trim() : '';
    if (!name) {
      if (window.showAlertModal) {
        window.showAlertModal({ title: 'Внимание', message: 'Пожалуйста, введите название упражнения' });
      } else {
        alert('Пожалуйста, введите название упражнения');
      }
      return;
    }

    const type = typeSel ? typeSel.value : 'weight_reps';
    addExerciseToActiveWorkout({ name, type });
    if (window.closeModal) window.closeModal();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 5. ЗАВЕРШЕНИЕ ТРЕНИРОВКИ И АВТО-ДЕТЕКЦИЯ РЕКОРДОВ (Finish Workout & PRs)
  // ---------------------------------------------------------------------------
  /**
   * Проверяет, содержит ли подход фактическую полезную нагрузку:
   * отсекает пустые подходы с нулевыми значениями веса, повторений, дистанции и времени.
   */
  function isSetMeaningful(s) {
    const w = parseFloat(s.weight) || 0;
    const r = parseInt(s.reps, 10) || 0;
    const dist = parseFloat(s.distance) || 0;
    const dur = parseInt(s.duration, 10) || 0;
    return w > 0 || r > 0 || dist > 0 || dur > 0;
  }

  /**
   * Завершает текущую тренировочную сессию:
   * 1. Рассчитывает длительность тренировки в минутах.
   * 2. Вычисляет суммарный чистый тоннаж сессии (вес * повторения) и количество рабочих подходов.
   * 3. Формирует структурированную запись для истории тренировок.
   * 4. Проверяет установление новых личных рекордов (PR) через аналитическое ядро Storage.
   * 5. Показывает победное модальное окно с метриками и баннером рекорда.
   */
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

    const anyCompleted = aw.exercises.some(ex => ex.sets.some(s => s.completed));

    aw.exercises.forEach(ex => {
      let validSetIdx = 0;
      ex.sets.forEach(s => {
        if (anyCompleted && !s.completed) return;
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
      if (window.showAlertModal) {
        window.showAlertModal({
          title: 'Тренировка пуста',
          message: 'Заполните хотя бы один подход (вес, повторы, дистанцию или время) перед сохранением тренировки.'
        });
      } else {
        alert('Заполните хотя бы один подход (вес, повторы, дистанцию или время) перед сохранением тренировки.');
      }
      return;
    }

    const metrics = (window.Storage && window.Storage.calculateSessionMetrics)
      ? window.Storage.calculateSessionMetrics(record.sets)
      : { totalVolume, pureVolume: totalVolume, totalSets: totalSetsCount };

    totalVolume = metrics.pureVolume || metrics.totalVolume;
    totalSetsCount = metrics.totalSets;

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

  /**
   * Фиксирует тренировку в постоянной базе данных IndexedDB/LocalStorage:
   * 1. Записывает результат сессии в журнал тренировок.
   * 2. Гарантированно сохраняет структуру упражнений в шаблон программы.
   * 3. Останавливает таймер отдыха, сбрасывает черновик активной сессии.
   * 4. Мгновенно переводит атлета на экран «Статистика» для просмотра результатов и отчёта.
   */
  function confirmSaveWorkoutRecord() {
    if (window._pendingWorkoutRecord && window.Storage) {
      window.Storage.addWorkoutRecord(window._pendingWorkoutRecord);
      window._pendingWorkoutRecord = null;
    }
    const aw = window.state?.work?.activeWorkout;
    if (aw && Array.isArray(aw.exercises)) {
      aw.exercises.forEach(ex => {
        persistExerciseToRoutine(aw.routineId, aw.routineName, ex);
      });
    }
    if (window.stopRestTimer) window.stopRestTimer();
    window.state.work.activeWorkout = null;
    syncActiveDraft();
    if (window.closeModal) window.closeModal();
    if (window.triggerHaptic) window.triggerHaptic('success');
    if (window.switchTab) window.switchTab('stats');
  }

  // ---------------------------------------------------------------------------
  // БЛОК 6. МОДАЛЬНЫЙ КОНСТРУКТОР И РЕДАКТОР ПРОГРАММ (Workout Routine Creator & Editor)
  // ---------------------------------------------------------------------------
  /**
   * Локальное состояние редактируемой или создаваемой программы тренировок.
   * id: null при создании новой программы, либо числовой ID существующей.
   */
  let editorState = { id: null, name: '', exercises: [] };

  /**
   * Открывает диалоговое окно создания новой программы с чистым состоянием.
   */
  function openCreateWorkoutModal() {
    editorState = { id: null, name: '', exercises: [] };
    renderWorkoutEditorModal();
  }

  /**
   * Открывает модальное окно для редактирования существующей программы по ID:
   * копирует упражнения и их типы нагрузки в буфер editorState.
   */
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

  /**
   * Считывает текущие значения из DOM инпутов модального окна в объект editorState.
   */
  function syncEditorFormValues() {
    const nameInput = document.getElementById('we-name');
    if (nameInput) editorState.name = nameInput.value;
    editorState.exercises.forEach((ex, idx) => {
      const sel = document.getElementById(`we-type-${idx}`);
      if (sel) ex.type = sel.value;
    });
  }

  /**
   * Генерирует HTML-разметку карточек упражнений для конструктора программы:
   * включает кнопки изменения очередности (вверх/вниз), поле выбора типа нагрузки и кнопку удаления.
   */
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
          <div style="display:flex; align-items:flex-start; gap:6px;">
            <span style="font-size:12px; font-weight:700; color:var(--text-secondary); margin-top:2px;">${idx + 1}.</span>
            <div style="font-weight:600; font-size:14px; line-height:1.35; word-break:break-word; color:var(--text-primary);">${esc(e.name)}</div>
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

  /**
   * Точечно обновляет DOM списка упражнений в открытом модальном окне редактора
   * без перезапуска всей модалки, чтобы не сбивать фокус ввода.
   */
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

  /**
   * Меняет порядок упражнения в конструкторе программы (выше/ниже).
   */
  function moveEditorEx(idx, dir) {
    syncEditorFormValues();
    const targetIdx = idx + dir;
    if (idx < 0 || idx >= editorState.exercises.length || targetIdx < 0 || targetIdx >= editorState.exercises.length) return;
    const temp = editorState.exercises[idx];
    editorState.exercises[idx] = editorState.exercises[targetIdx];
    editorState.exercises[targetIdx] = temp;
    updateWorkoutEditorListDOM();
  }

  /**
   * Рендерит полное модальное окно конструктора программы тренировки.
   */
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
        <button class="btn btn-outline" onclick="promptAddExercise()" style="width:100%; margin-top:6px; margin-bottom:16px; padding:13px; font-weight:700; border-style:dashed; display:flex; align-items:center; justify-content:center; gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Добавить упражнение
        </button>
        <button class="btn btn-green" style="width:100%;" onclick="saveEditorRoutine()">Сохранить программу</button>
      `);
    }
  }

  /**
   * Добавляет новое упражнение в список конструктора из текстового поля ввода.
   */
  function addEditorExerciseFromInput() {
    const inp = document.getElementById('we-new-ex-input');
    const name = inp?.value.trim();
    if (name) {
      syncEditorFormValues();
      editorState.exercises.push({ name, type: 'weight_reps' });
      updateWorkoutEditorListDOM();
      if (inp) {
        inp.value = '';
        inp.focus();
      }
    }
  }

  /**
   * Открывает единый каталог и селектор для добавления упражнения в конструктор программы.
   */
  function promptAddExercise() {
    syncEditorFormValues();
    openExerciseSelectorModal({
      title: 'Добавить в программу',
      onSelect: ({ name, type }) => {
        editorState.exercises.push({ name, type: type || 'weight_reps' });
        renderWorkoutEditorModal();
      }
    });
  }

  /**
   * Удаляет упражнение из списка конструктора по индексу.
   */
  function removeEditorEx(idx) {
    syncEditorFormValues();
    editorState.exercises.splice(idx, 1);
    updateWorkoutEditorListDOM();
  }

  /**
   * Валидирует и сохраняет готовую программу в постоянное хранилище Storage,
   * закрывает окно редактора и перерисовывает список программ на главном экране.
   */
  function saveEditorRoutine() {
    syncEditorFormValues();
    const name = editorState.name.trim();
    if (!name) {
      if (window.showAlertModal) {
        window.showAlertModal({ title: 'Внимание', message: 'Введите название программы' });
      } else {
        alert('Введите название программы');
      }
      return;
    }
    if (!editorState.exercises.length) {
      if (window.showAlertModal) {
        window.showAlertModal({ title: 'Внимание', message: 'Добавьте хотя бы одно упражнение' });
      } else {
        alert('Добавьте хотя бы одно упражнение');
      }
      return;
    }

    if (window.Storage) {
      window.Storage.saveRoutine({ id: editorState.id, name, exercises: editorState.exercises });
    }
    if (window.closeModal) window.closeModal();
    renderWork();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 7. ЭКСПОРТ В GLOBAL WINDOW (Module Exports)
  // ---------------------------------------------------------------------------
  /**
   * Публичный интерфейс модуля тренировок, связывающий экранные компоненты VIV.
   */
  window.TYPE_LABELS = TYPE_LABELS;
  window.getExerciseTypeLabel = getExerciseTypeLabel;
  window.renderStepper = renderStepper;
  window.renderSetPill = renderSetPill;
  window.renderWork = renderWork;
  window.startWorkout = startWorkout;
  window.renderActiveWorkoutScreen = renderActiveWorkoutScreen;
  window.moveActiveWorkoutEx = moveActiveWorkoutEx;
  window.toggleSetComplete = toggleSetComplete;
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
  window.addEditorExerciseFromInput = addEditorExerciseFromInput;
  window.removeEditorEx = removeEditorEx;
  window.removeActiveWorkoutEx = removeActiveWorkoutEx;
  window.openAddExerciseToActiveWorkoutModal = openAddExerciseToActiveWorkoutModal;
  window.confirmAddActiveExercise = confirmAddActiveExercise;
  window.addExerciseToActiveWorkout = addExerciseToActiveWorkout;
  window.openExerciseSelectorModal = openExerciseSelectorModal;
  window.filterSelectorModalCategory = filterSelectorModalCategory;
  window.filterExerciseSelectorList = filterExerciseSelectorList;
  window.selectExerciseFromSuggestion = selectExerciseFromSuggestion;
  window.confirmSelectorExercise = confirmSelectorExercise;
  window.saveEditorRoutine = saveEditorRoutine;
  window.openSetPicker = openSetPicker;
})();
