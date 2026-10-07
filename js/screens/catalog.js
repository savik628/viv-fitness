// VIV Fitness - Catalog Screen (Screen 1: Каталог упражнений)
// Поиск, фильтрация по снарядам, анатомические категории, просмотр упражнения и добавление

(function () {
  'use strict';

  const EQUIPMENT_OPTIONS = [
    { id: 'all', label: 'Все' },
    { id: 'barbell', label: 'Штанга' },
    { id: 'dumbbell', label: 'Гантели' },
    { id: 'bodyweight', label: 'Свой вес' },
    { id: 'machine', label: 'Тренажеры' },
    { id: 'cable', label: 'Блочные' },
  ];

  function matchesEquipment(exEquipment, filterId) {
    if (filterId === 'all') return true;
    const eq = (exEquipment || '').toLowerCase();
    if (filterId === 'barbell') return eq.includes('barbell') || eq.includes('штанга') || eq.includes('ez');
    if (filterId === 'dumbbell') return eq.includes('dumbbell') || eq.includes('гантел');
    if (filterId === 'bodyweight') return eq.includes('body') || eq.includes('свой вес') || eq.includes('none') || eq === '';
    if (filterId === 'machine') return eq.includes('machine') || eq.includes('тренажер');
    if (filterId === 'cable') return eq.includes('cable') || eq.includes('блок');
    return true;
  }

  async function renderHome() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const catalog = await window.Storage.initCatalog();
    window.state.home.allExercises = catalog.exercises || [];

    const isSearching = window.state.home.searchQuery.trim().length > 0;
    const isFiltered = window.state.home.selectedEquipment !== 'all';

    // 1. Поисковая строка и фильтры снарядов
    const searchAndChipsHtml = `
      <div class="search-container">
        <div class="search-icon-wrapper">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <input 
          id="catalog-search-input" 
          class="search-input" 
          type="search" 
          placeholder="Поиск по 886 упражнениям..." 
          value="${window.state.home.searchQuery}"
          oninput="onCatalogSearch(this.value)"
        >
        ${window.state.home.searchQuery ? `<button class="search-clear-btn" onclick="clearCatalogSearch()">✕</button>` : ''}
      </div>
      <div class="filter-chips-container">
        ${EQUIPMENT_OPTIONS.map(opt => `
          <button 
            class="filter-chip ${window.state.home.selectedEquipment === opt.id ? 'active' : ''}" 
            onclick="selectEquipmentFilter('${opt.id}')"
          >${opt.label}</button>
        `).join('')}
      </div>
    `;

    // 2. Если активен поиск или фильтр по снаряду — показываем отфильтрованные карточки
    if (isSearching || isFiltered) {
      if (window.setHeader) window.setHeader('Каталог', isSearching || isFiltered);
      const query = window.state.home.searchQuery.toLowerCase().trim();
      
      let filtered = window.state.home.allExercises.filter(ex => {
        const matchText = !query || ex.name.toLowerCase().includes(query) || (ex.primaryMuscles || '').toLowerCase().includes(query);
        const matchEq = matchesEquipment(ex.equipment, window.state.home.selectedEquipment);
        return matchText && matchEq;
      });

      window.state.home.exercises = filtered;

      mainContent.innerHTML = `
        ${searchAndChipsHtml}
        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
          Найдено: <strong>${filtered.length}</strong> упражнений
        </div>
        ${filtered.length === 0 ? `
          <div style="text-align:center; padding:40px 0; color:var(--text-secondary)">
            Ничего не найдено
          </div>
        ` : `
          <div class="item-list">
            ${filtered.slice(0, 80).map(ex => `
              <div class="list-card" onclick="openExerciseDetail('${ex.id}')">
                <div style="min-width:0; flex:1;">
                  <div class="list-card-title">${ex.name}</div>
                  <div class="list-card-subtitle">${ex.equipment || 'Без снаряда'} • ${ex.primaryMuscles || ''}</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            `).join('')}
          </div>
        `}
      `;
      return;
    }

    // 3. Выбрана конкретная целевая мышца
    if (window.state.home.muscle) {
      if (window.setHeader) window.setHeader(window.state.home.muscle.toUpperCase(), true);
      const exercises = await window.Storage.getExercises(window.state.home.category, window.state.home.muscle);
      window.state.home.exercises = exercises;

      mainContent.innerHTML = `
        ${searchAndChipsHtml}
        ${!exercises.length ? `
          <div style="text-align:center; padding:40px 0; color:var(--text-secondary)">Упражнений не найдено</div>
        ` : `
          <div class="item-list">
            ${exercises.map(ex => `
              <div class="list-card" onclick="openExerciseDetail('${ex.id}')">
                <div style="min-width:0; flex:1;">
                  <div class="list-card-title">${ex.name}</div>
                  <div class="list-card-subtitle">${ex.equipment || 'Без снаряда'} • ${ex.level || 'Базовый'}</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            `).join('')}
          </div>
        `}
      `;
      return;
    }

    // 4. Выбрана категория мышц
    if (window.state.home.category) {
      if (window.setHeader) window.setHeader(window.state.home.category.toUpperCase(), true);
      const muscles = await window.Storage.getMuscles(window.state.home.category);

      mainContent.innerHTML = `
        ${searchAndChipsHtml}
        <div class="item-list">
          ${muscles.map(m => `
            <div class="list-card" onclick="selectMuscle('${m}')">
              <div class="list-card-title">${m[0].toUpperCase() + m.slice(1)}</div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          `).join('')}
        </div>
      `;
      return;
    }

    // 5. Главный экран каталога: Сетка категорий
    if (window.setHeader) window.setHeader('Направления', false);
    const categories = await window.Storage.getCategories();

    mainContent.innerHTML = `
      ${searchAndChipsHtml}
      <div class="two-column-grid">
        ${categories.map(cat => `
          <div class="tile-card" onclick="selectCategory('${cat}')">
            <span>${cat.toUpperCase()}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function onCatalogSearch(query) {
    window.state.home.searchQuery = query;
    renderHome();
    const input = document.getElementById('catalog-search-input');
    if (input) {
      input.focus();
      input.setSelectionRange(query.length, query.length);
    }
  }

  function clearCatalogSearch() {
    window.state.home.searchQuery = '';
    renderHome();
  }

  function selectEquipmentFilter(filterId) {
    window.state.home.selectedEquipment = filterId;
    renderHome();
  }

  function selectCategory(cat) {
    window.state.home.category = cat;
    window.state.home.muscle = null;
    renderHome();
  }

  function selectMuscle(muscle) {
    window.state.home.muscle = muscle;
    renderHome();
  }

  function openExerciseDetail(exId) {
    const ex = window.state.home.exercises.find(e => e.id === exId) || window.state.home.allExercises.find(e => e.id === exId);
    if (!ex) return;

    if (window.state.animTimer) {
      clearInterval(window.state.animTimer);
      window.state.animTimer = null;
    }
    let frame = 0;
    let animActive = true;

    window.handleImgError = function(img) {
      animActive = false;
      if (window.state.animTimer) {
        clearInterval(window.state.animTimer);
        window.state.animTimer = null;
      }
      const parent = img.parentElement;
      if (parent) {
        parent.innerHTML = `
          <div class="img-offline-placeholder">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--text-secondary); margin-bottom:8px;">
              <rect x="2" y="10" width="3" height="4" rx="1"></rect>
              <rect x="19" y="10" width="3" height="4" rx="1"></rect>
              <rect x="5" y="7" width="2" height="10" rx="1"></rect>
              <rect x="17" y="7" width="2" height="10" rx="1"></rect>
              <line x1="7" y1="12" x2="17" y2="12"></line>
            </svg>
            <div class="offline-title">${ex.name}</div>
            <div class="offline-desc">Анимация доступна при подключении к сети</div>
          </div>`;
      }
    };

    if (window.openModal) {
      window.openModal(`
        <div class="modal-header">
          <div class="modal-title">${ex.name}</div>
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
        </div>
        <div class="exercise-anim-box">
          <img id="exercise-frame-img" src="/images/${ex.id}_0.jpg" alt="${ex.name}" onerror="handleImgError(this)">
        </div>
        <div class="card" style="margin-bottom:12px">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px">
            <span style="color:var(--text-secondary)">Снаряд</span><strong>${ex.equipment || '—'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px">
            <span style="color:var(--text-secondary)">Мышцы</span><strong>${ex.primaryMuscles || '—'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px">
            <span style="color:var(--text-secondary)">Уровень</span><strong>${ex.level || '—'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px">
            <span style="color:var(--text-secondary)">Тип усилия</span><strong>${ex.force || '—'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between">
            <span style="color:var(--text-secondary)">Механика</span><strong>${ex.mechanic || '—'}</strong>
          </div>
        </div>
        <button class="btn btn-green" style="width:100%; padding:14px; font-weight:700;" onclick="addExerciseToWorkout('${ex.id}')">
          + В тренировку
        </button>
      `);
    }

    window.state.animTimer = setInterval(() => {
      if (!animActive) return;
      frame = frame === 0 ? 1 : 0;
      const imgEl = document.getElementById('exercise-frame-img');
      if (imgEl) imgEl.src = `/images/${ex.id}_${frame}.jpg`;
    }, 800);
  }

  function addExerciseToWorkout(exId) {
    const ex = window.state.home.exercises.find(e => e.id === exId) || window.state.home.allExercises.find(e => e.id === exId);
    if (!ex) return;

    const exType = (ex.equipment || '').toLowerCase().includes('body') ? 'bodyweight' : 'weight_reps';

    // 1. Если тренировка уже активна — добавляем сразу в нее
    if (window.state.work.activeWorkout) {
      window.state.work.activeWorkout.exercises.push({
        name: ex.name,
        type: exType,
        primaryMuscle: ex.primaryMuscles || 'chest',
        sets: [{ setNumber: 1, reps: 0, weight: 0, completed: false }]
      });
      if (window.triggerHaptic) window.triggerHaptic('success');
      if (window.closeModal) window.closeModal();
      alert(`Упражнение «${ex.name}» добавлено в текущую активную тренировку!`);
      if (window.switchTab) window.switchTab('work');
      return;
    }

    // 2. Если тренировка не активна — диалог выбора
    const routines = window.Storage ? window.Storage.getRoutines() : [];
    if (window.openModal) {
      window.openModal(`
        <div class="modal-header">
          <div class="modal-title">Добавить в тренировку</div>
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
        </div>
        <div style="font-size:14px; color:var(--text-secondary); margin-bottom:14px;">
          Куда добавить упражнение <strong>«${ex.name}»</strong>?
        </div>
        <button class="btn btn-green" style="width:100%; margin-bottom:12px; padding:12px;" onclick="startInstantWorkoutWithExercise('${ex.id}')">
          Начать тренировку
        </button>
        ${routines.length ? `
          <div style="font-size:12px; font-weight:bold; color:var(--text-secondary); margin:12px 0 8px;">Добавить в программу:</div>
          <div class="item-list" style="max-height:180px; overflow-y:auto; margin-bottom:12px;">
            ${routines.map(r => `
              <div class="list-card" onclick="addExerciseToRoutine(${r.id}, '${ex.id}')" style="padding:10px 14px;">
                <div style="font-weight:600;">${r.name}</div>
                <span class="badge">+</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `);
    }
  }

  function startInstantWorkoutWithExercise(exId) {
    const ex = window.state.home.exercises.find(e => e.id === exId) || window.state.home.allExercises.find(e => e.id === exId);
    const exType = (ex.equipment || '').toLowerCase().includes('body') ? 'bodyweight' : 'weight_reps';

    window.state.work.activeWorkout = {
      routineName: 'Экспресс тренировка',
      startTime: Date.now(),
      exercises: [{
        name: ex.name,
        type: exType,
        primaryMuscle: ex.primaryMuscles || 'chest',
        sets: [{ setNumber: 1, reps: 0, weight: 0, completed: false }]
      }]
    };
    if (window.closeModal) window.closeModal();
    if (window.switchTab) window.switchTab('work');
  }

  function addExerciseToRoutine(routineId, exId) {
    const routines = window.Storage ? window.Storage.getRoutines() : [];
    const r = routines.find(item => item.id === routineId);
    const ex = window.state.home.exercises.find(e => e.id === exId) || window.state.home.allExercises.find(e => e.id === exId);
    if (!r || !ex) return;

    const exType = (ex.equipment || '').toLowerCase().includes('body') ? 'bodyweight' : 'weight_reps';
    r.exercises.push({ name: ex.name, type: exType, primaryMuscle: ex.primaryMuscles || 'chest' });
    window.Storage.saveRoutine(r);
    if (window.closeModal) window.closeModal();
    alert(`Упражнение добавлено в программу «${r.name}»!`);
  }

  // Экспорт
  window.EQUIPMENT_OPTIONS = EQUIPMENT_OPTIONS;
  window.matchesEquipment = matchesEquipment;
  window.renderHome = renderHome;
  window.onCatalogSearch = onCatalogSearch;
  window.clearCatalogSearch = clearCatalogSearch;
  window.selectEquipmentFilter = selectEquipmentFilter;
  window.selectCategory = selectCategory;
  window.selectMuscle = selectMuscle;
  window.openExerciseDetail = openExerciseDetail;
  window.addExerciseToWorkout = addExerciseToWorkout;
  window.startInstantWorkoutWithExercise = startInstantWorkoutWithExercise;
  window.addExerciseToRoutine = addExerciseToRoutine;
})();
