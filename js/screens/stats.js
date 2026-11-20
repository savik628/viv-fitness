// =============================================================================
// VIV Fitness - Экран аналитики, отчётов и истории тренировок (Stats Screen)
// =============================================================================
// Назначение модуля:
// 1. Монохромный премиальный отчёт VIV: недельный календарь тоннажа по дням,
//    расчёт чистого силового объёма дня и экспорт постера в PNG через Canvas.
// 2. Графика прогресса: динамика максимального веса (MAX), расчётного 1RM и
//    суммарного тоннажа (SUM) с настраиваемой выборкой последних тренировок.
// 3. Календарь активности: сетка дней месяца, статус тренировок и детальный
//    просмотр выполненных сессий за любой выбранный день.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. ДИСПЕТЧЕР ПОДВКЛАДОК СТАТИСТИКИ (Sub-tabs Router)
  // ---------------------------------------------------------------------------
  /**
   * Безопасное экранирование специальных символов HTML для предотвращения XSS-инъекций.
   */
  function esc(str) {
    return window.esc ? window.esc(str) : (window.escapeHtml ? window.escapeHtml(str) : (str || ''));
  }

  /**
   * Главный диспетчер экрана аналитики:
   * - Инициализирует локальное состояние подвкладок ('progress', 'calendar', 'report').
   * - Рендерит верхний переключатель режимов с логотипом VIV.
   * - Делегирует построение контента соответствующему подмодулю.
   */
  function renderStats() {
    try {
      if (window.setHeader) window.setHeader('Статистика', false);
      const mainContent = document.getElementById('main-content');
      if (!mainContent) return;

      if (!window.state) window.state = {};
      if (!window.state.stats) {
        window.state.stats = {
          activeSubTab: 'progress',
          selectedExerciseDetail: null,
          exerciseCategoryFilter: 'all',
          exerciseSearchQuery: '',
          calYear: new Date().getFullYear(),
          calMonth: new Date().getMonth(),
          chartLimit: 10
        };
      }

      const validTabs = ['progress', 'calendar', 'report'];
      if (!validTabs.includes(window.state.stats.activeSubTab)) {
        window.state.stats.activeSubTab = 'progress';
      }

      mainContent.innerHTML = `
        <div class="sub-tabs">
          <button class="sub-tab-btn ${window.state.stats.activeSubTab === 'progress' ? 'active' : ''}" onclick="switchStatsSubTab('progress')">Прогресс</button>
          <button class="sub-tab-btn ${window.state.stats.activeSubTab === 'calendar' ? 'active' : ''}" onclick="switchStatsSubTab('calendar')">Календарь</button>
          <button class="sub-tab-btn ${window.state.stats.activeSubTab === 'report' ? 'active' : ''}" onclick="switchStatsSubTab('report')" title="VIV" style="display:inline-flex; align-items:center; justify-content:center;"><img src="icon.svg" style="height:14px; width:auto; border:none; vertical-align:middle; background:transparent;" alt="VIV"></button>
        </div>
        <div id="stats-tab-content"></div>`;

      if (window.state.stats.activeSubTab === 'report') {
        renderStatsReportTab();
      } else if (window.state.stats.activeSubTab === 'calendar') {
        renderStatsCalendarTab();
      } else {
        renderStatsProgressTab();
      }
    } catch (err) {
      console.error('Ошибка в renderStats():', err);
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.innerHTML = `
          <div style="padding:40px 16px; text-align:center; color:var(--text-secondary);">
            <div style="font-weight:700; font-size:16px; margin-bottom:8px; color:var(--text-primary);">Экран статистики</div>
            <div style="font-size:12px; color:#ff4d4f; margin-bottom:12px; font-family:monospace; word-break:break-all;">${esc(err && (err.stack || err.message || String(err)))}</div>
            <div style="font-size:12.5px; margin-bottom:16px;">Пожалуйста, обновите страницу.</div>
            <button class="btn btn-outline btn-sm" onclick="window.location.reload(true)">Обновить</button>
          </div>`;
      }
    }
  }

  /**
   * Переключает текущую подвкладку статистики и запускает перерисовку.
   */
  function switchStatsSubTab(tab) {
    window.state.stats.activeSubTab = tab;
    renderStats();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 1.0. ЕДИНАЯ АНАЛИТИКА ПРОГРЕССА И УПРАЖНЕНИЙ (Unified Exercise & Progress Analytics)
  // ---------------------------------------------------------------------------
  /**
   * Рендерит объединённую вкладку «Прогресс» со всей истории тренировок:
   * - Список всех когда-либо выполненных упражнений с фильтром по категориям и поиском.
   * - Отображение рекордов (PR) для всех 4 типов нагрузок и гибридных движений.
   * - Переход в детальный экран упражнения с динамическими графиками и историей подходов.
   */
  function renderStatsProgressTab() {
    const container = document.getElementById('stats-tab-content');
    if (!container) return;

    if (window.state.stats.selectedExerciseDetail) {
      renderExerciseDetailView(window.state.stats.selectedExerciseDetail);
      return;
    }

    const allExercises = (window.Storage && window.Storage.getAllUniqueHistoryExercises)
      ? window.Storage.getAllUniqueHistoryExercises()
      : [];

    const activeCat = window.state.stats.exerciseCategoryFilter || 'all';
    const searchQuery = (window.state.stats.exerciseSearchQuery || '').toLowerCase().trim();

    const categories = window.EXERCISE_CATEGORIES || [
      { id: 'all', label: 'Все' },
      { id: 'chest', label: 'Грудь' },
      { id: 'back', label: 'Спина' },
      { id: 'shoulders', label: 'Плечи' },
      { id: 'legs', label: 'Ноги' },
      { id: 'arms', label: 'Руки' },
      { id: 'core', label: 'Кор' },
      { id: 'cardio', label: 'Кардио' },
      { id: 'mobility', label: 'Растяжка' }
    ];

    const filtered = allExercises.filter(ex => {
      const matchCat = activeCat === 'all' || ex.category === activeCat;
      const matchSearch = !searchQuery || ex.name.toLowerCase().includes(searchQuery);
      return matchCat && matchSearch;
    });

    const categoryChipsHtml = `
      <div class="category-chips-row" style="display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin-bottom:12px; -webkit-overflow-scrolling:touch; scrollbar-width:none;">
        ${categories.map(c => `
          <button class="chip-btn ${activeCat === c.id ? 'active' : ''}" onclick="filterExerciseStatsCategory('${c.id}')">
            ${esc(c.label)}
          </button>
        `).join('')}
      </div>
    `;

    const searchInputHtml = `
      <div style="margin-bottom:12px;">
        <input class="form-input" 
               placeholder="Поиск по упражнениям..." 
               value="${esc(window.state.stats.exerciseSearchQuery || '')}"
               oninput="filterExerciseStatsSearch(this.value)"
               style="width:100%; padding:10px 14px; font-size:13.5px; border-radius:12px;">
      </div>
    `;

    let contentHtml = '';
    if (!allExercises.length) {
      contentHtml = `
        <div class="card" style="text-align:center; padding:32px 16px; color:var(--text-secondary);">
          <div style="font-size:24px; margin-bottom:10px;">🏋️‍♂️</div>
          <div style="font-size:16px; font-weight:700; color:var(--text-primary); margin-bottom:6px;">Нет записей упражнений</div>
          <div style="font-size:13px; line-height:1.5; margin-bottom:16px;">
            Выполните свою первую тренировку во вкладке «Тренировка», и здесь появится подробный персональный анализ каждого движения из всех программ.
          </div>
          <button class="btn btn-green btn-sm" onclick="if(window.switchTab)window.switchTab('workout');">Перейти к тренировкам</button>
        </div>
      `;
    } else if (!filtered.length) {
      contentHtml = `
        <div class="card" style="text-align:center; padding:24px 16px; color:var(--text-secondary);">
          Ничего не найдено по фильтрам «${esc(activeCat !== 'all' ? activeCat : '')} ${esc(searchQuery)}».
        </div>
      `;
    } else {
      contentHtml = `
        <div class="item-list">
          ${filtered.map(ex => {
            const isWeight = ex.hasWeightSets || ex.maxWeight > 0 || ex.type === 'weight_reps';
            let primaryMetric = '';
            if (ex.isHybrid) {
              primaryMetric = `<span style="font-size:14.5px; font-weight:800; color:var(--accent-color, #DFFF00);">${ex.maxWeight} кг <span style="font-size:11px; font-weight:600; color:var(--text-secondary);">/ ${ex.maxBodyweightReps} повт</span></span>`;
            } else if (ex.hasWeightSets || ex.maxWeight > 0) {
              primaryMetric = `<span style="font-size:16px; font-weight:800; color:var(--accent-color, #DFFF00);">${ex.maxWeight} <span style="font-size:11px; font-weight:600; color:var(--text-secondary);">кг</span></span>`;
            } else if (ex.hasBodyweightSets || ex.maxReps > 0) {
              primaryMetric = `<span style="font-size:16px; font-weight:800; color:var(--accent-color, #DFFF00);">${ex.maxReps} <span style="font-size:11px; font-weight:600; color:var(--text-secondary);">повт</span></span>`;
            } else if (ex.maxDistance > 0) {
              primaryMetric = `<span style="font-size:16px; font-weight:800; color:var(--accent-color, #DFFF00);">${ex.maxDistance} <span style="font-size:11px; font-weight:600; color:var(--text-secondary);">км</span></span>`;
            } else if (ex.maxDuration > 0) {
              primaryMetric = `<span style="font-size:16px; font-weight:800; color:var(--accent-color, #DFFF00);">${ex.maxDuration} <span style="font-size:11px; font-weight:600; color:var(--text-secondary);">сек</span></span>`;
            } else {
              primaryMetric = `<span style="font-size:16px; font-weight:800; color:var(--accent-color, #DFFF00);">${ex.totalSets} <span style="font-size:11px; font-weight:600; color:var(--text-secondary);">сетов</span></span>`;
            }

            return `
              <div class="card exercise-stat-card" 
                   onclick="openExerciseDetail('${esc(ex.name)}')" 
                   style="cursor:pointer; transition:transform 0.15s ease, border-color 0.15s ease; padding:14px 16px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:8px;">
                  <div style="flex:1; min-width:0;">
                    <div style="font-size:15.5px; font-weight:700; color:var(--text-primary); line-height:1.3; word-break:break-word; margin-bottom:4px;">
                      ${esc(ex.name)}
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                      <span class="badge" style="font-size:10.5px; padding:2px 7px; text-transform:uppercase;">${esc(ex.categoryLabel || 'Силовые')}</span>
                      ${isWeight && ex.max1RM > 0 ? `<span style="font-size:11.5px; color:var(--text-secondary);">1RM ~ <b>${ex.max1RM}</b> кг</span>` : ''}
                    </div>
                  </div>
                  <div style="text-align:right; flex-shrink:0;">
                    <div style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:2px;">Рекорд</div>
                    ${primaryMetric}
                  </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; color:var(--text-secondary); border-top:1px solid var(--border-color, #1c2229); padding-top:8px; margin-top:6px;">
                  <div>Тренировок: <strong style="color:var(--text-primary);">${ex.totalSessions}</strong> (${ex.totalSets} подх.)</div>
                  <div>${ex.lastDate ? `Посл: ${ex.lastDate}` : ''} <span style="color:var(--accent-color, #DFFF00); font-weight:700;">→</span></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    container.innerHTML = `
      <div style="margin-bottom:16px;">
        ${searchInputHtml}
        ${categoryChipsHtml}
        ${contentHtml}
      </div>
    `;
  }

  /**
   * Рендерит глубокий экран детальной аналитики упражнения (рекорды, графики, история подходов).
   */
  function renderExerciseDetailView(exerciseName) {
    const container = document.getElementById('stats-tab-content');
    if (!container) return;

    const stats = window.Storage ? window.Storage.getExerciseAggregatedStats(exerciseName) : null;
    const history = window.Storage ? window.Storage.getExerciseHistoryTimeline(exerciseName) : [];
    const chartPoints = window.Storage ? window.Storage.getExerciseChartPoints(exerciseName) : [];

    const currentLimit = (window.Storage && window.Storage.getChartLimit) ? window.Storage.getChartLimit() : 10;
    const visiblePoints = chartPoints.slice(-currentLimit);

    const isWeight = stats ? (stats.exerciseType === 'weight_reps' || stats.maxWeight > 0) : true;
    const meta = window.getExerciseMeta ? window.getExerciseMeta(exerciseName) : null;
    const catLabel = meta ? (window.getCategoryLabel ? window.getCategoryLabel(meta.category) : meta.category) : 'Упражнение';

    let chartsHtml = '';
    if (!chartPoints.length) {
      chartsHtml = '<div class="card" style="text-align:center; color:var(--text-secondary); padding:24px;">Нет данных для графиков</div>';
    } else if (isWeight) {
      chartsHtml = `
        <div class="card" style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-weight:700; font-size:12px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">Динамика MAX веса (кг)</div>
            <button class="btn btn-outline btn-sm" onclick="openChartLimitPicker()" style="padding:4px 8px; font-size:11px;">Выборка: ${currentLimit}</button>
          </div>
          <div class="chart-container"><canvas id="exDetailCanvasMax"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:12px;">
          <div style="font-weight:700; font-size:12px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">Расчетный 1RM (кг)</div>
          <div class="chart-container"><canvas id="exDetailCanvas1RM"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:12px;">
          <div style="font-weight:700; font-size:12px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">Суммарный тоннаж за тренировку (кг)</div>
          <div class="chart-container"><canvas id="exDetailCanvasVol"></canvas></div>
        </div>
      `;
    } else {
      chartsHtml = `
        <div class="card" style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-weight:700; font-size:12px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">Динамика результата</div>
            <button class="btn btn-outline btn-sm" onclick="openChartLimitPicker()" style="padding:4px 8px; font-size:11px;">Выборка: ${currentLimit}</button>
          </div>
          <div class="chart-container"><canvas id="exDetailCanvasSingle"></canvas></div>
        </div>
      `;
    }

    const historySessionsHtml = history.map(h => `
      <div class="card" style="padding:14px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <div style="font-size:14.5px; font-weight:700; color:var(--text-primary);">${esc(h.routineName)}</div>
            <div style="font-size:11.5px; color:var(--text-secondary);">${h.date}</div>
          </div>
          <div class="badge" style="font-size:11px;">${h.sets.length} подх.</div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:6px;">
          ${h.sets.map((s, idx) => {
            let setValText = '';
            const w = parseFloat(s.weight) || 0;
            const r = parseInt(s.reps, 10) || 0;
            const dist = parseFloat(s.distance) || 0;
            const dur = parseInt(s.duration, 10) || 0;

            if (w > 0) {
              setValText = `<span style="color:var(--accent-color, #DFFF00); font-weight:700;">+${w} кг</span> × ${r}`;
            } else if (r > 0) {
              setValText = `<strong style="color:var(--text-primary);">${r} повт</strong> <span style="font-size:10px; color:var(--text-secondary);">(свой вес)</span>`;
            } else if (dist > 0) {
              setValText = `<strong style="color:var(--text-primary);">${dist} км</strong>`;
            } else if (dur > 0) {
              setValText = `<strong style="color:var(--text-primary);">${dur} с</strong>`;
            } else {
              setValText = `<span style="color:var(--text-secondary);">0</span>`;
            }

            return `
              <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color, #1c2229); border-radius:8px; padding:6px 10px; font-size:12px;">
                <span style="color:var(--text-secondary); font-weight:600;">№${s.setNumber || idx + 1}:</span>
                <span style="margin-left:4px;">${setValText}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div style="margin-bottom:16px;">
        <button class="btn btn-outline btn-sm" onclick="closeExerciseDetail()" style="margin-bottom:14px; display:inline-flex; align-items:center; gap:6px; font-weight:700;">
          <span>← Все упражнения</span>
        </button>

        <div style="margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span class="badge" style="font-size:11px; text-transform:uppercase;">${esc(catLabel)}</span>
            <span style="font-size:12px; color:var(--text-secondary);">${stats ? stats.totalLifetimeSessions : 0} тренировок</span>
          </div>
          <h2 style="font-size:22px; font-weight:800; color:var(--text-primary); line-height:1.25; margin:0; word-break:break-word;">
            ${esc(exerciseName)}
          </h2>
        </div>

        <div class="finish-stat-grid" style="margin-bottom:16px;">
          ${stats && stats.isHybrid ? `
            <div class="finish-stat-box">
              <div class="finish-stat-val" style="color:var(--accent-color, #DFFF00);">+${stats.maxWeight} кг</div>
              <div class="finish-stat-lbl">Доп. вес (MAX)</div>
            </div>
            <div class="finish-stat-box">
              <div class="finish-stat-val">${stats.maxBodyweightReps} повт</div>
              <div class="finish-stat-lbl">Свой вес (MAX)</div>
            </div>
            <div class="finish-stat-box">
              <div class="finish-stat-val">${stats.max1RM} кг</div>
              <div class="finish-stat-lbl">Расчетный 1RM</div>
            </div>
          ` : (stats && (stats.hasWeightSets || stats.maxWeight > 0) ? `
            <div class="finish-stat-box">
              <div class="finish-stat-val" style="color:var(--accent-color, #DFFF00);">${stats.maxWeight} кг</div>
              <div class="finish-stat-lbl">Рекорд (MAX)</div>
            </div>
            <div class="finish-stat-box">
              <div class="finish-stat-val">${stats.max1RM} кг</div>
              <div class="finish-stat-lbl">Расчетный 1RM</div>
            </div>
            <div class="finish-stat-box">
              <div class="finish-stat-val">${Math.round(stats.totalLifetimeVolume)} кг</div>
              <div class="finish-stat-lbl">Тоннаж за все время</div>
            </div>
          ` : (stats && stats.maxDistance > 0 ? `
            <div class="finish-stat-box">
              <div class="finish-stat-val" style="color:var(--accent-color, #DFFF00);">${stats.maxDistance} км</div>
              <div class="finish-stat-lbl">Макс. дистанция</div>
            </div>
            <div class="finish-stat-box">
              <div class="finish-stat-val">${stats.totalLifetimeSessions}</div>
              <div class="finish-stat-lbl">Тренировок</div>
            </div>
            <div class="finish-stat-box">
              <div class="finish-stat-val">${stats.totalLifetimeSets}</div>
              <div class="finish-stat-lbl">Подходов</div>
            </div>
          ` : (stats && stats.maxDuration > 0 ? `
            <div class="finish-stat-box">
              <div class="finish-stat-val" style="color:var(--accent-color, #DFFF00);">${stats.maxDuration} с</div>
              <div class="finish-stat-lbl">Макс. время</div>
            </div>
            <div class="finish-stat-box">
              <div class="finish-stat-val">${stats.totalLifetimeSessions}</div>
              <div class="finish-stat-lbl">Тренировок</div>
            </div>
            <div class="finish-stat-box">
              <div class="finish-stat-val">${stats.totalLifetimeSets}</div>
              <div class="finish-stat-lbl">Подходов</div>
            </div>
          ` : `
            <div class="finish-stat-box">
              <div class="finish-stat-val" style="color:var(--accent-color, #DFFF00);">${stats ? stats.maxReps : 0} повт</div>
              <div class="finish-stat-lbl">Рекорд повторов</div>
            </div>
            <div class="finish-stat-box">
              <div class="finish-stat-val">${stats ? stats.totalLifetimeSessions : 0}</div>
              <div class="finish-stat-lbl">Тренировок</div>
            </div>
            <div class="finish-stat-box">
              <div class="finish-stat-val">${stats ? stats.totalLifetimeSets : 0}</div>
              <div class="finish-stat-lbl">Подходов</div>
            </div>
          `)))}
        </div>

        ${chartsHtml}

        <div style="margin-top:20px;">
          <div style="font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:10px;">
            История выполнения (${history.length})
          </div>
          ${historySessionsHtml || '<div class="card" style="text-align:center; color:var(--text-secondary); padding:16px;">Нет истории</div>'}
        </div>
      </div>
    `;

    if (visiblePoints.length > 0 && window.drawChart) {
      setTimeout(() => {
        if (isWeight) {
          window.drawChart('exDetailCanvasMax', visiblePoints, p => p.maxWeight, 'кг');
          window.drawChart('exDetailCanvas1RM', visiblePoints, p => p.oneRepMax, 'кг');
          window.drawChart('exDetailCanvasVol', visiblePoints, p => p.totalVolume, 'кг');
        } else {
          window.drawChart('exDetailCanvasSingle', visiblePoints, p => p.totalValue, visiblePoints[0]?.unit || '');
        }
      }, 50);
    }
  }

  function openExerciseDetail(name) {
    if (!window.state.stats) window.state.stats = {};
    window.state.stats.selectedExerciseDetail = name;
    renderStats();
  }

  function closeExerciseDetail() {
    if (!window.state.stats) window.state.stats = {};
    window.state.stats.selectedExerciseDetail = null;
    renderStats();
  }

  function filterExerciseStatsCategory(catId) {
    if (!window.state.stats) window.state.stats = {};
    window.state.stats.exerciseCategoryFilter = catId;
    renderStats();
  }

  function filterExerciseStatsSearch(q) {
    if (!window.state.stats) window.state.stats = {};
    window.state.stats.exerciseSearchQuery = q;
    renderStatsProgressTab();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 1.1. АТЛЕТИЧЕСКИЙ ОТЧЁТ VIV, НЕДЕЛЬНЫЙ КАЛЕНДАРЬ И РАСЧЁТ ТОННАЖА
  // ---------------------------------------------------------------------------
  /**
   * Форматирует объект даты в ISO-строку 'ГГГГ-ММ-ДД' с ведущими нулями.
   */
  function fmtDateIso(d) {
    if (window.DateUtils && typeof window.DateUtils.toIso === 'function') {
      return window.DateUtils.toIso(d);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Возвращает дату, выбранную пользователем в отчёте VIV (по умолчанию — сегодня).
   */
  function getReportSelectedDate() {
    if (!window.state) window.state = {};
    if (!window.state.stats) window.state.stats = {};
    if (!window.state.stats.reportSelectedDate) {
      window.state.stats.reportSelectedDate = window.DateUtils ? window.DateUtils.today() : (window.getLocalDateStr ? window.getLocalDateStr() : fmtDateIso(new Date()));
    }
    return window.state.stats.reportSelectedDate;
  }

  /**
   * Выбирает конкретную дату в отчёте VIV с лёгким виброоткликом и перерисовывает отчёт.
   */
  function selectReportDate(dateStr) {
    if (!window.state) window.state = {};
    if (!window.state.stats) window.state.stats = {};
    window.state.stats.reportSelectedDate = dateStr;
    if (window.triggerHaptic) window.triggerHaptic('light');
    renderStatsReportTab();
  }

  /**
   * Сдвигает фокус недели в отчёте VIV на +/- 7 дней назад или вперёд.
   */
  function shiftReportWeek(deltaDays) {
    const cur = getReportSelectedDate();
    const [y, m, d] = cur.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + deltaDays);
    selectReportDate(fmtDateIso(dateObj));
  }

  /**
   * Формирует массив 7 дней (Пн-Вс) для недели, содержащей указанную референсную дату.
   */
  function getReportWeekDates(refDateStr) {
    if (window.DateUtils && typeof window.DateUtils.getWeekDates === 'function') {
      return window.DateUtils.getWeekDates(refDateStr);
    }
    const ref = refDateStr ? new Date(refDateStr + 'T12:00:00') : new Date();
    const dayOfWeek = ref.getDay();
    const distToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(ref);
    monday.setDate(ref.getDate() + distToMon);

    const week = [];
    const weekdaysNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const todayStr = window.DateUtils ? window.DateUtils.today() : fmtDateIso(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = fmtDateIso(d);
      week.push({
        dateStr: iso,
        dayNum: d.getDate(),
        weekday: weekdaysNames[i],
        isToday: iso === todayStr
      });
    }
    return week;
  }

  /**
   * Вычисляет чистый силовой тоннаж атлета строго за выбранный день (вес * повторения):
   * исключает кардио, дистанцию и время, суммируя чистую поднятую массу по упражнениям.
   */
  function calculateDayPureVolume(history, targetDateStr) {
    const volumeByExercise = {};
    let totalPureVolume = 0;
    let totalPureSets = 0;

    if (!Array.isArray(history)) return { volumeByExercise, totalPureVolume, totalPureSets };

    history.forEach(h => {
      const hDate = h.date ? h.date.substring(0, 10) : '';
      if (hDate !== targetDateStr) return;

      h.sets?.forEach(s => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        if (w > 0 && r > 0 && s.exerciseName && s.exerciseType !== 'distance' && s.exerciseType !== 'duration') {
          const vol = w * r;
          volumeByExercise[s.exerciseName] = (volumeByExercise[s.exerciseName] || 0) + vol;
          totalPureVolume += vol;
          totalPureSets++;
        }
      });
    });

    return { volumeByExercise, totalPureVolume, totalPureSets };
  }

  /**
   * Рендерит монохромный атлетический отчёт VIV:
   * - Недельный календарь-ленту дней (Пн-Вс) с индикаторами выполненных тренировок.
   * - Центральное кольцо чистого тоннажа дня (кг / тонн).
   * - Распределение поднятого веса по упражнениям с прогресс-барами.
   * - Интерактивный логотип VIV для сохранения постера по двойному клику.
   */
  function renderStatsReportTab() {
    const container = document.getElementById('stats-tab-content');
    if (!container) return;

    const history = window.Storage ? window.Storage.getHistory() : [];
    const curDateStr = getReportSelectedDate();
    const todayStr = window.getLocalDateStr ? window.getLocalDateStr() : fmtDateIso(new Date());

    // Расчет чистого силового тоннажа за выбранный день
    const { volumeByExercise, totalPureVolume } = calculateDayPureVolume(history, curDateStr);

    const isTons = totalPureVolume >= 1000;
    const displayVol = isTons ? (Math.round((totalPureVolume / 1000) * 10) / 10) : Math.round(totalPureVolume);
    const volUnit = isTons ? 'ТОНН' : 'КГ';

    // Список упражнений строго по убыванию чистого тоннажа за выбранный день
    const sortedExercises = Object.keys(volumeByExercise)
      .map(name => {
        const vol = volumeByExercise[name];
        const pct = totalPureVolume > 0 ? Math.round((vol / totalPureVolume) * 100) : 0;
        const volStr = vol >= 1000 
          ? (Math.round((vol / 1000) * 10) / 10) + ' т' 
          : Math.round(vol) + ' кг';
        return { name, volume: vol, volStr, pct };
      })
      .sort((a, b) => b.volume - a.volume);

    // Недельная лента дат
    const weekDays = getReportWeekDates(curDateStr);
    const startParts = weekDays[0].dateStr.split('-').map(Number);
    const endParts = weekDays[6].dateStr.split('-').map(Number);
    const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);

    let formattedWeekRange = '';
    const startMonth = startDate.toLocaleDateString('ru-RU', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('ru-RU', { month: 'short' });

    if (startDate.getMonth() === endDate.getMonth()) {
      formattedWeekRange = `${startDate.getDate()} – ${endDate.getDate()} ${endDate.toLocaleDateString('ru-RU', { month: 'long' })}`;
    } else {
      formattedWeekRange = `${startDate.getDate()} ${startMonth} – ${endDate.getDate()} ${endMonth}`;
    }

    const [cy, cm, cd] = curDateStr.split('-').map(Number);
    const selDateObj = new Date(cy, cm - 1, cd);
    const formattedSelDate = selDateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const isCurToday = curDateStr === todayStr;
    const displayDateHeader = (isCurToday ? 'Сегодня, ' : '') + formattedSelDate;

    const logoHtml = window.AppLogo ? window.AppLogo.render({ className: 'apple-report-logo-text' }) : 'VIV';

    container.innerHTML = `
      <div class="report-tab-wrapper">
        <!-- 1. Навигация по неделям (как в календаре привычек) -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:0 2px;">
          <button class="cal-nav-btn" onclick="shiftReportWeek(-7)" aria-label="Предыдущая неделя" title="Предыдущая неделя">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <div style="text-align:center;">
            <div style="font-size:15px; font-weight:700; letter-spacing:-0.2px; color:var(--text-primary); text-transform:capitalize;">${formattedWeekRange}</div>
          </div>
          <button class="cal-nav-btn" onclick="shiftReportWeek(7)" aria-label="Следующая неделя" title="Следующая неделя">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <!-- 2. Недельная лента дней -->
        <div class="habit-week-strip" style="margin-bottom:14px;">
          ${weekDays.map(w => {
            const isSelected = w.dateStr === curDateStr;
            const dayVol = calculateDayPureVolume(history, w.dateStr).totalPureVolume;
            const hasWorkout = dayVol > 0;
            return `
              <button 
                class="habit-day-pill ${isSelected ? 'active' : ''} ${w.isToday ? 'is-today' : ''}" 
                onclick="selectReportDate('${w.dateStr}')"
                title="${w.dayNum} ${w.weekday}${hasWorkout ? ' • ' + (dayVol >= 1000 ? (Math.round(dayVol / 100) / 10) + ' т' : Math.round(dayVol) + ' кг') : ''}"
              >
                <span class="habit-day-name">${w.weekday}</span>
                <span class="habit-day-num">${w.dayNum}</span>
                <span class="habit-day-dot ${hasWorkout ? 'full' : ''}" style="${hasWorkout ? 'background:var(--text-primary); box-shadow:0 0 6px var(--text-primary);' : ''}"></span>
              </button>
            `;
          }).join('')}
        </div>

        <div id="viv-athlete-pdf-document" class="printable-athlete-doc apple-fitness-report">
          <!-- Шапка ПО ЦЕНТРУ с чистым логотипом VIV (двойной клик сохраняет PNG) -->
          <div class="apple-report-branding">
            <div class="apple-report-logo-interactive viv-logo-target" 
                 id="viv-report-logo-btn" 
                 role="button" 
                 tabindex="0"
                 title="Двойной клик для сохранения отчёта"
                 ondblclick="exportVivReportPng()"
                 onclick="handleVivLogoTouch(event)">
              ${logoHtml}
            </div>
            <div class="apple-report-date">${displayDateHeader}</div>
          </div>

          <!-- ГЛАВНЫЙ АКЦЕНТ: МОНОХРОМНОЕ КОЛЬЦО ТОННАЖА ПО ЦЕНТРУ -->
          <div class="apple-hero-ring-card">
            <div class="apple-ring-container-centered">
              <svg class="apple-ring-svg-lg" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="appleRingGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ffffff" />
                    <stop offset="100%" stop-color="#94a3b8" />
                  </linearGradient>
                </defs>
                <circle class="apple-ring-bg-lg" cx="80" cy="80" r="62" />
                <circle class="apple-ring-bar-lg" cx="80" cy="80" r="62" stroke="url(#appleRingGrad1)" />
              </svg>
              <div class="apple-ring-center-info">
                <div class="apple-ring-center-num">${displayVol}</div>
                <div class="apple-ring-center-unit">${volUnit}</div>
              </div>
            </div>
          </div>

          <!-- СПИСОК РАСПРЕДЕЛЕНИЯ СИЛОВОГО ТОННАЖА ПО УБЫВАНИЮ -->
          <div class="tonnage-dist-section" style="margin-top:6px;">
            ${sortedExercises.length ? `
              <div class="tonnage-dist-list">
                ${sortedExercises.map(item => `
                  <div class="tonnage-dist-card">
                    <div class="tonnage-dist-row">
                      <span class="tonnage-dist-name" title="${esc(item.name)}">${esc(item.name)}</span>
                      <div class="tonnage-dist-stats">
                        <span class="tonnage-dist-pct">${item.pct}%</span>
                        <span class="tonnage-dist-vol">${item.volStr}</span>
                      </div>
                    </div>
                    <div class="tonnage-dist-track">
                      <div class="tonnage-dist-bar" style="width:${Math.max(4, item.pct)}%;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="apple-empty-box">Нет завершенных тренировок за этот день.</div>
            `}
          </div>

          <!-- ЛАКОНИЧНЫЙ ЦЕНТРИРОВАННЫЙ ПОДВАЛ -->
          <div class="apple-report-footer">
          </div>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // БЛОК 1.2. ГЕНЕРАТОР ПОСТЕРА В CANVAS PNG И ДВОЙНОЙ КЛИК (Canvas PNG Exporter)
  // ---------------------------------------------------------------------------
  let lastLogoTapTime = 0;
  /**
   * Обработчик двойного тапа / клика по логотипу VIV в шапке отчёта.
   * Открывает скрытую возможность экспорта эстетичного монохромного постера.
   */
  function handleVivLogoTouch(e) {
    const now = Date.now();
    if (now - lastLogoTapTime < 400) {
      exportVivReportPng();
      lastLogoTapTime = 0;
    } else {
      lastLogoTapTime = now;
    }
  }

  /**
   * Рендерит постер отчёта в скрытом элементе Canvas с Retina-разрешением (@2x/3x)
   * и инициирует автоматическое скачивание файла PNG на устройство атлета:
   * - Рисует закругленные карточки, адаптированные под светлую или тёмную тему.
   * - Векторно воспроизводит SVG-логотип VIV, дату и кольцо силового тоннажа.
   * - Формирует список лучших упражнений дня с прогресс-барами распределения нагрузки.
   */
  async function exportVivReportPng() {
    if (window.triggerHaptic) window.triggerHaptic('medium');

    const curDateStr = getReportSelectedDate();
    const history = window.Storage ? window.Storage.getHistory() : [];
    
    // Чистый силовой объем за выбранный день
    const { volumeByExercise, totalPureVolume } = calculateDayPureVolume(history, curDateStr);

    const isTons = totalPureVolume >= 1000;
    const displayVol = isTons ? (Math.round((totalPureVolume / 1000) * 10) / 10) : Math.round(totalPureVolume);
    const volUnit = isTons ? 'ТОНН' : 'КГ';

    const sortedExercises = Object.keys(volumeByExercise)
      .map(name => {
        const vol = volumeByExercise[name];
        const pct = totalPureVolume > 0 ? Math.round((vol / totalPureVolume) * 100) : 0;
        const volStr = vol >= 1000 
          ? (Math.round((vol / 1000) * 10) / 10) + ' т' 
          : Math.round(vol) + ' кг';
        return { name, volume: vol, volStr, pct };
      })
      .sort((a, b) => b.volume - a.volume);

    const scale = 2; // Ретина-качество (2x)
    const cardW = 390;
    const padOuter = 16;
    const W = cardW + padOuter * 2;

    const cardPad = 14;
    const innerW = cardW - cardPad * 2;
    const heroH = 216;
    const exCount = Math.max(1, sortedExercises.length);
    const exCardH = 56;
    const exGap = 10;
    const exListH = sortedExercises.length ? (exCount * exCardH + (exCount - 1) * exGap) : 56;

    const cardTopPad = 18;
    const headerH = 38 + 6 + 14 + 12 + 1; // иконка (38) + отступ (6) + дата (14) + отступ (12) + линия (1)
    const gapHero = 14;
    const gapEx = 12;
    const botDividerPad = 14;
    const cardBotPad = 16;

    const cardH = cardTopPad + headerH + gapHero + heroH + gapEx + exListH + botDividerPad + 1 + cardBotPad;
    const H = cardH + padOuter * 2;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);

    function roundRect(x, y, w, h, r, fill, stroke, strokeColor, lineWidth = 1) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth; ctx.stroke(); }
    }

    function fitTextWithEllipsis(text, maxW) {
      if (ctx.measureText(text).width <= maxW) return text;
      let truncated = text;
      while (truncated.length > 1 && ctx.measureText(truncated + '...').width > maxW) {
        truncated = truncated.slice(0, -1);
      }
      return truncated + '...';
    }

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    // Динамическая загрузка icon.svg: при светлой теме пути SVG подменяются на черный цвет
    const loadSvgImage = async (src, isLightMode) => {
      let resolvedSrc = src;
      try {
        const resp = await fetch(src);
        if (resp.ok) {
          let svgText = await resp.text();
          if (isLightMode) {
            svgText = svgText
              .replace(/fill\s*=\s*["']white["']/gi, 'fill="#000000"')
              .replace(/fill\s*=\s*["']#ffffff["']/gi, 'fill="#000000"')
              .replace(/fill\s*=\s*["']#fff["']/gi, 'fill="#000000"');
          }
          const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
          resolvedSrc = URL.createObjectURL(blob);
        }
      } catch (e) {}

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = resolvedSrc;
      });
    };
    const logoImg = await loadSvgImage('icon.svg', isLight);

    const cOuterBg = isLight ? '#f1f5f9' : '#0d0f12';
    const cCardBg = isLight ? '#ffffff' : '#000000';
    const cCardBorder = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.1)';
    const cSubCardBg = isLight ? '#f8fafc' : '#14181c';
    const cSubCardBorder = isLight ? 'rgba(0, 0, 0, 0.08)' : '#1c2229';
    const cTextPrimary = isLight ? '#000000' : '#ffffff';
    const cTextSecondary = isLight ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';
    const cTextMuted = isLight ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)';
    const cDivider = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    const cRingBg = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.07)';
    const cTrackBg = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    const cPillBg = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.06)';

    // 1. Внешний фон
    ctx.fillStyle = cOuterBg;
    ctx.fillRect(0, 0, W, H);

    // 2. Карточка окна отчёта .apple-fitness-report
    const cardX = padOuter;
    const cardY = padOuter;
    roundRect(cardX, cardY, cardW, cardH, 22, cCardBg, true, cCardBorder, 1);

    // 3. Шапка: спортивный логотип VIV из icon.svg без рамок + дата
    const logoH = 20;
    const aspect = (logoImg && (logoImg.naturalWidth || logoImg.width) && (logoImg.naturalHeight || logoImg.height))
      ? ((logoImg.naturalWidth || logoImg.width) / (logoImg.naturalHeight || logoImg.height))
      : 4;
    const logoW = Math.round(logoH * aspect);
    const logoX = cardX + (cardW - logoW) / 2;
    const logoY = cardY + cardTopPad + 4;

    if (logoImg) {
      if (isLight) {
        // Гарантированная кроссбраузерная заливка черным для белой темы
        const offCanvas = document.createElement('canvas');
        const offW = Math.max(1, Math.round(logoW * scale));
        const offH = Math.max(1, Math.round(logoH * scale));
        offCanvas.width = offW;
        offCanvas.height = offH;
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
          offCtx.drawImage(logoImg, 0, 0, offW, offH);
          offCtx.globalCompositeOperation = 'source-in';
          offCtx.fillStyle = '#000000';
          offCtx.fillRect(0, 0, offW, offH);
          ctx.drawImage(offCanvas, logoX, logoY, logoW, logoH);
        } else {
          ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
        }
      } else {
        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
      }
    }

    const [cy, cm, cd] = curDateStr.split('-').map(Number);
    const selDateObj = new Date(cy, cm - 1, cd);
    const dateStr = selDateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateY = logoY + logoH + 16;
    ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    ctx.fillStyle = cTextSecondary;
    ctx.textAlign = 'center';
    ctx.fillText(dateStr, cardX + cardW / 2, dateY);

    // Тонкий разделитель под шапкой
    const divY1 = dateY + 12;
    ctx.strokeStyle = cDivider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + cardPad, divY1);
    ctx.lineTo(cardX + cardW - cardPad, divY1);
    ctx.stroke();

    // 4. Карточка кольца тоннажа (.apple-hero-ring-card)
    const heroX = cardX + cardPad;
    const heroY = divY1 + gapHero;
    const heroW = innerW;
    roundRect(heroX, heroY, heroW, heroH, 22, cSubCardBg, true, cSubCardBorder, 1);

    // Кольцо тоннажа
    const ringCenterX = heroX + heroW / 2;
    const ringCenterY = heroY + heroH / 2;
    const ringRadius = 62;
    const ringStroke = 13;

    // Фоновый круг кольца
    ctx.lineWidth = ringStroke;
    ctx.beginPath();
    ctx.arc(ringCenterX, ringCenterY, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = cRingBg;
    ctx.stroke();

    // Монохромная дуга активности (черно-белая)
    const ringGrad = ctx.createLinearGradient(ringCenterX - ringRadius, ringCenterY - ringRadius, ringCenterX + ringRadius, ringCenterY + ringRadius);
    if (isLight) {
      ringGrad.addColorStop(0, '#0f172a');
      ringGrad.addColorStop(1, '#334155');
    } else {
      ringGrad.addColorStop(0, '#ffffff');
      ringGrad.addColorStop(1, '#94a3b8');
    }

    ctx.save();
    ctx.shadowColor = isLight ? 'rgba(15, 23, 42, 0.25)' : 'rgba(255, 255, 255, 0.25)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(ringCenterX, ringCenterY, ringRadius, -Math.PI / 2, Math.PI * 1.15);
    ctx.strokeStyle = ringGrad;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Число тоннажа и единица строго по центру
    ctx.textAlign = 'center';
    ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillStyle = cTextPrimary;
    ctx.fillText(`${displayVol}`, ringCenterX, ringCenterY + 4);

    ctx.font = '800 14px -apple-system, sans-serif';
    ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
    ctx.letterSpacing = '1.5px';
    ctx.fillText(volUnit, ringCenterX, ringCenterY + 25);
    ctx.letterSpacing = '0px';

    // 5. Карточки упражнений (.tonnage-dist-card)
    let curExY = heroY + heroH + gapEx;
    if (!sortedExercises.length) {
      roundRect(cardX + cardPad, curExY, innerW, 56, 14, cSubCardBg, true, cSubCardBorder, 1);
      ctx.textAlign = 'center';
      ctx.font = '500 13px -apple-system, sans-serif';
      ctx.fillStyle = cTextMuted;
      ctx.fillText('Нет завершенных тренировок за этот день.', cardX + cardW / 2, curExY + 32);
      curExY += 56 + exGap;
    } else {
      for (let i = 0; i < sortedExercises.length; i++) {
        const item = sortedExercises[i];
        const exX = cardX + cardPad;
        roundRect(exX, curExY, innerW, exCardH, 14, cSubCardBg, true, cSubCardBorder, 1);

        const rowTextY = curExY + 22;

        // Вес/тоннаж справа
        ctx.textAlign = 'right';
        ctx.font = '800 14px -apple-system, sans-serif';
        ctx.fillStyle = cTextPrimary;
        ctx.fillText(item.volStr, exX + innerW - 14, rowTextY);
        const volW = ctx.measureText(item.volStr).width;

        // Пилл с процентами левее веса
        const pctStr = item.pct + '%';
        ctx.font = '700 11px -apple-system, sans-serif';
        const pctW = ctx.measureText(pctStr).width;
        const pillW = pctW + 12;
        const pillH = 18;
        const pillX = exX + innerW - 14 - volW - 8 - pillW;
        const pillY = rowTextY - 13;
        roundRect(pillX, pillY, pillW, pillH, 4, cPillBg, false, null);

        ctx.fillStyle = cTextSecondary;
        ctx.textAlign = 'center';
        ctx.fillText(pctStr, pillX + pillW / 2, rowTextY);

        // Название упражнения слева
        ctx.textAlign = 'left';
        ctx.font = '700 14px -apple-system, sans-serif';
        ctx.fillStyle = cTextPrimary;
        const maxNameW = pillX - exX - 22;
        const safeName = fitTextWithEllipsis(item.name, maxNameW);
        ctx.fillText(safeName, exX + 14, rowTextY);

        // Прогресс-бар трек и цветной бар
        const trackX = exX + 14;
        const trackY = curExY + 36;
        const trackW = innerW - 28;
        roundRect(trackX, trackY, trackW, 6, 3, cTrackBg, false, null);

        const barW = Math.max(6, Math.round((trackW * item.pct) / 100));
        const barGrad = ctx.createLinearGradient(trackX, trackY, trackX + barW, trackY);
        if (isLight) {
          barGrad.addColorStop(0, '#0f172a');
          barGrad.addColorStop(1, '#334155');
        } else {
          barGrad.addColorStop(0, '#ffffff');
          barGrad.addColorStop(1, '#cbd5e1');
        }
        roundRect(trackX, trackY, barW, 6, 3, barGrad, false, null);

        curExY += exCardH + exGap;
      }
    }

    // 6. Нижний разделитель подвала (.apple-report-footer)
    const botDivY = curExY - exGap + botDividerPad;
    ctx.strokeStyle = cDivider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + cardPad, botDivY);
    ctx.lineTo(cardX + cardW - cardPad, botDivY);
    ctx.stroke();

    // 7. Прямое надёжное скачивание PNG в браузер
    const fileName = `viv-tonnage-report-${new Date().toISOString().substring(0, 10)}.png`;
    const triggerFileDownload = (url) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.triggerHaptic) window.triggerHaptic('success');
    };

    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          triggerFileDownload(url);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        } else {
          try {
            const dataUrl = canvas.toDataURL('image/png');
            triggerFileDownload(dataUrl);
          } catch (e) {
            console.error('Ошибка экспорта canvas:', e);
          }
        }
      }, 'image/png');
    } else {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        triggerFileDownload(dataUrl);
      } catch (e) {
        console.error('Ошибка экспорта canvas:', e);
      }
    }
  }

  window.handleVivLogoTouch = handleVivLogoTouch;
  window.handleVivLogoClick = handleVivLogoTouch;
  window.exportVivReportPng = exportVivReportPng;

  // ---------------------------------------------------------------------------
  // БЛОК 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И ПИКЕРЫ (Chart Helpers & Limit Picker)
  // ---------------------------------------------------------------------------
  /**
   * Открывает барабанный пикер для настройки лимита отображаемых тренировок на графиках (от 1 до 50).
   */
  function openChartLimitPicker() {
    if (window.openNumberPicker) {
      window.openNumberPicker({
        title: 'Показать последние тренировки',
        value: window.state.stats.chartLimit || 10,
        min: 1,
        max: 50,
        step: 1,
        unit: 'записей',
        deltas: [-10, -5, -1, 1, 5, 10],
        onConfirm: (val) => {
          const limit = Math.max(1, Math.min(50, Math.round(val)));
          window.state.stats.chartLimit = limit;
          if (window.Storage && window.Storage.setChartLimit) {
            window.Storage.setChartLimit(limit);
          }
          renderStatsProgressTab();
        }
      });
    }
  }
  window.openChartLimitPicker = openChartLimitPicker;

  // ---------------------------------------------------------------------------
  // БЛОК 3. ВКЛАДКА "КАЛЕНДАРЬ АКТИВНОСТИ" (Monthly Calendar Grid)
  // ---------------------------------------------------------------------------
  /**
   * Рендерит календарную сетку тренировок за выбранный месяц:
   * - Подсвечивает тренировочные дни фирменным спортивным индикатором.
   * - Показывает суммарное количество тренировок в месяце и за год.
   * - Выводит хронологическую ленту последних завершённых сессий.
   */
  function renderStatsCalendarTab() {
    const container = document.getElementById('stats-tab-content');
    if (!container) return;

    const daysMap = window.Storage.getActivityCalendar();
    const records = window.Storage.getHistory();

    const year = window.state.stats.calYear;
    const month = window.state.stats.calMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDayOfWeek = (firstDay.getDay() + 6) % 7;

    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    let activeDaysThisMonth = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (daysMap[ds]) activeDaysThisMonth++;
    }

    const cells = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push('<div class="cal-cell" style="background:none; border:none;"></div>');
    }

    const todayStr = window.getLocalDateStr ? window.getLocalDateStr() : new Date().toISOString().substring(0, 10);

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const act = daysMap[ds];
      const isToday = ds === todayStr;
      const isAct = !!act;

      cells.push(`
        <div 
          class="cal-cell ${isAct ? 'active-workout' : ''} ${isToday ? 'today' : ''}" 
          onclick="showDayWorkoutDetails('${ds}')"
          title="${isAct ? `${act.routines.join(', ')} (${Math.round(act.totalTonnage)} кг)` : ''}"
        >
          ${d}
        </div>
      `);
    }

    container.innerHTML = `
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <button class="cal-nav-btn" onclick="changeCalMonth(-1)" aria-label="Предыдущий месяц">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <div style="text-align:center;">
            <div style="font-size:16.5px; font-weight:700; letter-spacing:-0.2px;">${monthNames[month]} ${year}</div>
          </div>
          <button class="cal-nav-btn" onclick="changeCalMonth(1)" aria-label="Следующий месяц">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background-color:var(--card-bg-subtle, rgba(120,120,128,0.06)); border:1px solid var(--border-color); border-radius:10px; padding:9px 12px; margin-bottom:14px; font-size:12px;">
          <span>Тренировок в этом месяце: <strong style="color:var(--green-btn); font-size:13px;">${activeDaysThisMonth}</strong></span>
          <span style="color:var(--text-secondary);">Всего за год: <strong>${records.length}</strong></span>
        </div>

        <div class="activity-cal-grid">
          ${weekdays.map(w => `<div class="cal-weekday">${w}</div>`).join('')}
          ${cells.join('')}
        </div>
      </div>

      <!-- Лента истории тренировок -->
      <div style="font-weight:bold; font-size:15px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin:16px 0 10px;">История тренировок</div>
      ${records.length === 0 ? `
        <div class="card" style="text-align:center; color:var(--text-secondary); padding:24px;">История пуста</div>
      ` : `
        <div class="item-list">
          ${records.slice(0, 30).map(r => `
            <div class="card">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div>
                  <div style="font-weight:bold; font-size:16px;">${esc(r.routineName)}</div>
                  <div style="font-size:12px; color:var(--text-secondary);">${r.date}</div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="deleteHistoryRecord(${r.id})">Удалить</button>
              </div>
              <div style="background-color:var(--card-bg-subtle, rgba(120,120,128,0.06)); border-radius:10px; padding:10px;">
                ${r.sets.map(s => `
                  <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
                    <span>${esc(s.exerciseName)} (сет ${s.setNumber})</span>
                    <span style="color:var(--text-primary); font-weight:600;">
                      ${s.exerciseType === 'bodyweight' ? `${s.reps} повторений` :
                        s.exerciseType === 'distance' ? `${s.distance} км` :
                        s.exerciseType === 'duration' ? `${s.duration} сек` :
                        `${s.reps} повторений × ${s.weight} кг`}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
          ${records.length > 30 ? `
            <div style="text-align:center; padding:14px 10px; color:var(--text-secondary); font-size:12px;">
              Показаны последние 30 тренировок из ${records.length}.
            </div>
          ` : ''}
        </div>
      `}
    `;
  }

  /**
   * Листает календарь активности на +/- 1 месяц с корректным переходом через границы года.
   */
  function changeCalMonth(delta) {
    let m = window.state.stats.calMonth + delta;
    let y = window.state.stats.calYear;
    if (m < 0) { m = 11; y--; }
    else if (m > 11) { m = 0; y++; }
    window.state.stats.calMonth = m;
    window.state.stats.calYear = y;
    renderStatsCalendarTab();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4. МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ТРЕНИРОВКИ ДНЯ (Day Details Modal)
  // ---------------------------------------------------------------------------
  /**
   * Открывает всплывающее окно с подробным журналом тренировок за выбранную дату:
   * - Если день пустой: карточка дня восстановления с кнопкой «Начать тренировку».
   * - Если тренировки были: сводка тоннажа, подходов, упражнений и список всех выполненных сетов.
   */
  function showDayWorkoutDetails(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const formattedDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const weekdayName = dateObj.toLocaleDateString('ru-RU', { weekday: 'long' });
    const capWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);

    const records = window.Storage.getHistory().filter(h => (h.date || '').substring(0, 10) === dateStr);

    if (!records.length) {
      if (window.openModal) {
        window.openModal(`
          <div class="modal-header">
            <div>
              <div class="modal-title">${formattedDate}</div>
              <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${capWeekday}</div>
            </div>
            <button class="modal-close-btn" onclick="closeModal()">✕</button>
          </div>
          <div style="text-align:center; padding:28px 16px;">
            <div class="badge" style="margin-bottom:12px; font-size:11.5px; padding:4px 14px; letter-spacing:0.8px; text-transform:uppercase;">ДЕНЬ ОТДЫХА</div>
            <div style="font-size:17.5px; font-weight:700; margin-bottom:6px;">День восстановления</div>
            <div style="font-size:13px; color:var(--text-secondary); margin-bottom:22px;">В этот день тренировок не проводилось.</div>
            <button class="btn btn-green" style="width:100%;" onclick="closeModal(); switchTab('work');">Начать тренировку</button>
          </div>
        `);
      }
      return;
    }

    let totalTonnage = 0;
    let totalSets = 0;
    const uniqueExercises = new Set();
    records.forEach(r => {
      (r.sets || []).forEach(s => {
        totalSets++;
        uniqueExercises.add(s.exerciseName);
        if (s.weight && s.reps) totalTonnage += (s.weight * s.reps);
      });
    });

    if (window.openModal) {
      window.openModal(`
        <div class="modal-header">
          <div>
            <div class="modal-title">${formattedDate}</div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${capWeekday} • Дневник тренировок</div>
          </div>
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
        </div>

        <div style="display:flex; gap:8px; margin-bottom:16px;">
          <div class="cal-detail-metric">
            <div class="cal-detail-metric-val">${totalTonnage > 0 ? `${Math.round(totalTonnage).toLocaleString('ru-RU')} кг` : '—'}</div>
            <div class="cal-detail-metric-lbl">Тоннаж</div>
          </div>
          <div class="cal-detail-metric">
            <div class="cal-detail-metric-val">${totalSets}</div>
            <div class="cal-detail-metric-lbl">Подходов</div>
          </div>
          <div class="cal-detail-metric">
            <div class="cal-detail-metric-val">${uniqueExercises.size}</div>
            <div class="cal-detail-metric-lbl">Упражнений</div>
          </div>
        </div>

        <div class="item-list">
          ${records.map(r => {
            const grouped = {};
            (r.sets || []).forEach(s => {
              if (!grouped[s.exerciseName]) grouped[s.exerciseName] = [];
              grouped[s.exerciseName].push(s);
            });

            return `
              <div class="card" style="margin-bottom:12px; border-left:3px solid var(--green-btn);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <div>
                    <div style="font-weight:700; font-size:16px;">${esc(r.routineName)}</div>
                    <div style="font-size:11.5px; color:var(--text-secondary);">${r.sets.length} выполненных подходов</div>
                  </div>
                  <button class="btn btn-danger btn-sm" onclick="deleteHistoryRecord(${r.id}); closeModal();">Удалить</button>
                </div>

                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${Object.keys(grouped).map(exName => {
                    const exSets = grouped[exName];
                    return `
                      <div style="background-color:var(--card-bg-subtle, rgba(120,120,128,0.06)); border:1px solid var(--border-color); border-radius:8px; padding:8px 10px;">
                        <div style="font-weight:600; font-size:13.5px; margin-bottom:6px; color:var(--text-primary);">${esc(exName)}</div>
                        <div style="display:flex; flex-direction:column; gap:4px; font-size:12px;">
                          ${exSets.map((s, idx) => `
                            <div style="display:flex; justify-content:space-between; color:var(--text-secondary);">
                              <span>Сет ${idx + 1}</span>
                              <span style="color:var(--text-primary); font-weight:600;">
                                ${s.exerciseType === 'bodyweight' ? `${s.reps} повт.` :
                                  s.exerciseType === 'distance' ? `${s.distance} км` :
                                  s.exerciseType === 'duration' ? `${s.duration} сек` :
                                  `${s.weight} кг × ${s.reps}`}
                              </span>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `);
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 5. УДАЛЕНИЕ ЗАПИСЕЙ И ОБРАБОТЧИК СМЕНЫ ТЕМЫ (Delete & Theme Watcher)
  // ---------------------------------------------------------------------------
  /**
   * Удаляет выбранную запись тренировки из постоянной истории после подтверждения.
   */
  function deleteHistoryRecord(id) {
    if (!confirm('Удалить эту запись тренировки из истории?')) return;
    if (window.Storage) window.Storage.deleteHistoryRecord(id);
    renderStats();
  }

  /**
   * Слушатель глобального события смены темы: динамически перерисовывает графики
   * прогресса для подстройки контрастности сеток и линий Chart.js.
   */
  window.addEventListener('viv-theme-changed', () => {
    if (window.state && window.state.currentTab === 'stats') {
      if (window.state.stats.activeSubTab === 'progress') renderStatsProgressTab();
      else if (window.state.stats.activeSubTab === 'report') renderStatsReportTab();
      else if (window.state.stats.activeSubTab === 'calendar') renderStatsCalendarTab();
    }
  });

  // ---------------------------------------------------------------------------
  // БЛОК 6. ЭКСПОРТ В GLOBAL WINDOW (Module Exports)
  // ---------------------------------------------------------------------------
  /**
   * Публичный интерфейс экрана аналитики и отчётов VIV.
   */
  window.renderStats = renderStats;
  window.switchStatsSubTab = switchStatsSubTab;
  window.renderStatsProgressTab = renderStatsProgressTab;
  window.renderStatsExercisesTab = renderStatsProgressTab;
  window.renderExerciseDetailView = renderExerciseDetailView;
  window.openExerciseDetail = openExerciseDetail;
  window.closeExerciseDetail = closeExerciseDetail;
  window.filterExerciseStatsCategory = filterExerciseStatsCategory;
  window.filterExerciseStatsSearch = filterExerciseStatsSearch;
  window.renderStatsReportTab = renderStatsReportTab;
  window.shiftReportWeek = shiftReportWeek;
  window.selectReportDate = selectReportDate;
  window.triggerPrintReport = exportVivReportPng;
  window.renderStatsCalendarTab = renderStatsCalendarTab;
  window.changeCalMonth = changeCalMonth;
  window.showDayWorkoutDetails = showDayWorkoutDetails;
  window.deleteHistoryRecord = deleteHistoryRecord;
})();
