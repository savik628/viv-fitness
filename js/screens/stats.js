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

    const validTabs = ['progress', 'calendar', 'report'];
    if (!validTabs.includes(window.state.stats.activeSubTab)) {
      window.state.stats.activeSubTab = 'progress';
    }

    mainContent.innerHTML = `
      <div class="sub-tabs">
        <button class="sub-tab-btn ${window.state.stats.activeSubTab === 'progress' ? 'active' : ''}" onclick="switchStatsSubTab('progress')">Прогресс</button>
        <button class="sub-tab-btn ${window.state.stats.activeSubTab === 'calendar' ? 'active' : ''}" onclick="switchStatsSubTab('calendar')">Календарь</button>
        <button class="sub-tab-btn ${window.state.stats.activeSubTab === 'report' ? 'active' : ''}" onclick="switchStatsSubTab('report')">Отчёт PDF</button>
      </div>
      <div id="stats-tab-content"></div>`;

    if (window.state.stats.activeSubTab === 'report') {
      renderStatsReportTab();
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
  // БЛОК 1.1. АТЛЕТИЧЕСКИЙ ОТЧЁТ PDF (VIV Athlete Performance Report)
  // ---------------------------------------------------------------------------
  function renderStatsReportTab() {
    const container = document.getElementById('stats-tab-content');
    if (!container) return;

    const prof = window.Storage ? window.Storage.getProfile() : {};
    const history = window.Storage ? window.Storage.getHistory() : [];
    const weightLogs = window.Storage ? window.Storage.getBodyweightHistory() : [];
    const latestW = weightLogs.length ? weightLogs[weightLogs.length - 1].weight : (prof.weight || null);
    const initialW = weightLogs.length ? weightLogs[0].weight : (prof.weight || null);
    const weightDiff = (latestW != null && initialW != null) ? Math.round((latestW - initialW) * 10) / 10 : 0;

    const measurements = window.Storage ? window.Storage.getMeasurements() : [];
    const latestM = measurements[0] || { chest: 0, waist: 0, bicep: 0, thigh: 0 };

    let totalVolume = 0;
    let totalSets = 0;
    let totalDurationSec = 0;
    history.forEach(h => {
      totalDurationSec += (h.duration || 0);
      h.sets?.forEach(s => {
        totalSets++;
        totalVolume += ((parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0));
      });
    });

    const totalHours = Math.round((totalDurationSec / 3600) * 10) / 10;

    // Личные рекорды (PR)
    const bests = {};
    history.forEach(h => {
      h.sets?.forEach(s => {
        const w = parseFloat(s.weight) || 0;
        if (w > 0 && s.exerciseName) {
          if (!bests[s.exerciseName] || w > bests[s.exerciseName].weight) {
            bests[s.exerciseName] = { weight: w, reps: s.reps, date: h.date };
          }
        }
      });
    });

    const bestsList = Object.keys(bests)
      .map(k => ({ name: k, ...bests[k] }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8);

    // Привычки и дисциплина
    const habits = window.Storage ? window.Storage.getHabits() : [];
    let maxStreak = 0;
    habits.forEach(h => {
      const st = window.Storage ? window.Storage.getHabitStats(h.id) : { currentStreak: 0 };
      if (st.currentStreak > maxStreak) maxStreak = st.currentStreak;
    });

    const todayDateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    container.innerHTML = `
      <div class="report-tab-wrapper">
        <!-- Верхняя панель действий -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; gap:8px;">
          <div>
            <div style="font-size:16px; font-weight:800; color:var(--text-primary);">Атлетический отчёт</div>
            <div style="font-size:12px; color:var(--text-secondary);">Готов к печати и экспорту в PDF</div>
          </div>
          <button class="btn btn-green" onclick="triggerPrintReport()" style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; font-weight:700;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Экспорт в PDF
          </button>
        </div>

        <!-- Документ отчёта -->
        <div id="viv-athlete-pdf-document" class="printable-athlete-doc">
          <!-- Шапка документа -->
          <div class="doc-header">
            <div class="doc-logo-title">
              <span class="doc-logo-accent">VIV</span> FITNESS
            </div>
            <div class="doc-badge">ATHLETIC PERFORMANCE REPORT</div>
            <div class="doc-meta-date">Дата формирования: ${todayDateStr}</div>
          </div>

          <!-- 1. Профиль атлета -->
          <div class="doc-section">
            <div class="doc-section-title">1. ПРОФИЛЬ АТЛЕТА</div>
            <div class="doc-profile-grid">
              <div class="doc-kv"><span>Имя:</span><strong>${esc(prof.name || 'Атлет')}</strong></div>
              <div class="doc-kv"><span>Уровень:</span><strong>${esc(prof.level || 'Начинающий')}</strong></div>
              <div class="doc-kv"><span>Рост:</span><strong>${prof.height ? `${prof.height} см` : '—'}</strong></div>
              <div class="doc-kv"><span>Вес тела:</span><strong>${latestW ? `${latestW} кг` : '—'} ${weightDiff !== 0 ? `(${weightDiff > 0 ? `+${weightDiff}` : weightDiff} кг)` : ''}</strong></div>
            </div>
          </div>

          <!-- 2. Сводные показатели -->
          <div class="doc-section">
            <div class="doc-section-title">2. СВОДНЫЕ ТРЕНИРОВОЧНЫЕ ПОКАЗАТЕЛИ</div>
            <div class="doc-kpi-grid">
              <div class="doc-kpi-card">
                <div class="doc-kpi-label">Всего тренировок</div>
                <div class="doc-kpi-value">${history.length}</div>
              </div>
              <div class="doc-kpi-card">
                <div class="doc-kpi-label">Суммарный тоннаж</div>
                <div class="doc-kpi-value">${Math.round(totalVolume).toLocaleString('ru-RU')} кг</div>
              </div>
              <div class="doc-kpi-card">
                <div class="doc-kpi-label">Всего подходов</div>
                <div class="doc-kpi-value">${totalSets}</div>
              </div>
              <div class="doc-kpi-card">
                <div class="doc-kpi-label">Время под нагрузкой</div>
                <div class="doc-kpi-value">${totalHours} ч</div>
              </div>
            </div>
          </div>

          <!-- 3. Антропометрия -->
          <div class="doc-section">
            <div class="doc-section-title">3. АНТРОПОМЕТРИЯ (ЗАМЕРЫ ТЕЛА)</div>
            <div class="doc-measurements-grid">
              <div class="doc-measure-chip"><span>Грудь:</span> <strong>${latestM.chest ? `${latestM.chest} см` : '—'}</strong></div>
              <div class="doc-measure-chip"><span>Талия:</span> <strong>${latestM.waist ? `${latestM.waist} см` : '—'}</strong></div>
              <div class="doc-measure-chip"><span>Бицепс:</span> <strong>${latestM.bicep ? `${latestM.bicep} см` : '—'}</strong></div>
              <div class="doc-measure-chip"><span>Бедро:</span> <strong>${latestM.thigh ? `${latestM.thigh} см` : '—'}</strong></div>
            </div>
          </div>

          <!-- 4. Личные рекорды -->
          <div class="doc-section">
            <div class="doc-section-title">4. ЛИЧНЫЕ РЕКОРДЫ В УПРАЖНЕНИЯХ (PR)</div>
            ${bestsList.length ? `
              <table class="doc-table">
                <thead>
                  <tr>
                    <th>Упражнение</th>
                    <th style="text-align:right;">Макс. вес</th>
                    <th style="text-align:right;">Повторения</th>
                    <th style="text-align:right;">Дата фиксации</th>
                  </tr>
                </thead>
                <tbody>
                  ${bestsList.map(b => `
                    <tr>
                      <td><strong>${esc(b.name)}</strong></td>
                      <td style="text-align:right;">${b.weight} кг</td>
                      <td style="text-align:right;">${b.reps} повт</td>
                      <td style="text-align:right; color:var(--text-secondary); font-size:11.5px;">${b.date || '—'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="font-size:12px; color:var(--text-secondary); padding:8px 0;">Личные рекорды будут отображаться по мере завершения тренировок.</div>
            `}
          </div>

          <!-- 5. Журнал недавних сессий -->
          <div class="doc-section">
            <div class="doc-section-title">5. ЖУРНАЛ ПОСЛЕДНИХ ТРЕНИРОВОЧНЫХ СЕССИЙ</div>
            ${history.length ? `
              <table class="doc-table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Программа</th>
                    <th style="text-align:right;">Подходы</th>
                    <th style="text-align:right;">Тоннаж</th>
                  </tr>
                </thead>
                <tbody>
                  ${history.slice(0, 6).map(h => {
                    let wVol = 0;
                    h.sets?.forEach(s => { wVol += (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0); });
                    return `
                      <tr>
                        <td style="font-size:12px;">${h.date}</td>
                        <td><strong>${esc(h.routineName || 'Тренировка')}</strong></td>
                        <td style="text-align:right;">${h.sets ? h.sets.length : 0}</td>
                        <td style="text-align:right;">${Math.round(wVol).toLocaleString('ru-RU')} кг</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            ` : `
              <div style="font-size:12px; color:var(--text-secondary); padding:8px 0;">Нет завершенных тренировок.</div>
            `}
          </div>

          <!-- 6. Дисциплина и режим -->
          ${habits.length ? `
            <div class="doc-section">
              <div class="doc-section-title">6. ДИСЦИПЛИНА И РЕЖИМ ДНЯ</div>
              <div style="display:flex; justify-content:space-between; align-items:center; background:var(--card-bg-elevated); padding:10px 14px; border-radius:10px; border:1px solid var(--border-color); font-size:13px;">
                <div>Активных привычек в трекере: <strong>${habits.length}</strong></div>
                <div>Максимальная серия (стрик): <strong style="color:var(--accent-color);">${maxStreak} дней</strong></div>
              </div>
            </div>
          ` : ''}

          <!-- Подвал документа -->
          <div class="doc-footer">
            <div>VIV FITNESS CLUB • АТЛЕТИЧЕСКИЙ ПРОГРЕСС И МОНИТОРИНГ ФОРМЫ</div>
            <div style="margin-top:2px;">Сгенерировано в приложении VIV Fitness на устройстве атлета.</div>
          </div>
        </div>
      </div>
    `;
  }

  function triggerPrintReport() {
    window.print();
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
  window.renderStatsReportTab = renderStatsReportTab;
  window.triggerPrintReport = triggerPrintReport;
  window.renderStatsProgressTab = renderStatsProgressTab;
  window.changeStatsRoutine = changeStatsRoutine;
  window.changeStatsExercise = changeStatsExercise;
  window.renderStatsCalendarTab = renderStatsCalendarTab;
  window.changeCalMonth = changeCalMonth;
  window.showDayWorkoutDetails = showDayWorkoutDetails;
  window.deleteHistoryRecord = deleteHistoryRecord;
})();
