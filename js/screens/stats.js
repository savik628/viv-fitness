// =============================================================================
// VIV Fitness - Экран аналитики и истории тренировок (Stats Screen)
// =============================================================================
// Назначение: Визуализация тренировочного прогресса через интерактивные графики
// (максимальный рабочий вес, расчетный 1RM, суммарный тоннаж), календарь активности
// по месяцам и подробный журнал истории завершенных сессий.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. ДИСПЕТЧЕР ПОДВКЛАДОК СТАТИСТИКИ (Sub-tabs Router)
  // ---------------------------------------------------------------------------
  function esc(str) {
    return window.escapeHtml ? window.escapeHtml(str) : (str || '');
  }

  function renderStats() {
    if (window.setHeader) window.setHeader('Статистика', false);
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const validTabs = ['summary', 'progress', 'calendar'];
    if (!validTabs.includes(window.state.stats.activeSubTab)) {
      window.state.stats.activeSubTab = 'summary';
    }

    mainContent.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab-btn ${window.state.stats.activeSubTab === 'summary' ? 'active' : ''}" onclick="switchStatsSubTab('summary')">Сводка</button>
        <button class="sub-tab-btn ${window.state.stats.activeSubTab === 'progress' ? 'active' : ''}" onclick="switchStatsSubTab('progress')">Прогресс</button>
        <button class="sub-tab-btn ${window.state.stats.activeSubTab === 'calendar' ? 'active' : ''}" onclick="switchStatsSubTab('calendar')">Календарь</button>
      </div>
      <div id="stats-tab-content"></div>`;

    if (window.state.stats.activeSubTab === 'summary') {
      renderStatsSummaryTab();
    } else if (window.state.stats.activeSubTab === 'calendar') {
      renderStatsCalendarTab();
    } else {
      renderStatsProgressTab();
    }
  }

  function switchStatsSubTab(tab) {
    window.state.stats.activeSubTab = tab;
    renderStats();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 1.1. СВОДКА ЗА ДЕНЬ (Apple Fitness Style Summary Dashboard)
  // ---------------------------------------------------------------------------
  function renderStatsSummaryTab() {
    const container = document.getElementById('stats-tab-content');
    if (!container) return;

    const todayStr = window.getLocalDateStr ? window.getLocalDateStr() : new Date().toISOString().substring(0, 10);
    const dateObj = new Date();
    const dayName = dateObj.toLocaleDateString('ru-RU', { weekday: 'long' });
    const dayDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const formattedDate = dayName.charAt(0).toUpperCase() + dayName.slice(1) + ', ' + dayDate;

    // 1. Тренировочные данные за сегодня
    const history = window.Storage ? window.Storage.getHistory() : [];
    const todayWorkouts = history.filter(h => h.date === todayStr);

    let todayVolume = 0;
    let todaySets = 0;
    let todayDurationSec = 0;
    todayWorkouts.forEach(w => {
      todayDurationSec += (w.duration || 0);
      if (Array.isArray(w.sets)) {
        todaySets += w.sets.length;
        w.sets.forEach(s => {
          const wgt = parseFloat(s.weight) || 0;
          const rps = parseInt(s.reps, 10) || 0;
          todayVolume += wgt * rps;
        });
      }
    });

    const todayDurationMin = Math.round(todayDurationSec / 60);
    const targetVolume = Math.max(2000, todayVolume > 0 ? Math.ceil(todayVolume / 500) * 500 : 2000);
    const volumePct = targetVolume > 0 ? Math.min(100, Math.round((todayVolume / targetVolume) * 100)) : 0;

    // 2. Данные по привычкам за сегодня
    const habits = window.Storage ? window.Storage.getHabits() : [];
    const habitProgress = window.Storage ? window.Storage.getDailyHabitProgress(todayStr) : { total: 0, completed: 0, percentage: 0 };
    const totalHabits = habitProgress.total || habits.length;
    const completedHabits = habitProgress.completed || 0;
    const habitsPct = totalHabits > 0 ? Math.min(100, Math.round((completedHabits / totalHabits) * 100)) : 0;

    // 3. Данные по стрику / дисциплине
    let maxStreak = 0;
    habits.forEach(h => {
      const st = window.Storage ? window.Storage.getHabitStats(h.id) : { currentStreak: 0 };
      if (st.currentStreak > maxStreak) maxStreak = st.currentStreak;
    });
    if (maxStreak === 0 && todayWorkouts.length > 0) maxStreak = 1;
    const targetStreak = 7;
    const streakPct = Math.min(100, Math.round((maxStreak / targetStreak) * 100));

    // 4. Данные по весу тела
    const bwLogs = window.Storage ? window.Storage.getBodyweightLogs() : [];
    const latestWeight = bwLogs.length ? bwLogs[bwLogs.length - 1].weight : (window.state?.profile?.weight || 75);
    let weightDiffText = 'Текущий вес';
    if (bwLogs.length > 1) {
      const prevWeight = bwLogs[bwLogs.length - 2].weight;
      const diff = Math.round((latestWeight - prevWeight) * 10) / 10;
      if (diff > 0) weightDiffText = `+${diff} кг к прошлому`;
      else if (diff < 0) weightDiffText = `${diff} кг к прошлому`;
      else weightDiffText = 'Без изменений';
    }

    // 5. Параметры SVG колец активности
    const c1 = 326.73; // r = 52
    const offset1 = c1 - (c1 * (volumePct / 100));

    const c2 = 238.76; // r = 38
    const offset2 = c2 - (c2 * (habitsPct / 100));

    const c3 = 150.80; // r = 24
    const offset3 = c3 - (c3 * (streakPct / 100));

    // 6. Мини-графики столбиков (12 колонок как в Apple Fitness)
    const miniBarsHtml = Array.from({ length: 12 }).map((_, i) => {
      const hasSet = i < todaySets;
      const barHeight = hasSet ? Math.min(26, Math.max(8, (i + 1) * 3)) : 4;
      return `<div class="summary-mini-bar ${hasSet ? 'active-purple' : ''}" style="height:${barHeight}px;"></div>`;
    }).join('');

    const miniBwBarsHtml = Array.from({ length: 12 }).map((_, i) => {
      const isFilled = i >= 4 && i <= 8;
      const h = isFilled ? 18 : 6;
      return `<div class="summary-mini-bar ${isFilled ? 'active-cyan' : ''}" style="height:${h}px;"></div>`;
    }).join('');

    const routines = window.Storage ? window.Storage.getRoutines() : [];
    const featuredRoutine = routines[0] || null;

    container.innerHTML = `
      <div class="apple-fitness-summary">
        <!-- Шапка сводки -->
        <div class="summary-header-block">
          <div>
            <div class="summary-title-main">Сводка</div>
            <div class="summary-date-sub">${esc(formattedDate)}</div>
          </div>
          <div class="badge" style="background:var(--card-bg-elevated); border:1px solid var(--border-color); font-size:12px; padding:4px 10px;">
            VIV Activity
          </div>
        </div>

        <!-- Карточка: Кольца активности (Activity Rings) -->
        <div class="activity-rings-card">
          <div class="activity-rings-card-title">Кольца активности</div>
          <div class="activity-rings-content">
            <div class="activity-rings-svg-wrap">
              <svg width="130" height="130" viewBox="0 0 140 140" class="activity-rings-svg">
                <!-- Фоны дорожек -->
                <circle cx="70" cy="70" r="52" stroke="rgba(255, 45, 85, 0.22)" stroke-width="11" fill="none" />
                <circle cx="70" cy="70" r="38" stroke="rgba(48, 209, 88, 0.22)" stroke-width="11" fill="none" />
                <circle cx="70" cy="70" r="24" stroke="rgba(0, 240, 255, 0.22)" stroke-width="11" fill="none" />

                <!-- Прогресс колец -->
                <circle cx="70" cy="70" r="52" stroke="#ff2d55" stroke-width="11" fill="none" stroke-linecap="round"
                        stroke-dasharray="326.73" stroke-dashoffset="${offset1}" style="transition: stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1);" />
                <circle cx="70" cy="70" r="38" stroke="#30d158" stroke-width="11" fill="none" stroke-linecap="round"
                        stroke-dasharray="238.76" stroke-dashoffset="${offset2}" style="transition: stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1);" />
                <circle cx="70" cy="70" r="24" stroke="#00f0ff" stroke-width="11" fill="none" stroke-linecap="round"
                        stroke-dasharray="150.80" stroke-dashoffset="${offset3}" style="transition: stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1);" />
              </svg>
            </div>

            <!-- Легенда и показатели справа -->
            <div class="rings-legend-list">
              <div class="ring-stat-item">
                <div class="ring-stat-label">Тоннаж / Объем</div>
                <div class="ring-stat-val val-red">
                  ${todayVolume.toLocaleString('ru-RU')}/${targetVolume.toLocaleString('ru-RU')} <span class="ring-stat-unit">КГ</span>
                </div>
              </div>

              <div class="ring-stat-item">
                <div class="ring-stat-label">Привычки</div>
                <div class="ring-stat-val val-green">
                  ${completedHabits}/${totalHabits} <span class="ring-stat-unit">ВЫПОЛНЕНО</span>
                </div>
              </div>

              <div class="ring-stat-item">
                <div class="ring-stat-label">Дисциплина</div>
                <div class="ring-stat-val val-cyan">
                  ${maxStreak} <span class="ring-stat-unit">ДНЕЙ ПОДРЯД</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2 квадратные метрические карточки в ряд -->
        <div class="summary-metric-cards-grid">
          <!-- Подходы -->
          <div class="summary-metric-card" onclick="switchStatsSubTab('calendar')" style="cursor:pointer;" title="Нажмите для перехода в журнал">
            <div>
              <div class="summary-metric-top">
                <span class="summary-metric-title">Подходы</span>
                <span class="summary-metric-chevron">›</span>
              </div>
              <div class="summary-metric-sub">Сегодня</div>
              <div class="summary-metric-num num-purple">${todaySets}</div>
            </div>
            <div class="summary-mini-bars">
              ${miniBarsHtml}
            </div>
          </div>

          <!-- Вес тела -->
          <div class="summary-metric-card" onclick="openWeightModalFromSummary()" style="cursor:pointer;" title="Нажмите для записи веса">
            <div>
              <div class="summary-metric-top">
                <span class="summary-metric-title">Вес тела</span>
                <span class="summary-metric-chevron">›</span>
              </div>
              <div class="summary-metric-sub">${esc(weightDiffText)}</div>
              <div class="summary-metric-num num-cyan">${latestWeight} <span style="font-size:14px; font-weight:700;">КГ</span></div>
            </div>
            <div class="summary-mini-bars">
              ${miniBwBarsHtml}
            </div>
          </div>
        </div>

        <!-- Карточка тренировки дня -->
        <div class="summary-featured-workout-card">
          ${todayWorkouts.length > 0 ? `
            <div class="summary-featured-badge">✓ Тренировка завершена</div>
            <div class="summary-featured-title">${esc(todayWorkouts[0].routineName || 'Тренировка')}</div>
            <div class="summary-featured-meta">
              <span>⏱ ${todayDurationMin} мин</span>
              <span>⚡ ${todaySets} подходов</span>
              <span>🏋️ ${todayVolume.toLocaleString('ru-RU')} кг</span>
            </div>
            <button class="btn btn-outline btn-sm" onclick="switchStatsSubTab('calendar')">Посмотреть в журнале</button>
          ` : `
            <div class="summary-featured-badge" style="color:#38bdf8;">Активность дня</div>
            <div class="summary-featured-title">${featuredRoutine ? esc(featuredRoutine.name) : 'Силовая тренировка'}</div>
            <div class="summary-featured-meta">
              <span>${featuredRoutine ? `${featuredRoutine.exercises.length} упражнений` : 'Создайте первую программу'}</span>
              <span>Регулярность формирует результат</span>
            </div>
            <div style="display:flex; gap:8px;">
              ${featuredRoutine ? `
                <button class="btn btn-green" style="flex:1;" onclick="startWorkoutFromSummary(${featuredRoutine.id})">Начать тренировку</button>
              ` : `
                <button class="btn btn-green" style="flex:1;" onclick="window.switchTab ? window.switchTab('work') : null">Перейти к программам</button>
              `}
            </div>
          `}
        </div>

        <!-- Быстрый чеклист привычек на сегодня -->
        ${habits.length > 0 ? `
          <div class="card" style="padding:14px 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div style="font-size:13.5px; font-weight:700; color:var(--text-primary);">Привычки на сегодня</div>
              <button class="btn btn-outline btn-sm" style="padding:3px 8px; font-size:11px;" onclick="window.switchTab ? window.switchTab('habits') : null">Все привычки ›</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${habits.slice(0, 4).map(h => {
                const isDone = window.Storage ? window.Storage.isHabitCompleted(todayStr, h.id) : false;
                return `
                  <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:var(--card-bg-elevated); border:1px solid var(--border-subtle); border-radius:10px;">
                    <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                      <span style="font-size:16px;">${h.emoji || '🎯'}</span>
                      <span style="font-size:13px; font-weight:600; text-decoration:${isDone ? 'line-through' : 'none'}; color:${isDone ? 'var(--text-secondary)' : 'var(--text-primary)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${esc(h.title)}
                      </span>
                    </div>
                    <button class="habit-checkbox-btn ${isDone ? 'checked' : ''}" style="width:28px; height:28px; border-radius:8px; font-size:12px;" onclick="toggleSummaryHabit(${h.id}, '${todayStr}')">✓</button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function startWorkoutFromSummary(routineId) {
    if (window.startWorkout) {
      window.startWorkout(routineId);
      if (window.switchTab) window.switchTab('work');
    }
  }

  function toggleSummaryHabit(habitId, dateStr) {
    if (window.Storage) {
      window.Storage.toggleHabit(dateStr, habitId);
      if (window.triggerHaptic) window.triggerHaptic('impact');
      renderStatsSummaryTab();
    }
  }

  function openWeightModalFromSummary() {
    if (window.openLogWeightModal) {
      window.openLogWeightModal();
    } else if (window.switchTab) {
      window.switchTab('profile');
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 2. ВКЛАДКА "ПРОГРЕСС" И ГРАФИКИ ДИНАМИКИ (Progress Charts)
  // ---------------------------------------------------------------------------
  function renderStatsProgressTab() {
    const container = document.getElementById('stats-tab-content');
    if (!container) return;

    const routines = window.Storage ? window.Storage.getStatsRoutines() : [];
    window.state.stats.routines = routines;

    if (!routines.length) {
      container.innerHTML = `<div style="text-align:center; padding:40px 16px; color:var(--text-secondary)">Нет записей тренировок.</div>`;
      return;
    }

    if (!window.state.stats.selectedRoutine || !routines.includes(window.state.stats.selectedRoutine)) {
      window.state.stats.selectedRoutine = routines[0];
    }

    const exercises = window.Storage.getStatsExercises(window.state.stats.selectedRoutine);
    window.state.stats.exercises = exercises;

    if (!window.state.stats.selectedExercise || !exercises.includes(window.state.stats.selectedExercise)) {
      window.state.stats.selectedExercise = exercises[0] || null;
    }

    const chartPoints = window.state.stats.selectedExercise
      ? window.Storage.getChartPoints(window.state.stats.selectedRoutine, window.state.stats.selectedExercise)
      : [];
    window.state.stats.chartPoints = chartPoints;

    const exType = chartPoints[0]?.exerciseType || 'weight_reps';
    const isWeightReps = exType === 'weight_reps' || (chartPoints[0]?.maxWeight > 0);

    let chartsHtml = '';
    if (!chartPoints.length) {
      chartsHtml = '<div class="card" style="text-align:center; color:var(--text-secondary); padding:24px;">Нет данных для графика по этому упражнению</div>';
    } else if (isWeightReps) {
      chartsHtml = `
        <div class="card" style="margin-bottom:12px;">
          <div style="font-weight:bold; font-size:15px; margin-bottom:2px;">${esc(window.state.stats.selectedExercise)}</div>
          <div style="font-size:11.5px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:12px;">Максимальный вес (кг)</div>
          <div class="chart-container">
            <canvas id="progressCanvasMaxWeight"></canvas>
          </div>
        </div>
        <div class="card" style="margin-bottom:12px;">
          <div style="font-weight:bold; font-size:15px; margin-bottom:2px;">${esc(window.state.stats.selectedExercise)}</div>
          <div style="font-size:11.5px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:12px;">Расчётный 1RM (кг)</div>
          <div class="chart-container">
            <canvas id="progressCanvas1RM"></canvas>
          </div>
        </div>
        <div class="card">
          <div style="font-weight:bold; font-size:15px; margin-bottom:2px;">${esc(window.state.stats.selectedExercise)}</div>
          <div style="font-size:11.5px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:12px;">Суммарный тоннаж (кг)</div>
          <div class="chart-container">
            <canvas id="progressCanvasTotalVolume"></canvas>
          </div>
        </div>
      `;
    } else if (exType === 'bodyweight') {
      chartsHtml = `
        <div class="card">
          <div style="font-weight:bold; font-size:15px; margin-bottom:2px;">${esc(window.state.stats.selectedExercise)}</div>
          <div style="font-size:11.5px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:12px;">Максимальное количество повторений</div>
          <div class="chart-container">
            <canvas id="progressCanvasSingle"></canvas>
          </div>
        </div>
      `;
    } else if (exType === 'distance') {
      chartsHtml = `
        <div class="card">
          <div style="font-weight:bold; font-size:15px; margin-bottom:2px;">${esc(window.state.stats.selectedExercise)}</div>
          <div style="font-size:11.5px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:12px;">Суммарная дистанция (км)</div>
          <div class="chart-container">
            <canvas id="progressCanvasSingle"></canvas>
          </div>
        </div>
      `;
    } else {
      chartsHtml = `
        <div class="card">
          <div style="font-weight:bold; font-size:15px; margin-bottom:2px;">${esc(window.state.stats.selectedExercise)}</div>
          <div style="font-size:11.5px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:12px;">Время под нагрузкой (сек)</div>
          <div class="chart-container">
            <canvas id="progressCanvasSingle"></canvas>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="card">
        <div class="form-group">
          <label class="form-label">Программа</label>
          <select class="form-select" onchange="changeStatsRoutine(this.value)">
            ${routines.map(r => `<option value="${esc(r)}" ${r === window.state.stats.selectedRoutine ? 'selected' : ''}>${esc(r)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Упражнение</label>
          <select class="form-select" onchange="changeStatsExercise(this.value)">
            ${exercises.map(e => `<option value="${esc(e)}" ${e === window.state.stats.selectedExercise ? 'selected' : ''}>${esc(e)}</option>`).join('')}
          </select>
        </div>
      </div>
      ${chartsHtml}
    `;

    if (chartPoints.length > 0 && window.drawChart) {
      if (isWeightReps) {
        window.drawChart('progressCanvasMaxWeight', chartPoints, p => p.maxWeight, 'кг');
        window.drawChart('progressCanvas1RM', chartPoints, p => p.oneRepMax, 'кг');
        window.drawChart('progressCanvasTotalVolume', chartPoints, p => p.totalVolume, 'кг');
      } else if (exType === 'bodyweight') {
        window.drawChart('progressCanvasSingle', chartPoints, p => p.maxReps, 'повторений');
      } else if (exType === 'distance') {
        window.drawChart('progressCanvasSingle', chartPoints, p => p.totalValue, 'км');
      } else {
        window.drawChart('progressCanvasSingle', chartPoints, p => p.totalValue, 'сек');
      }
    }
  }

  function changeStatsRoutine(val) {
    window.state.stats.selectedRoutine = val;
    window.state.stats.selectedExercise = null;
    renderStatsProgressTab();
  }

  function changeStatsExercise(val) {
    window.state.stats.selectedExercise = val;
    renderStatsProgressTab();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 3. ВКЛАДКА "КАЛЕНДАРЬ АКТИВНОСТИ" (Monthly Calendar Grid)
  // ---------------------------------------------------------------------------
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
  function deleteHistoryRecord(id) {
    if (!confirm('Удалить эту запись тренировки из истории?')) return;
    if (window.Storage) window.Storage.deleteHistoryRecord(id);
    renderStats();
  }

  window.addEventListener('viv-theme-changed', () => {
    if (window.state && window.state.currentTab === 'stats') {
      if (window.state.stats.activeSubTab === 'progress') renderStatsProgressTab();
    }
  });

  // ---------------------------------------------------------------------------
  // БЛОК 6. ЭКСПОРТ В GLOBAL WINDOW (Module Exports)
  // ---------------------------------------------------------------------------
  window.renderStats = renderStats;
  window.switchStatsSubTab = switchStatsSubTab;
  window.renderStatsSummaryTab = renderStatsSummaryTab;
  window.startWorkoutFromSummary = startWorkoutFromSummary;
  window.toggleSummaryHabit = toggleSummaryHabit;
  window.openWeightModalFromSummary = openWeightModalFromSummary;
  window.renderStatsProgressTab = renderStatsProgressTab;
  window.changeStatsRoutine = changeStatsRoutine;
  window.changeStatsExercise = changeStatsExercise;
  window.renderStatsCalendarTab = renderStatsCalendarTab;
  window.changeCalMonth = changeCalMonth;
  window.showDayWorkoutDetails = showDayWorkoutDetails;
  window.deleteHistoryRecord = deleteHistoryRecord;
})();
