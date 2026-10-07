// VIV Fitness - Habits Tracker Module (Screen: Привычки)
// Ежедневный трекинг атлетических привычек, серий дней (streaks) и недельная лента

(function () {
  'use strict';

  // 8 атлетических эмодзи для привычек
  const HABIT_EMOJIS = ['✅', '🛑', '🌙', '⏱️', '⚡', '💧', '🔥', '🎯', '❄️', '☀️', '🌿', '➡️'];

  // Старый маппинг категорий на эмодзи для обратной совместимости
  const LEGACY_CATEGORY_MAP = {
    water: '💧',
    sleep: '🌙',
    nutrition: '🍏',
    sport: '🏋️',
    recovery: '🧘',
    steps: '🏃'
  };

  function getHabitEmoji(habit) {
    if (habit && habit.emoji) return habit.emoji;
    if (habit && habit.category && LEGACY_CATEGORY_MAP[habit.category]) {
      return LEGACY_CATEGORY_MAP[habit.category];
    }
    return '⚡';
  }

  // Получение 7 дней текущей недели (Пн - Вс)
  function getCurrentWeekDates(refDateStr) {
    const ref = refDateStr ? new Date(refDateStr + 'T12:00:00') : new Date();
    const dayOfWeek = ref.getDay();
    const distToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(ref);
    monday.setDate(ref.getDate() + distToMon);

    const week = [];
    const weekdayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isoStr = d.toISOString().substring(0, 10);
      week.push({
        dateStr: isoStr,
        dayNum: d.getDate(),
        weekday: weekdayNames[i],
        isToday: isoStr === new Date().toISOString().substring(0, 10)
      });
    }
    return week;
  }

  function getSelectedDate() {
    if (!window.state) return new Date().toISOString().substring(0, 10);
    if (!window.state.stats.selectedHabitDate) {
      window.state.stats.selectedHabitDate = new Date().toISOString().substring(0, 10);
    }
    return window.state.stats.selectedHabitDate;
  }

  function setSelectedDate(dateStr) {
    if (!window.state) return;
    window.state.stats.selectedHabitDate = dateStr;
    renderHabitsTab();
  }

  // Рендеринг основного содержимого подвкладки "Привычки"
  function renderHabitsTab(targetContainer) {
    const container = targetContainer || document.getElementById('stats-tab-content');
    if (!container) return;

    const habits = window.Storage ? window.Storage.getHabits() : [];
    const curDateStr = getSelectedDate();
    const todayStr = new Date().toISOString().substring(0, 10);
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
          ${habits.length ? `
            <span class="badge" style="font-size:13px; font-weight:800; padding:4px 10px;">
              ${dailyProgress.percentage}%
            </span>
          ` : ''}
        </div>

        ${habits.length ? `
          <div class="habit-progress-bar-bg">
            <div class="habit-progress-bar-fill" style="width:${dailyProgress.percentage}%;"></div>
          </div>
        ` : ''}
      </div>
    `;

    // 3. Список привычек
    if (!habits.length) {
      html += `
        <div class="card" style="text-align:center; padding:36px 16px; margin-bottom:16px;">
          <div style="font-size:32px; margin-bottom:10px;">⚡</div>
          <div style="font-size:17px; font-weight:700; margin-bottom:6px;">Трекер привычек</div>
          <div style="font-size:13px; color:var(--text-secondary); margin-bottom:20px; line-height:1.4;">
            Создайте свои ежедневные привычки для контроля режима, сна и восстановления.
          </div>
          <button class="btn btn-primary" onclick="openAddHabitModal()" style="width:100%;">
            + Добавить привычку
          </button>
        </div>
      `;
    } else {
      html += `
        <div class="habits-list" style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
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
                    <div class="habit-title">${h.title}</div>
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

    container.innerHTML = html;
  }

  // Переключение статуса привычки
  function toggleHabitStatus(habitId) {
    if (!window.Storage) return;
    const curDateStr = getSelectedDate();
    const isDone = window.Storage.toggleHabit(curDateStr, habitId);

    if (window.triggerHaptic) {
      window.triggerHaptic(isDone ? 'success' : 'light');
    }
    renderHabitsTab();
  }

  // Модальное окно добавления/редактирования
  function openAddHabitModal(habitId = null) {
    const isEdit = habitId !== null;
    let habit = { title: '', emoji: '💧' };

    if (isEdit && window.Storage) {
      const found = window.Storage.getHabits().find(h => String(h.id) === String(habitId));
      if (found) {
        habit = {
          ...found,
          emoji: getHabitEmoji(found)
        };
      }
    }

    const currentEmoji = habit.emoji || '💧';

    if (window.openModal) {
      window.openModal(`
        <div class="modal-header">
          <div class="modal-title">${isEdit ? 'Настройка привычки' : 'Новая привычка'}</div>
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">Название привычки</label>
          <input id="habit-title-input" class="form-input" placeholder="Название привычки" value="${habit.title || ''}">
        </div>

        <div class="form-group">
          <label class="form-label">Иконка</label>
          <div class="habit-emoji-grid">
            ${HABIT_EMOJIS.map(em => `
              <button 
                type="button" 
                class="habit-emoji-chip ${currentEmoji === em ? 'active' : ''}" 
                data-emoji="${em}"
                onclick="selectHabitEmoji('${em}')"
              >
                ${em}
              </button>
            `).join('')}
          </div>
          <input type="hidden" id="habit-emoji-val" value="${currentEmoji}">
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
          <button class="btn btn-green" onclick="saveHabitModal(${habitId})">
            ${isEdit ? 'Сохранить изменения' : 'Создать привычку'}
          </button>
          ${isEdit ? `
            <button class="btn btn-outline" style="color:#ef4444; border-color:rgba(239,68,68,0.3);" onclick="deleteHabitModal(${habitId})">
              Удалить привычку
            </button>
          ` : ''}
        </div>
      `);
    }
  }

  function selectHabitEmoji(emoji) {
    const hidden = document.getElementById('habit-emoji-val');
    if (hidden) hidden.value = emoji;
    document.querySelectorAll('.habit-emoji-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.emoji === emoji);
    });
  }

  function saveHabitModal(habitId) {
    const titleInput = document.getElementById('habit-title-input');
    const emojiInput = document.getElementById('habit-emoji-val');

    const title = titleInput ? titleInput.value.trim() : '';
    if (!title) return alert('Введите название привычки');

    const emoji = emojiInput ? emojiInput.value : '💧';

    if (window.Storage) {
      window.Storage.saveHabit({
        id: habitId || undefined,
        title,
        emoji
      });
    }

    if (window.closeModal) window.closeModal();
    renderHabitsTab();
  }

  function deleteHabitModal(habitId) {
    if (!confirm('Удалить эту привычку и её историю?')) return;
    if (window.Storage) {
      window.Storage.deleteHabit(habitId);
    }
    if (window.closeModal) window.closeModal();
    renderHabitsTab();
  }

  // Экспорт в глобальную область
  window.renderHabitsTab = renderHabitsTab;
  window.selectHabitDate = setSelectedDate;
  window.toggleHabitStatus = toggleHabitStatus;
  window.openAddHabitModal = openAddHabitModal;
  window.selectHabitEmoji = selectHabitEmoji;
  window.saveHabitModal = saveHabitModal;
  window.deleteHabitModal = deleteHabitModal;
})();
