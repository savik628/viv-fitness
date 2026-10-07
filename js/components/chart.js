// VIV Fitness - Chart Component (Canvas)
// Высокопроизводительная отрисовка графиков прогресса с поддержкой темной и светлой тем

(function () {
  'use strict';

      
    function drawChart(canvasId, points, valueGetter, unit) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width, h = rect.height;

    // Определение текущей темы
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const lineColor = isLight ? '#0f172a' : '#ffffff';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(120, 120, 128, 0.14)';
    const gridTextColor = isLight ? '#64748b' : '#71717a';
    const pointCenter = isLight ? '#ffffff' : '#000000';
    const badgeBg = isLight ? '#0f172a' : '#18181b';
    const badgeBorder = isLight ? '#334155' : '#3f3f46';
    const badgeTextColor = '#ffffff';
    const gradTop = isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.16)';
    const gradBottom = 'rgba(0, 0, 0, 0.0)';

    const values = points.map(p => {
      const val = typeof valueGetter === 'function' ? valueGetter(p) : p[valueGetter];
      return Math.max(0, Math.round((Number(val) || 0) * 10) / 10);
    });

    const maxData = Math.max(...values, 0);

    const scaleMax = (() => {
      const raw = maxData > 0 ? maxData * 1.3 : 10;
      if (raw <= 10) return Math.ceil(raw);
      if (raw <= 50) return Math.ceil(raw / 5) * 5;
      if (raw <= 100) return Math.ceil(raw / 10) * 10;
      if (raw <= 500) return Math.ceil(raw / 50) * 50;
      if (raw <= 2000) return Math.ceil(raw / 100) * 100;
      if (raw <= 10000) return Math.ceil(raw / 500) * 500;
      return Math.ceil(raw / 1000) * 1000;
    })();

    // Защита оси Y от обрезания больших чисел (динамический отступ)
    ctx.font = '10px -apple-system, sans-serif';
    const maxYTextW = ctx.measureText(String(scaleMax)).width;
    const padLeft = Math.max(38, Math.ceil(maxYTextW + 14));
    const padRight = 16, padTop = 26, padBottom = 28;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    // Координатная сетка
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      ctx.fillStyle = gridTextColor;
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      const gridVal = Math.round(scaleMax - (scaleMax / 4) * i);
      ctx.fillText(`${gridVal}`, padLeft - 6, y + 3);
    }

    // Расчет координат точек
    const totalPts = points.length;
    if (totalPts === 0) return;

    const coords = points.map((p, idx) => {
      const val = values[idx];
      const x = totalPts === 1 ? padLeft + chartW / 2 : padLeft + (chartW / (totalPts - 1)) * idx;
      const y = padTop + chartH - (val / scaleMax) * chartH;
      return { x, y, point: p, val, idx };
    });

    // Заливка под графиком
    ctx.beginPath();
    ctx.moveTo(coords[0].x, padTop + chartH);
    coords.forEach(c => ctx.lineTo(c.x, c.y));
    ctx.lineTo(coords[coords.length - 1].x, padTop + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    grad.addColorStop(0, gradTop);
    grad.addColorStop(1, gradBottom);
    ctx.fillStyle = grad;
    ctx.fill();

    // Линия графика
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    coords.forEach(c => ctx.lineTo(c.x, c.y));
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Отрисовка базовых круглых маркеров
    coords.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = pointCenter;
      ctx.fill();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // УМНЫЕ БЕЙДЖИ ЗНАЧЕНИЙ (защита от наложения друг на друга)
    const maxIdx = values.indexOf(Math.max(...values));
    const candidateIndices = [];
    if (totalPts <= 4) {
      for (let i = 0; i < totalPts; i++) candidateIndices.push(i);
    } else {
      candidateIndices.push(maxIdx);
      if (!candidateIndices.includes(totalPts - 1)) candidateIndices.push(totalPts - 1);
      if (!candidateIndices.includes(0)) candidateIndices.push(0);
    }

    // Фильтруем кандидатов: расстояние между бейджами строго не менее 52px
    const acceptedBadges = [];
    candidateIndices.forEach(idx => {
      const c = coords[idx];
      const wouldCollide = acceptedBadges.some(b => Math.abs(b.x - c.x) < 52);
      if (!wouldCollide) {
        acceptedBadges.push(c);
      }
    });

    acceptedBadges.forEach(c => {
      const valText = `${c.val} ${unit}`;
      ctx.font = 'bold 9.5px -apple-system, sans-serif';
      const textW = ctx.measureText(valText).width;
      const bW = textW + 10, bH = 17;
      let bX = c.x - bW / 2;
      bX = Math.max(padLeft, Math.min(w - padRight - bW, bX));
      let bY = c.y - 21;
      if (bY < 4) bY = c.y + 8;

      ctx.fillStyle = badgeBg;
      ctx.strokeStyle = badgeBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bX, bY, bW, bH, 5);
      else ctx.rect(bX, bY, bW, bH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = badgeTextColor;
      ctx.textAlign = 'center';
      ctx.fillText(valText, bX + bW / 2, bY + 12);
    });

    // ПОДПИСИ ПО ОСИ X (КОМПАКТНЫЕ ДАТЫ ДД.ММ БЕЗ НАЛЕЗАНИЯ)
    function formatXDate(rawDate) {
      if (!rawDate) return '';
      if (rawDate.length === 10 && rawDate.includes('-')) {
        return `${rawDate.substring(8, 10)}.${rawDate.substring(5, 7)}`;
      }
      return rawDate;
    }

    const minXGap = 46;
    const xLabelsToDraw = [];
    const lastCoord = coords[totalPts - 1];

    if (totalPts <= 5 && chartW / Math.max(1, totalPts - 1) >= minXGap) {
      for (let i = 0; i < totalPts; i++) xLabelsToDraw.push(coords[i]);
    } else {
      let lastX = -999;
      for (let i = 0; i < totalPts - 1; i++) {
        const c = coords[i];
        if ((c.x - lastX >= minXGap) && (lastCoord.x - c.x >= minXGap)) {
          xLabelsToDraw.push(c);
          lastX = c.x;
        }
      }
      xLabelsToDraw.push(lastCoord);
    }

    xLabelsToDraw.forEach(c => {
      const shortDate = formatXDate(c.point.date);
      const orderStr = c.point.orderLabel || `№${c.idx + 1}`;

      let textX = c.x;
      if (c.idx === 0) textX = Math.max(padLeft + 10, c.x);
      if (c.idx === totalPts - 1) textX = Math.min(w - padRight - 10, c.x);

      ctx.font = 'bold 9.5px -apple-system, sans-serif';
      ctx.fillStyle = isLight ? '#475569' : '#a1a1aa';
      ctx.textAlign = 'center';
      ctx.fillText(orderStr, textX, h - 13);

      if (shortDate) {
        ctx.font = '8.5px -apple-system, sans-serif';
        ctx.fillStyle = gridTextColor;
        ctx.fillText(shortDate, textX, h - 2);
      }
    });
  }

  
    window.drawChart = drawChart;
})();
