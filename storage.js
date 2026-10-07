// VIV Fitness - Client-Side Storage Manager
// Локальное хранилище данных каждого пользователя на его устройстве

const KEYS = {
  PROFILE: 'viv_user_profile',
  ROUTINES: 'viv_user_routines',
  HISTORY: 'viv_user_history',
  CATALOG: 'viv_catalog_cache',
  WEIGHT_LOG: 'viv_user_weight_log',
  MEASUREMENTS: 'viv_user_measurements',
  SETTINGS: 'viv_user_settings',
  ACTIVE_DRAFT: 'viv_active_draft_workout',
  THEME: 'viv_theme',
  HABITS: 'viv_user_habits',
  HABIT_LOGS: 'viv_user_habit_logs',
  SEED_CLEANED: 'viv_clean_state_v1',
};

// Автоматическая очистка предустановленных демо-данных из хранилища браузера
(function autoPurgeDefaults() {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(KEYS.SEED_CLEANED)) return;

    // Очистка предустановленных программ-шаблонов
    const rawRoutines = localStorage.getItem(KEYS.ROUTINES);
    if (rawRoutines) {
      try {
        const parsed = JSON.parse(rawRoutines);
        if (Array.isArray(parsed) && parsed.some(r => r.id === 1 || r.id === 2 || r.id === 3)) {
          localStorage.setItem(KEYS.ROUTINES, JSON.stringify([]));
        }
      } catch (_) {}
    } else {
      localStorage.setItem(KEYS.ROUTINES, JSON.stringify([]));
    }

    // Очистка предустановленных замеров веса
    const rawWeight = localStorage.getItem(KEYS.WEIGHT_LOG);
    if (rawWeight) {
      try {
        const parsed = JSON.parse(rawWeight);
        if (Array.isArray(parsed) && parsed.some(w => w.id === 1 || w.id === 2 || w.id === 3)) {
          localStorage.setItem(KEYS.WEIGHT_LOG, JSON.stringify([]));
        }
      } catch (_) {}
    } else {
      localStorage.setItem(KEYS.WEIGHT_LOG, JSON.stringify([]));
    }

    // Очистка предустановленных замеров тела
    const rawMeas = localStorage.getItem(KEYS.MEASUREMENTS);
    if (rawMeas) {
      try {
        const parsed = JSON.parse(rawMeas);
        if (Array.isArray(parsed) && (parsed.length === 0 || (parsed.length === 1 && parsed[0].chest === 104))) {
          localStorage.setItem(KEYS.MEASUREMENTS, JSON.stringify([]));
        }
      } catch (_) {}
    } else {
      localStorage.setItem(KEYS.MEASUREMENTS, JSON.stringify([]));
    }

    // Очистка предустановленного профиля
    const rawProf = localStorage.getItem(KEYS.PROFILE);
    if (rawProf) {
      try {
        const parsed = JSON.parse(rawProf);
        if (parsed && (parsed.name === 'Пользователь' || parsed.weight === 70)) {
          localStorage.setItem(KEYS.PROFILE, JSON.stringify({
            name: '',
            level: '',
            weight: null,
            height: null,
            notificationsEnabled: true
          }));
        }
      } catch (_) {}
    }

    localStorage.setItem(KEYS.SEED_CLEANED, 'true');
  } catch (e) {
    console.warn('Auto-purge error:', e);
  }
})();

const _memStore = {};

const getStore = (key, fallback) => {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }
    return _memStore[key] ? JSON.parse(_memStore[key]) : fallback;
  } catch {
    return fallback;
  }
};

