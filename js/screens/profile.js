// =============================================================================
// VIV Fitness - Экран профиля, настроек, антропометрии и бэкапов (Profile Screen)
// =============================================================================
// Назначение: Управление профилем атлета, выбор темы оформления (Dark/Light/Auto),
// ведение дневника веса и замеров тела, формирование печатного PDF-отчета,
// экспорт и импорт резервных копий (JSON/буфер обмена) и внешние ссылки VIV.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // БЛОК 1. ГЛАВНЫЙ РЕНДЕР ЭКРАНА ПРОФИЛЯ (Profile Layout & Cards)
  // ---------------------------------------------------------------------------
  function fmtDate(d = new Date()) {
    return window.getLocalDateStr ? window.getLocalDateStr(d) : d.toISOString().substring(0, 10);
  }

  function esc(str) {
    return window.escapeHtml ? window.escapeHtml(str) : (str || '');
  }

  function renderProfile() {
    if (window.setHeader) window.setHeader('Профиль', false);
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const prof = window.Storage ? window.Storage.getProfile() : { name: '', level: '', weight: null, height: null };
    window.state.profile = prof;
    const initial = prof.name?.trim()?.[0]?.toUpperCase() || '—';

    const weightLogs = window.Storage ? window.Storage.getBodyweightHistory() : [];
    const latestWeight = weightLogs.length ? weightLogs[weightLogs.length - 1].weight : (prof.weight || null);
    const initialWeight = weightLogs.length ? weightLogs[0].weight : (prof.weight || null);
    const weightDiff = (latestWeight != null && initialWeight != null) ? Math.round((latestWeight - initialWeight) * 10) / 10 : 0;

    const measurements = window.Storage ? window.Storage.getMeasurements() : [];
    const latestM = measurements[0] || { chest: 0, waist: 0, bicep: 0, thigh: 0 };

    const currentRestTimerSec = window.Storage ? window.Storage.getRestTimerSeconds() : 90;
    const currentTheme = window.Storage ? window.Storage.getTheme() : 'dark';

    mainContent.innerHTML = `
      <div class="avatar-circle">${esc(initial)}</div>
      <div style="text-align:center; margin-bottom:20px;">
        <div style="font-size:20px; font-weight:bold;">${esc(prof.name || 'Атлет')}</div>
      </div>

      <!-- 1. ТЕМА ОФОРМЛЕНИЯ (Dark / Light) -->
      <div class="card">
        <div style="font-weight:bold; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:12px;">
          Тема оформления
        </div>
        <div class="theme-switcher-grid" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px;">
          <button 
            class="btn-theme-select ${currentTheme === 'dark' ? 'theme-active' : ''}" 
            data-theme-btn="dark"
            onclick="setAppTheme('dark')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:2px;">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <span>Тёмная</span>
          </button>

          <button 
            class="btn-theme-select ${currentTheme === 'light' ? 'theme-active' : ''}" 
            data-theme-btn="light"
            onclick="setAppTheme('light')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:2px;">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <span>Светлая</span>
          </button>
        </div>
      </div>

      <!-- 2. ФОРМА ПАРАМЕТРОВ ПРОФИЛЯ -->
      <div class="card">
        <div class="form-group">
          <label class="form-label">Имя</label>
          <input id="prof-name" class="form-input" placeholder="Имя" value="${esc(prof.name)}">
        </div>
        <div class="form-group">
          <label class="form-label">Рост (см)</label>
          <input id="prof-height" type="text" inputmode="decimal" readonly style="cursor:pointer;" class="form-input" placeholder="Не указан" value="${prof.height != null ? prof.height : ''}" onclick="openProfileHeightPicker()">
        </div>
        <button class="btn btn-primary" onclick="saveProfile()" style="width:100%; margin-top:14px;">Сохранить параметры</button>
      </div>

      <!-- 3. КАРТОЧКА ДИНАМИКИ ВЕСА ТЕЛА -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div>
            <div style="font-weight:bold; font-size:15.5px;">Динамика веса тела</div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
              Текущий: <strong>${latestWeight != null ? `${latestWeight} кг` : '—'}</strong> 
              ${weightLogs.length >= 2 ? `(${weightDiff >= 0 ? `+${weightDiff}` : weightDiff} кг)` : ''}
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="openAddWeightModal()">+ Вес</button>
        </div>

        <div class="chart-container" style="height:170px;">
          ${weightLogs.length ? `<canvas id="bodyweightCanvas"></canvas>` : `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-secondary); font-size:13px;">Нет записей веса</div>`}
        </div>

        <div style="display:flex; justify-content:space-between; font-size:11.5px; color:var(--text-secondary); margin-top:8px;">
          <span>Записей: ${weightLogs.length}</span>
          <span onclick="openWeightHistoryModal()" style="cursor:pointer; text-decoration:underline;">История записей →</span>
        </div>
      </div>

      <!-- 4. КАРТОЧКА ЗАМЕРОВ ТЕЛА -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-weight:bold; font-size:15.5px;">Замеры тела (см)</div>
          <button class="btn btn-outline btn-sm" onclick="openAddMeasurementModal()">+ Замер</button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; text-align:center;">
          <div style="background:var(--card-bg-elevated); padding:8px 4px; border-radius:8px; border:1px solid var(--border-color); min-width:0;">
            <div style="font-size:10.5px; text-transform:uppercase; color:var(--text-secondary);">Грудь</div>
            <div style="font-size:15px; font-weight:800; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${latestM.chest || '—'}</div>
          </div>
          <div style="background:var(--card-bg-elevated); padding:8px 4px; border-radius:8px; border:1px solid var(--border-color); min-width:0;">
            <div style="font-size:10.5px; text-transform:uppercase; color:var(--text-secondary);">Талия</div>
            <div style="font-size:15px; font-weight:800; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${latestM.waist || '—'}</div>
          </div>
          <div style="background:var(--card-bg-elevated); padding:8px 4px; border-radius:8px; border:1px solid var(--border-color); min-width:0;">
            <div style="font-size:10.5px; text-transform:uppercase; color:var(--text-secondary);">Бицепс</div>
            <div style="font-size:15px; font-weight:800; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${latestM.bicep || '—'}</div>
          </div>
          <div style="background:var(--card-bg-elevated); padding:8px 4px; border-radius:8px; border:1px solid var(--border-color); min-width:0;">
            <div style="font-size:10.5px; text-transform:uppercase; color:var(--text-secondary);">Бедро</div>
            <div style="font-size:15px; font-weight:800; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${latestM.thigh || '—'}</div>
          </div>
        </div>

        <div style="font-size:11.5px; color:var(--text-secondary); margin-top:8px; text-align:right;">
          <span onclick="openMeasurementHistoryModal()" style="cursor:pointer; text-decoration:underline;">История замеров (${measurements.length}) →</span>
        </div>
      </div>

      <!-- 5. НАСТРОЙКИ ТАЙМЕРА ОТДЫХА -->
      <div class="card">
        <div style="font-weight:bold; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:12px;">
          Таймер отдыха
        </div>
        <div style="display:flex; gap:8px;">
          ${[60, 90, 120, 180].map(sec => `
            <button 
              class="filter-chip ${currentRestTimerSec === sec ? 'active' : ''}" 
              style="flex:1; text-align:center;"
              onclick="updateDefaultRestTimer(${sec})"
            >${sec}с</button>
          `).join('')}
        </div>
      </div>

      <!-- 6. УПРАВЛЕНИЕ ПАМЯТЬЮ И РЕЗЕРВНОЕ КОПИРОВАНИЕ -->
      <div class="card">
        <div style="font-weight:bold; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:12px;">
          Память устройства
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
          <button class="btn btn-secondary" onclick="exportUserData()" style="display:flex; align-items:center; justify-content:center; gap:6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Экспорт
          </button>
          <button class="btn btn-secondary" onclick="triggerImportUserData()" style="display:flex; align-items:center; justify-content:center; gap:6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Импорт
          </button>
          <input type="file" id="import-backup-file" accept=".json,application/json" style="display:none;" onchange="handleImportFile(event)">
        </div>
        <button class="btn btn-outline" onclick="resetUserLocalData()" style="width:100%; color:#ef4444; border-color:rgba(239,68,68,0.3);">Сбросить локальные данные</button>
      </div>
    `;

    drawBodyweightChart(weightLogs);
  }

  // ---------------------------------------------------------------------------
  // БЛОК 2. ОБНОВЛЕНИЕ ПРОФИЛЯ И ТАЙМЕРА (Profile & Timer Settings)
  // ---------------------------------------------------------------------------
  function openProfileHeightPicker() {
    const inp = document.getElementById('prof-height');
    const val = parseFloat(inp?.value) || 175;
    if (window.openNumberPicker) {
      window.openNumberPicker({
        title: 'Рост тела',
        value: val,
        min: 100,
        max: 250,
        step: 0.5,
        unit: '',
        deltas: [-10, -5, -1, 1, 5, 10],
        onConfirm: (newVal) => {
          if (inp) inp.value = newVal;
        }
      });
    }
  }

  function openProfileWeightPicker() {
    const inp = document.getElementById('prof-weight');
    const val = parseFloat(inp?.value) || 75;
    if (window.openNumberPicker) {
      window.openNumberPicker({
        title: 'Вес тела',
        value: val,
        min: 30,
        max: 300,
        step: 0.1,
        unit: '',
        deltas: [-5, -1, -0.5, 0.5, 1, 5],
        onConfirm: (newVal) => {
          if (inp) inp.value = newVal;
        }
      });
    }
  }

  function openBwWeightPicker() {
    const inp = document.getElementById('bw-weight');
    const val = parseFloat(inp?.value) || (window.Storage?.getProfile()?.weight || 75);
    if (window.openNumberPicker) {
      window.openNumberPicker({
        title: 'Вес взвешивания',
        value: val,
        min: 30,
        max: 300,
        step: 0.1,
        unit: '',
        deltas: [-5, -1, -0.5, 0.5, 1, 5],
        onConfirm: (newVal) => {
          if (inp) inp.value = newVal;
        }
      });
    }
  }

  function openMeasurementPicker(inputId, metricTitle) {
    const inp = document.getElementById(inputId);
    const val = parseFloat(inp?.value) || 0;
    if (window.openNumberPicker) {
      window.openNumberPicker({
        title: `Замер: ${metricTitle}`,
        value: val > 0 ? val : 50,
        min: 10,
        max: 200,
        step: 0.5,
        unit: '',
        deltas: [-5, -2, -0.5, 0.5, 2, 5],
        onConfirm: (newVal) => {
          if (inp) inp.value = newVal;
        }
      });
    }
  }

  function saveProfile() {
    const nameInput = document.getElementById('prof-name');
    const heightInput = document.getElementById('prof-height');

    const name = nameInput?.value.trim() || '';
    const height = parseFloat(heightInput?.value) || null;

    if (window.Storage) {
      const prevProfile = window.Storage.getProfile();
      window.state.profile = window.Storage.saveProfile({
        name,
        level: prevProfile?.level || '',
        weight: prevProfile?.weight ?? null,
        height,
        notificationsEnabled: true
      });
    }
    if (window.triggerHaptic) window.triggerHaptic('success');
    alert('Профиль успешно сохранен!');
    renderProfile();
  }

  function updateDefaultRestTimer(sec) {
    if (window.Storage) window.Storage.setRestTimerSeconds(sec);
    renderProfile();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 3. ТРЕКЕР ВЕСА ТЕЛА И ГРАФИК (Bodyweight Tracker & Modals)
  // ---------------------------------------------------------------------------
  function drawBodyweightChart(logs) {
    const canvas = document.getElementById('bodyweightCanvas');
    if (!canvas || !logs || !logs.length) return;

    const points = logs.map((l, idx) => ({
      orderLabel: `${idx + 1}`,
      date: l.date.substring(5),
      weight: l.weight
    }));

    if (window.drawChart) {
      window.drawChart('bodyweightCanvas', points, p => p.weight, 'кг');
    }
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return 'Сегодня';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch (e) {}
    return dateStr;
  }

  function setProfileQuickDate(inputId, textId, offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = fmtDate(d);
    const input = document.getElementById(inputId);
    if (input) input.value = dateStr;
    const txt = document.getElementById(textId);
    if (txt) txt.textContent = formatDisplayDate(dateStr);
    if (window.triggerHaptic) window.triggerHaptic('light');
  }

  function onDateInputChange(inputId, textId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const txt = document.getElementById(textId);
    if (txt) txt.textContent = formatDisplayDate(input.value);
  }

  function triggerNativeDatePicker(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.showPicker) {
      try { input.showPicker(); return; } catch (e) {}
    }
    input.focus();
    input.click();
  }

  function openAddWeightModal() {
    const today = fmtDate();
    const curW = (window.Storage ? window.Storage.getProfile()?.weight : '') || '';

    if (window.openModal) {
      window.openModal(`
        <div class="modal-header">
          <div class="modal-title">Записать вес тела</div>
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
        </div>
        <div class="form-group">
          <label class="form-label">Дата взвешивания</label>
          <div style="position:relative; width:100%;">
            <input id="bw-date" 
                   type="date" 
                   class="form-input" 
                   value="${today}" 
                   onchange="onDateInputChange('bw-date', 'bw-date-text')"
                   onclick="triggerNativeDatePicker('bw-date')"
                   style="position:absolute; inset:0; width:100%; height:100%; opacity:0; z-index:2; cursor:pointer;">
            <div id="bw-date-display" class="form-input" onclick="triggerNativeDatePicker('bw-date')" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <span id="bw-date-text" style="font-weight:600;">${formatDisplayDate(today)}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent-color); flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Вес</label>
          <input id="bw-weight" type="text" inputmode="decimal" readonly style="cursor:pointer;" class="form-input" placeholder="0" value="${curW}" onclick="openBwWeightPicker()">
        </div>
        <button class="btn btn-green" style="width:100%; margin-top:10px;" onclick="saveBodyweightEntry()">Записать</button>
      `);
    }
  }

  function saveBodyweightEntry() {
    const dateInput = document.getElementById('bw-date');
    const weightInput = document.getElementById('bw-weight');
    const date = dateInput ? dateInput.value : fmtDate();
    const weight = parseFloat(weightInput ? weightInput.value : 0);
    if (!weight || weight < 30 || weight > 300) return alert('Введите корректный вес');

    if (window.Storage) window.Storage.addBodyweightLog(weight, date);
    if (window.closeModal) window.closeModal();
    renderProfile();
  }

  function openWeightHistoryModal() {
    const logs = (window.Storage ? window.Storage.getBodyweightHistory() : []).slice().reverse();
    if (window.openModal) {
      window.openModal(`
        <div class="modal-header">
          <div class="modal-title">История взвешиваний</div>
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
        </div>
        <div class="item-list" style="max-height:360px; overflow-y:auto;">
          ${logs.length ? logs.map(l => `
            <div class="list-card" style="padding:10px 14px;">
              <div>
                <div style="font-weight:bold; font-size:15px;">${l.weight} кг</div>
                <div style="font-size:12px; color:var(--text-secondary);">${l.date}</div>
              </div>
              <button class="modal-close-btn" onclick="deleteWeightLog(${l.id})">✕</button>
            </div>
          `).join('') : '<div style="text-align:center; padding:30px 16px; color:var(--text-secondary);">Нет записей веса</div>'}
        </div>
      `);
    }
  }

  function deleteWeightLog(id) {
    if (window.Storage) window.Storage.deleteBodyweightLog(id);
    renderProfile();
    openWeightHistoryModal();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 4. ДНЕВНИК ЗАМЕРОВ ТЕЛА (Body Measurements Modals)
  // ---------------------------------------------------------------------------
  function openAddMeasurementModal() {
    const today = fmtDate();
    const m = (window.Storage ? window.Storage.getMeasurements()[0] : null) || {};

    if (window.openModal) {
      window.openModal(`
        <div class="modal-header">
          <div class="modal-title">Новый замер тела</div>
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
        </div>
        <div class="form-group">
          <label class="form-label">Дата замера</label>
          <div style="position:relative; width:100%;">
            <input id="bm-date" 
                   type="date" 
                   class="form-input" 
                   value="${today}" 
                   onchange="onDateInputChange('bm-date', 'bm-date-text')"
                   onclick="triggerNativeDatePicker('bm-date')"
                   style="position:absolute; inset:0; width:100%; height:100%; opacity:0; z-index:2; cursor:pointer;">
            <div id="bm-date-display" class="form-input" onclick="triggerNativeDatePicker('bm-date')" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <span id="bm-date-text" style="font-weight:600;">${formatDisplayDate(today)}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent-color); flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; width:100%; box-sizing:border-box;">
          <div class="form-group" style="min-width:0; margin-bottom:12px;">
            <label class="form-label">Грудь</label>
            <input id="bm-chest" type="text" inputmode="decimal" readonly style="box-sizing:border-box; width:100%; min-width:0; cursor:pointer;" class="form-input" placeholder="0" value="${m.chest || ''}" onclick="openMeasurementPicker('bm-chest', 'Грудь')">
          </div>
          <div class="form-group" style="min-width:0; margin-bottom:12px;">
            <label class="form-label">Талия</label>
            <input id="bm-waist" type="text" inputmode="decimal" readonly style="box-sizing:border-box; width:100%; min-width:0; cursor:pointer;" class="form-input" placeholder="0" value="${m.waist || ''}" onclick="openMeasurementPicker('bm-waist', 'Талия')">
          </div>
          <div class="form-group" style="min-width:0; margin-bottom:12px;">
            <label class="form-label">Бицепс</label>
            <input id="bm-bicep" type="text" inputmode="decimal" readonly style="box-sizing:border-box; width:100%; min-width:0; cursor:pointer;" class="form-input" placeholder="0" value="${m.bicep || ''}" onclick="openMeasurementPicker('bm-bicep', 'Бицепс')">
          </div>
          <div class="form-group" style="min-width:0; margin-bottom:12px;">
            <label class="form-label">Бедро</label>
            <input id="bm-thigh" type="text" inputmode="decimal" readonly style="box-sizing:border-box; width:100%; min-width:0; cursor:pointer;" class="form-input" placeholder="0" value="${m.thigh || ''}" onclick="openMeasurementPicker('bm-thigh', 'Бедро')">
          </div>
        </div>
        <button class="btn btn-green" style="width:100%; margin-top:8px;" onclick="saveMeasurementEntry()">Сохранить замер</button>
      `);
    }
  }

  function saveMeasurementEntry() {
    const dateInput = document.getElementById('bm-date');
    const date = dateInput ? dateInput.value : fmtDate();
    const chest = parseFloat(document.getElementById('bm-chest')?.value) || 0;
    const waist = parseFloat(document.getElementById('bm-waist')?.value) || 0;
    const bicep = parseFloat(document.getElementById('bm-bicep')?.value) || 0;
    const thigh = parseFloat(document.getElementById('bm-thigh')?.value) || 0;

    if (chest <= 0 && waist <= 0 && bicep <= 0 && thigh <= 0) {
      return alert('Введите хотя бы один замер');
    }

    if (window.Storage) window.Storage.addMeasurement({ date, chest, waist, bicep, thigh });
    if (window.closeModal) window.closeModal();
    renderProfile();
  }

  function openMeasurementHistoryModal() {
    const list = window.Storage ? window.Storage.getMeasurements() : [];
    if (window.openModal) {
      window.openModal(`
        <div class="modal-header">
          <div class="modal-title">История замеров тела</div>
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
        </div>
        <div class="item-list" style="max-height:360px; overflow-y:auto;">
          ${list.length ? list.map(m => `
            <div class="list-card" style="padding:10px 14px; align-items:flex-start;">
              <div style="flex:1;">
                <div style="font-weight:bold; font-size:14px; margin-bottom:4px;">${m.date}</div>
                <div style="font-size:12px; color:var(--text-secondary); display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                  <span>Грудь: <strong>${m.chest || '—'} см</strong></span>
                  <span>Талия: <strong>${m.waist || '—'} см</strong></span>
                  <span>Бицепс: <strong>${m.bicep || '—'} см</strong></span>
                  <span>Бедро: <strong>${m.thigh || '—'} см</strong></span>
                </div>
              </div>
              <button class="modal-close-btn" onclick="deleteMeasurementLog(${m.id})">✕</button>
            </div>
          `).join('') : '<div style="text-align:center; padding:30px 16px; color:var(--text-secondary);">Нет сохранённых замеров</div>'}
        </div>
      `);
    }
  }

  function deleteMeasurementLog(id) {
    if (window.Storage) window.Storage.deleteMeasurement(id);
    renderProfile();
    openMeasurementHistoryModal();
  }

  // ---------------------------------------------------------------------------
  // БЛОК 5. ГЕНЕРАТОР ПЕЧАТНОГО ОТЧЕТА АТЛЕТА (Coach PDF Report)
  // ---------------------------------------------------------------------------
  function openCoachReportModal() {
    if (window.switchTab) {
      window.switchTab('stats');
      if (window.switchStatsSubTab) {
        window.switchStatsSubTab('report');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 6. УПРАВЛЕНИЕ РЕЗЕРВНЫМИ КОПИЯМИ И СБРОС (Export / Import / Clipboard)
  // ---------------------------------------------------------------------------
  function exportUserData() {
    if (!window.Storage) return;
    const blob = new Blob([window.Storage.exportBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viv_fitness_backup_${fmtDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function triggerImportUserData() {
    const fileInput = document.getElementById('import-backup-file');
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }

  function handleImportFile(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const content = e.target.result;
        if (!window.Storage) return;
        const success = window.Storage.importBackup(content);
        if (success) {
          alert('Данные успешно импортированы!');
          renderProfile();
          if (window.renderWork && window.state?.currentTab === 'work') {
            window.renderWork();
          }
        } else {
          alert('Ошибка при импорте файла: неверный формат резервной копии.');
        }
      } catch (err) {
        alert('Не удалось прочитать файл резервной копии.');
      }
    };
    reader.readAsText(file);
  }

  function resetUserLocalData() {
    if (confirm('Сбросить все тренировки и настройки к начальному состоянию?')) {
      if (window.Storage) window.Storage.resetAllData();
      alert('Локальные данные сброшены');
      renderProfile();
    }
  }

  // ---------------------------------------------------------------------------
  // БЛОК 7. ЭКРАН РЕСУРСОВ И СООБЩЕСТВ VIV (Shop & Social Links Screen)
  // ---------------------------------------------------------------------------
  function renderShop() {
    if (window.setHeader) window.setHeader('VIV', false);
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
      <div class="item-list">
        <div class="card" style="text-align:center; padding:22px 16px;">
          <div style="font-size:24px; font-weight:900; letter-spacing:1.5px; margin-bottom:4px;">
            <span class="viv-logo-target">${window.AppLogo ? window.AppLogo.render() : 'VIV'}</span>
          </div>
          <div style="font-size:13px; color:var(--text-secondary);">Официальные ресурсы и сообщества</div>
        </div>
        <a href="https://vivclub.ru" target="_blank" rel="noopener noreferrer" onclick="return openExternal('https://vivclub.ru', event);" class="social-btn">
          <div class="social-btn-content">
            <div style="width:38px; height:38px; background:var(--card-bg-elevated); border:1px solid var(--border-color); border-radius:10px; display:flex; align-items:center; justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </div>
            <div>
              <div>Официальный сайт</div>
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </a>
        <a href="https://t.me/vivclubru" target="_blank" rel="noopener noreferrer" onclick="return openExternal('https://t.me/vivclubru', event);" class="social-btn">
          <div class="social-btn-content">
            <div style="width:38px; height:38px; background:var(--card-bg-elevated); border:1px solid var(--border-color); border-radius:10px; display:flex; align-items:center; justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </div>
            <div>
              <div>Telegram канал</div>
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </a>
        <a href="https://www.instagram.com/vivclub.ru?stkn=MTF4aTZwc3ZucG03eg==" target="_blank" rel="noopener noreferrer" onclick="return openExternal('https://www.instagram.com/vivclub.ru?stkn=MTF4aTZwc3ZucG03eg==', event);" class="social-btn">
          <div class="social-btn-content">
            <div style="width:38px; height:38px; background:var(--card-bg-elevated); border:1px solid var(--border-color); border-radius:10px; display:flex; align-items:center; justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </div>
            <div>
              <div>Instagram</div>
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </a>
      </div>
    `;
  }

  function openExternal(url, e) {
    if (window.Telegram?.WebApp && typeof window.Telegram.WebApp.openLink === 'function') {
      if (e && e.preventDefault) e.preventDefault();
      try {
        window.Telegram.WebApp.openLink(url);
        return false;
      } catch (err) {
        console.warn('Telegram openLink error:', err);
      }
    }
    // В стандартном браузере или PWA позволяем нативному переходу сработать
    if (e && e.type === 'click') {
      return true;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }

  // ---------------------------------------------------------------------------
  // БЛОК 8. РЕАКТИВНОСТЬ НА СМЕНУ ТЕМЫ И ЭКСПОРТ В WINDOW (Exports)
  // ---------------------------------------------------------------------------
  window.addEventListener('viv-theme-changed', () => {
    if (window.state && window.state.currentTab === 'profile') {
      const logs = window.Storage ? window.Storage.getBodyweightHistory() : [];
      drawBodyweightChart(logs);
    }
  });

  window.renderProfile = renderProfile;
  window.updateDefaultRestTimer = updateDefaultRestTimer;
  window.drawBodyweightChart = drawBodyweightChart;
  window.openAddWeightModal = openAddWeightModal;
  window.saveBodyweightEntry = saveBodyweightEntry;
  window.openWeightHistoryModal = openWeightHistoryModal;
  window.deleteWeightLog = deleteWeightLog;
  window.openAddMeasurementModal = openAddMeasurementModal;
  window.saveMeasurementEntry = saveMeasurementEntry;
  window.openMeasurementHistoryModal = openMeasurementHistoryModal;
  window.deleteMeasurementLog = deleteMeasurementLog;
  window.openCoachReportModal = openCoachReportModal;
  window.saveProfile = saveProfile;
  window.exportUserData = exportUserData;
  window.triggerImportUserData = triggerImportUserData;
  window.handleImportFile = handleImportFile;
  window.resetUserLocalData = resetUserLocalData;
  window.renderShop = renderShop;
  window.openExternal = openExternal;
  window.openProfileHeightPicker = openProfileHeightPicker;
  window.openProfileWeightPicker = openProfileWeightPicker;
  window.openBwWeightPicker = openBwWeightPicker;
  window.openMeasurementPicker = openMeasurementPicker;
  window.setProfileQuickDate = setProfileQuickDate;
  window.onDateInputChange = onDateInputChange;
  window.triggerNativeDatePicker = triggerNativeDatePicker;
})();
