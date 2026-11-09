'use strict';

(function () {
  const STORE_KEY = 'snappp-proto-v3';
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ─── Dates (local YYYY-MM-DD keys, so days follow the user's time zone) ───
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const realToday = () => keyOf(new Date());
  const today = () => addDays(realToday(), S.dayOffset);
  const dow = (k) => (parseKey(k).getDay() + 6) % 7; // 0 = Monday
  const fmtDay = (k, opts = { weekday: 'long', month: 'long', day: 'numeric' }) => parseKey(k).toLocaleDateString(undefined, opts);
  const fmtShort = (k) => fmtDay(k, { month: 'short', day: 'numeric' });
  const fmtTime = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); const d = new Date(); d.setHours(h, m); return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
  const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const pick = (arr, seed) => arr[Math.floor(hash(seed) * arr.length)];
  const uid = (p) => `${p}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

  // ─── Content ───
  const FLOWERS = [
    { id: 'poppy', name: 'Poppy', shape: 'round', petals: 5, petal: '#e8553d', center: '#3a2a1f' },
    { id: 'daisy', name: 'Daisy', shape: 'thin', petals: 12, petal: '#ffffff', stroke: '#d6d6d6', center: '#f2b705' },
    { id: 'tulip', name: 'Tulip', shape: 'tulip', petal: '#d9417f' },
    { id: 'sunflower', name: 'Sunflower', shape: 'thin', petals: 14, petal: '#f5b301', center: '#6b3e12' },
    { id: 'cornflower', name: 'Cornflower', shape: 'round', petals: 8, petal: '#4f7be8', center: '#2b3d8f' },
    { id: 'lavender', name: 'Lavender', shape: 'spike', petal: '#9b7fd4' },
  ];
  const flowerName = (id) => (FLOWERS.find((f) => f.id === id) || FLOWERS[0]).name;
  // Typing a keyword offers more specific names, e.g. "Read" → "Read 10 pages".
  const SUGGEST = [
    [['read', 'book'], ['Read 10 pages', 'Read 20 minutes', 'Read before bed']],
    [['run', 'jog'], ['Run 3 km', 'Run 20 minutes', 'Morning run']],
    [['swim', 'laps'], ['Swim 30 minutes', 'Swim 20 laps']],
    [['walk', 'steps'], ['Walk 30 minutes', 'Walk 8,000 steps']],
    [['meditat', 'breath', 'mindful'], ['Meditate 10 minutes', 'Breathe for 5 minutes']],
    [['journal', 'write', 'diary'], ['Journal one page', 'Write 300 words']],
    [['stretch', 'yoga'], ['Stretch 10 minutes', 'Yoga 20 minutes']],
    [['gym', 'workout', 'work out', 'lift', 'exercise'], ['Work out 30 minutes', 'Lift weights 45 minutes']],
    [['water', 'drink'], ['Drink 8 glasses of water']],
    [['guitar', 'piano', 'music', 'practice', 'sing'], ['Practice guitar 15 minutes', 'Practice piano 20 minutes']],
    [['cook', 'meal'], ['Cook dinner at home', 'Pack a homemade lunch']],
    [['study', 'learn', 'language', 'code'], ['Study 30 minutes', 'Practice a language 15 minutes', 'Code for 30 minutes']],
    [['draw', 'sketch', 'paint'], ['Sketch for 15 minutes', 'Draw one page']],
    [['sleep', 'bed'], ['In bed by 11 pm']],
  ];
  function suggestionsFor(text) {
    const q = text.trim().toLowerCase();
    if (q.length < 2) return [];
    const out = [];
    SUGGEST.forEach(([keys, names]) => {
      if (keys.some((k) => k.startsWith(q) || q.includes(k))) names.forEach((n) => { if (n.toLowerCase() !== q && !out.includes(n)) out.push(n); });
    });
    return out.slice(0, 4);
  }
  const REFLECTIONS = [
    'Finished a chapter on the bus.',
    'Hard to start, glad I did.',
    'Felt calmer afterwards.',
    'Short one today but it counts.',
    'Did it before work. Good start to the day.',
    'Tried something new.',
    '',
  ];
  const PHOTO_TONES = [['#f6d365', '#fda085'], ['#a1c4fd', '#c2e9fb'], ['#d4fc79', '#96e6a1'], ['#fbc2eb', '#a6c1ee'], ['#ffecd2', '#fcb69f'], ['#84fab0', '#8fd3f4']];

  // Mix two #rrggbb colours: t = 0 keeps a, t = 1 gives b.
  function mix(a, b, t) {
    const n = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [n(a), n(b)];
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  // How each habit stage draws a flower: head tilt (deg), stem bend and droop, and colour shift.
  const STAGE_LOOK = {
    healthy: { tilt: 0, bend: 0, drop: 0, toward: null, t: 0, stem: '#4f8a3a', leaf: '#5f9e45', fallen: 0 },
    wilting: { tilt: 80, bend: 10, drop: 5, toward: '#7a4a2e', t: 0.42, stem: '#8a7742', leaf: '#a2884e', fallen: 2 },
    withered: { tilt: 98, bend: 11, drop: 7, toward: '#3a2214', t: 0.86, stem: '#5c4628', leaf: '#6b5432', fallen: 4 },
    dead: { tilt: 125, bend: 11, drop: 8, toward: '#b4b4b4', t: 1, stem: '#a8a8a8', leaf: '#bdbdbd', fallen: 3 },
  };
  function flowerSVG(id, stage = 'healthy') {
    const f = FLOWERS.find((x) => x.id === id) || FLOWERS[0];
    const look = STAGE_LOOK[stage] || STAGE_LOOK.healthy;
    const tone = (c) => (look.toward ? mix(c, look.toward, look.t) : c);
    const petal = tone(f.petal), center = f.center && tone(f.center);
    const cx = 32, cy = 24;
    let head = '';
    if (f.shape === 'tulip') {
      head = `<path d="M20 12 L26 21 L32 10 L38 21 L44 12 C47 28 41 36 32 36 C23 36 17 28 20 12Z" fill="${petal}"/>`;
    } else if (f.shape === 'spike') {
      for (let i = 0; i < 6; i++) {
        const y = 8 + i * 4.6, rx = 2.6 + i * 0.35;
        head += `<ellipse cx="${cx - 3.2}" cy="${y}" rx="${rx}" ry="3.2" fill="${petal}"/><ellipse cx="${cx + 3.2}" cy="${y + 2.2}" rx="${rx}" ry="3.2" fill="${petal}"/>`;
      }
    } else {
      const thin = f.shape === 'thin', r = thin ? 11 : 9;
      const stroke = f.stroke ? ` stroke="${tone(f.stroke)}" stroke-width="1"` : '';
      for (let i = 0; i < f.petals; i++) {
        head += `<ellipse cx="${cx}" cy="${cy - r}" rx="${thin ? 3.6 : 8}" ry="${thin ? 9 : 10}" fill="${petal}"${stroke} transform="rotate(${(360 / f.petals) * i} ${cx} ${cy})"/>`;
      }
      head += `<circle cx="${cx}" cy="${cy}" r="${thin ? 7 : 5.5}" fill="${center}"/>`;
    }
    const stemTop = f.shape === 'spike' ? 34 : 30;
    const { tilt, bend, drop } = look;
    const tipX = cx + bend, tipY = stemTop + drop;
    const stem = `<path d="M32 62 C32 50 ${32 + bend * 0.2} ${stemTop + 8} ${tipX} ${tipY}" fill="none" stroke="${look.stem}" stroke-width="3" stroke-linecap="round"/><path d="M32 52 C24 50 20 44 19 ${40 + drop} C26 ${41 + drop} 31 45 32 52Z" fill="${look.leaf}"/>`;
    const step = look.fallen > 3 ? 9 : 13;
    const fallen = Array.from({ length: look.fallen }, (_, i) => `<ellipse cx="${14 + i * step}" cy="${61 - (i % 2)}" rx="3.4" ry="1.6" fill="${petal}" transform="rotate(${i % 2 ? 18 : -14} ${14 + i * step} 61)"/>`).join('');
    const headG = tilt || bend ? `<g transform="translate(${bend} ${drop}) rotate(${tilt} 32 ${stemTop})">${head}</g>` : head;
    // Shift a drooping flower left so its bent head stays inside the frame.
    const shift = -Math.round(bend * 0.6 + tilt / 14);
    return `<svg class="flower" viewBox="0 0 64 64" overflow="visible" aria-hidden="true"><g transform="translate(${shift} 0)">${stem}${headG}</g>${fallen}</svg>`;
  }
  // A just-planted habit with no snaps yet.
  const sproutSVG = () => '<svg class="flower" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 62 V44" stroke="#4f8a3a" stroke-width="3" stroke-linecap="round"/><path d="M32 48 C26 47 22 42 21 37 C27 38 31 42 32 48Z" fill="#5f9e45"/><path d="M32 46 C38 45 42 40 43 35 C37 36 33 40 32 46Z" fill="#6fb04f"/></svg>';
  function placeholderPhoto(seed) {
    const [a, b] = pick(PHOTO_TONES, seed);
    const x = 60 + Math.floor(hash(seed + 'x') * 180), y = 80 + Math.floor(hash(seed + 'y') * 160);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="300" height="400" fill="url(#g)"/><circle cx="${x}" cy="${y}" r="70" fill="#fff" opacity=".35"/><rect x="40" y="250" width="220" height="110" rx="18" fill="#fff" opacity=".25"/></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  const photoSrc = (e) => e.photo || placeholderPhoto(e.seed || e.id);

  // ─── State ───
  function seedState() {
    const t = realToday();
    const start = addDays(t, -28);
    const mk = (id, name, days, time, flower) => ({ id, name, days, time, reminder: false, flower, created: start, deletedOn: null });
    const habits = [
      mk('h-read', 'Read 10 pages', [0, 1, 2, 3, 4, 5, 6], '21:30', 'tulip'),
      mk('h-swim', 'Swim 30 minutes', [1, 3], '07:00', 'cornflower'),
      mk('h-stretch', 'Stretch 10 minutes', [0, 1, 2, 3, 4], '08:00', 'lavender'),
    ];
    // Skipped scheduled days, counted back from the most recent one (0 = last scheduled day).
    // Read: one skip that recovered. Swim: last session skipped (Wilting).
    // Stretch: an older run of 3 skips reset the streak (grey flowers), then 2 recent skips (Withered).
    const skips = { 'h-read': [8], 'h-swim': [0], 'h-stretch': [0, 1, 9, 10, 11] };
    const entries = [];
    habits.forEach((h) => {
      const sched = [];
      for (let d = start; d < t; d = addDays(d, 1)) if (h.days.includes(dow(d))) sched.push(d);
      sched.forEach((d, j) => {
        if (skips[h.id].includes(sched.length - 1 - j)) return;
        entries.push({ id: `seed-${h.id}-${d}`, date: d, habitId: h.id, flower: h.flower, photo: null, seed: h.id + d, reflection: pick(REFLECTIONS, h.id + d), ts: 0 });
      });
    });
    return { v: 3, dayOffset: 0, habits, entries, settings: { permission: 'default', fired: {} }, fakeCamera: false };
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.v === 3) return s; }
    } catch (_) { /* storage unavailable: run in memory */ }
    return seedState();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); return true; }
    catch (_) { toast('Storage is full. Reset demo data to free space.'); return false; }
  }

  let S = load();
  const UI = { tab: 'today', stack: [], sheet: null, gardenView: 'garden', calHabit: null, calPage: 0, planted: null };

  // ─── Habit rules (per habit, scheduled days only) ───
  // Record: +1 streak (once per day), all flowers back to Healthy.
  // Skip a scheduled day: Healthy → Wilting → Withered → streak resets and flowers turn grey.
  const activeHabits = () => S.habits.filter((h) => !h.deletedOn);
  const habitById = (id) => S.habits.find((h) => h.id === id);
  const isScheduled = (h, d) => h.days.includes(dow(d));
  const habitDates = (h) => new Set(S.entries.filter((e) => e.habitId === h.id).map((e) => e.date));

  function habitState(h) {
    const t = today();
    // A deleted habit stops changing on the day it was deleted.
    const end = h.deletedOn && h.deletedOn < t ? h.deletedOn : t;
    const rec = habitDates(h);
    const base = { stage: 'new', streak: 0, resetAt: null, first: null, recordedToday: rec.has(t), dueToday: isScheduled(h, t) };
    const first = [...rec].filter((d) => d <= end).sort()[0];
    if (!first) return base;
    let stage = 'healthy', streak = 0, resetAt = null, skippedOn = null;
    for (let d = first; d <= end; d = addDays(d, 1)) {
      if (rec.has(d)) { streak++; stage = 'healthy'; continue; }
      if (d === end || !isScheduled(h, d) || stage === 'reset') continue;
      skippedOn = d;
      if (stage === 'healthy') stage = 'wilting';
      else if (stage === 'wilting') stage = 'withered';
      else { stage = 'reset'; streak = 0; resetAt = d; }
    }
    return { ...base, stage, streak, resetAt, first, skippedOn };
  }
  // The look of one flower: grey if planted before the habit's last reset, else the habit's stage.
  function flowerStage(e, st) {
    if (st.resetAt && e.date < st.resetAt) return 'dried';
    return st.stage === 'wilting' || st.stage === 'withered' ? st.stage : 'healthy';
  }
  const entriesOn = (d, hid) => S.entries.filter((e) => e.date === d && (!hid || e.habitId === hid)).sort((a, b) => a.ts - b.ts);

  // ─── Small UI helpers ───
  let toastTimer = null, bannerTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
  }
  function banner({ title, body, go }) {
    const el = $('#banner');
    el.innerHTML = `<span class="app-icon">${flowerSVG('daisy')}</span><span class="body"><span class="row-between"><strong>${esc(title)}</strong><span class="meta">now</span></span><span>${esc(body)}</span></span>`;
    el.hidden = false;
    el.onclick = () => { el.hidden = true; if (go) go(); };
    el.setAttribute('role', 'button');
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { el.hidden = true; }, 6000);
  }
  const habitIcon = (h) => `<span class="habit-icon" aria-hidden="true">${flowerSVG(h.flower)}</span>`;
  const navHead = (title, right = '') =>
    `<div class="nav-head"><button class="btn-icon outline" data-action="back" aria-label="Back"><i class="ti ti-chevron-left"></i></button><div class="title">${esc(title)}</div><div class="right">${right}</div></div>`;
  function scheduleText(h) {
    const d = [...h.days].sort();
    if (d.length === 7) return 'Every day';
    if (d.join() === '0,1,2,3,4') return 'Weekdays';
    if (d.join() === '5,6') return 'Weekends';
    return d.map((i) => DAY_SHORT[i]).join(', ');
  }

  const STAGE_CHIP = { new: 'Not started', healthy: 'Healthy', wilting: 'Wilting', withered: 'Withered', reset: 'Streak reset' };
  const stageChip = (st) => `<span class="chip ${st.stage}"><span class="dot"></span>${STAGE_CHIP[st.stage]}</span>`;
  function stageMsg(h, st) {
    const skipped = st.skippedOn ? fmtDay(st.skippedOn, { weekday: 'long' }) : '';
    if (st.recordedToday) return 'Done today. Its flowers are healthy.';
    switch (st.stage) {
      case 'new': return st.dueToday ? 'Snap it today to plant your first flower.' : `Starts on your next scheduled day (${scheduleText(h)}).`;
      case 'wilting': return `Skipped ${skipped}, so its flowers are wilting. Snap it once to bring them back.`;
      case 'withered': return 'Withered. Skip the next scheduled day and this streak resets.';
      case 'reset': return 'Streak reset. Older flowers stay grey. Snap it to start fresh.';
      default: return st.dueToday ? 'Due today.' : 'Rest day. Nothing wilts today.';
    }
  }

  // ─── Screens ───
  function screenToday() {
    const t = today();
    const hs = activeHabits();
    const due = hs.filter((h) => isScheduled(h, t));
    const done = due.filter((h) => habitState(h).recordedToday).length;
    const cards = hs.map((h) => {
      const st = habitState(h);
      const look = { new: 'new', healthy: 'healthy', wilting: 'wilting', withered: 'withered', reset: 'dead' }[st.stage];
      const badge = st.recordedToday ? '<span class="plot-badge done"><i class="ti ti-check"></i></span>'
        : look === 'withered' ? '<svg class="plot-alert" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 3.5 21 19H3Z" fill="var(--danger)" stroke="var(--danger)" stroke-width="5" stroke-linejoin="round"/><rect x="10.8" y="7.5" width="2.4" height="7" rx="1.2" fill="#fff"/><circle cx="12" cy="17.4" r="1.4" fill="#fff"/></svg>' : '';
      return `<div class="card habit-card is-${look}">
        <button class="habit-main tappable" data-action="edit-habit" data-id="${h.id}" aria-label="Edit ${esc(h.name)}, ${esc(STAGE_CHIP[st.stage])}">
          <span class="plot" aria-hidden="true">${look === 'new' ? sproutSVG() : flowerSVG(h.flower, look)}${badge}</span>
          <div class="grow">
            <div class="h3">${esc(h.name)}</div>
            <div class="xs muted">${esc(scheduleText(h))}${h.reminder ? ` · <i class="ti ti-bell" aria-label="Reminder"></i> ${esc(fmtTime(h.time))}` : ''}</div>
            <div class="habit-meta">${stageChip(st)}</div>
          </div>
          <div class="habit-streak"><div class="n">${st.streak}</div><div class="xs muted">streak</div></div>
        </button>
        <div class="habit-foot"><span class="xs muted grow">${esc(stageMsg(h, st))}</span>
          ${st.recordedToday ? '' : `<button class="btn-icon outline" data-action="snap-habit" data-id="${h.id}" aria-label="Snap ${esc(h.name)}"><i class="ti ti-camera"></i></button>`}</div>
      </div>`;
    }).join('');
    return `<div class="scroll">
      <header class="top"><p class="eyebrow">${esc(fmtDay(t))}</p><h1 class="h1">Today</h1>
        <p class="small muted" style="margin-top:6px">${due.length ? `${done} of ${due.length} scheduled habits done` : 'No habits scheduled today. Nothing will wilt.'}</p></header>
      ${hs.length ? `<div class="stack-3">${cards}</div>
        <button class="btn btn-primary btn-block" style="margin-top:20px" data-action="snap"><i class="ti ti-camera"></i>Snap a habit</button>
        <button class="btn btn-secondary btn-block" style="margin-top:12px" data-action="new-habit"><i class="ti ti-plus"></i>New habit</button>`
        : `<div class="empty"><div class="flowers">${flowerSVG('tulip')}${flowerSVG('sunflower')}${flowerSVG('cornflower')}</div>
          <div class="stack-2"><h2 class="h2">Plant your first habit</h2><p class="small muted">Pick a habit, the days you'll do it and a flower. Each time you snap it, a flower grows.</p></div>
          <button class="btn btn-primary btn-block" data-action="new-habit">New habit</button></div>`}
    </div>`;
  }

  function screenGarden() {
    const seg = (id, label) => `<button data-action="garden-view" data-v="${id}" aria-pressed="${UI.gardenView === id}">${label}</button>`;
    return `<div class="scroll">
      <header class="top"><h1 class="h1">Garden</h1></header>
      <div class="segmented" role="group" aria-label="Garden view">${seg('garden', 'Garden')}${seg('calendar', 'Calendar')}</div>
      ${UI.gardenView === 'garden' ? gardenMeadow() : gardenCalendar()}
    </div>`;
  }

  function gardenMeadow() {
    const states = {};
    S.habits.forEach((h) => { states[h.id] = habitState(h); });
    const es = [...S.entries].filter((e) => e.date <= today()).sort((a, b) => (a.date === b.date ? a.ts - b.ts : a.date < b.date ? -1 : 1));
    if (!es.length) {
      return `<div class="empty"><div class="flowers">${flowerSVG('daisy')}</div><p class="small muted">Your garden is empty. Snap a habit to plant the first flower.</p></div>`;
    }
    const blooms = es.map((e) => {
      const h = habitById(e.habitId);
      const fs = flowerStage(e, states[e.habitId]);
      const lift = Math.round(hash(e.id) * 10);
      return `<button class="bloom st-${fs}${UI.planted === e.id ? ' planted' : ''}" style="--lift:${lift}px" data-action="day" data-date="${e.date}" data-habit="${e.habitId}"
        aria-label="${esc(`${h ? h.name : 'Habit'}, ${fmtDay(e.date, { month: 'short', day: 'numeric' })}, ${fs === 'dried' ? 'grey after a reset' : fs}`)}">${flowerSVG(e.flower)}</button>`;
    }).join('');
    const legend = S.habits.filter((h) => S.entries.some((e) => e.habitId === h.id)).map((h) => {
      const st = states[h.id];
      const n = S.entries.filter((e) => e.habitId === h.id).length;
      return `<div class="list-row">${habitIcon(h)}<div class="grow"><div class="h3">${esc(h.name)}</div><div class="xs muted">${n} flower${n === 1 ? '' : 's'}${h.deletedOn ? ' · Habit deleted' : ''}</div></div>${h.deletedOn ? '' : stageChip(st)}</div>`;
    }).join('');
    return `<section class="section">
        <div class="garden-bed meadow" aria-label="All flowers, oldest first">${blooms}</div>
        <p class="xs muted" style="margin-top:8px">One flower for every snap, oldest first. Tap a flower to see its photo.</p>
      </section>
      <section class="section"><h2 class="h2 section-head">Habits in this garden</h2><div class="card">${legend}</div></section>`;
  }

  function gardenCalendar() {
    const hs = activeHabits();
    if (!hs.length) return '<div class="empty"><p class="small muted">Create a habit to see its calendar.</p></div>';
    if (!habitById(UI.calHabit) || habitById(UI.calHabit).deletedOn) UI.calHabit = hs[0].id;
    const h = habitById(UI.calHabit);
    const st = habitState(h);
    const rec = habitDates(h);
    const t = today();
    const end = addDays(t, 6 - dow(t) - UI.calPage * 35);
    const start = addDays(end, -34);
    let cells = '';
    for (let i = 0; i < 35; i++) {
      const d = addDays(start, i);
      const n = parseKey(d).getDate();
      if (d > t) { cells += `<div class="tile future" aria-hidden="true"><span class="tile-date">${n}</span></div>`; continue; }
      let cls = 'tile', inner = `<span class="tile-date">${n}</span>`, label = fmtDay(d, { weekday: 'short', month: 'short', day: 'numeric' });
      const sched = isScheduled(h, d);
      if (rec.has(d)) {
        const e = entriesOn(d, h.id)[0];
        cls += ` st-${flowerStage(e, st)}`;
        inner = flowerSVG(e.flower);
        label += ', recorded';
      } else if (d === t) {
        label += sched ? ', due today' : ', not scheduled';
        if (!sched) cls += ' rest';
      } else if (sched && st.first && d > st.first) {
        cls += ' missed';
        inner = `<span class="tile-date">${n}</span><span class="soil"></span>`;
        label += ', skipped';
      } else {
        cls += sched ? ' blank' : ' rest';
        label += sched ? '' : ', not scheduled';
      }
      if (d === t) cls += ' today';
      cells += `<button class="${cls}" data-action="day" data-date="${d}" data-habit="${h.id}" aria-label="${esc(label)}">${inner}</button>`;
    }
    const chips = hs.map((x) => `<button class="chip habit-chip" data-action="cal-habit" data-id="${x.id}" aria-pressed="${x.id === h.id}"><span class="mini">${flowerSVG(x.flower)}</span>${esc(x.name)}</button>`).join('');
    return `<div class="habit-chips">${chips}</div>
      <section class="card-raised" style="margin-top:16px">
        <div class="streak-card"><div><div class="streak-num">${st.streak}</div><div class="streak-label">${esc(h.name)} streak</div></div><div style="margin-left:auto">${stageChip(st)}</div></div>
        <p class="garden-msg">${esc(stageMsg(h, st))}</p>
      </section>
      <section class="section">
        <div class="row-between section-head">
          <div><h2 class="h2">${esc(scheduleText(h))}</h2><p class="xs muted" style="margin-top:4px">${esc(`${fmtShort(start)} – ${fmtShort(end)}`)}</p></div>
          <div class="row" style="gap:8px">
            <button class="btn-icon outline" data-action="cal-page" data-dir="1" aria-label="Earlier weeks"><i class="ti ti-chevron-left"></i></button>
            <button class="btn-icon outline" data-action="cal-page" data-dir="-1" aria-label="Later weeks" ${UI.calPage === 0 ? 'disabled' : ''}><i class="ti ti-chevron-right"></i></button>
          </div>
        </div>
        <div class="garden-bed"><div class="weekdays" aria-hidden="true">${'MTWTFSS'.split('').map((c) => `<span>${c}</span>`).join('')}</div><div class="garden">${cells}</div></div>
        <div class="legend"><span><span class="sw">${flowerSVG(h.flower)}</span>Recorded</span><span><span class="sw"><span class="soil"></span></span>Skipped</span><span><span class="sw rest"></span>Not scheduled</span></div>
      </section>`;
  }

  function screenSettings() {
    const s = S.settings;
    const hs = activeHabits();
    const deleted = S.habits.length - hs.length;
    const permText = { default: 'Not asked yet. You\'ll be asked when you turn on a reminder.', granted: 'Allowed', denied: 'Blocked. Turn notifications on in your phone\'s Settings to get reminders.' }[s.permission];
    const rows = hs.map((h) => `<div class="list-row">${habitIcon(h)}<div class="grow"><div class="h3">${esc(h.name)}</div><div class="xs muted">${esc(scheduleText(h))}</div></div>
        <input class="time-input" type="time" data-change="habit-time" data-id="${h.id}" value="${esc(h.time)}" ${h.reminder ? '' : 'disabled'} aria-label="Reminder time for ${esc(h.name)}">
        <label class="switch"><input type="checkbox" data-change="habit-reminder" data-id="${h.id}" ${h.reminder ? 'checked' : ''} aria-label="Reminder for ${esc(h.name)}"><span class="knob"></span></label></div>`).join('');
    return `<div class="scroll"><header class="top"><h1 class="h1">Settings</h1></header>
      <section><h2 class="h2 section-head">Reminders</h2>
        <p class="xs muted" style="margin:-4px 0 12px">Each habit reminds you at its own time, only on its scheduled days.</p>
        <div class="card">${rows || '<p class="small muted">No habits yet.</p>'}
          <p class="xs ${s.permission === 'denied' ? 'notice' : 'muted'}" style="margin-top:12px">Notifications: ${esc(permText)}</p></div></section>
      <section class="section"><h2 class="h2 section-head">Habits</h2><div class="card">
        ${hs.map((h) => `<button class="list-row tappable plain-row" data-action="edit-habit" data-id="${h.id}">${habitIcon(h)}<div class="grow"><div class="h3">${esc(h.name)}</div><div class="xs muted">${esc(flowerName(h.flower))} · ${esc(scheduleText(h))}</div></div><i class="ti ti-chevron-right muted"></i></button>`).join('')}
        <button class="btn btn-secondary btn-block" style="margin-top:12px" data-action="new-habit"><i class="ti ti-plus"></i>New habit</button>
        ${deleted ? `<p class="xs muted" style="margin-top:12px">${deleted} deleted habit${deleted === 1 ? '' : 's'}. Their flowers, photos and reflections are still in your garden.</p>` : ''}
      </div></section>
    </div>`;
  }

  function screenHabitForm(v) {
    const err = v.err || {};
    const sugg = suggestionsFor(v.title);
    const dayBtns = DAY_SHORT.map((d, i) => `<button type="button" data-action="hf-day" data-d="${i}" aria-pressed="${v.days.includes(i)}" aria-label="${d}">${d[0]}</button>`).join('');
    const blocked = S.settings.permission === 'denied';
    return `${navHead(v.id ? 'Edit habit' : 'New habit')}
      <div class="scroll"><form class="stack-5" data-form="habit" novalidate>
        <label class="field ${err.name ? 'error' : ''}"><span>Name</span>
          <input name="title" data-input="hf-name" maxlength="40" autocomplete="off" placeholder="Try “Read” or “Run”" value="${esc(v.title)}">
          <div class="suggestions" id="hf-suggestions">${suggestionHTML(sugg)}</div>
          ${err.name ? `<div class="field-err">${esc(err.name)}</div>` : ''}</label>
        <div><div class="field-label">Repeats on</div>
          <div class="day-picker" role="group" aria-label="Days of the week">${dayBtns}</div>
          <div class="row" style="gap:8px;margin-top:8px"><button type="button" class="chip" data-action="hf-preset" data-p="all">Every day</button><button type="button" class="chip" data-action="hf-preset" data-p="weekdays">Weekdays</button><button type="button" class="chip" data-action="hf-preset" data-p="weekends">Weekends</button></div>
          ${err.days ? `<div class="field-err">${esc(err.days)}</div>` : '<div class="field-help">Flowers only wilt when you skip one of these days.</div>'}</div>
        <div><div class="field-label">Reminder</div><div class="card" style="padding:4px 16px">
          <div class="list-row"><div class="grow"><div class="h3">Remind me</div><div class="xs muted">On scheduled days only</div></div>
            <label class="switch"><input type="checkbox" data-change="hf-reminder" ${v.reminder ? 'checked' : ''} aria-label="Remind me"><span class="knob"></span></label></div>
          <div class="list-row"><div class="grow"><div class="h3">Time</div></div><input class="time-input" type="time" data-change="hf-time" value="${esc(v.time)}" aria-label="Reminder time"></div>
        </div>${blocked ? '<p class="notice">Notifications are blocked for Snappp. Turn them on in your phone\'s Settings to get reminders.</p>' : ''}</div>
        <div><div class="field-label">Flower</div>
          <div class="flower-picker">${FLOWERS.map((f) => `<button type="button" class="flower-opt" data-action="hf-flower" data-id="${f.id}" aria-pressed="${v.flower === f.id}">${flowerSVG(f.id)}${esc(f.name)}</button>`).join('')}</div>
          <div class="field-help">${v.id ? 'New snaps grow this flower. Flowers already planted keep their look.' : 'Every snap of this habit plants one of these.'}</div></div>
        <button class="btn btn-primary btn-block" type="submit">${v.id ? 'Save changes' : 'Create habit'}</button>
        ${v.id ? '<button type="button" class="btn btn-ghost btn-block btn-danger-text" data-action="hf-delete"><i class="ti ti-trash"></i>Delete habit</button>' : ''}
      </form></div>`;
  }
  const suggestionHTML = (list) => list.map((n) => `<button type="button" class="chip" data-action="hf-suggest" data-name="${esc(n)}">${esc(n)}</button>`).join('');

  function screenCapture(v) {
    const h = habitById(v.habitId);
    return `<div class="camera" id="cam-wrap">
      ${S.fakeCamera ? '<canvas class="viewfinder" id="fakecam" width="540" height="720"></canvas>' : '<video id="cam" playsinline muted autoplay></video>'}
      <div class="cam-top"><button class="btn-icon" data-action="back" aria-label="Close camera"><i class="ti ti-x"></i></button><span class="cam-label">${esc(h ? h.name : '')}</span><span style="width:36px"></span></div>
      <div class="cam-error" id="cam-error" hidden></div>
      <div class="cam-bottom" id="cam-bottom"><button class="shutter" data-action="shutter" aria-label="Take photo" disabled></button><p class="cam-hint">Live photos only. Uploads from your library aren't allowed.</p></div>
    </div>`;
  }
  function screenReview(v) {
    const h = habitById(v.habitId);
    return `${navHead('New entry', '')}
      <div class="scroll"><div class="stack-4">
        <img class="photo tall" src="${v.photo}" alt="Photo you just took">
        <div class="row">${habitIcon(h)}<div><div class="h3">${esc(h.name)}</div><div class="xs muted">${esc(fmtDay(today()))} · plants a ${esc(flowerName(h.flower).toLowerCase())}</div></div></div>
        <label class="field"><span>Reflection <span class="muted" style="font-weight:500">(optional)</span></span><textarea id="reflection" rows="3" maxlength="280" placeholder="How did it go?"></textarea></label>
        <button class="btn btn-primary btn-block" data-action="save-entry">Save to today</button>
        <button class="btn btn-ghost btn-block" data-action="retake">Retake photo</button>
      </div></div>`;
  }

  // ─── Sheets ───
  function sheetHTML() {
    const sh = UI.sheet;
    if (!sh) return '';
    if (sh.type === 'permission') {
      return `<div class="scrim center"><div class="alert" role="alertdialog" aria-label="Notification permission"><div class="body"><div class="h3">“Snappp” would like to send you notifications</div><p class="xs">Notifications may include alerts, sounds and icon badges.</p></div>
        <div class="actions"><button data-action="perm" data-v="denied">Don't allow</button><button data-action="perm" data-v="granted">Allow</button></div></div></div>`;
    }
    let body = '';
    if (sh.type === 'pick-habit') {
      const t = today();
      const hs = [...activeHabits()].sort((a, b) => Number(isScheduled(b, t)) - Number(isScheduled(a, t)));
      body = `<div class="sheet-head"><h2 class="h2">Which habit?</h2></div>${hs.map((h) => {
        const st = habitState(h);
        const note = st.recordedToday ? 'Snapped today. Another snap plants another flower.' : isScheduled(h, t) ? 'Due today' : 'Not scheduled today. You can still snap it.';
        return `<button class="list-row tappable plain-row" data-action="choose-habit" data-id="${h.id}">${habitIcon(h)}<div class="grow"><div class="h3">${esc(h.name)}</div><div class="xs muted">${esc(note)}</div></div><i class="ti ti-camera"></i></button>`;
      }).join('')}`;
    } else if (sh.type === 'day') {
      const d = sh.date, h = sh.habitId ? habitById(sh.habitId) : null, es = entriesOn(d, sh.habitId), isToday = d === today();
      const items = es.map((e) => {
        const eh = habitById(e.habitId) || { name: 'Habit' };
        const editing = sh.editing === e.id;
        const fs = flowerStage(e, habitState(eh));
        return `<div class="stack-3" style="margin-bottom:24px"><img class="photo" src="${photoSrc(e)}" alt="Your photo for ${esc(eh.name)}">
          <div class="row-between"><div class="row" style="gap:8px"><span class="mini st-${fs}">${flowerSVG(e.flower)}</span><div class="h3">${esc(eh.name)}</div></div>${fs === 'dried' ? '<span class="badge-soft">Before reset</span>' : eh.deletedOn ? '<span class="badge-soft">Deleted habit</span>' : ''}</div>
          ${editing
            ? `<label class="field"><textarea id="edit-ref" rows="3" maxlength="280" aria-label="Reflection">${esc(e.reflection)}</textarea></label><div class="row"><button class="btn btn-dark" data-action="save-ref" data-id="${e.id}">Save</button><button class="btn btn-ghost" data-action="cancel-ref">Cancel</button></div>`
            : `<p class="small ${e.reflection ? '' : 'muted'}">${e.reflection ? esc(e.reflection) : 'No reflection'}</p><button class="btn btn-secondary" data-action="edit-ref" data-id="${e.id}"><i class="ti ti-pencil"></i>${e.reflection ? 'Edit reflection' : 'Add reflection'}</button>`}
        </div>`;
      }).join('');
      let empty = '<p class="small muted">No entry on this day.</p>';
      if (h && !isScheduled(h, d)) empty = `<p class="small muted">${esc(h.name)} isn't scheduled on ${esc(fmtDay(d, { weekday: 'long' }))}s, so nothing wilted.</p>`;
      else if (h && !isToday) empty = `<p class="small muted">${esc(h.name)} was skipped on this day.</p>`;
      if (isToday && h && !h.deletedOn) empty += `<button class="btn btn-primary btn-block" style="margin-top:16px" data-action="snap-habit" data-id="${h.id}"><i class="ti ti-camera"></i>Snap ${esc(h.name)}</button>`;
      body = `<div class="sheet-head"><div><p class="eyebrow">${isToday ? 'Today' : esc(fmtDay(d, { weekday: 'long' }))}</p><h2 class="h2">${esc(fmtDay(d, { month: 'long', day: 'numeric' }))}</h2></div></div>${es.length ? items : empty}`;
    } else if (sh.type === 'reset') {
      body = `<div class="sheet-head"><h2 class="h2">Reset demo data?</h2></div>
        <p class="small muted" style="margin-bottom:20px">Your habits, photos and reflections in this prototype will be cleared and the sample habits will come back.</p>
        <button class="btn btn-dark btn-block" data-action="confirm-reset">Reset demo data</button>
        <button class="btn btn-ghost btn-block" data-action="close-sheet">Cancel</button>`;
    } else if (sh.type === 'delete') {
      const h = habitById(sh.id);
      body = `<div class="sheet-head"><h2 class="h2">Delete ${esc(h.name)}?</h2></div>
        <p class="small muted" style="margin-bottom:20px">You'll stop getting reminders for it and it won't wilt any more. Its flowers, photos and reflections stay in your garden.</p>
        <button class="btn btn-dark btn-block" data-action="confirm-delete" data-id="${h.id}">Delete habit</button>
        <button class="btn btn-ghost btn-block" data-action="close-sheet">Keep it</button>`;
    }
    return `<div class="scrim" data-action="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-handle"></div>${body}</div></div>`;
  }
  function openSheet(sheet) { UI.sheet = sheet; renderSheet(); }
  function closeSheet() { UI.sheet = null; renderSheet(); }
  function renderSheet() { $('#overlay').innerHTML = sheetHTML(); }

  // ─── Render ───
  const view = () => UI.stack[UI.stack.length - 1];
  function render() {
    const v = view();
    const app = $('#app');
    if (v && v.name === 'capture' && $('#cam-wrap')) return;
    $('#device').classList.toggle('dark-status', !!(v && v.name === 'capture'));
    const sc = $('.scroll');
    const keep = sc && v && v.name === 'habitForm' ? sc.scrollTop : null;
    let html = '';
    if (!v) html = { today: screenToday, garden: screenGarden, settings: screenSettings }[UI.tab]();
    else html = { habitForm: screenHabitForm, capture: screenCapture, review: screenReview }[v.name](v);
    const tab = (id, icon, label) => `<button class="tab ${UI.tab === id ? 'active' : ''}" data-action="tab" data-tab="${id}" ${UI.tab === id ? 'aria-current="page"' : ''}><i class="ti ${icon}"></i>${label}</button>`;
    app.innerHTML = html + (!v ? `<nav class="tabbar">${tab('today', 'ti-checklist', 'Today')}${tab('garden', 'ti-plant-2', 'Garden')}${tab('settings', 'ti-settings', 'Settings')}</nav>` : '');
    if (keep !== null && $('.scroll')) $('.scroll').scrollTop = keep;
    if (v && v.name === 'capture') startCamera();
    UI.planted = null;
    renderDemo();
  }
  function rerenderAll() { render(); renderSheet(); }
  function goTab(tab) { stopCamera(); UI.tab = tab; UI.stack = []; closeSheet(); render(); const sc = $('.scroll'); if (sc) sc.scrollTop = 0; }

  function push(v) { UI.stack.push(v); render(); const sc = $('.scroll'); if (sc) sc.scrollTop = 0; }
  function back() {
    const v = UI.stack.pop();
    if (v && v.name === 'capture') stopCamera();
    render();
  }

  // ─── Camera ───
  let stream = null, fakeRaf = null;
  function camError(kind) {
    const copy = {
      denied: ['ti-camera-off', 'Camera access is off', 'Snappp needs your camera to record a habit. Allow camera access in your browser or phone settings, then try again.'],
      missing: ['ti-camera-off', 'No camera found', "We couldn't find a camera on this device. Connect one or switch devices, then try again."],
      capture: ['ti-alert-circle', "Couldn't take the photo", 'Something went wrong while capturing. Try again.'],
      other: ['ti-alert-circle', "Couldn't start the camera", 'The camera may be in use by another app. Close it and try again.'],
    }[kind];
    const el = $('#cam-error');
    if (!el) return;
    el.innerHTML = `<i class="ti ${copy[0]}"></i><h2 class="h2">${copy[1]}</h2><p>${copy[2]}</p>
      <button class="btn btn-primary btn-block" data-action="cam-retry">Try again</button>
      <button class="btn btn-secondary btn-block" data-action="cam-demo">Use demo camera instead</button>`;
    el.hidden = false;
    $('#cam-bottom').hidden = true;
  }
  async function startCamera() {
    const shutter = $('.shutter');
    if (S.fakeCamera) {
      const c = $('#fakecam'), ctx = c.getContext('2d');
      const t0 = performance.now();
      const draw = (now) => {
        const s = (now - t0) / 1000;
        const g = ctx.createLinearGradient(0, 0, c.width, c.height);
        g.addColorStop(0, `hsl(${(s * 20) % 360} 70% 70%)`);
        g.addColorStop(1, `hsl(${(s * 20 + 60) % 360} 70% 55%)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.arc(270 + Math.sin(s) * 120, 300 + Math.cos(s * 0.8) * 100, 110, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(80, 470, 380, 170);
        fakeRaf = requestAnimationFrame(draw);
      };
      fakeRaf = requestAnimationFrame(draw);
      shutter.disabled = false;
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camError('missing'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      const video = $('#cam');
      if (!video) { stopCamera(); return; }
      video.srcObject = stream;
      await video.play().catch(() => {});
      shutter.disabled = false;
    } catch (err) {
      camError(err && err.name === 'NotAllowedError' ? 'denied' : err && (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') ? 'missing' : 'other');
    }
  }
  function stopCamera() {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (fakeRaf) { cancelAnimationFrame(fakeRaf); fakeRaf = null; }
  }
  function capture() {
    const src = S.fakeCamera ? $('#fakecam') : $('#cam');
    const sw = S.fakeCamera ? src.width : src.videoWidth, sh = S.fakeCamera ? src.height : src.videoHeight;
    if (!sw || !sh) { camError('capture'); return; }
    const out = document.createElement('canvas');
    out.width = 540; out.height = 720;
    const target = 3 / 4, ratio = sw / sh;
    let cw = sw, ch = sh;
    if (ratio > target) cw = sh * target; else ch = sw / target;
    out.getContext('2d').drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, out.width, out.height);
    let photo;
    try { photo = out.toDataURL('image/jpeg', 0.72); } catch (_) { camError('capture'); return; }
    const flash = document.createElement('div');
    flash.className = 'flash';
    $('#device').appendChild(flash);
    setTimeout(() => flash.remove(), 320);
    const v = view();
    stopCamera();
    UI.stack.pop();
    $('#app').innerHTML = '';
    push({ name: 'review', habitId: v.habitId, photo });
  }

  // ─── Actions ───
  function startSnap() {
    const hs = activeHabits();
    if (!hs.length) { closeSheet(); openHabitForm(); toast('Create a habit first'); return; }
    if (hs.length === 1) { snapHabit(hs[0].id); return; }
    openSheet({ type: 'pick-habit' });
  }
  function snapHabit(id) { closeSheet(); UI.stack = UI.stack.filter((v) => v.name !== 'capture' && v.name !== 'review'); push({ name: 'capture', habitId: id }); }
  function openHabitForm(id) {
    const h = id && habitById(id);
    push(h ? { name: 'habitForm', id: h.id, title: h.name, days: [...h.days], time: h.time, reminder: h.reminder, flower: h.flower }
      : { name: 'habitForm', id: null, title: '', days: [0, 1, 2, 3, 4, 5, 6], time: '20:00', reminder: false, flower: null });
  }
  function requestPermission(then) {
    if (S.settings.permission === 'granted') { then(true); return; }
    if (S.settings.permission === 'denied') { then(false); return; }
    UI.afterPermission = then;
    openSheet({ type: 'permission' });
  }
  function fireReminders(list) {
    const h = list[0];
    const body = list.length === 1 ? `Time for ${h.name}. Snap it to keep its flowers healthy.` : `${list.length} habits are due: ${list.map((x) => x.name).join(', ')}.`;
    banner({ title: 'Snappp', body, go: () => (list.length === 1 ? (goTab('today'), snapHabit(h.id)) : (goTab('today'), openSheet({ type: 'pick-habit' }))) });
  }
  const dueWithReminder = () => activeHabits().filter((h) => h.reminder && isScheduled(h, today()) && !habitState(h).recordedToday);

  const actions = {
    tab: (el) => { UI.calPage = 0; goTab(el.dataset.tab); },
    back,
    snap: startSnap,
    'snap-habit': (el) => snapHabit(el.dataset.id),
    'choose-habit': (el) => snapHabit(el.dataset.id),
    shutter: capture,
    retake: () => { const v = view(); UI.stack.pop(); push({ name: 'capture', habitId: v.habitId }); },
    'cam-retry': () => { stopCamera(); const v = view(); UI.stack.pop(); $('#app').innerHTML = ''; push(v); },
    'cam-demo': () => { S.fakeCamera = true; save(); actions['cam-retry'](); },
    'save-entry': () => {
      const v = view(), t = today(), h = habitById(v.habitId);
      const before = habitState(h);
      const entry = { id: uid('e'), date: t, habitId: h.id, flower: h.flower, photo: v.photo, reflection: ($('#reflection').value || '').trim(), ts: Date.now() };
      S.entries.push(entry);
      if (!save()) { S.entries.pop(); return; }
      UI.stack = [];
      UI.tab = 'garden';
      UI.gardenView = 'garden';
      UI.planted = entry.id;
      render();
      const sc = $('.scroll'); if (sc) sc.scrollTop = sc.scrollHeight;
      const revived = before.stage === 'wilting' || before.stage === 'withered';
      toast(before.recordedToday ? `Saved. Another ${flowerName(h.flower).toLowerCase()} planted. Your streak already counted today.`
        : revived ? `Saved. ${h.name} is healthy again.`
        : `Saved. A ${flowerName(h.flower).toLowerCase()} was planted for ${h.name}.`);
    },
    'close-sheet': closeSheet,
    scrim: (el, e) => { if (e.target === el) closeSheet(); },
    day: (el) => openSheet({ type: 'day', date: el.dataset.date, habitId: el.dataset.habit || null }),
    'edit-ref': (el) => { UI.sheet.editing = el.dataset.id; renderSheet(); const ta = $('#edit-ref'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } },
    'cancel-ref': () => { UI.sheet.editing = null; renderSheet(); },
    'save-ref': (el) => {
      const e = S.entries.find((x) => x.id === el.dataset.id);
      e.reflection = ($('#edit-ref').value || '').trim();
      save();
      UI.sheet.editing = null;
      renderSheet();
      toast('Reflection saved');
    },
    'garden-view': (el) => { UI.gardenView = el.dataset.v; render(); },
    'cal-habit': (el) => { UI.calHabit = el.dataset.id; UI.calPage = 0; render(); },
    'cal-page': (el) => { UI.calPage = Math.max(0, UI.calPage + Number(el.dataset.dir)); render(); },
    'new-habit': () => openHabitForm(),
    'edit-habit': (el) => openHabitForm(el.dataset.id),
    'hf-day': (el) => { const v = view(), d = Number(el.dataset.d); v.days = v.days.includes(d) ? v.days.filter((x) => x !== d) : [...v.days, d].sort(); if (v.err) v.err.days = null; render(); },
    'hf-preset': (el) => { const v = view(); v.days = { all: [0, 1, 2, 3, 4, 5, 6], weekdays: [0, 1, 2, 3, 4], weekends: [5, 6] }[el.dataset.p]; if (v.err) v.err.days = null; render(); },
    'hf-flower': (el) => { view().flower = el.dataset.id; render(); },
    'hf-suggest': (el) => { const v = view(); v.title = el.dataset.name; if (v.err) v.err.name = null; render(); },
    'hf-delete': () => openSheet({ type: 'delete', id: view().id }),
    'confirm-delete': (el) => {
      const h = habitById(el.dataset.id);
      h.deletedOn = today();
      h.reminder = false;
      save();
      UI.calHabit = null;
      goTab('today');
      toast(`${h.name} deleted. Its flowers stay in your garden.`);
    },
    perm: (el) => {
      S.settings.permission = el.dataset.v;
      save();
      closeSheet();
      const cb = UI.afterPermission;
      UI.afterPermission = null;
      if (cb) cb(el.dataset.v === 'granted');
    },
    // Demo panel
    'demo-next': () => { S.dayOffset += 1; save(); rerenderAll(); toast(`It's now ${fmtDay(today(), { weekday: 'long', month: 'short', day: 'numeric' })}`); },
    'demo-skip3': () => { S.dayOffset += 3; save(); rerenderAll(); toast('Skipped ahead 3 days'); },
    'demo-reminder': () => {
      if (S.settings.permission !== 'granted' || !activeHabits().some((h) => h.reminder)) { toast('Turn on a reminder for a habit first'); return; }
      const list = dueWithReminder();
      if (!list.length) { toast('No reminders due today. They only fire on scheduled days that aren\'t done yet.'); return; }
      fireReminders(list);
    },
    'demo-reset': () => { $('#demo').classList.remove('open'); openSheet({ type: 'reset' }); },
    'confirm-reset': () => {
      stopCamera();
      S = seedState();
      save();
      Object.assign(UI, { tab: 'today', stack: [], sheet: null, gardenView: 'garden', calHabit: null, calPage: 0 });
      rerenderAll();
      toast('Demo data reset');
    },
    'demo-perm': () => { S.settings.permission = 'default'; S.habits.forEach((h) => { h.reminder = false; }); save(); rerenderAll(); toast('Notification permission reset'); },
    'demo-close': () => $('#demo').classList.remove('open'),
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (fn) fn(el, e);
  });
  // Typing in the habit name updates suggestions in place so the field keeps focus.
  document.addEventListener('input', (e) => {
    if (e.target.dataset.input !== 'hf-name') return;
    const v = view();
    v.title = e.target.value;
    $('#hf-suggestions').innerHTML = suggestionHTML(suggestionsFor(v.title));
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    const k = el.dataset && el.dataset.change;
    if (!k) return;
    if (k === 'hf-reminder') {
      const v = view();
      if (!el.checked) { v.reminder = false; return; }
      requestPermission((ok) => { v.reminder = ok; render(); if (!ok) toast('Notifications are blocked'); });
    } else if (k === 'hf-time') {
      view().time = el.value || '20:00';
    } else if (k === 'habit-reminder') {
      const h = habitById(el.dataset.id);
      if (!el.checked) { h.reminder = false; save(); render(); return; }
      requestPermission((ok) => {
        h.reminder = ok;
        save();
        render();
        toast(ok ? `${h.name}: reminder at ${fmtTime(h.time)} on ${scheduleText(h).toLowerCase()}` : 'Notifications are blocked');
      });
    } else if (k === 'habit-time') {
      const h = habitById(el.dataset.id);
      h.time = el.value || '20:00';
      delete S.settings.fired[h.id];
      save();
      render();
      toast(`${h.name} reminder moved to ${fmtTime(h.time)}`);
    } else if (k === 'demo-camera') {
      S.fakeCamera = el.checked;
      save();
    }
  });
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.dataset.form !== 'habit') return;
    e.preventDefault();
    const v = view();
    v.title = (form.elements.title.value || '').trim();
    v.err = {};
    if (!v.title) v.err.name = 'Give your habit a name';
    else if (activeHabits().some((h) => h.id !== v.id && h.name.toLowerCase() === v.title.toLowerCase())) v.err.name = 'You already have a habit with this name';
    if (!v.days.length) v.err.days = 'Pick at least one day';
    if (!v.flower) v.flower = FLOWERS[S.habits.length % FLOWERS.length].id;
    if (v.err.name || v.err.days) { render(); return; }
    const fields = { name: v.title, days: [...v.days].sort(), time: v.time, reminder: v.reminder, flower: v.flower };
    if (v.id) {
      const h = habitById(v.id);
      if (h.time !== fields.time) delete S.settings.fired[h.id];
      Object.assign(h, fields);
    } else {
      S.habits.push({ id: uid('h'), ...fields, created: today(), deletedOn: null });
    }
    save();
    goTab('today');
    toast(v.id ? 'Habit updated' : `${v.title} created${v.reminder ? `. Reminder at ${fmtTime(v.time)}` : ''}`);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && UI.sheet && UI.sheet.type !== 'permission') closeSheet(); });

  // ─── Demo panel ───
  function renderDemo() {
    const rows = activeHabits().map((h) => { const st = habitState(h); return `<li><strong>${esc(h.name)}</strong>: ${esc(STAGE_CHIP[st.stage].toLowerCase())}, streak ${st.streak}${isScheduled(h, today()) ? ', due today' : ''}</li>`; }).join('');
    $('#demo').innerHTML = `
      <div class="row-between"><h2>Demo controls</h2><button class="btn-icon demo-close-btn" data-action="demo-close" aria-label="Close demo controls" style="display:none"><i class="ti ti-x"></i></button></div>
      <p class="xs muted">Not part of the app. Use these to try the PRD rules quickly.</p>
      <div class="group"><div class="group-label">Simulated date</div><div class="date">${esc(fmtDay(today()))}</div>
        <p class="xs muted">${S.dayOffset ? `${S.dayOffset} day${S.dayOffset === 1 ? '' : 's'} ahead of today` : 'Real date'}</p>
        <ul class="xs demo-status">${rows}</ul>
        <button class="btn btn-secondary" data-action="demo-next"><i class="ti ti-player-track-next"></i>Next day</button>
        <button class="btn btn-secondary" data-action="demo-skip3"><i class="ti ti-calendar-off"></i>Skip 3 days</button></div>
      <div class="group"><div class="group-label">Notifications</div>
        <button class="btn btn-secondary" data-action="demo-reminder"><i class="ti ti-bell"></i>Send due reminders now</button>
        <button class="btn btn-secondary" data-action="demo-perm"><i class="ti ti-bell-off"></i>Reset notification permission</button></div>
      <div class="group"><div class="group-label">Device</div>
        <label class="check-row">Demo camera (no webcam needed)<span class="switch"><input type="checkbox" data-change="demo-camera" ${S.fakeCamera ? 'checked' : ''} aria-label="Demo camera"><span class="knob"></span></span></label></div>
      <div class="group"><div class="group-label">Rules in this prototype</div><div class="rules"><ul>
        <li>Each habit has its own days, flower, reminder and streak.</li>
        <li>Every snap plants one flower. Several snaps of a habit in one day add to its streak once.</li>
        <li>Skipping a scheduled day moves that habit Healthy → Wilting → Withered. Skipping while Withered resets its streak and turns its flowers grey.</li>
        <li>One snap brings the habit back to Healthy. Days off never wilt.</li></ul></div></div>
      <div class="group"><button class="btn btn-secondary btn-danger-text" data-action="demo-reset"><i class="ti ti-refresh"></i>Reset demo data</button></div>`;
  }
  $('#demo-fab').addEventListener('click', () => $('#demo').classList.toggle('open'));

  // Shrink the device frame on short desktop windows so the whole phone stays visible.
  function fitDevice() {
    const s = Math.min(1, (window.innerHeight - 72) / 856);
    document.documentElement.style.setProperty('--device-scale', String(Math.max(0.5, s)));
  }
  fitDevice();
  window.addEventListener('resize', fitDevice);

  // ─── Clock and scheduled reminders ───
  function tick() {
    const now = new Date();
    $('#clock').textContent = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, '');
    if (S.settings.permission !== 'granted') return;
    const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const due = dueWithReminder().filter((h) => h.time === hhmm && S.settings.fired[h.id] !== today());
    if (!due.length) return;
    due.forEach((h) => { S.settings.fired[h.id] = today(); });
    save();
    fireReminders(due);
  }
  tick();
  setInterval(tick, 15000);

  render();
})();
