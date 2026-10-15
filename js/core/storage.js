// =============================================================================
// VIV Fitness - Централизованное локальное хранилище данных (Storage Manager)
// =============================================================================
// Назначение: Обеспечивает персистентность данных пользователя на его устройстве
// через localStorage с fallback в оперативную память. Хранит профиль, программы,
// историю сессий, антропометрию, привычки и резервные копии.
// =============================================================================

// -----------------------------------------------------------------------------
// БЛОК 1. СИСТЕМНЫЕ КЛЮЧИ ХРАНИЛИЩА (Storage Keys Registry)
// -----------------------------------------------------------------------------
/**
 * Уникальные префиксы ключей в пространстве localStorage для предотвращения коллизий.
 */
const KEYS = {
  PROFILE: 'viv_user_profile',
  ROUTINES: 'viv_user_routines',
  HISTORY: 'viv_user_history',
  WEIGHT_LOG: 'viv_user_weight_log',
  MEASUREMENTS: 'viv_user_measurements',
  SETTINGS: 'viv_user_settings',
  ACTIVE_DRAFT: 'viv_active_draft_workout',
  THEME: 'viv_theme',
  HABITS: 'viv_user_habits',
  HABIT_LOGS: 'viv_user_habit_logs',
  CHART_LIMIT: 'viv_chart_limit',
};

// -----------------------------------------------------------------------------
// БЛОК 2. ДЕФОЛТНЫЕ СТРУКТУРЫ ДАННЫХ (Default Fallbacks)
// -----------------------------------------------------------------------------
/**
 * Базовые начальные структуры сущностей при первом запуске приложения.
 */
const DEFAULT_PROFILE = {
  name: '',
  level: '',
  weight: null,
  height: null,
  notificationsEnabled: true,
};

const DEFAULT_ROUTINES = [];

// -----------------------------------------------------------------------------
// БЛОК 3. НИЗКОУРОВНЕВЫЙ ДВИЖОК ПЕРСИСТЕНТНОСТИ И УТИЛИТЫ (Helpers)
// -----------------------------------------------------------------------------
const _memStore = {};
const _cache = {};

function getLocalDateStr(d = new Date()) {
  const dateObj = (d instanceof Date && !isNaN(d)) ? d : new Date();
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const getStore = (key, fallback) => {
  if (_cache[key] !== undefined) {
    return _cache[key];
  }
  try {
    let val;
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      val = raw ? JSON.parse(raw) : fallback;
    } else {
      val = _memStore[key] ? JSON.parse(_memStore[key]) : fallback;
    }
    _cache[key] = val;
    return val;
  } catch {
    return fallback;
  }
};

const setStore = (key, val) => {
  try {
    _cache[key] = val;
    const serialized = JSON.stringify(val);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized);
    } else {
      _memStore[key] = serialized;
    }
  } catch (e) {
    console.error(`Ошибка записи в ${key}:`, e);
  }
};

