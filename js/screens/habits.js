// =============================================================================
// VIV Fitness - Экран трекера привычек атлета (Habits Tracker Screen)
// =============================================================================
// Назначение: Ежедневный учет полезных привычек (сон, вода, спорт, питание),
// расчет непрерывных серий выполнения (streaks), визуализация недельной ленты
// и модальное окно добавления/редактирования с сеткой из 12 иконок.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. КОНСТАНТЫ ИКОНОК ПРИВЫЧЕК (Habit Icons Registry)
  // ---------------------------------------------------------------------------
  const HABIT_EMOJIS = ['✅', '🛑', '🌙', '⏱️', '⚡', '💧', '🔥', '🎯', '❄️', '☀️', '🌿', '➡️'];

  function getHabitEmoji(habit) {
    return (habit && habit.emoji) ? habit.emoji : '⚡';
  }

  // ---------------------------------------------------------------------------
  // БЛОК 2. НЕДЕЛЬНАЯ ЛЕНТА ДАТ И УПРАВЛЕНИЕ ВЫБОРОМ ДНЯ (Week Dates & State)
  // ---------------------------------------------------------------------------
  function fmtDate(d = new Date()) {
    return window.getLocalDateStr ? window.getLocalDateStr(d) : d.toISOString().substring(0, 10);
  }

  function esc(str) {
    return window.escapeHtml ? window.escapeHtml(str) : (str || '');
  }

  function getCurrentWeekDates(refDateStr) {
    const ref = refDateStr ? new Date(refDateStr + 'T12:00:00') : new Date();
    const dayOfWeek = ref.getDay();
    const distToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(ref);
    monday.setDate(ref.getDate() + distToMon);

    const week = [];
    const weekdaysNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const todayStr = fmtDate(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = fmtDate(d);
      week.push({
        dateStr: iso,
        dayNum: d.getDate(),
        weekday: weekdaysNames[i],
        isToday: iso === todayStr
      });
    }
    return week;
  }

  function getSelectedDate() {
    if (!window.state) return fmtDate(new Date());
    if (!window.state.habits) window.state.habits = {};
    if (!window.state.habits.selectedDate) {
      window.state.habits.selectedDate = fmtDate(new Date());
    }
    return window.state.habits.selectedDate;
  }

  function setSelectedDate(dateStr) {
    if (!window.state) return;
    if (!window.state.habits) window.state.habits = {};
    window.state.habits.selectedDate = dateStr;
    renderHabits();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 3. РЕНДЕРИНГ ЭКРАНА ПРИВЫЧЕК (Screen Layout & Habit Cards List)
  // ---------------------------------------------------------------------------
  function renderHabits() {
    const container = document.getElementById('main-content');
    if (!container) return;

    if (window.setHeader) {
      window.setHeader('Привычки', false, `
        <button class="header-icon-btn" onclick="openAddHabitModal()" title="Добавить привычку">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      `);
    }

    const habits = window.Storage ? window.Storage.getHabits() : [];
    const curDateStr = getSelectedDate();
    const todayStr = fmtDate(new Date());
    const isToday = curDateStr === todayStr;

    const weekDays = getCurrentWeekDates(curDateStr);
    const dailyProgress = window.Storage ? window.Storage.getDailyHabitProgress(curDateStr) : { total: 0, completed: 0, percentage: 0 };

    const [y, m, d] = curDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const formattedDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

    let html = `
      <!-- 1. Недельная лента дней -->
      <div class="habit-week-strip">
        ${weekDays.map(w => {
          const isSelected = w.dateStr === curDateStr;
          const prog = window.Storage ? window.Storage.getDailyHabitProgress(w.dateStr) : { total: 0, completed: 0 };
          const isFull = prog.total > 0 && prog.completed === prog.total;
          return `
            <button 
              class="habit-day-pill ${isSelected ? 'active' : ''} ${w.isToday ? 'is-today' : ''}" 
              onclick="selectHabitDate('${w.dateStr}')"
            >
              <span class="habit-day-name">${w.weekday}</span>
              <span class="habit-day-num">${w.dayNum}</span>
              <span class="habit-day-dot ${isFull ? 'full' : prog.completed > 0 ? 'partial' : ''}"></span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- 2. Сводка дня и прогресс-бар -->
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <div style="font-weight:700; font-size:15px;">
              ${isToday ? 'Сегодня' : formattedDate}
            </div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
              ${habits.length ? `Выполнено ${dailyProgress.completed} из ${dailyProgress.total}` : 'Нет активных привычек'}
            </div>
          </div>
          <div style="font-size:20px; font-weight:800; color:${dailyProgress.percentage === 100 ? 'var(--color-success, #16a34a)' : 'var(--text-primary)'};">
            ${dailyProgress.percentage}%
          </div>
        </div>

        <div class="habit-progress-track">
          <div 
            class="habit-progress-bar" 
            style="width:${dailyProgress.percentage}%; ${dailyProgress.percentage === 100 ? 'background:var(--color-success, #16a34a);' : ''}"
          ></div>
        </div>
      </div>
    `;

    // 3. Список карточек привычек
    if (!habits.length) {
      html += `
        <div class="card" style="text-align:center; padding:36px 16px;">
          <div style="font-size:36px; margin-bottom:12px;">🎯</div>
          <div style="font-size:16px; font-weight:700; margin-bottom:6px;">Трекер привычек пуст</div>
          <div style="font-size:13px; color:var(--text-secondary); margin-bottom:20px; max-width:280px; margin-left:auto; margin-right:auto;">
            Добавьте ежедневные привычки: сон, воду, зарядку или приём витаминов.
          </div>
          <button class="btn btn-primary" onclick="openAddHabitModal()">+ Добавить привычку</button>
        </div>
      `;
    } else {
      html += `
        <div class="habit-cards-list">
          ${habits.map(h => {
            const isDone = window.Storage ? window.Storage.isHabitCompleted(curDateStr, h.id) : false;
            const stats = window.Storage ? window.Storage.getHabitStats(h.id) : { currentStreak: 0, bestStreak: 0, totalCompleted: 0 };
            return `
              <div class="habit-card ${isDone ? 'completed' : ''}">
                <div class="habit-card-left" onclick="openAddHabitModal(${h.id})" style="cursor:pointer;">
                  <div class="habit-icon-wrap">
                    ${getHabitEmoji(h)}
                  </div>
                  <div class="habit-info">
                    <div class="habit-title">${esc(h.title)}</div>
                    <div class="habit-meta">
                      ${stats.currentStreak > 0 
                        ? `<span class="habit-streak-badge active">🔥 ${stats.currentStreak} дн.</span>` 
                        : `<span class="habit-streak-badge">0 дн.</span>`
                      }
                      <span>Всего: ${stats.totalCompleted}</span>
                    </div>
                  </div>
                </div>

                <button 
                  class="habit-checkbox-btn ${isDone ? 'checked' : ''}" 
                  onclick="toggleHabitStatus(${h.id})"
                  aria-label="Отметить выполнение"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </button>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn btn-outline" onclick="openAddHabitModal()" style="flex:1;">
            + Добавить привычку
          </button>
        </div>
      `;
    }

    const prevScroll = container.scrollTop;
    container.innerHTML = html;
    container.scrollTop = prevScroll;
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4. ПЕРЕКЛЮЧЕНИЕ СТАТУСА ПРИВЫЧКИ (Toggle Habit & Haptic Feedback)
  // ---------------------------------------------------------------------------
  function toggleHabitStatus(habitId) {
    const curDateStr = getSelectedDate();
    if (!window.Storage) return;

    const isDone = window.Storage.toggleHabit(curDateStr, habitId);

    if (window.triggerHaptic) {
      window.triggerHaptic(isDone ? 'success' : 'light');
    }
    renderHabits();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 5. МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ (Habit Modal Manager)
  // ---------------------------------------------------------------------------
  function openAddHabitModal(habitId = null) {
    const isEdit = habitId !== null;
    let habit = { title: '', emoji: '✅' };

    if (isEdit && window.Storage) {
      const habits = window.Storage.getHabits();
      const found = habits.find(h => h.id === habitId);
      if (found) habit = { ...found, emoji: getHabitEmoji(found) };
    }

    let selectedEmoji = habit.emoji || '✅';

    const modalHtml = `
      <div style="padding:16px;">
        <div style="font-size:18px; font-weight:bold; margin-bottom:16px;">
          ${isEdit ? 'Редактировать привычку' : 'Новая привычка'}
        </div>

        <div style="margin-bottom:14px;">
          <label style="display:block; font-size:13px; color:var(--text-secondary); margin-bottom:6px;">Название</label>
          <input id="habit-title-input" class="form-input" placeholder="Название привычки" value="${esc(habit.title)}">
        </div>

        <!-- Сетка 12 минималистичных иконок -->
        <div style="margin-bottom:18px;">
          <label style="display:block; font-size:13px; color:var(--text-secondary); margin-bottom:8px;">Иконка</label>
          <div class="habit-emoji-grid" id="habit-emoji-selector">
            ${HABIT_EMOJIS.map(em => `
              <button 
                type="button" 
                class="habit-emoji-chip ${em === selectedEmoji ? 'active' : ''}" 
                data-emoji="${em}"
                onclick="selectHabitEmoji('${em}')"
              >
                <span>${em}</span>
              </button>
            `).join('')}
          </div>
          <input type="hidden" id="habit-selected-emoji" value="${selectedEmoji}">
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn btn-green" style="flex:1;" onclick="saveHabitModal(${habitId})">
            ${isEdit ? 'Сохранить' : 'Создать'}
          </button>
          ${isEdit ? `
            <button class="btn btn-outline" style="color:var(--color-danger, #ef4444); border-color:rgba(239,68,68,0.4);" onclick="deleteHabitModal(${habitId})">
              Удалить
            </button>
          ` : ''}
          <button class="btn btn-outline" onclick="closeModal()">Отмена</button>
        </div>
      </div>
    `;

    if (window.openModal) {
      window.openModal(modalHtml);
      setTimeout(() => {
        const inp = document.getElementById('habit-title-input');
        if (inp) inp.focus();
      }, 100);
    }
  }

  function selectHabitEmoji(em) {
    const hiddenInp = document.getElementById('habit-selected-emoji');
    if (hiddenInp) hiddenInp.value = em;

    document.querySelectorAll('.habit-emoji-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.emoji === em);
    });
  }

  function saveHabitModal(habitId) {
    const titleInput = document.getElementById('habit-title-input');
    const emojiInput = document.getElementById('habit-selected-emoji');
    const title = titleInput?.value.trim();
    const emoji = emojiInput?.value || '✅';

    if (!title) {
      alert('Введите название привычки');
      return;
    }

    if (window.Storage) {
      window.Storage.saveHabit({
        id: habitId || undefined,
        title,
        emoji
      });
    }

    if (window.closeModal) window.closeModal();
    renderHabits();
  }

  function deleteHabitModal(habitId) {
    if (!confirm('Удалить эту привычку и её историю?')) return;
    if (window.Storage) {
      window.Storage.deleteHabit(habitId);
    }
    if (window.closeModal) window.closeModal();
    renderHabits();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 6. ЭКСПОРТ ФУНКЦИЙ ЭКРАНА В GLOBAL WINDOW (Module Exports)
  // ---------------------------------------------------------------------------
  window.renderHabits = renderHabits;
  window.selectHabitDate = setSelectedDate;
  window.toggleHabitStatus = toggleHabitStatus;
  window.openAddHabitModal = openAddHabitModal;
  window.selectHabitEmoji = selectHabitEmoji;
  window.saveHabitModal = saveHabitModal;
  window.deleteHabitModal = deleteHabitModal;
})();
