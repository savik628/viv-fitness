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
        <button class="sub-tab-btn ${window.state.stats.activeSubTab === 'report' ? 'active' : ''}" onclick="switchStatsSubTab('report')">Отчёт VIV</button>
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
  // БЛОК 1.1. АТЛЕТИЧЕСКИЙ ОТЧЁТ VIV
  // ---------------------------------------------------------------------------
  function plural(n, forms) {
    const num = Math.abs(Math.round(n || 0));
    const rem100 = num % 100;
    const rem10 = num % 10;
    if (rem100 >= 11 && rem100 <= 19) return forms[2];
    if (rem10 === 1) return forms[0];
    if (rem10 >= 2 && rem10 <= 4) return forms[1];
    return forms[2];
  }

  function renderStatsReportTab() {
    const container = document.getElementById('stats-tab-content');
    if (!container) return;

    const prof = window.Storage ? window.Storage.getProfile() : {};
    const history = window.Storage ? window.Storage.getHistory() : [];
    const weightLogs = window.Storage ? window.Storage.getBodyweightHistory() : [];
    const latestW = weightLogs.length ? weightLogs[weightLogs.length - 1].weight : (prof.weight || null);
    const initialW = weightLogs.length ? weightLogs[0].weight : (prof.weight || null);
    const weightDiff = (latestW != null && initialW != null) ? Math.round((latestW - initialW) * 10) / 10 : 0;

    // Расчет чистого силового тоннажа (исключая упражнения на время и дистанцию)
    const volumeByExercise = {};
    let totalPureVolume = 0;
    let totalPureSets = 0;

    history.forEach(h => {
      h.sets?.forEach(s => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        // Учитывается исключительно силовой вес (кг); время (сек/мин) и дистанция исключены
        if (w > 0 && r > 0 && s.exerciseName && s.exerciseType !== 'distance' && s.exerciseType !== 'duration') {
          const vol = w * r;
          volumeByExercise[s.exerciseName] = (volumeByExercise[s.exerciseName] || 0) + vol;
          totalPureVolume += vol;
          totalPureSets++;
        }
      });
    });

    const isTons = totalPureVolume >= 1000;
    const displayVol = isTons ? (Math.round((totalPureVolume / 1000) * 10) / 10) : Math.round(totalPureVolume);
    const volUnit = isTons ? 'ТОНН' : 'КГ';

    // Список упражнений строго по убыванию чистого тоннажа
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

    const topExercise = sortedExercises[0];
    const topContribStr = topExercise ? (topExercise.pct + '%') : '—';

    const todayDateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const logoHtml = window.AppLogo ? window.AppLogo.render({ className: 'apple-report-logo-text' }) : 'VIV';

    container.innerHTML = `
      <div class="report-tab-wrapper">
        <div id="viv-athlete-pdf-document" class="printable-athlete-doc apple-fitness-report">
          <!-- Шапка ПО ЦЕНТРУ с чистым белым логотипом VIV (двойной клик сохраняет PNG) -->
          <div class="apple-report-branding">
            <div class="apple-report-logo-interactive viv-logo-target" 
                 id="viv-report-logo-btn" 
                 role="button" 
                 tabindex="0"
                 title="Нажмите дважды для сохранения в PNG"
                 ondblclick="exportVivReportPng()"
                 onclick="handleVivLogoClick(event)">
              ${logoHtml}
            </div>
            <div class="apple-report-hint">Дважды нажмите на VIV для сохранения PNG</div>
            <div class="apple-report-date">${todayDateStr}</div>
          </div>

          <!-- ГЛАВНЫЙ АКЦЕНТ: ДВУХЦВЕТНОЕ НЕОНОВОЕ КОЛЬЦО ТОННАЖА ПО ЦЕНТРУ (ДИЗАЙН 1) -->
          <div class="apple-hero-ring-card">
            <div class="apple-ring-container-centered">
              <svg class="apple-ring-svg-lg" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="appleRingGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#00F59B" />
                    <stop offset="50%" stop-color="#10b981" />
                    <stop offset="100%" stop-color="#DFFF00" />
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

          <!-- СУММАРНЫЕ KPI-МЕТРИКИ (3 карточки в ряд) -->
          <div class="apple-kpi-grid">
            <div class="apple-kpi-card">
              <div class="apple-kpi-val">${totalPureSets}</div>
              <div class="apple-kpi-lbl">Подходов</div>
            </div>
            <div class="apple-kpi-card">
              <div class="apple-kpi-val">${sortedExercises.length}</div>
              <div class="apple-kpi-lbl">Упражнений</div>
            </div>
            <div class="apple-kpi-card">
              <div class="apple-kpi-val">${topContribStr}</div>
              <div class="apple-kpi-lbl">Топ вклад</div>
            </div>
          </div>

          <!-- СПИСОК РАСПРЕДЕЛЕНИЯ СИЛОВОГО ТОННАЖА ПО УБЫВАНИЮ -->
          <div class="tonnage-dist-section">
            <div class="tonnage-dist-header-row">
              <div class="tonnage-dist-section-title">Распределение тоннажа</div>
            </div>
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
              <div class="apple-empty-box">Нет завершенных силовых тренировок с весом.</div>
            `}
          </div>

          <!-- ЛАКОНИЧНЫЙ ЦЕНТРИРОВАННЫЙ ПОДВАЛ -->
          <div class="apple-report-footer">
          </div>
        </div>
      </div>
    `;
  }

  let _vivTapTime = 0;
  function handleVivLogoClick(e) {
    const now = Date.now();
    if (now - _vivTapTime < 420) {
      _vivTapTime = 0;
      exportVivReportPng();
    } else {
      _vivTapTime = now;
    }
  }

  async function exportVivReportPng() {
    if (window.triggerHaptic) window.triggerHaptic('medium');

    const history = window.Storage ? window.Storage.getHistory() : [];
    
    // Чистый силовой объем
    const volumeByExercise = {};
    let totalPureVolume = 0;

    history.forEach(h => {
      h.sets?.forEach(s => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        if (w > 0 && r > 0 && s.exerciseName && s.exerciseType !== 'distance' && s.exerciseType !== 'duration') {
          const vol = w * r;
          volumeByExercise[s.exerciseName] = (volumeByExercise[s.exerciseName] || 0) + vol;
          totalPureVolume += vol;
        }
      });
    });

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

    const canvas = document.createElement('canvas');
    const W = 1080;
    const H = 1350; // Формат 4:5
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    // 1. Фон глубокий матовый
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0a0c0e');
    bgGrad.addColorStop(1, '#11151a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Радиальный неоновый свет позади кольца
    const glow = ctx.createRadialGradient(W / 2, 360, 20, W / 2, 360, 360);
    glow.addColorStop(0, 'rgba(0, 245, 155, 0.16)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 80, W, 650);

    // Рамка карточки
    roundRect(36, 36, W - 72, H - 72, 38, null, true, 'rgba(255, 255, 255, 0.08)', 2);

    // 2. Шапка: VIV (текст или логотип в зависимости от window.AppLogo.mode)
    let iconImg = null;
    if (window.AppLogo && window.AppLogo.mode === 'icon') {
      try {
        iconImg = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = window.AppLogo.iconSrc || 'icon.svg';
        });
      } catch (e) {
        iconImg = null;
      }
    }

    if (iconImg) {
      const iconSize = 88;
      ctx.save();
      ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
      ctx.shadowBlur = 20;
      ctx.drawImage(iconImg, (W - iconSize) / 2, 64, iconSize, iconSize);
      ctx.restore();
    } else {
      ctx.textAlign = 'center';
      ctx.font = '900 74px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
      ctx.shadowBlur = 24;
      ctx.fillText('VIV', W / 2, 130);
      ctx.shadowBlur = 0;
    }

    const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.font = '500 21px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(dateStr, W / 2, 178);

    // 3. Центральное неоновое кольцо с суммарным тоннажем
    const ringCenterX = W / 2;
    const ringCenterY = 355;
    const ringRadius = 135;

    // Фоновая окружность
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.arc(ringCenterX, ringCenterY, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.stroke();

    // Неоновая дуга активности
    const ringGrad = ctx.createLinearGradient(ringCenterX - ringRadius, ringCenterY - ringRadius, ringCenterX + ringRadius, ringCenterY + ringRadius);
    ringGrad.addColorStop(0, '#00F59B');
    ringGrad.addColorStop(1, '#DFFF00');
    ctx.beginPath();
    ctx.arc(ringCenterX, ringCenterY, ringRadius, -Math.PI / 2, Math.PI * 1.15);
    ctx.strokeStyle = ringGrad;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Текст строго в центре кольца (без наезда на нижнюю дугу)
    ctx.textAlign = 'center';
    ctx.font = '900 86px -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${displayVol}`, ringCenterX, ringCenterY + 16);

    ctx.font = '800 26px -apple-system, sans-serif';
    ctx.fillStyle = '#DFFF00';
    ctx.letterSpacing = '1px';
    ctx.fillText(volUnit, ringCenterX, ringCenterY + 58);
    ctx.letterSpacing = '0px';

    // 4. Сетка из 3 суммарных KPI-карточек (заполнение пространства и информативность)
    const listW = W - 140;
    const listLeft = 70;
    const kpiY = 520;
    const kpiH = 84;
    const kpiW = Math.round((listW - 20) / 3);

    const kpiItems = [
      { val: totalPureSets, lbl: 'ПОДХОДОВ', color: '#ffffff' },
      { val: sortedExercises.length, lbl: 'УПРАЖНЕНИЙ', color: '#ffffff' },
      { val: topExercise ? topExercise.pct + '%' : '—', lbl: 'ТОП ВКЛАД', color: '#DFFF00' }
    ];

    for (let k = 0; k < 3; k++) {
      const item = kpiItems[k];
      const kX = listLeft + k * (kpiW + 10);
      roundRect(kX, kpiY, kpiW, kpiH, 18, '#13181f', true, 'rgba(255, 255, 255, 0.07)', 1.5);

      ctx.textAlign = 'center';
      ctx.font = '900 32px -apple-system, sans-serif';
      ctx.fillStyle = item.color;
      ctx.fillText(String(item.val), kX + kpiW / 2, kpiY + 42);

      ctx.font = '700 12px -apple-system, sans-serif';
      ctx.fillStyle = '#a1a1aa';
      ctx.letterSpacing = '0.5px';
      ctx.fillText(item.lbl, kX + kpiW / 2, kpiY + 68);
      ctx.letterSpacing = '0px';
    }

    // 5. Список распределения тоннажа по убыванию (Дизайн 1)
    const listTopY = 642;

    ctx.textAlign = 'left';
    ctx.font = '800 21px -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = '0.5px';
    ctx.fillText('РАСПРЕДЕЛЕНИЕ ТОННАЖА', listLeft, listTopY);
    ctx.letterSpacing = '0px';

    let rowY = listTopY + 20;
    const maxItems = Math.min(6, sortedExercises.length);
    const cardH = maxItems <= 4 ? 90 : 80;
    const cardGap = maxItems <= 4 ? 14 : 10;

    if (maxItems === 0) {
      roundRect(listLeft, rowY, listW, 110, 20, '#13181f', true, 'rgba(255, 255, 255, 0.06)', 1.5);
      ctx.textAlign = 'center';
      ctx.font = '500 20px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('Нет завершенных силовых тренировок', W / 2, rowY + 62);
    } else {
      for (let i = 0; i < maxItems; i++) {
        const item = sortedExercises[i];
        roundRect(listLeft, rowY, listW, cardH, 18, '#13181f', true, 'rgba(255, 255, 255, 0.07)', 1.5);

        const textY = rowY + (cardH <= 80 ? 35 : 39);

        // Тоннаж справа
        ctx.textAlign = 'right';
        ctx.font = '800 21px -apple-system, sans-serif';
        ctx.fillStyle = '#DFFF00';
        ctx.fillText(item.volStr, listLeft + listW - 24, textY);
        const volW = ctx.measureText(item.volStr).width;

        // Процент левее тоннажа с четким интервалом
        const pctStr = item.pct + '%';
        ctx.font = '700 15px -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        const pctRight = listLeft + listW - 24 - volW - 14;
        ctx.fillText(pctStr, pctRight, textY);
        const pctW = ctx.measureText(pctStr).width;

        // Название упражнения слева (с обрезкой через многоточие при превышении ширины)
        const maxNameW = listW - 48 - volW - pctW - 36;
        ctx.textAlign = 'left';
        ctx.font = '700 21px -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        const safeName = fitTextWithEllipsis(item.name, maxNameW);
        ctx.fillText(safeName, listLeft + 24, textY);

        // Тонкий неоновый прогресс-бар
        const trackY = rowY + (cardH <= 80 ? 53 : 58);
        const trackW = listW - 48;
        const trackX = listLeft + 24;
        roundRect(trackX, trackY, trackW, 7, 3.5, 'rgba(255, 255, 255, 0.07)', false, null);

        const barW = Math.max(10, Math.round((trackW * item.pct) / 100));
        const barGrad = ctx.createLinearGradient(trackX, trackY, trackX + barW, trackY);
        barGrad.addColorStop(0, '#00F59B');
        barGrad.addColorStop(1, '#DFFF00');
        roundRect(trackX, trackY, barW, 7, 3.5, barGrad, false, null);

        rowY += cardH + cardGap;
      }
    }

    // 6. Водяной знак
    ctx.textAlign = 'center';
    ctx.font = '700 14px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.letterSpacing = '1px';
    ctx.fillText('VIV  •  ATHLETIC PERFORMANCE SYSTEM', W / 2, H - 42);
    ctx.letterSpacing = '0px';

    // Сохранение и шеринг
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const fileName = `viv-tonnage-report-${new Date().toISOString().substring(0, 10)}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'VIV Athletic Report',
            text: 'Мой силовой отчёт VIV',
            files: [file]
          });
          if (window.triggerHaptic) window.triggerHaptic('success');
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (window.triggerHaptic) window.triggerHaptic('success');
      alert('Отчёт VIV успешно сохранён в PNG! ✨');
    }, 'image/png');
  }

  window.handleVivLogoClick = handleVivLogoClick;
  window.exportVivReportPng = exportVivReportPng;

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

    const currentLimit = (window.Storage && window.Storage.getChartLimit) ? window.Storage.getChartLimit() : 10;
    window.state.stats.chartLimit = currentLimit;
    const visiblePoints = chartPoints.slice(-currentLimit);

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
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary);">Выбор упражнения</div>
          <button class="btn btn-outline btn-sm chart-limit-filter-btn" onclick="openChartLimitPicker()" style="display:inline-flex; align-items:center; gap:6px; font-weight:600; padding:6px 12px; border-radius:10px; cursor:pointer;">
            <span>Последние: <b style="color:var(--accent-color);">${currentLimit}</b></span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </div>
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

    if (visiblePoints.length > 0 && window.drawChart) {
      if (isWeightReps) {
        window.drawChart('progressCanvasMaxWeight', visiblePoints, p => p.maxWeight, 'кг');
        window.drawChart('progressCanvas1RM', visiblePoints, p => p.oneRepMax, 'кг');
        window.drawChart('progressCanvasTotalVolume', visiblePoints, p => p.totalVolume, 'кг');
      } else if (exType === 'bodyweight') {
        window.drawChart('progressCanvasSingle', visiblePoints, p => p.maxReps, 'повторений');
      } else if (exType === 'distance') {
        window.drawChart('progressCanvasSingle', visiblePoints, p => p.totalValue, 'км');
      } else {
        window.drawChart('progressCanvasSingle', visiblePoints, p => p.totalValue, 'сек');
      }
    }
  }

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