// -----------------------------------------------------------------------------
// ОСНОВНОЙ ОБЪЕКТ УПРАВЛЕНИЯ ДАННЫМИ (Storage Facade)
// -----------------------------------------------------------------------------
const Storage = {

  // ---------------------------------------------------------------------------
  // БЛОК 4. УПРАВЛЕНИЕ ПРОФИЛЕМ АТЛЕТА (Athlete Profile Store)
  // ---------------------------------------------------------------------------
  getProfile() {
    return getStore(KEYS.PROFILE, DEFAULT_PROFILE);
  },

  saveProfile(profile) {
    setStore(KEYS.PROFILE, profile);
    return profile;
  },

  // ---------------------------------------------------------------------------
  // БЛОК 5. ПРОГРАММЫ ТРЕНИРОВОК И ЧЕРНОВИК (Routines & Active Draft Store)
  // ---------------------------------------------------------------------------
  getRoutines() {
    const list = getStore(KEYS.ROUTINES, null);
    if (Array.isArray(list)) return list;
    return [];
  },

  saveRoutines(routines) {
    setStore(KEYS.ROUTINES, routines);
    return routines;
  },

  saveRoutine(routine) {
    const routines = this.getRoutines();
    if (routine.id) {
      const idx = routines.findIndex(r => String(r.id) === String(routine.id));
      if (idx !== -1) routines[idx] = { ...routines[idx], ...routine };
      else routines.unshift(routine);
    } else {
      routine = {
        ...routine,
        id: Date.now(),
        createdAt: getLocalDateStr(),
      };
      routines.unshift(routine);
    }
    this.saveRoutines(routines);
    return routine;
  },

  deleteRoutine(id) {
    const filtered = this.getRoutines().filter(r => String(r.id) !== String(id));
    this.saveRoutines(filtered);
    return true;
  },

  getActiveDraft() {
    return getStore(KEYS.ACTIVE_DRAFT, null);
  },

  saveActiveDraft(draft) {
    setStore(KEYS.ACTIVE_DRAFT, draft);
    return draft;
  },

  clearActiveDraft() {
    delete _cache[KEYS.ACTIVE_DRAFT];
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEYS.ACTIVE_DRAFT);
  },

  // ---------------------------------------------------------------------------
  // БЛОК 6. ИСТОРИЯ ТРЕНИРОВОК И РЕКОРДЫ (Workout Logs & Personal Records PR)
  // ---------------------------------------------------------------------------
  getHistory() {
    return getStore(KEYS.HISTORY, []);
  },

  saveHistory(history) {
    setStore(KEYS.HISTORY, history);
    return history;
  },

  getLastExerciseSets(exerciseName) {
    if (!exerciseName) return null;
    const targetName = exerciseName.trim().toLowerCase();
    const history = this.getHistory();
    for (const h of history) {
      if (Array.isArray(h.sets)) {
        const matching = h.sets.filter(s => s.exerciseName && s.exerciseName.trim().toLowerCase() === targetName);
        if (matching.length > 0) {
          return matching.map((s, idx) => ({
            setNumber: idx + 1,
            weight: parseFloat(s.weight) || 0,
            reps: parseInt(s.reps, 10) || 0,
            distance: parseFloat(s.distance) || 0,
            duration: parseInt(s.duration, 10) || 0,
            rpe: s.rpe || '',
            completed: false,
          }));
        }
      }
    }
    return null;
  },

  addWorkoutRecord(record) {
    const history = this.getHistory();
    let sets = [];

    if (Array.isArray(record.exercises)) {
      record.exercises.forEach(ex => {
        if (Array.isArray(ex.sets)) {
          ex.sets.forEach(s => {
            sets.push({
              exerciseName: ex.name,
              exerciseType: ex.type || s.exerciseType || 'weight_reps',
              setNumber: s.setNumber,
              weight: parseFloat(s.weight) || 0,
              reps: parseInt(s.reps, 10) || 0,
              distance: parseFloat(s.distance) || 0,
              duration: parseInt(s.duration, 10) || 0,
            });
          });
        }
      });
    } else if (Array.isArray(record.sets)) {
      sets = record.sets;
    }

    const newRecord = {
      id: record.id || Date.now(),
      routineName: record.routineName || 'Тренировка',
      date: record.date || getLocalDateStr(),
      duration: record.duration || 0,
      sets,
    };
    history.unshift(newRecord);
    this.saveHistory(history);
    return newRecord;
  },

  deleteHistoryRecord(id) {
    const filtered = this.getHistory().filter(h => String(h.id) !== String(id));
    this.saveHistory(filtered);
    return true;
  },

  checkWorkoutPRs(historyRecord) {
    const priorHistory = this.getHistory().filter(h => String(h.id) !== String(historyRecord.id));
    const prs = [];

    // Находим максимальный вес для каждого упражнения в текущей тренировке
    const currentMaxWeights = {};
    historyRecord.sets?.forEach(s => {
      const isWeight = s.exerciseType === 'weight_reps' || !s.exerciseType;
      const w = parseFloat(s.weight) || 0;
      if (isWeight && w > 0 && s.exerciseName) {
        const name = s.exerciseName.trim();
        if (!currentMaxWeights[name] || w > currentMaxWeights[name]) {
          currentMaxWeights[name] = w;
        }
      }
    });

    // Сравниваем максимальный вес текущей тренировки с абсолютным максимумом прошлого
    Object.keys(currentMaxWeights).forEach(exName => {
      const currentMax = currentMaxWeights[exName];
      let maxPriorW = 0;
      const lowerName = exName.toLowerCase();

      priorHistory.forEach(h => {
        h.sets?.forEach(ps => {
          if (ps.exerciseName && ps.exerciseName.trim().toLowerCase() === lowerName) {
            const pw = parseFloat(ps.weight) || 0;
            if (pw > maxPriorW) maxPriorW = pw;
          }
        });
      });

      if (currentMax > maxPriorW && maxPriorW > 0) {
        prs.push({
          exerciseName: exName,
          weight: currentMax,
          priorWeight: maxPriorW,
          diff: Math.round((currentMax - maxPriorW) * 10) / 10
        });
      }
    });

    return prs;
  },

  // ---------------------------------------------------------------------------
  // БЛОК 7. АНАЛИТИКА, ГРАФИКИ И КАЛЕНДАРЬ (Analytics, Charts & Calendar)
  // ---------------------------------------------------------------------------
  getStatsRoutines() {
    return Array.from(new Set(this.getHistory().map(h => h.routineName).filter(Boolean))).sort();
  },

  getStatsExercises(routineName) {
    const names = new Set();
    this.getHistory().forEach(h => {
      if (!routineName || h.routineName === routineName) {
        h.sets?.forEach(s => s.exerciseName && names.add(s.exerciseName));
      }
    });
    return Array.from(names).sort();
  },

  getChartPoints(routineName, exerciseName) {
    const sessions = this.getHistory()
      .filter(h => (!routineName || h.routineName === routineName) && h.sets?.some(s => s.exerciseName === exerciseName))
      .sort((a, b) => {
        const diff = new Date(a.date) - new Date(b.date);
        return diff !== 0 && !isNaN(diff) ? diff : (Number(a.id) || 0) - (Number(b.id) || 0);
      });

    return sessions.map((session, index) => {
      const sets = session.sets.filter(s => s.exerciseName === exerciseName);
      let maxW = 0, maxR = 0, vol = 0, dist = 0, dur = 0, type = 'weight_reps', max1RM = 0;

      sets.forEach(s => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        if (w > maxW) maxW = w;
        if (r > maxR) maxR = r;
        vol += (w * r);
        dist += (parseFloat(s.distance) || 0);
        dur += (parseInt(s.duration, 10) || 0);
        if (s.exerciseType) type = s.exerciseType;
        if (w > 0 && r > 0) {
          const est = this.calculate1RM(w, r);
          if (est > max1RM) max1RM = est;
        }
      });

      let val = maxW > 0 ? maxW : vol;
      let unit = 'кг';
      if (type === 'bodyweight' || type === 'reps_only') { val = maxR; unit = 'повторений'; }
      else if (type === 'distance') { val = dist; unit = 'км'; }
      else if (type === 'duration') { val = dur; unit = 'сек'; }

      const idx = index + 1;
      return {
        order: idx,
        orderLabel: `№${idx}`,
        sessionIndex: idx,
        date: session.date ? session.date.substring(0, 10) : '',
        totalValue: Math.round(val * 10) / 10,
        unit,
        maxWeight: Math.round(maxW * 10) / 10,
        maxReps: maxR,
        totalVolume: Math.round(vol * 10) / 10,
        oneRepMax: Math.round(max1RM * 10) / 10,
        exerciseType: type,
        setsCount: sets.length,
      };
    });
  },

  getChartLimit() {
    const val = parseInt(getStore(KEYS.CHART_LIMIT, 10), 10);
    return (isNaN(val) || val < 1) ? 10 : Math.min(50, val);
  },

  setChartLimit(limit) {
    const val = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    setStore(KEYS.CHART_LIMIT, val);
    return val;
  },

  getActivityCalendar() {
    const history = this.getHistory();
    const daysMap = {};

    history.forEach(h => {
      const d = (h.date || '').substring(0, 10);
      if (d) {
        if (!daysMap[d]) daysMap[d] = { count: 0, totalTonnage: 0, routines: [] };
        daysMap[d].count++;
        daysMap[d].routines.push(h.routineName);
        let vol = 0;
        h.sets?.forEach(s => { vol += ((parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0)); });
        daysMap[d].totalTonnage += vol;
      }
    });

    return daysMap;
  },

  // ---------------------------------------------------------------------------
  // БЛОК 8. РАСЧЕТНЫЕ КАЛЬКУЛЯТОРЫ (1RM & Plate Calculator)
  // ---------------------------------------------------------------------------
  calculate1RM(weight, reps) {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (w <= 0 || r <= 0) return 0;
    if (r <= 3) return w;
    const est = w * (0.9 + (r / 30));
    return Math.round(Math.max(w, est) * 10) / 10;
  },

  calculatePlates(targetWeight, barWeight = 20) {
    const target = parseFloat(targetWeight) || 0;
    const bar = parseFloat(barWeight) || 20;
    if (target <= bar) return { perSide: [], barWeight: bar, totalWeight: bar, remainder: 0 };

    let neededPerSide = (target - bar) / 2;
    const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
    const plates = [];

    for (const p of availablePlates) {
      if (neededPerSide >= p) {
        const count = Math.floor(neededPerSide / p);
        plates.push({ weight: p, count });
        neededPerSide = Math.round((neededPerSide - p * count) * 100) / 100;
      }
    }

    return {
      perSide: plates,
      barWeight: bar,
      totalWeight: target,
      remainder: neededPerSide
    };
  },

  // ---------------------------------------------------------------------------
  // БЛОК 9. АНТРОПОМЕТРИЯ: ВЕС И ЗАМЕРЫ ТЕЛА (Bodyweight & Measurements)
  // ---------------------------------------------------------------------------
  getBodyweightHistory() {
    const logs = getStore(KEYS.WEIGHT_LOG, []);
    if (Array.isArray(logs)) {
      return logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    return [];
  },

  addBodyweightLog(weight, date) {
    const logs = this.getBodyweightHistory();
    const w = Math.round(parseFloat(weight) * 10) / 10;
    const d = date || getLocalDateStr();

    const existingIdx = logs.findIndex(l => l.date === d);
    let entry;
    if (existingIdx !== -1) {
      logs[existingIdx].weight = w;
      entry = logs[existingIdx];
    } else {
      entry = { id: Date.now(), date: d, weight: w };
      logs.push(entry);
    }
    setStore(KEYS.WEIGHT_LOG, logs);

    logs.sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = logs[logs.length - 1];
    const profile = this.getProfile();
    profile.weight = latest ? latest.weight : w;
    this.saveProfile(profile);

    return entry;
  },

  deleteBodyweightLog(id) {
    const logs = this.getBodyweightHistory().filter(l => String(l.id) !== String(id));
    setStore(KEYS.WEIGHT_LOG, logs);

    const profile = this.getProfile();
    if (logs.length > 0) {
      logs.sort((a, b) => new Date(a.date) - new Date(b.date));
      profile.weight = logs[logs.length - 1].weight;
    } else {
      profile.weight = null;
    }
    this.saveProfile(profile);
    return true;
  },

  getMeasurements() {
    const list = getStore(KEYS.MEASUREMENTS, []);
    if (Array.isArray(list)) {
      return list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return [];
  },

  addMeasurement(data) {
    const list = this.getMeasurements();
    const entry = {
      id: Date.now(),
      date: data.date || getLocalDateStr(),
      chest: parseFloat(data.chest) || 0,
      waist: parseFloat(data.waist) || 0,
      bicep: parseFloat(data.bicep) || 0,
      thigh: parseFloat(data.thigh) || 0,
    };
    list.unshift(entry);
    setStore(KEYS.MEASUREMENTS, list);
    return entry;
  },

  deleteMeasurement(id) {
    const list = this.getMeasurements().filter(m => String(m.id) !== String(id));
    setStore(KEYS.MEASUREMENTS, list);
    return true;
  },

  // ---------------------------------------------------------------------------
  // БЛОК 10. ТРЕКЕР ПРИВЫЧЕК И СЕРИЙ (Habits Tracker & Streaks Engine)
  // ---------------------------------------------------------------------------
  getHabits() {
    return getStore(KEYS.HABITS, []);
  },

  saveHabit(habit) {
    const habits = this.getHabits();
    if (habit.id) {
      const idx = habits.findIndex(h => String(h.id) === String(habit.id));
      if (idx !== -1) {
        habits[idx] = { ...habits[idx], ...habit, updatedAt: new Date().toISOString() };
      } else {
        habits.push(habit);
      }
    } else {
      habit.id = Date.now() + Math.floor(Math.random() * 10000);
      habit.createdAt = getLocalDateStr();
      habits.push(habit);
    }
    setStore(KEYS.HABITS, habits);
    return habit;
  },

  deleteHabit(id) {
    const habits = this.getHabits().filter(h => String(h.id) !== String(id));
    setStore(KEYS.HABITS, habits);
    const logs = getStore(KEYS.HABIT_LOGS, {});
    let changed = false;
    Object.keys(logs).forEach(date => {
      if (Array.isArray(logs[date]) && logs[date].some(hid => String(hid) === String(id))) {
        logs[date] = logs[date].filter(hid => String(hid) !== String(id));
        changed = true;
      }
    });
    if (changed) setStore(KEYS.HABIT_LOGS, logs);
    return true;
  },

  getHabitLogs() {
    return getStore(KEYS.HABIT_LOGS, {});
  },

  isHabitCompleted(dateStr, habitId) {
    const logs = this.getHabitLogs();
    const dayList = logs[dateStr];
    return Array.isArray(dayList) && dayList.some(hid => String(hid) === String(habitId));
  },

  toggleHabit(dateStr, habitId) {
    const logs = this.getHabitLogs();
    if (!logs[dateStr]) logs[dateStr] = [];
    const idx = logs[dateStr].findIndex(hid => String(hid) === String(habitId));
    let isCompleted = false;
    if (idx !== -1) {
      logs[dateStr].splice(idx, 1);
      isCompleted = false;
    } else {
      logs[dateStr].push(habitId);
      isCompleted = true;
    }
    setStore(KEYS.HABIT_LOGS, logs);
    return isCompleted;
  },

  getHabitStats(habitId) {
    const habits = this.getHabits();
    const habit = habits.find(h => String(h.id) === String(habitId));
    if (!habit) return { currentStreak: 0, totalCompleted: 0 };

    const logs = this.getHabitLogs();
    const completedDates = new Set();
    Object.keys(logs).forEach(date => {
      if (Array.isArray(logs[date]) && logs[date].some(hid => String(hid) === String(habitId))) {
        completedDates.add(date);
      }
    });

    const totalCompleted = completedDates.size;
    const toDateStr = d => getLocalDateStr(d);
    const prevDay = d => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() - 1);
      return copy;
    };

    let checkDate = new Date();
    let currentStreak = 0;
    const todayStr = toDateStr(new Date());

    if (completedDates.has(todayStr)) {
      currentStreak++;
      checkDate = prevDay(checkDate);
    } else {
      const yesterdayStr = toDateStr(prevDay(new Date()));
      if (completedDates.has(yesterdayStr)) {
        currentStreak++;
        checkDate = prevDay(prevDay(new Date()));
      }
    }

    while (currentStreak > 0 && completedDates.has(toDateStr(checkDate))) {
      currentStreak++;
      checkDate = prevDay(checkDate);
    }

    return { currentStreak, totalCompleted };
  },

  getDailyHabitProgress(dateStr) {
    const habits = this.getHabits();
    if (!habits.length) return { total: 0, completed: 0, percentage: 0 };
    const logs = this.getHabitLogs();
    const dayList = logs[dateStr] || [];
    const completed = habits.filter(h => dayList.some(hid => String(hid) === String(h.id))).length;
    return {
      total: habits.length,
      completed,
      percentage: Math.round((completed / habits.length) * 100)
    };
  },

  // ---------------------------------------------------------------------------
  // БЛОК 11. СИСТЕМНЫЕ НАСТРОЙКИ (Theme & Rest Timer Settings)
  // ---------------------------------------------------------------------------
  getTheme() {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(KEYS.THEME) || 'dark';
      }
      return _memStore[KEYS.THEME] || 'dark';
    } catch {
      return 'dark';
    }
  },

  setTheme(theme) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(KEYS.THEME, theme);
      } else {
        _memStore[KEYS.THEME] = theme;
      }
      return theme;
    } catch (e) {
      console.error('Ошибка сохранения темы:', e);
      return theme;
    }
  },

  getRestTimerSeconds() {
    return parseInt(getStore(KEYS.SETTINGS, {})?.restTimerSec, 10) || 90;
  },

  setRestTimerSeconds(sec) {
    const settings = getStore(KEYS.SETTINGS, {});
    settings.restTimerSec = parseInt(sec, 10) || 90;
    setStore(KEYS.SETTINGS, settings);
    return settings.restTimerSec;
  },

  // ---------------------------------------------------------------------------
  // БЛОК 12. РЕЗЕРВНОЕ КОПИРОВАНИЕ И СБРОС (Export, Import & Reset Engine)
  // ---------------------------------------------------------------------------
  exportBackup() {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profile: this.getProfile(),
      routines: this.getRoutines(),
      history: this.getHistory(),
      weightLog: this.getBodyweightHistory(),
      measurements: this.getMeasurements(),
      habits: this.getHabits(),
      habitLogs: this.getHabitLogs(),
    }, null, 2);
  },

  importBackup(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      Object.keys(_cache).forEach(k => delete _cache[k]);
      if (data.profile) this.saveProfile(data.profile);
      if (Array.isArray(data.routines)) this.saveRoutines(data.routines);
      if (Array.isArray(data.history)) this.saveHistory(data.history);
      if (Array.isArray(data.weightLog)) setStore(KEYS.WEIGHT_LOG, data.weightLog);
      if (Array.isArray(data.measurements)) setStore(KEYS.MEASUREMENTS, data.measurements);
      if (Array.isArray(data.habits)) setStore(KEYS.HABITS, data.habits);
      if (data.habitLogs && typeof data.habitLogs === 'object') setStore(KEYS.HABIT_LOGS, data.habitLogs);
      return true;
    } catch {
      return false;
    }
  },

  resetAllData() {
    Object.keys(_cache).forEach(k => delete _cache[k]);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(KEYS.PROFILE);
      localStorage.removeItem(KEYS.ROUTINES);
      localStorage.removeItem(KEYS.HISTORY);
      localStorage.removeItem(KEYS.WEIGHT_LOG);
      localStorage.removeItem(KEYS.MEASUREMENTS);
      localStorage.removeItem(KEYS.ACTIVE_DRAFT);
      localStorage.removeItem(KEYS.HABITS);
      localStorage.removeItem(KEYS.HABIT_LOGS);
    }
    this.saveProfile(DEFAULT_PROFILE);
    this.saveRoutines(DEFAULT_ROUTINES);
    return true;
  }
};

// -----------------------------------------------------------------------------
// БЛОК 13. ЭКСПОРТ МОДУЛЯ (Module Interface Export)
// -----------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.Storage = Storage;
  window.getLocalDateStr = getLocalDateStr;
  window.escapeHtml = escapeHtml;
}
if (typeof module !== 'undefined') module.exports = Storage;