const setStore = (key, val) => {
  try {
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

const DEFAULT_PROFILE = {
  name: '',
  level: '',
  weight: null,
  height: null,
  notificationsEnabled: true,
};

const DEFAULT_ROUTINES = [];

const Storage = {
  // 1. Профиль пользователя
  getProfile() {
    return getStore(KEYS.PROFILE, DEFAULT_PROFILE);
  },
  saveProfile(profile) {
    setStore(KEYS.PROFILE, profile);
    return profile;
  },

  // 2. Программы тренировок
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
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
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

  // 3. История тренировок
  getHistory() {
    return getStore(KEYS.HISTORY, []);
  },
  saveHistory(history) {
    setStore(KEYS.HISTORY, history);
    return history;
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
      date: record.date || new Date().toISOString().replace('T', ' ').substring(0, 16),
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

  // 4. Статистика и графики
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

  // 5. Каталог упражнений
  getCatalog() {
    return getStore(KEYS.CATALOG, { categories: [], exercises: [] });
  },
  async initCatalog() {
    const cached = getStore(KEYS.CATALOG, null);
    if (cached?.exercises?.length) return cached;

    try {
      const res = await fetch('/data/catalog.json');
      if (res.ok) {
        const data = await res.json();
        setStore(KEYS.CATALOG, data);
        return data;
      }
    } catch (e) {
      console.warn('Не удалось загрузить catalog.json:', e);
    }
    return { categories: [], exercises: [] };
  },
  async getCategories() {
    const cat = await this.initCatalog();
    return cat.categories?.length ? cat.categories : ['cardio', 'olympic weightlifting', 'plyometrics', 'powerlifting', 'strength', 'stretching', 'strongman'];
  },
  async getMuscles(category) {
    const cat = await this.initCatalog();
    const muscles = new Set();
    cat.exercises.forEach(ex => {
      if (!category || ex.category.toLowerCase() === category.toLowerCase()) {
        if (ex.primaryMuscles) muscles.add(ex.primaryMuscles);
      }
    });
    return Array.from(muscles).sort();
  },
  async getExercises(category, muscle) {
    const cat = await this.initCatalog();
    return cat.exercises.filter(ex => {
      const cMatch = !category || ex.category.toLowerCase() === category.toLowerCase();
      const mMatch = !muscle || ex.primaryMuscles.toLowerCase() === muscle.toLowerCase();
      return cMatch && mMatch;
    });
  },

  // 6. Расчёты и утилиты
  calculate1RM(weight, reps) {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (w <= 0 || r <= 0) return 0;
    // До 3х повторений равен поднятому весу (не меньше поднятого)
    if (r <= 3) return w;
    // После 3х повторений увеличивается по формуле 0.9 + (reps / 30)
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

  // 7. Трекер веса тела
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
    const d = date || new Date().toISOString().substring(0, 10);
    const entry = { id: Date.now(), date: d, weight: w };
    logs.push(entry);
    setStore(KEYS.WEIGHT_LOG, logs);

    const profile = this.getProfile();
    profile.weight = w;
    this.saveProfile(profile);

    return entry;
  },

  deleteBodyweightLog(id) {
    const logs = this.getBodyweightHistory().filter(l => String(l.id) !== String(id));
    setStore(KEYS.WEIGHT_LOG, logs);
    return true;
  },

  // 8. Дневник замеров тела (грудь, талия, бицепс, бедро в см)
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
      date: data.date || new Date().toISOString().substring(0, 10),
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

  // 9. Аналитика мышечного объёма (Muscle Heatmap Data)
  getMuscleDistribution(days = 30) {
    const history = this.getHistory();
    const cutoff = days && days < 365 ? (Date.now() - (days * 86400000)) : 0;
    const counts = {
      chest: 0,
      back: 0,
      legs: 0,
      shoulders: 0,
      arms: 0,
      core: 0,
    };

    const muscleGroupMap = {
      'chest': 'chest',
      'pectorals': 'chest',
      'грудные': 'chest',
      'грудь': 'chest',
      'lats': 'back',
      'middle back': 'back',
      'lower back': 'back',
      'traps': 'back',
      'спина': 'back',
      'широчайшие': 'back',
      'трапеции': 'back',
      'поясница': 'back',
      'quadriceps': 'legs',
      'hamstrings': 'legs',
      'calves': 'legs',
      'glutes': 'legs',
      'adductors': 'legs',
      'abductors': 'legs',
      'ноги': 'legs',
      'квадрицепсы': 'legs',
      'бицепс бедра': 'legs',
      'ягодицы': 'legs',
      'икры': 'legs',
      'голень': 'legs',
      'shoulders': 'shoulders',
      'deltoids': 'shoulders',
      'плечи': 'shoulders',
      'дельты': 'shoulders',
      'biceps': 'arms',
      'triceps': 'arms',
      'forearms': 'arms',
      'руки': 'arms',
      'бицепс': 'arms',
      'трицепс': 'arms',
      'предплечья': 'arms',
      'abdominals': 'core',
      'neck': 'core',
      'пресс': 'core',
      'кор': 'core',
      'живот': 'core',
    };

    // Fast catalog lookup map
    const catalog = this.getCatalog()?.exercises || [];
    const catalogMap = new Map();
    catalog.forEach(ex => {
      if (ex.name && ex.primaryMuscles) {
        catalogMap.set(ex.name.toLowerCase().trim(), ex.primaryMuscles);
      }
    });

    function parseDateMs(dateStr) {
      if (!dateStr) return 0;
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return new Date(dateStr).getTime();
      if (/^\d{2}\.\d{2}\.\d{4}/.test(dateStr)) {
        const p = dateStr.split(/[.,\s]/);
        return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
      }
      const parsed = new Date(dateStr).getTime();
      return isNaN(parsed) ? 0 : parsed;
    }

    let totalSets = 0;

    history.forEach(h => {
      const hTime = parseDateMs(h.date);
      if (!cutoff || hTime === 0 || hTime >= cutoff) {
        h.sets?.forEach(s => {
          totalSets++;
          let targetGroup = null;

          // 1. Direct match on primaryMuscle
          const m = (s.primaryMuscle || '').toLowerCase().trim();
          if (m && muscleGroupMap[m]) {
            targetGroup = muscleGroupMap[m];
          }

          // 2. Lookup in catalog by exerciseName
          if (!targetGroup && s.exerciseName) {
            const catMuscle = catalogMap.get(s.exerciseName.toLowerCase().trim());
            if (catMuscle && muscleGroupMap[catMuscle.toLowerCase()]) {
              targetGroup = muscleGroupMap[catMuscle.toLowerCase()];
            }
          }

          // 3. Keyword heuristic on exercise name
          if (!targetGroup && s.exerciseName) {
            const name = s.exerciseName.toLowerCase();
            if (/присед|выпад|ног|бедр|квадрицепс|икр|ягодиц|голен|жим ногами|сгибан.*ног|разгибан.*ног/.test(name)) targetGroup = 'legs';
            else if (/подтяг|тяг.*блок|тяг.*штан|становая|тяг.*гантел|гиперэкстен|широчайш|спин/.test(name)) targetGroup = 'back';
            else if (/жим.*стоя|армейск|махи|разведен.*сторон|дельт|плеч|шраг/.test(name)) targetGroup = 'shoulders';
            else if (/бицепс|трицепс|руки|брахи|предплеч|французск|молотк|брусья|сгибан.*рук|разгибан.*рук/.test(name)) targetGroup = 'arms';
            else if (/пресс|скручиван|планк|кор|живот|подъем ног/.test(name)) targetGroup = 'core';
            else if (/жим.*лежа|отжим|груд|кроссовер|разводк.*гантел|бабочк|пуловер/.test(name)) targetGroup = 'chest';
          }

          // 4. Default fallback
          if (!targetGroup) targetGroup = 'chest';

          counts[targetGroup] = (counts[targetGroup] || 0) + 1;
        });
      }
    });

    const groupLabels = {
      chest: 'Грудные',
      back: 'Спина',
      legs: 'Ноги',
      shoulders: 'Плечи',
      arms: 'Руки',
      core: 'Пресс / Кор'
    };

    const groups = Object.keys(counts).map(k => ({
      key: k,
      name: groupLabels[k] || k,
      sets: counts[k],
      percentage: totalSets > 0 ? Math.round((counts[k] / totalSets) * 100) : 0,
    })).sort((a, b) => b.sets - a.sets);

    return { groups, totalSets };
  },

  // 10. Календарь активности
  getActivityCalendar(year, month) {
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

  // 11. Личные рекорды в тренировке (PR detector)
  checkWorkoutPRs(historyRecord) {
    const priorHistory = this.getHistory().filter(h => String(h.id) !== String(historyRecord.id));
    const prs = [];

    historyRecord.sets?.forEach(s => {
      const w = parseFloat(s.weight) || 0;
      if (w > 0 && s.exerciseName) {
        let maxPriorW = 0;
        priorHistory.forEach(h => {
          h.sets?.forEach(ps => {
            if (ps.exerciseName === s.exerciseName) {
              const pw = parseFloat(ps.weight) || 0;
              if (pw > maxPriorW) maxPriorW = pw;
            }
          });
        });

        if (w > maxPriorW && maxPriorW > 0) {
          if (!prs.some(p => p.exerciseName === s.exerciseName)) {
            prs.push({
              exerciseName: s.exerciseName,
              weight: w,
              priorWeight: maxPriorW,
              diff: Math.round((w - maxPriorW) * 10) / 10
            });
          }
        }
      }
    });

    return prs;
  },

  // 12. Настройки таймера отдыха
  getRestTimerSeconds() {
    return parseInt(getStore(KEYS.SETTINGS, {})?.restTimerSec, 10) || 90;
  },
  setRestTimerSeconds(sec) {
    const settings = getStore(KEYS.SETTINGS, {});
    settings.restTimerSec = parseInt(sec, 10) || 90;
    setStore(KEYS.SETTINGS, settings);
    return settings.restTimerSec;
  },

  // 13. Черновик текущей тренировки (Quick Add)
  getActiveDraft() {
    return getStore(KEYS.ACTIVE_DRAFT, null);
  },
  saveActiveDraft(draft) {
    setStore(KEYS.ACTIVE_DRAFT, draft);
    return draft;
  },
  clearActiveDraft() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEYS.ACTIVE_DRAFT);
  },

  // 14. Трекер привычек (Habits)
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
      habit.createdAt = new Date().toISOString().substring(0, 10);
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
    if (!habit) return { currentStreak: 0, bestStreak: 0, totalCompleted: 0, weeklyRate: 0 };

    const logs = this.getHabitLogs();
    const completedDates = new Set();
    Object.keys(logs).forEach(date => {
      if (Array.isArray(logs[date]) && logs[date].some(hid => String(hid) === String(habitId))) {
        completedDates.add(date);
      }
    });

    const totalCompleted = completedDates.size;
    const toDateStr = d => d.toISOString().substring(0, 10);
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

    const sortedDates = Array.from(completedDates).sort();
    let bestStreak = 0;
    let tempStreak = 0;
    let lastTime = null;

    sortedDates.forEach(dStr => {
      const curTime = new Date(dStr + 'T00:00:00').getTime();
      if (lastTime === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((curTime - lastTime) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      lastTime = curTime;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    });

    bestStreak = Math.max(bestStreak, currentStreak);

    let last7Completed = 0;
    let d = new Date();
    for (let i = 0; i < 7; i++) {
      if (completedDates.has(toDateStr(d))) last7Completed++;
      d = prevDay(d);
    }
    const weeklyRate = Math.round((last7Completed / 7) * 100);

    return { currentStreak, bestStreak, totalCompleted, weeklyRate };
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

  // 15. Экспорт и сброс
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
  },

  // 15. Тема оформления ('dark', 'light', 'auto')
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
  }
};

if (typeof window !== 'undefined') window.Storage = Storage;
if (typeof module !== 'undefined') module.exports = Storage;
