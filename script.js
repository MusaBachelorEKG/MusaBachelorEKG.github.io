(function () {
  const leftLeads = ['I', 'II', 'III', 'aVL', 'aVR', 'aVF'];
  const rightLeads = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
  const allLeads = [...leftLeads, ...rightLeads];
  const mm = 5; // pixel size for 1 mm
  const leadWidth = 700;
  const leadHeight = 130;
  const labelWidth = 40;
  const columnWidth = labelWidth + leadWidth;
  const topMargin = mm * 10; // add 2 big boxes (10 mm) above leads

  const canvas = document.getElementById('ekg');
  const ctx = canvas.getContext('2d');
  const cabCanvas = document.getElementById('cabrera');
  const cabCtx = cabCanvas.getContext('2d');
  const cabRadius = 80;
  const cabCenter = { x: cabCanvas.width / 2, y: cabCanvas.height / 2 };
  const deg = (d) => (d * Math.PI) / 180;
  const cabDisplay = ['aVL', 'I', '-aVR', 'II', 'aVF', 'III'];
  const cabAngles = {
    aVL: deg(-30),
    I: deg(0),
    '-aVR': deg(30),
    II: deg(60),
    aVF: deg(90),
    III: deg(120),
  };
  const axisAngles = {
    I: deg(0),
    II: deg(60),
    III: deg(120),
    aVR: deg(-150),
    aVL: deg(-30),
    aVF: deg(90),
  };
  const cabDefault = deg(75);
  let cabAngle = cabDefault;
  let draggingCab = false;
let handles = [];
let activeHandle = null;
let lastArrFactors = [];
let lastPFrac = 0;
const leadMeta = {};

let redrawPending = false;
let placingExtra = false;
function queueDraw(setDefaults = false) {
    if (redrawPending) return;
    redrawPending = true;
    const activeParam = activeHandle ? activeHandle.param : null;
    requestAnimationFrame(() => {
      drawEKG(currentDiagnosis, setDefaults);
      if (activeParam) {
        activeHandle = handles.find((h) => h.param === activeParam) || null;
      }
      redrawPending = false;
    });
  }

const defaultParams = {
  pAmp: 20,
  pLen: 25,
  pqTime: 10,
  pOffset: 0,
  rAmp: 40,
  qAmp: -10,
  sAmp: -10,
  qrsWidth: 30,
  tAmp: 20,
  tWidth: 40,
  stHeight: 0,
  isoLen: 60,
  complexes: 5,
  tPeaked: false,
  afib: false,
  aflutter: false,
  rhythmic: true,
  arrLevel: 'mittel',
  stElevation: false,
  avBlock: false,
  avType: '2-2',
  avRatio: 3,
  extraType: 'sve',
  extras: [],
};
  const arrRanges = {
    leicht: [0.75, 1.25],
    mittel: [0.5, 1.5],
    schwer: [0.25, 1.75],
    extrem: [0.25, 2.5],
  };
  const leadParams = {};
  const leadBase = {};
allLeads.forEach((l) => {
  leadParams[l] = { ...defaultParams, extras: [] };
  leadBase[l] = {
    pAmp: defaultParams.pAmp,
    qAmp: defaultParams.qAmp,
    rAmp: defaultParams.rAmp,
    tAmp: defaultParams.tAmp,
    sAmp: defaultParams.sAmp,
  };
});
  let currentLead = 'all';
  let params = leadParams[allLeads[0]];
  function updateParamsRef() {
    params = currentLead === 'all' ? leadParams[allLeads[0]] : leadParams[currentLead];
  }
  const diagnosisPresets = {
    tachy: { isoLen: 40 },
    brady: { isoLen: 100 },
    fibr: { irregular: true, pAmp: 0 },
  };

  let currentDiagnosis = '';
  let aiSets = [];

  function hasLeadKeys(obj) {
    return allLeads.some((l) => l in obj);
  }

  function hasParamKeys(obj) {
    const keys = [
      'pAmp',
      'pLen',
      'pqTime',
      'pOffset',
      'qAmp',
      'rAmp',
      'sAmp',
      'qrsWidth',
      'tAmp',
      'tWidth',
      'tPeaked',
      'stHeight',
      'isoLen',
      'complexes',
    ];
    return keys.some((k) => k in obj);
  }

  function applyAIParams(p) {
    if (!p) return;
    const perLead = hasLeadKeys(p);
      allLeads.forEach((l) => {
        const src = perLead ? p[l] || {} : p;
        leadParams[l] = {
          ...defaultParams,
          ...src,
          extras: src.extras ? [...src.extras] : [],
        };
        leadBase[l] = {
          pAmp: leadParams[l].pAmp,
          qAmp: leadParams[l].qAmp,
          rAmp: leadParams[l].rAmp,
          tAmp: leadParams[l].tAmp,
          sAmp: leadParams[l].sAmp,
        };
      });
    updateParamsRef();
    syncControls();
    cabAngle = cabDefault;
    drawCabrera();
    applyAxis();
  }

  function syncControls() {
    document.getElementById('leadSelect').value = currentLead;
    document.getElementById('pAmp').value = params.pAmp;
    document.getElementById('pLen').value = params.pLen;
    document.getElementById('pqTime').value = params.pqTime;
    document.getElementById('rAmp').value = params.rAmp;
    document.getElementById('qAmp').value = params.qAmp;
    const sAmpEl = document.getElementById('sAmp');
    sAmpEl.value = params.sAmp;
    sAmpEl.disabled = params.stElevation;
    document.getElementById('qrsWidth').value = params.qrsWidth;
    document.getElementById('tAmp').value = params.tAmp;
    document.getElementById('tWidth').value = params.tWidth;
    document.getElementById('tPeakedBox').checked = params.tPeaked;
    document.getElementById('stHeight').value = params.stHeight;
    document.getElementById('isoLen').value = params.isoLen;
    document.getElementById('complexes').value = params.complexes;
    document.getElementById('afibBox').checked = params.afib;
    document.getElementById('aflutterBox').checked = params.aflutter;
    document.getElementById('stElevBox').checked = params.stElevation;
    document.getElementById('avBlockBox').checked = params.avBlock;
    document.getElementById('avBlockControls').style.display = params.avBlock
      ? 'block'
      : 'none';
    document.getElementById('avBlockType').value = params.avType;
    document.getElementById('avBlockRatio').value = params.avRatio;
      document.getElementById('rhythm').checked = params.rhythmic;
      const arrSel = document.getElementById('arrLevel');
      arrSel.value = params.arrLevel;
      arrSel.disabled = params.rhythmic;
      const extraActive = params.extras && params.extras.length;
      document.getElementById('extraBox').checked = !!extraActive;
      document.getElementById('extraControls').style.display = extraActive
        ? 'block'
        : 'none';
      document.getElementById('extraType').value = params.extraType;
      document.getElementById('extraCount').value = params.extras.length || 1;
      const pAmpEl = document.getElementById('pAmp');
      const pLenEl = document.getElementById('pLen');
      pAmpEl.disabled = params.afib || params.aflutter;
      pLenEl.disabled = params.afib || params.aflutter;
    }

  function applyDiagnosis(diagnosis) {
    const lower = diagnosis.toLowerCase();
    let options = {};
      allLeads.forEach((l) => {
        leadParams[l] = { ...defaultParams, extras: [] };
        if (lower.includes('tachy')) Object.assign(leadParams[l], diagnosisPresets.tachy);
        if (lower.includes('brady')) Object.assign(leadParams[l], diagnosisPresets.brady);
        if (lower.includes('fibr')) Object.assign(leadParams[l], { pAmp: 0 });
        leadBase[l] = {
          pAmp: leadParams[l].pAmp,
          qAmp: leadParams[l].qAmp,
          rAmp: leadParams[l].rAmp,
          tAmp: leadParams[l].tAmp,
          sAmp: leadParams[l].sAmp,
        };
      });
    updateParamsRef();
    applyAxis();
    if (lower.includes('fibr')) options.irregular = true;
    if (lower.includes('av block')) options.avblock = true;
    return options;
  }

  function snapZero(v, dead = 5) {
    return Math.abs(v) < dead ? 0 : v;
  }

  function resetControls() {
    const targets = currentLead === 'all' ? allLeads : [currentLead];
    targets.forEach((l) => {
      leadParams[l] = { ...defaultParams, extras: [] };
      leadBase[l] = {
        pAmp: defaultParams.pAmp,
        qAmp: defaultParams.qAmp,
        rAmp: defaultParams.rAmp,
        tAmp: defaultParams.tAmp,
        sAmp: defaultParams.sAmp,
      };
    });

    updateParamsRef();
    syncControls();
    cabAngle = cabDefault;
    drawCabrera();
    applyAxis();
  }

  function restartAll() {
    currentDiagnosis = '';
    document.getElementById('diagnose').value = '';
    currentLead = 'all';
    cabAngle = cabDefault;
    drawCabrera();
    resetControls();
    handles = [];
    activeHandle = null;
    drawGrid(ctx, canvas.width, canvas.height);
    ['chk-generated', 'chk-exported', 'chk-name'].forEach((id) => {
      document.getElementById(id).checked = false;
    });
    document.getElementById('download').disabled = true;
    document.getElementById('download').classList.remove('ready');
    checkChecklist();
    syncControls();
  }

  function checkChecklist() {
    const allChecked = ['chk-generated', 'chk-exported', 'chk-name'].every(
      (id) => document.getElementById(id).checked
    );
    const dl = document.getElementById('download');
    if (allChecked) dl.classList.add('ready');
    else dl.classList.remove('ready');
  }

  function drawGrid(ctx, width, height) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffd6d6';
    for (let x = 0; x <= width; x += mm) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += mm) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#ff9b9b';
    const big = mm * 5;
    for (let x = 0; x <= width; x += big) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += big) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawCabrera() {
    cabCtx.clearRect(0, 0, cabCanvas.width, cabCanvas.height);
    cabCtx.strokeStyle = '#000';
    cabCtx.lineWidth = 1;
    cabCtx.beginPath();
    cabCtx.arc(cabCenter.x, cabCenter.y, cabRadius, 0, Math.PI * 2);
    cabCtx.stroke();
    cabDisplay.forEach((l) => {
      const ang = cabAngles[l];
      const x = cabCenter.x + Math.cos(ang) * cabRadius;
      const y = cabCenter.y + Math.sin(ang) * cabRadius;
      cabCtx.beginPath();
      cabCtx.moveTo(cabCenter.x, cabCenter.y);
      cabCtx.lineTo(x, y);
      cabCtx.stroke();
      cabCtx.fillText(
        l,
        cabCenter.x + Math.cos(ang) * (cabRadius + 12) - 8,
        cabCenter.y + Math.sin(ang) * (cabRadius + 12) + 4
      );
    });
    const ax = cabCenter.x + Math.cos(cabAngle) * cabRadius;
    const ay = cabCenter.y + Math.sin(cabAngle) * cabRadius;
    cabCtx.beginPath();
    cabCtx.moveTo(cabCenter.x, cabCenter.y);
    cabCtx.lineTo(ax, ay);
    cabCtx.stroke();
    cabCtx.beginPath();
    const head = 10;
    cabCtx.moveTo(ax, ay);
    cabCtx.lineTo(
      ax - head * Math.cos(cabAngle - Math.PI / 6),
      ay - head * Math.sin(cabAngle - Math.PI / 6)
    );
    cabCtx.lineTo(
      ax - head * Math.cos(cabAngle + Math.PI / 6),
      ay - head * Math.sin(cabAngle + Math.PI / 6)
    );
    cabCtx.closePath();
    cabCtx.fill();
  }

  function applyAxis() {
    // Limb leads respond to axis rotation
    leftLeads.forEach((l) => {
      const ang = axisAngles[l];
      const diff = ang - cabAngle;
      let scale = Math.cos(diff);
      // keep lead I slightly positive in the steep axis range (II↔aVF)
      if (
        l === 'I' &&
        cabAngle >= deg(60) &&
        cabAngle <= deg(90) &&
        scale < 0.2
      ) {
        scale = 0.2;
      }
      leadParams[l].pAmp = leadBase[l].pAmp * scale;
      leadParams[l].qAmp = leadBase[l].qAmp * scale;
      leadParams[l].rAmp = leadBase[l].rAmp * scale;
      leadParams[l].sAmp = leadBase[l].sAmp * scale;
      leadParams[l].tAmp = leadBase[l].tAmp * scale;
    });
    // Precordial leads remain unaffected by axis rotation
    rightLeads.forEach((l) => {
      leadParams[l].pAmp = leadBase[l].pAmp;
      leadParams[l].qAmp = leadBase[l].qAmp;
      leadParams[l].rAmp = leadBase[l].rAmp;
      leadParams[l].sAmp = leadBase[l].sAmp;
      leadParams[l].tAmp = leadBase[l].tAmp;
    });
    updateParamsRef();
    syncControls();
    queueDraw(false);
  }

  function setCabAngle(dx, dy) {
    cabAngle = Math.atan2(dy, dx);
    drawCabrera();
    applyAxis();
  }

  function drawCalibration(ctx, baseline) {
    const unit = mm; // 1 mm grid
    const spikeStart = unit * 2; // 2 mm baseline before spike
    const spikeEnd = unit * 4; // width of top section
    const totalWidth = unit * 6; // overall width of block

    ctx.beginPath();
    ctx.moveTo(0, baseline); // baseline before
    ctx.lineTo(spikeStart, baseline);
    ctx.lineTo(spikeStart, baseline - unit * 10); // rise to 1 mV
    ctx.lineTo(spikeEnd, baseline - unit * 10); // top width
    ctx.lineTo(spikeEnd, baseline); // fall back to baseline
    ctx.lineTo(totalWidth, baseline); // baseline after
    ctx.stroke();

    // 0.5 mV divider
    ctx.beginPath();
    ctx.moveTo(spikeStart, baseline - unit * 5);
    ctx.lineTo(spikeEnd, baseline - unit * 5);
    ctx.stroke();

    ctx.font = '12px Arial';
    ctx.fillStyle = '#000';
    ctx.fillText('1mV', spikeStart, baseline + unit * 3);

    return totalWidth; // width occupied by calibration
  }

  function drawBaselineSegment(ctx, start, length, level, options) {
    if (length <= 0) return start;
    if (options.afib) {
      const steps = Math.max(4, Math.floor(length / mm));
      for (let j = 1; j <= steps; j++) {
        const px = start + (length / steps) * j;
        const py = level + (Math.random() - 0.5) * 10;
        ctx.lineTo(px, py);
      }
    } else if (options.aflutter) {
      const tooth = mm * 2;
      let px = start;
      while (px < start + length) {
        ctx.lineTo(px + tooth / 2, level - 10);
        ctx.lineTo(px + tooth, level);
        px += tooth;
      }
    } else {
      ctx.lineTo(start + length, level + noise(options));
    }
    return start + length;
  }

  function drawPattern(
    ctx,
    width,
    height,
    params,
    leadName,
    options = {},
    calibrate = false,
    arrFactors = [],
    pFrac = 0
  ) {
    const baseline = height / 2;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;

    const blockWidth = calibrate ? drawCalibration(ctx, baseline) : mm * 6;
    const startX = blockWidth + mm; // consistent gap after calibration area

    ctx.beginPath();
    ctx.moveTo(startX, baseline);

    const availableWidth = width - startX;
    const pqSeg = params.pqTime;
    const stSeg = 10;
    const offsetVal = params.pOffset || 0;
    let baseUnits =
      offsetVal +
      params.pLen +
      pqSeg +
      params.qrsWidth +
      stSeg +
      params.tWidth +
      params.isoLen;
    if (params.avBlock && params.avType === '3') {
      baseUnits =
        params.qrsWidth + stSeg + params.tWidth + params.isoLen;
    }
      const unitScale =
        (availableWidth / Math.max(1, params.complexes)) / baseUnits;
      const cycleWidth = baseUnits * unitScale;
    const pOffset =
      params.avBlock && params.avType === '3'
        ? 0
        : offsetVal * unitScale;
    const pLen = params.pLen * unitScale;
    const pqLen = pqSeg * unitScale;
    const qrsWidth = params.qrsWidth * unitScale;
    const stLen = stSeg * unitScale;
    const tWidth = params.tWidth * unitScale;
    const isoLen = params.isoLen * unitScale;

    const maxAmp = leadHeight / 2 - 5;
    const clamp = (v) => Math.max(-maxAmp, Math.min(maxAmp, v));
    const pAmp = clamp(params.pAmp);
    const qAmp = clamp(params.qAmp);
    const rAmp = clamp(params.rAmp);
    const sAmp = clamp(params.sAmp);
    const tAmp = clamp(params.tAmp);
    const stHeight = clamp(params.stHeight);

    const localHandles = [];

    if (params.complexes === 0) {
        ctx.moveTo(startX, baseline);
        ctx.lineTo(width, baseline);
        ctx.stroke();
        return { handles: localHandles, startX, cycleWidth };
    }

    let x = startX;
    const avEnabled = options.avblock;
    const avType = options.avType;
    const ratio = options.avRatio || 3;
    if (avEnabled && avType === '3') {
      const ventPeriod = qrsWidth + stLen + tWidth + isoLen;
      const pPeriod = ventPeriod / ratio;

      // draw atrial rhythm first so ventricular strokes overlay P-waves
      let firstPX = startX + pFrac * pPeriod;
      while (firstPX + pLen > startX) firstPX -= pPeriod;
      ctx.beginPath();
      let firstP = true;
      for (let pX = firstPX; pX < width; pX += pPeriod) {
        ctx.moveTo(pX, baseline);
        ctx.quadraticCurveTo(
          pX + pLen / 2,
          baseline - pAmp + noise(options),
          pX + pLen,
          baseline + noise(options)
        );
        if (firstP) {
          localHandles.push({
            param: 'pAmp',
            x: pX + pLen / 2,
            y: baseline - pAmp,
            update: (nx, ny) => {
              const el = document.getElementById('pAmp');
              let v = baseline - ny;
              v = snapZero(v);
              params.pAmp = Math.max(+el.min, Math.min(+el.max, v));
              el.value = Math.round(params.pAmp);
              leadBase[leadName].pAmp = params.pAmp;
            },
          });
          localHandles.push({
            param: 'pLen',
            x: pX + pLen,
            y: baseline,
            update: (nx) => {
              const el = document.getElementById('pLen');
              const v = Math.round((nx - pX) / unitScale);
              params.pLen = Math.max(+el.min, Math.min(+el.max, v));
              el.value = params.pLen;
            },
          });
          firstP = false;
        }
      }
      ctx.stroke();

      // now draw ventricular complexes over the P-waves
        ctx.beginPath();
        ctx.moveTo(startX, baseline);
      x = startX;
      for (let i = 0; i < params.complexes; i++) {
        if (x >= width) break;
        const irregular =
          options.irregular || options.arrhythmia ? arrFactors[i] || 1 : 1;
        const iso = isoLen * irregular;
        const qStart = x;
        ctx.lineTo(qStart + qrsWidth * 0.2, baseline - qAmp + noise(options));
        ctx.lineTo(qStart + qrsWidth * 0.5, baseline - rAmp + noise(options));
        const sEnd = baseline - stHeight + noise(options);
        if (options.stElevation) {
          ctx.lineTo(qStart + qrsWidth, sEnd);
        } else {
          ctx.lineTo(qStart + qrsWidth * 0.8, baseline - sAmp + noise(options));
          ctx.lineTo(qStart + qrsWidth, sEnd);
        }
        if (i === 0) {
          localHandles.push({
            param: 'qAmp',
            x: qStart + qrsWidth * 0.2,
            y: baseline - qAmp,
            update: (nx, ny) => {
              const el = document.getElementById('qAmp');
              let v = baseline - ny;
              v = snapZero(v);
              params.qAmp = Math.max(+el.min, Math.min(+el.max, v));
              el.value = Math.round(params.qAmp);
              leadBase[leadName].qAmp = params.qAmp;
            },
          });
          localHandles.push({
            param: 'rAmp',
            x: qStart + qrsWidth * 0.5,
            y: baseline - rAmp,
            update: (nx, ny) => {
              const el = document.getElementById('rAmp');
              let v = baseline - ny;
              v = snapZero(v);
              params.rAmp = Math.max(+el.min, Math.min(+el.max, v));
              el.value = Math.round(params.rAmp);
              leadBase[leadName].rAmp = params.rAmp;
            },
          });
          if (!options.stElevation) {
            localHandles.push({
              param: 'sAmp',
              x: qStart + qrsWidth * 0.8,
              y: baseline - sAmp,
              update: (nx, ny) => {
                const el = document.getElementById('sAmp');
                let v = baseline - ny;
                v = snapZero(v);
                params.sAmp = Math.max(+el.min, Math.min(+el.max, v));
                el.value = Math.round(params.sAmp);
                leadBase[leadName].sAmp = params.sAmp;
              },
            });
          }
          localHandles.push({
            param: 'qrsWidth',
            x: qStart + qrsWidth,
            y: baseline,
            update: (nx) => {
              const el = document.getElementById('qrsWidth');
              const v = Math.round((nx - qStart) / unitScale);
              params.qrsWidth = Math.max(+el.min, Math.min(+el.max, v));
              el.value = params.qrsWidth;
            },
          });
        }
        x = qStart + qrsWidth;
        const stStart = x;
        if (!options.stElevation) {
          x = drawBaselineSegment(ctx, x, stLen, baseline - stHeight, options);
        }
        if (i === 0) {
          localHandles.push({
            param: 'stHeight',
            x: stStart + (options.stElevation ? 0 : stLen),
            y: baseline - stHeight,
            update: (nx, ny) => {
              const el = document.getElementById('stHeight');
              let v = baseline - ny;
              v = snapZero(v);
              params.stHeight = Math.max(+el.min, Math.min(+el.max, v));
              el.value = params.stHeight;
            },
          });
        }
        const tStart = x;
        if (params.tPeaked) {
          ctx.lineTo(
            tStart + tWidth / 2,
            baseline - stHeight - tAmp + noise(options)
          );
        } else {
          ctx.quadraticCurveTo(
            tStart + tWidth / 2,
            baseline - stHeight - tAmp + noise(options),
            tStart + tWidth,
            baseline - stHeight + noise(options)
          );
        }
        if (i === 0) {
          localHandles.push({
            param: 'tAmp',
            x: tStart + tWidth / 2,
            y: baseline - stHeight - tAmp,
            update: (nx, ny) => {
              const el = document.getElementById('tAmp');
              let v = baseline - stHeight - ny;
              v = snapZero(v);
              params.tAmp = Math.max(+el.min, Math.min(+el.max, v));
              el.value = Math.round(params.tAmp);
              leadBase[leadName].tAmp = params.tAmp;
            },
          });
          localHandles.push({
            param: 'tWidth',
            x: tStart + tWidth,
            y: baseline - stHeight,
            update: (nx) => {
              const el = document.getElementById('tWidth');
              const v = Math.round((nx - tStart) / unitScale);
              params.tWidth = Math.max(+el.min, Math.min(+el.max, v));
              el.value = params.tWidth;
            },
          });
        }
        x = tStart + tWidth;
        const isoStart = x;
        x = drawBaselineSegment(ctx, x, iso, baseline, options);
        if (i === 0) {
          localHandles.push({
            param: 'isoLen',
            x: isoStart + iso,
            y: baseline,
            update: (nx) => {
              const el = document.getElementById('isoLen');
              const v = Math.round((nx - isoStart) / unitScale);
              params.isoLen = Math.max(+el.min, Math.min(+el.max, v));
              el.value = params.isoLen;
            },
          });
        }
      }
        if (x < width) ctx.lineTo(width, baseline);
        ctx.stroke();
        return { handles: localHandles, startX, cycleWidth };
    }

      for (let i = 0; i < params.complexes; i++) {
        if (x >= width) break;
        const irregular =
          options.irregular || options.arrhythmia ? arrFactors[i] || 1 : 1;
        let iso = isoLen * irregular;
        let isDrop = false;
        let pqCurrent = pqLen;
        const extra = params.extras.find((e) => e.index === i);
        let pAmpB = pAmp,
          qAmpB = qAmp,
          rAmpB = rAmp,
          sAmpB = sAmp,
          qrsW = qrsWidth,
          tAmpB = tAmp;
        if (extra) {
          if (extra.type === 'sve') {
            qAmpB = qAmp * 0.5;
            rAmpB = rAmp * 0.6;
            sAmpB = sAmp * 0.5;
          } else {
            pAmpB = 0;
            qAmpB = 0;
            rAmpB = -rAmp;
            sAmpB = -sAmp;
            qrsW = qrsWidth * 1.5;
            tAmpB = -tAmp;
          }
          iso *= 1.75;
        }
        if (avEnabled) {
          if (avType === '2-1') {
            const cycle = i % 4;
            pqCurrent = pqLen * (1 + 0.5 * cycle);
            isDrop = cycle === 3;
          } else if (avType === '2-2') {
            const cycle = i % (ratio + 1);
            isDrop = cycle === ratio;
          }
        }
        x = drawBaselineSegment(ctx, x, pOffset, baseline, options);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, baseline);

        if (!options.afib && !options.aflutter) {
          const pStart = x;
          ctx.quadraticCurveTo(
            pStart + pLen / 2,
            baseline - pAmpB + noise(options),
            pStart + pLen,
            baseline + noise(options)
          );
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pStart + pLen, baseline);

        if (i === 0) {
          localHandles.push({
            param: 'pAmp',
            x: pStart + pLen / 2,
            y: baseline - pAmp,
            update: (nx, ny) => {
              const el = document.getElementById('pAmp');
              let v = baseline - ny;
              v = snapZero(v);
              params.pAmp = Math.max(+el.min, Math.min(+el.max, v));
              el.value = Math.round(params.pAmp);
              leadBase[leadName].pAmp = params.pAmp;
              const newStart = nx - pLen / 2;
              const offsetUnits = Math.round((newStart - startX) / unitScale);
              params.pOffset = Math.max(0, offsetUnits);
            },
          });
          localHandles.push({
            param: 'pLen',
            x: pStart + pLen,
            y: baseline,
            update: (nx) => {
              const el = document.getElementById('pLen');
              const v = Math.round((nx - pStart) / unitScale);
              params.pLen = Math.max(+el.min, Math.min(+el.max, v));
              el.value = params.pLen;
            },
          });
        }
        x = pStart + pLen;
        const pqStart = x;
        x = drawBaselineSegment(ctx, x, pqCurrent, baseline, options);
        if (i === 0) {
          localHandles.push({
            param: 'pqTime',
            x,
            y: baseline,
            update: (nx) => {
              const el = document.getElementById('pqTime');
              const v = Math.round((nx - pqStart) / unitScale);
              params.pqTime = Math.max(+el.min, Math.min(+el.max, v));
              el.value = params.pqTime;
            },
          });
        }
      } else {
        x = drawBaselineSegment(ctx, x, pLen + pqCurrent, baseline, options);
      }

      const qStart = x;
      if (isDrop) {
        x = drawBaselineSegment(
          ctx,
          x,
          qrsWidth + stLen + tWidth + iso,
          baseline,
          options
        );
        continue;
      }
        ctx.lineTo(x + qrsW * 0.2, baseline - qAmpB + noise(options));
        ctx.lineTo(x + qrsW * 0.5, baseline - rAmpB + noise(options));
        const sEnd2 = baseline - stHeight + noise(options);
        if (options.stElevation) {
          ctx.lineTo(x + qrsW, sEnd2);
        } else {
          ctx.lineTo(x + qrsW * 0.8, baseline - sAmpB + noise(options));
          ctx.lineTo(x + qrsW, sEnd2);
        }

        if (i === 0) {
          localHandles.push({
            param: 'qAmp',
            x: qStart + qrsWidth * 0.2,
            y: baseline - qAmp,
            update: (nx, ny) => {
              const el = document.getElementById('qAmp');
              let v = baseline - ny;
              v = snapZero(v);
              params.qAmp = Math.max(+el.min, Math.min(+el.max, v));
              el.value = Math.round(params.qAmp);
              leadBase[leadName].qAmp = params.qAmp;
            },
          });
          localHandles.push({
            param: 'rAmp',
            x: qStart + qrsWidth * 0.5,
            y: baseline - rAmp,
            update: (nx, ny) => {
              const el = document.getElementById('rAmp');
              let v = baseline - ny;
              v = snapZero(v);
              params.rAmp = Math.max(+el.min, Math.min(+el.max, v));
              el.value = Math.round(params.rAmp);
              leadBase[leadName].rAmp = params.rAmp;
            },
          });
          if (!options.stElevation) {
            localHandles.push({
              param: 'sAmp',
              x: qStart + qrsWidth * 0.8,
              y: baseline - sAmp,
              update: (nx, ny) => {
                const el = document.getElementById('sAmp');
                let v = baseline - ny;
                v = snapZero(v);
                params.sAmp = Math.max(+el.min, Math.min(+el.max, v));
                el.value = Math.round(params.sAmp);
                leadBase[leadName].sAmp = params.sAmp;
              },
            });
          }
          localHandles.push({
            param: 'qrsWidth',
            x: qStart + qrsWidth,
            y: baseline,
            update: (nx) => {
              const el = document.getElementById('qrsWidth');
              const v = Math.round((nx - qStart) / unitScale);
              params.qrsWidth = Math.max(+el.min, Math.min(+el.max, v));
              el.value = params.qrsWidth;
            },
          });
        }
        x += qrsW;

        const stStart = x;
        if (!options.stElevation) {
          x = drawBaselineSegment(ctx, x, stLen, baseline - stHeight, options);
        }
        if (i === 0) {
          localHandles.push({
            param: 'stHeight',
            x: stStart + (options.stElevation ? 0 : stLen),
            y: baseline - stHeight,
            update: (nx, ny) => {
              const el = document.getElementById('stHeight');
              let v = baseline - ny;
              v = snapZero(v);
              params.stHeight = Math.max(+el.min, Math.min(+el.max, v));
              el.value = params.stHeight;
            },
          });
        }

        const tStart = x;
        if (params.tPeaked) {
          ctx.lineTo(
            tStart + tWidth / 2,
            baseline - stHeight - tAmpB + noise(options)
          );
          ctx.lineTo(
            tStart + tWidth,
            baseline - stHeight + noise(options)
          );
        } else {
          ctx.quadraticCurveTo(
            tStart + tWidth / 2,
            baseline - stHeight - tAmpB + noise(options),
            tStart + tWidth,
            baseline - stHeight + noise(options)
          );
        }
        if (i === 0) {
          localHandles.push({
            param: 'tAmp',
            x: tStart + tWidth / 2,
            y: baseline - stHeight - tAmp,
            update: (nx, ny) => {
              const el = document.getElementById('tAmp');
              let v = baseline - stHeight - ny;
              v = snapZero(v);
              params.tAmp = Math.max(+el.min, Math.min(+el.max, v));
              el.value = Math.round(params.tAmp);
              leadBase[leadName].tAmp = params.tAmp;
            },
          });
          localHandles.push({
            param: 'tWidth',
            x: tStart + tWidth,
            y: baseline - stHeight,
            update: (nx) => {
              const el = document.getElementById('tWidth');
              const v = Math.round((nx - tStart) / unitScale);
              params.tWidth = Math.max(+el.min, Math.min(+el.max, v));
              el.value = params.tWidth;
            },
          });
        }
        x = tStart + tWidth;

      const isoStart = x;
      x = drawBaselineSegment(ctx, x, iso, baseline, options);
      if (i === 0) {
        localHandles.push({
          param: 'isoLen',
          x: isoStart + iso,
          y: baseline,
          update: (nx) => {
            const el = document.getElementById('isoLen');
            const v = Math.round((nx - isoStart) / unitScale);
            params.isoLen = Math.max(+el.min, Math.min(+el.max, v));
            el.value = params.isoLen;
          },
        });
      }
    }
      if (x < width) ctx.lineTo(width, baseline);
      ctx.stroke();
      return { handles: localHandles, startX, cycleWidth };
    }

  function noise(options) {
    return options.irregular ? (Math.random() - 0.5) * 40 : 0;
  }

  function drawLead(name, col, row, options, arrFactors, pFrac) {
    const x = col * columnWidth;
    const y = topMargin + row * leadHeight;
    ctx.save();
    ctx.translate(x, y);
    ctx.font = '16px Arial';
    ctx.fillStyle = '#000';
    ctx.fillText(name, 5, 15);
    ctx.translate(labelWidth, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, leadWidth, leadHeight);
    ctx.clip();
    const calibrate = name === 'I' || name === 'V1';
    const leadOpts = {
      ...options,
      afib: leadParams[name].afib,
      aflutter: leadParams[name].aflutter,
      arrhythmia: !leadParams[name].rhythmic,
      stElevation: leadParams[name].stElevation,
      avblock: leadParams[name].avBlock,
      avType: leadParams[name].avType,
      avRatio: leadParams[name].avRatio,
    };
      const { handles: local, startX: sX, cycleWidth: cW } = drawPattern(
        ctx,
        leadWidth,
        leadHeight,
        leadParams[name],
        name,
        leadOpts,
        calibrate,
        arrFactors,
        pFrac
      );
      leadMeta[name] = { startX: sX, cycleWidth: cW, col, row };
      if (name === currentLead) {
        local.forEach((h) => {
          handles.push({ ...h, x: h.x + x + labelWidth, y: h.y + y });
        });
      }
      ctx.restore();
      ctx.restore();
    }

  function drawEKG(
    diagnosis,
    setDefaults,
    showHandles = true,
    arrFactors,
    pFrac
  ) {
    drawGrid(ctx, canvas.width, canvas.height);

    handles = [];

    let options = {};
    if (setDefaults) {
      options = applyDiagnosis(diagnosis);
    } else {
      const lower = diagnosis.toLowerCase();
      if (lower.includes('fibr')) options.irregular = true;
      if (lower.includes('av block')) options.avblock = true;
    }

    const maxComplexes = Math.max(
      ...allLeads.map((l) => leadParams[l].complexes)
    );
    const needIrregular =
      options.irregular || allLeads.some((l) => !leadParams[l].rhythmic);
    let arrRange = arrRanges.mittel;
    if (!options.irregular) {
      const lead = allLeads.find((l) => !leadParams[l].rhythmic);
      if (lead) arrRange = arrRanges[leadParams[lead].arrLevel] || arrRange;
    }
    if (!arrFactors) {
      arrFactors = Array.from({ length: maxComplexes }, () =>
        needIrregular
          ? arrRange[0] + Math.random() * (arrRange[1] - arrRange[0])
          : 1
      );
    }
    if (pFrac == null) {
      pFrac = Math.random();
    }

    leftLeads.forEach((lead, i) =>
      drawLead(lead, 0, i, options, arrFactors, pFrac)
    );
    rightLeads.forEach((lead, i) =>
      drawLead(lead, 1, i, options, arrFactors, pFrac)
    );

    lastArrFactors = arrFactors;
    lastPFrac = pFrac;

    if (showHandles) {
      ctx.fillStyle = '#00f';
      ctx.strokeStyle = '#000';
      handles.forEach((h) => {
        ctx.beginPath();
        ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  }

  document.getElementById('leadSelect').addEventListener('change', (e) => {
    currentLead = e.target.value;
    updateParamsRef();
    syncControls();
    queueDraw(false);
  });

  document.getElementById('generate').addEventListener('click', () => {
    currentDiagnosis = document.getElementById('diagnose').value;
    queueDraw(true);
    document.getElementById('download').disabled = false;
  });

  document.getElementById('restart').addEventListener('click', restartAll);

  document.getElementById('aiJsonLoad').addEventListener('click', () => {
    document.getElementById('aiJsonFile').click();
  });

  document.getElementById('aiJsonFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result);
        const toSet = (name, data, idx) => ({
          name: name || `Set ${idx + 1}`,
          data,
        });
        aiSets = [];
        if (Array.isArray(raw)) {
          raw.forEach((item, i) => {
            const name = item.name;
            const data = item.leads || item;
            aiSets.push(toSet(name, data, i));
          });
        } else if (hasLeadKeys(raw) || hasParamKeys(raw)) {
          aiSets.push(toSet(raw.name, raw, 0));
        } else {
          Object.entries(raw).forEach(([name, data], i) => {
            aiSets.push(toSet(name, data, i));
          });
        }
        if (!aiSets.length) throw new Error('empty');
        const select = document.getElementById('aiJsonSelect');
        select.innerHTML = '';
        aiSets.forEach((s, i) => {
          const opt = document.createElement('option');
          opt.value = i;
          opt.textContent = s.name;
          select.appendChild(opt);
        });
        select.style.display = aiSets.length > 1 ? 'inline' : 'none';
        select.selectedIndex = 0;
        const first = aiSets[0];
        currentDiagnosis = first.name;
        document.getElementById('diagnose').value = first.name;
        applyAIParams(first.data);
        document.getElementById('download').disabled = false;
      } catch (err) {
        alert('Ungültige JSON-Datei');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('aiJsonSelect').addEventListener('change', (e) => {
    const idx = e.target.value;
    const set = aiSets[idx];
    if (!set) return;
    currentDiagnosis = set.name;
    document.getElementById('diagnose').value = set.name;
    applyAIParams(set.data);
    document.getElementById('download').disabled = false;
  });

  document.getElementById('download').addEventListener('click', downloadImage);

  ['chk-generated', 'chk-exported', 'chk-name'].forEach((id) =>
    document.getElementById(id).addEventListener('change', checkChecklist)
  );
  checkChecklist();

  function downloadImage() {
    const diagnosisInput = document.getElementById('diagnose');
    const diagnosis = diagnosisInput.value.trim();
    if (!diagnosis) {
      alert('Bitte Diagnose eintragen.');
      return;
    }
    const safeName = diagnosis.replace(/[^a-z0-9_\-]/gi, '_');
    const suggested = (safeName || 'ekg') + '.png';
    const fileName = prompt('Dateiname eingeben:', suggested);
    if (!fileName) return;

    drawEKG(currentDiagnosis, false, false, lastArrFactors, lastPFrac);
    const link = document.createElement('a');
    link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    drawEKG(currentDiagnosis, false, true, lastArrFactors, lastPFrac);
  }

  document.getElementById('pAmp').addEventListener('input', (e) => {
    const v = snapZero(+e.target.value);
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadBase[l].pAmp = v));
    } else {
      leadBase[currentLead].pAmp = v;
    }
    e.target.value = v;
    applyAxis();
  });
  document.getElementById('pLen').addEventListener('input', (e) => {
    const v = +e.target.value;
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].pLen = v));
    } else {
      params.pLen = v;
    }
    queueDraw(false);
  });
  document.getElementById('rAmp').addEventListener('input', (e) => {
    const v = snapZero(+e.target.value);
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadBase[l].rAmp = v));
    } else {
      leadBase[currentLead].rAmp = v;
    }
    e.target.value = v;
    applyAxis();
  });
  document.getElementById('qAmp').addEventListener('input', (e) => {
    const v = snapZero(+e.target.value);
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadBase[l].qAmp = v));
    } else {
      leadBase[currentLead].qAmp = v;
    }
    e.target.value = v;
    applyAxis();
  });
  document.getElementById('sAmp').addEventListener('input', (e) => {
    const v = snapZero(+e.target.value);
    if (currentLead === 'all') {
      allLeads.forEach((l) => {
        leadBase[l].sAmp = v;
        leadParams[l].sAmp = v;
      });
    } else {
      leadBase[currentLead].sAmp = v;
      params.sAmp = v;
    }
    e.target.value = v;
    applyAxis();
  });
  document.getElementById('qrsWidth').addEventListener('input', (e) => {
    const v = +e.target.value;
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].qrsWidth = v));
    } else {
      params.qrsWidth = v;
    }
    queueDraw(false);
  });
  document.getElementById('tAmp').addEventListener('input', (e) => {
    const v = snapZero(+e.target.value);
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadBase[l].tAmp = v));
    } else {
      leadBase[currentLead].tAmp = v;
    }
    e.target.value = v;
    applyAxis();
  });
  document.getElementById('tWidth').addEventListener('input', (e) => {
    const v = +e.target.value;
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].tWidth = v));
    } else {
      params.tWidth = v;
    }
    queueDraw(false);
  });
  document.getElementById('tPeakedBox').addEventListener('change', (e) => {
    const v = e.target.checked;
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].tPeaked = v));
    } else {
      params.tPeaked = v;
    }
    queueDraw(false);
  });
  document.getElementById('stHeight').addEventListener('input', (e) => {
    const v = snapZero(+e.target.value);
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].stHeight = v));
    } else {
      params.stHeight = v;
    }
    e.target.value = v;
    queueDraw(false);
  });
  document.getElementById('isoLen').addEventListener('input', (e) => {
    const v = +e.target.value;
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].isoLen = v));
    } else {
      params.isoLen = v;
    }
    queueDraw(false);
  });
  document.getElementById('pqTime').addEventListener('input', (e) => {
    const v = +e.target.value;
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].pqTime = v));
    } else {
      params.pqTime = v;
    }
    queueDraw(false);
  });
  document.getElementById('afibBox').addEventListener('change', (e) => {
    const v = e.target.checked;
    if (currentLead === 'all') {
      allLeads.forEach((l) => {
        leadParams[l].afib = v;
        if (v) leadParams[l].aflutter = false;
      });
      if (v) document.getElementById('aflutterBox').checked = false;
    } else {
      params.afib = v;
      if (v) params.aflutter = false;
    }
    syncControls();
    queueDraw(false);
  });
  document.getElementById('aflutterBox').addEventListener('change', (e) => {
    const v = e.target.checked;
    if (currentLead === 'all') {
      allLeads.forEach((l) => {
        leadParams[l].aflutter = v;
        if (v) leadParams[l].afib = false;
      });
      if (v) document.getElementById('afibBox').checked = false;
    } else {
      params.aflutter = v;
      if (v) params.afib = false;
    }
    syncControls();
    queueDraw(false);
  });
  document.getElementById('rhythm').addEventListener('change', (e) => {
    const v = e.target.checked;
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].rhythmic = v));
    } else {
      params.rhythmic = v;
    }
    document.getElementById('arrLevel').disabled = v;
    queueDraw(false);
  });
  document.getElementById('arrLevel').addEventListener('change', (e) => {
    const v = e.target.value;
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].arrLevel = v));
    } else {
      params.arrLevel = v;
    }
    queueDraw(false);
  });
  document.getElementById('extraBox').addEventListener('change', (e) => {
    const v = e.target.checked;
    document.getElementById('extraControls').style.display = v ? 'block' : 'none';
    const targets = currentLead === 'all' ? allLeads : [currentLead];
    targets.forEach((l) => {
      leadParams[l].extras = v ? [] : [];
      leadParams[l].extraType = document.getElementById('extraType').value;
    });
    queueDraw(false);
  });
  document.getElementById('extraType').addEventListener('change', (e) => {
    const v = e.target.value;
    const targets = currentLead === 'all' ? allLeads : [currentLead];
    targets.forEach((l) => {
      leadParams[l].extraType = v;
      leadParams[l].extras = leadParams[l].extras.map((ex) => ({
        index: ex.index,
        type: v,
      }));
    });
    queueDraw(false);
  });
  document.getElementById('extraCount').addEventListener('change', (e) => {
    const count = +e.target.value;
    const max = params.complexes;
    const idxs = [];
    while (idxs.length < count && idxs.length < max) {
      const idx = Math.floor(Math.random() * max);
      if (!idxs.includes(idx)) idxs.push(idx);
    }
    const targets = currentLead === 'all' ? allLeads : [currentLead];
    targets.forEach((l) => {
      leadParams[l].extras = idxs.map((i) => ({
        index: i,
        type: leadParams[l].extraType,
      }));
    });
    queueDraw(false);
  });
  document.getElementById('extraPlace').addEventListener('click', () => {
    placingExtra = true;
  });
  document.getElementById('avBlockBox').addEventListener('change', (e) => {
    const v = e.target.checked;
    document.getElementById('avBlockControls').style.display = v ? 'block' : 'none';
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].avBlock = v));
    } else {
      params.avBlock = v;
    }
    queueDraw(false);
  });
  document.getElementById('avBlockType').addEventListener('change', (e) => {
    const v = e.target.value;
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].avType = v));
    } else {
      params.avType = v;
    }
    queueDraw(false);
  });
  document.getElementById('avBlockRatio').addEventListener('input', (e) => {
    const v = +e.target.value;
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].avRatio = v));
    } else {
      params.avRatio = v;
    }
    queueDraw(false);
  });
  document.getElementById('stElevBox').addEventListener('change', (e) => {
    const v = e.target.checked;
    document.getElementById('sAmp').disabled = v;
    if (currentLead === 'all') {
      allLeads.forEach((l) => (leadParams[l].stElevation = v));
    } else {
      params.stElevation = v;
    }
    queueDraw(false);
  });
    document.getElementById('complexes').addEventListener('input', (e) => {
      const v = +e.target.value;
      allLeads.forEach((l) => {
        leadParams[l].complexes = v;
        leadParams[l].extras = leadParams[l].extras.filter((ex) => ex.index < v);
      });
      updateParamsRef();
      queueDraw(false);
    });
  document
    .getElementById('resetControls')
    .addEventListener('click', resetControls);

  const copyBtn = document.getElementById('copyBtn');
  const copyModal = document.getElementById('copyModal');
  const copyLeadOptions = document.getElementById('copyLeadOptions');
  const copyConfirm = document.getElementById('copyConfirm');
  const copyCancel = document.getElementById('copyCancel');

  copyBtn.addEventListener('click', () => {
    if (currentLead === 'all') {
      alert('Bitte zuerst eine Ableitung wählen.');
      return;
    }
    copyLeadOptions.innerHTML = '';
    copyConfirm.disabled = true;
    allLeads.forEach((l) => {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = l;
      if (l === currentLead) cb.disabled = true;
      cb.addEventListener('change', () => {
        copyConfirm.disabled = !copyLeadOptions.querySelector('input:checked');
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(l));
      copyLeadOptions.appendChild(label);
    });
    copyModal.style.display = 'flex';
  });

  copyCancel.addEventListener('click', () => {
    copyModal.style.display = 'none';
  });

  copyConfirm.addEventListener('click', () => {
      const src = { ...leadParams[currentLead] };
      const selected = Array.from(
        copyLeadOptions.querySelectorAll('input:checked')
      ).map((cb) => cb.value);
      selected.forEach((l) => {
        leadParams[l] = { ...src, extras: [...(src.extras || [])] };
        leadBase[l] = {
          pAmp: leadBase[currentLead].pAmp,
          qAmp: leadBase[currentLead].qAmp,
          rAmp: leadBase[currentLead].rAmp,
          tAmp: leadBase[currentLead].tAmp,
          sAmp: leadBase[currentLead].sAmp,
        };
      });
    copyModal.style.display = 'none';
    applyAxis();
  });

    canvas.addEventListener('click', (e) => {
      if (!placingExtra) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (y < topMargin) {
        placingExtra = false;
        return;
      }
      const col = x < columnWidth ? 0 : 1;
      const row = Math.floor((y - topMargin) / leadHeight);
      const lead = col === 0 ? leftLeads[row] : rightLeads[row];
      if (!lead) {
        placingExtra = false;
        return;
      }
      const meta = leadMeta[lead];
      if (!meta) {
        placingExtra = false;
        return;
      }
      const localX = x - col * columnWidth - labelWidth;
      if (localX < meta.startX) {
        placingExtra = false;
        return;
      }
      const idx = Math.floor((localX - meta.startX) / meta.cycleWidth);
      allLeads.forEach((l) => {
        leadParams[l].extras.push({ index: idx, type: leadParams[l].extraType });
      });
      document.getElementById('extraCount').value = leadParams[currentLead].extras.length;
      placingExtra = false;
      queueDraw(false);
    });

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      activeHandle = handles.find((h) => Math.hypot(h.x - x, h.y - y) < 6);
    });

  canvas.addEventListener('mousemove', (e) => {
    if (!activeHandle) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    activeHandle.update(x, y);
    queueDraw(false);
  });

  ['mouseup', 'mouseleave'].forEach((evt) =>
    canvas.addEventListener(evt, () => {
      activeHandle = null;
    })
  );

  cabCanvas.addEventListener('mousedown', (e) => {
    const dx = e.offsetX - cabCenter.x;
    const dy = e.offsetY - cabCenter.y;
    if (Math.hypot(dx, dy) <= cabRadius) {
      draggingCab = true;
      setCabAngle(dx, dy);
    }
  });
  cabCanvas.addEventListener('mousemove', (e) => {
    if (!draggingCab) return;
    const dx = e.offsetX - cabCenter.x;
    const dy = e.offsetY - cabCenter.y;
    setCabAngle(dx, dy);
  });
  ['mouseup', 'mouseleave'].forEach((evt) =>
    cabCanvas.addEventListener(evt, () => {
      draggingCab = false;
    })
  );

  drawCabrera();
  applyAxis();
})();
