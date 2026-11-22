(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rand = n => Math.floor(Math.random() * n);
  const pick = a => a[rand(a.length)];

  // ---------- 儲存 ----------
  const STORE_KEY = 'typemaster-v1';
  const defaults = () => ({
    lessons: {}, keyStats: {}, best: { 2: 0, 3: 0 }, lesson: 'home',
    opts: { level: 'mix', count: 25, caps: false, punct: false, sentences: 3, showKb: true, drill: 'normal', lang: detectLang() },
  });
  let store = (() => {
    const d = defaults();
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (!s) return d;
      return { ...d, ...s, opts: { ...d.opts, ...(s.opts || {}) }, best: { ...d.best, ...(s.best || {}) } };
    } catch (e) { return d; }
  })();
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ } };

  // ---------- 語言 ----------
  const dict = () => I18N[store.opts.lang] || I18N.en;
  const T = (k, ...a) => {
    let v = dict()[k];
    if (v === undefined) v = I18N.en[k];
    return typeof v === 'function' ? v(...a) : v;
  };
  const fingerName = i => T('fingers')[i];
  const lessonText = l => dict().lessonText?.[l.id] || [l.title, l.desc];

  let stage = 1;
  let heatOn = false;
  let spans = [];
  let timer = null;
  const S = {}; // 目前練習狀態

  // ---------- 鍵盤 ----------
  const charMap = {};
  const codeEl = {};
  const ALL_KEYS = KEY_ROWS.flat();

  function buildKeyboard() {
    const kb = $('#keyboard');
    KEY_ROWS.forEach(row => {
      const r = document.createElement('div');
      r.className = 'kb-row';
      row.forEach(k => {
        const el = document.createElement('div');
        el.className = 'key f' + k.f;
        el.style.setProperty('--w', k.w || 1);
        if (k.label) {
          el.classList.add('special');
          el.innerHTML = `<span class="lbl-special">${k.label}</span>`;
        } else if (/[a-z]/.test(k.b)) {
          el.innerHTML = `<span class="lbl-main">${k.b.toUpperCase()}</span>`;
        } else {
          el.innerHTML = `<span class="lbl-shift">${esc(k.s)}</span><span class="lbl-base">${esc(k.b)}</span>`;
        }
        if (k.bump) el.classList.add('bump');
        r.appendChild(el);
        codeEl[k.code] = el;
        if (k.b) {
          charMap[k.b] = { code: k.code, shift: false, f: k.f, base: k.b };
          charMap[k.s] = { code: k.code, shift: true, f: k.f, base: k.b };
        }
      });
      kb.appendChild(r);
    });
    charMap[' '] = { code: 'Space', shift: false, f: 5, base: ' ' };
  }

  function handSVG(side, small = false) {
    const ids = side === 'L' ? [0, 1, 2, 3, 4] : [9, 8, 7, 6, 5];
    const fingers = [{ x: 10, y: 58, w: 24, h: 74 }, { x: 38, y: 30, w: 26, h: 102 },
                     { x: 68, y: 16, w: 26, h: 116 }, { x: 98, y: 34, w: 26, h: 98 }];
    let inner = '<rect class="palm" x="8" y="104" width="118" height="78" rx="28"/>';
    fingers.forEach((f, i) => {
      inner += `<rect class="finger f${ids[i]}" data-f="${ids[i]}" x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="12"/>`;
    });
    inner += `<rect class="finger f${ids[4]}" data-f="${ids[4]}" x="118" y="120" width="26" height="66" rx="12" transform="rotate(40 131 186)"/>`;
    const g = side === 'L' ? inner : `<g transform="translate(180,0) scale(-1,1)">${inner}</g>`;
    const label = `<div class="hand-label">${side === 'L' ? T('leftHand') : T('rightHand')}</div>`;
    return `<svg class="hand${small ? ' mini' : ''}" viewBox="0 0 180 195">${g}</svg>${label}`;
  }

  function keyLabel(ch) {
    const m = charMap[ch];
    if (!m) return ch;
    return /[a-z]/.test(m.base) ? m.base.toUpperCase() : m.base;
  }

  function fingerText(ch) {
    const m = charMap[ch];
    if (!m) return '';
    if (ch === ' ') return T('hintSpace');
    if (m.shift) {
      const right = m.f < 5;
      const shown = /[A-Z]/.test(ch) ? ch : T('aboveKey', esc(ch), esc(keyLabel(ch)));
      return T('hintShift', shown, fingerName(right ? 9 : 0), T(right ? 'shiftR' : 'shiftL'), fingerName(m.f), esc(keyLabel(ch)));
    }
    return T('hintKey', esc(keyLabel(ch)), fingerName(m.f));
  }

  function highlight(ch) {
    $$('.key.target, .key.target-shift').forEach(e => e.classList.remove('target', 'target-shift'));
    const active = new Set();
    let hint = '';
    if (ch != null && charMap[ch]) {
      const m = charMap[ch];
      codeEl[m.code].classList.add('target');
      if (ch === ' ') { active.add(4); active.add(5); } else active.add(m.f);
      if (m.shift) {
        codeEl[m.f < 5 ? 'ShiftRight' : 'ShiftLeft'].classList.add('target-shift');
        active.add(m.f < 5 ? 9 : 0);
      }
      hint = fingerText(ch);
    } else if (ch == null) {
      hint = T('done');
    }
    $$('.finger').forEach(f => f.classList.toggle('active', active.has(+f.dataset.f)));
    $('#hint').innerHTML = hint;
  }

  function updateFocus(ch) {
    const fk = $('#focus-key'), ff = $('#focus-finger');
    if (ch == null) { fk.className = 'focus-key done'; fk.textContent = '✓'; ff.textContent = T('done'); return; }
    const m = charMap[ch];
    fk.className = 'focus-key' + (m ? ' f' + m.f : '');
    fk.textContent = ch === ' ' ? '␣' : ch;
    if (!m) { ff.textContent = ''; return; }
    if (ch === ' ') ff.textContent = T('thumb');
    else if (m.shift) ff.innerHTML = `${T(m.f < 5 ? 'shiftR' : 'shiftL')} ＋<br>${fingerName(m.f)}`;
    else ff.textContent = fingerName(m.f);
  }

  function applyHeat() {
    const kb = $('#keyboard');
    kb.classList.toggle('heat', heatOn);
    ALL_KEYS.forEach(k => {
      const el = codeEl[k.code];
      if (!k.b) { el.title = ''; return; }
      const a = store.keyStats[k.b] || { t: 0, e: 0 }, b = store.keyStats[k.s] || { t: 0, e: 0 };
      const t = a.t + b.t, e = a.e + b.e, r = t ? e / t : 0;
      el.style.setProperty('--heat', Math.min(1, r * 4).toFixed(2));
      el.title = heatOn ? (t ? T('heatTitle', (r * 100).toFixed(1), t) : T('noData')) : '';
    });
  }

  // ---------- 題目產生 ----------
  function keyWeight(k) {
    const s = store.keyStats[k];
    if (!s || s.t < 3) return 1;
    return 1 + Math.round(Math.min(1, s.e / s.t * 3) * 4);
  }

  // 每回合練習量（隨機字組數量）
  const DRILL_SIZES = { short: 15, normal: 35, long: 60, xl: 100 };

  function genDrill(lesson) {
    const keys = [...lesson.keys], mix = [...(lesson.mix || '')];
    const parts = [];
    const size = DRILL_SIZES[store.opts.drill] || DRILL_SIZES.normal;
    // 暖身：每個新鍵連打幾次
    if (keys.length <= 8) {
      const rep = size >= 35 ? 5 : 3;
      keys.forEach(k => parts.push(k.repeat(rep)));
      // 新鍵兩兩交替（例如 fjfj），熟悉手指切換
      if (keys.length >= 2 && size >= 35) {
        const pairs = Math.min(keys.length * 2, Math.round(size / 5));
        for (let i = 0; i < pairs; i++) {
          const a = keys[i % keys.length];
          let b; do { b = pick(keys); } while (b === a);
          parts.push((a + b).repeat(2));
        }
      }
    }
    const pool = [];
    keys.forEach(k => { const w = keyWeight(k) * 3; for (let i = 0; i < w; i++) pool.push(k); });
    mix.forEach(k => { const w = keyWeight(k); for (let i = 0; i < w; i++) pool.push(k); });
    const n = keys.length > 20 ? Math.round(size * 1.3) : size;
    for (let i = 0; i < n; i++) {
      const len = 3 + rand(3);
      let g = '';
      for (let j = 0; j < len; j++) g += pick(pool);
      parts.push(g);
    }
    return parts.join(' ');
  }

  function genWords() {
    const o = store.opts;
    let pool = WORDS;
    if (o.level === 'short') pool = WORDS.filter(w => w.length <= 4);
    else if (o.level === 'medium') pool = WORDS.filter(w => w.length >= 5 && w.length <= 7);
    else if (o.level === 'long') pool = WORDS.filter(w => w.length >= 8);
    const out = [];
    let prev = '';
    for (let i = 0; i < o.count; i++) {
      let w;
      do { w = pick(pool); } while (w === prev && pool.length > 1);
      prev = w;
      if (o.caps && Math.random() < 0.3) w = w[0].toUpperCase() + w.slice(1);
      if (o.punct && Math.random() < 0.25) w += pick([',', '.', ';', ':', '?', '!']);
      out.push(w);
    }
    return out.join(' ');
  }

  let lastSentences = [];
  function genSentences() {
    const pool = SENTENCES.filter(s => !lastSentences.includes(s));
    const arr = [...pool].sort(() => Math.random() - 0.5).slice(0, store.opts.sentences);
    lastSentences = arr;
    return arr.join(' ');
  }

  // ---------- 練習引擎 ----------
  function startExercise(text, strict) {
    stopTimer();
    Object.assign(S, {
      text, strict, pos: 0, status: new Array(text.length).fill(0), everWrong: new Set(),
      keystrokes: 0, correctKeys: 0, errors: 0, start: null, end: null, done: false, keyStats: {},
    });
    renderText();
    updateCursor();
    updateStats();
    hideModal();
  }

  function renderText() {
    const box = $('#text');
    box.innerHTML = '';
    box.scrollTop = 0;
    box.className = 'text stage' + stage;
    spans = [];
    let word = null;
    for (const c of S.text) {
      const sp = document.createElement('span');
      sp.className = 'ch';
      if (c === ' ') {
        sp.classList.add('sp');
        sp.textContent = ' ';
        box.appendChild(sp);
        word = null;
      } else {
        if (!word) { word = document.createElement('span'); word.className = 'word'; box.appendChild(word); }
        sp.textContent = c;
        word.appendChild(sp);
      }
      spans.push(sp);
    }
  }

  function setStatus(i, st) {
    S.status[i] = st;
    const sp = spans[i];
    sp.classList.remove('ok', 'bad', 'fixed', 'shake');
    if (st === 1) sp.classList.add('ok');
    else if (st === 2) sp.classList.add('bad');
    else if (st === 3) sp.classList.add('fixed');
  }

  function updateCursor() {
    $$('.ch.cur').forEach(e => e.classList.remove('cur'));
    const cur = spans[S.pos];
    if (cur && !S.done) {
      cur.classList.add('cur');
      const box = $('#text');
      const lh = parseFloat(getComputedStyle(box).lineHeight);
      const line = Math.round((cur.offsetTop - spans[0].offsetTop) / lh);
      box.scrollTop = Math.max(0, (line - (stage === 1 ? 0 : 1)) * lh);
    }
    const ch = S.done ? null : S.text[S.pos];
    highlight(ch);
    if (stage === 1) updateFocus(ch);
    $('#progress-bar').style.width = (S.pos / S.text.length * 100) + '%';
  }

  function elapsed() {
    if (!S.start) return 0;
    return ((S.end || performance.now()) - S.start) / 1000;
  }

  function calc() {
    const t = elapsed();
    let correctChars = 0;
    for (let i = 0; i < S.pos; i++) if (S.status[i] === 1 || S.status[i] === 3) correctChars++;
    const wpm = t > 1 ? Math.round(correctChars / 5 / (t / 60)) : 0;
    const acc = S.keystrokes ? Math.round(S.correctKeys / S.keystrokes * 1000) / 10 : 100;
    return { t, wpm, acc, correctChars };
  }

  const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  function updateStats() {
    const r = calc();
    $('#s-wpm').textContent = r.wpm;
    $('#s-acc').textContent = r.acc + '%';
    $('#s-time').textContent = fmtTime(r.t);
    $('#s-prog').textContent = `${S.pos}/${S.text.length}`;
  }

  function startTimer() { stopTimer(); timer = setInterval(updateStats, 250); }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  function typeChar(k) {
    if (!S.start) { S.start = performance.now(); startTimer(); }
    const exp = S.text[S.pos];
    const ks = S.keyStats[exp] || (S.keyStats[exp] = { t: 0, e: 0 });
    ks.t++;
    S.keystrokes++;
    if (k === exp) {
      S.correctKeys++;
      setStatus(S.pos, S.everWrong.has(S.pos) ? 3 : 1);
      S.pos++;
    } else {
      S.errors++;
      ks.e++;
      S.everWrong.add(S.pos);
      if (S.strict) {
        const sp = spans[S.pos];
        sp.classList.remove('shake');
        void sp.offsetWidth;
        sp.classList.add('shake', 'bad');
      } else {
        setStatus(S.pos, 2);
        S.pos++;
      }
    }
    if (S.pos >= S.text.length) { finish(); return; }
    updateCursor();
    updateStats();
  }

  function finish() {
    S.done = true;
    S.end = performance.now();
    stopTimer();
    updateCursor();
    updateStats();
    for (const [c, v] of Object.entries(S.keyStats)) {
      const g = store.keyStats[c] || (store.keyStats[c] = { t: 0, e: 0 });
      g.t += v.t; g.e += v.e;
    }
    const r = calc();
    let passed = null, isBest = false;
    if (stage === 1) {
      passed = r.acc >= 90;
      const rec = store.lessons[store.lesson] || {};
      if (passed) rec.passed = true;
      if (rec.bestAcc == null || r.acc > rec.bestAcc) rec.bestAcc = r.acc;
      if (rec.bestWpm == null || r.wpm > rec.bestWpm) rec.bestWpm = r.wpm;
      store.lessons[store.lesson] = rec;
    } else if (r.acc >= 80 && r.wpm > (store.best[stage] || 0)) {
      store.best[stage] = r.wpm;
      isBest = true;
    }
    save();
    renderSidebar();
    applyHeat();
    showResult(r, passed, isBest);
  }

  // ---------- 結果視窗 ----------
  let modalPrimary = () => {};

  function showResult(r, passed, isBest) {
    const weak = Object.entries(S.keyStats).filter(([, v]) => v.e > 0)
      .sort((a, b) => b[1].e - a[1].e).slice(0, 6);
    let title, msg;
    if (stage === 1) {
      title = T(passed ? 'passTitle' : 'failTitle');
      msg = T(passed ? 'passMsg' : 'failMsg');
    } else {
      title = T(isBest ? 'bestTitle' : 'doneTitle');
      msg = T(r.acc < 90 ? 'msgLowAcc' : r.wpm >= 60 ? 'msg60' : r.wpm >= 40 ? 'msg40' : r.wpm >= 25 ? 'msg25' : 'msgSlow');
    }
    const idx = LESSONS.findIndex(l => l.id === store.lesson);
    const hasNext = stage === 1 && passed && idx < LESSONS.length - 1;
    const primaryLabel = T(stage === 1 ? (hasNext ? 'nextLesson' : 'againLesson') : 'nextSet');
    modalPrimary = () => {
      if (hasNext) { store.lesson = LESSONS[idx + 1].id; save(); renderSidebar(); }
      newExercise();
    };
    $('#modal-card').innerHTML = `
      <h2>${title}</h2>
      <div class="res-grid">
        <div><span class="v">${r.wpm}</span><span class="l">${T('wpm')}</span></div>
        <div><span class="v">${r.acc}%</span><span class="l">${T('acc')}</span></div>
        <div><span class="v">${fmtTime(r.t)}</span><span class="l">${T('time')}</span></div>
        <div><span class="v">${S.errors}</span><span class="l">${T('errors')}</span></div>
      </div>
      <p class="res-msg">${msg}</p>
      ${weak.length ? `<div class="weak"><span>${T('needWork')}</span>${weak.map(([c, v]) =>
        `<span class="weak-key"><kbd>${c === ' ' ? T('spaceShort') : esc(c)}</kbd><small>${T('times', v.e)}</small></span>`).join('')}</div>` : `<div class="weak perfect">${T('perfect')}</div>`}
      <div class="modal-actions">
        <button class="btn" id="m-retry">${T('retry')} <kbd>Esc</kbd></button>
        <button class="btn primary" id="m-next">${primaryLabel} <kbd>Enter</kbd></button>
      </div>`;
    $('#m-retry').onclick = retrySame;
    $('#m-next').onclick = () => modalPrimary();
    $('#modal').classList.remove('hidden');
  }

  function hideModal() { $('#modal').classList.add('hidden'); }
  const modalOpen = () => !$('#modal').classList.contains('hidden');

  // ---------- 側欄 ----------
  const chips = (opt, items) => `<div class="chips" data-opt="${opt}">${items.map(([v, label]) =>
    `<button class="chip ${String(store.opts[opt]) === String(v) ? 'on' : ''}" data-v="${v}">${label}</button>`).join('')}</div>`;
  const toggleChip = (key, label) => `<button class="chip ${store.opts[key] ? 'on' : ''}" data-toggle="${key}">${store.opts[key] ? '✓ ' : ''}${label}</button>`;

  function renderSidebar() {
    const sb = $('#sidebar');
    if (stage === 1) {
      const passedN = LESSONS.filter(l => store.lessons[l.id]?.passed).length;
      sb.innerHTML = `
        <details class="side-section posture" ${passedN < 2 ? 'open' : ''}>
          <summary>${T('posture')}</summary>
          <ul>${T('postureTips').map(t => `<li>${t}</li>`).join('')}</ul>
        </details>
        <div class="side-section"><h3>${T('drillAmount')}</h3>
          ${chips('drill', ['short', 'normal', 'long', 'xl'].map(k => [k, T('drillOpts')[k]]))}</div>
        <div class="side-section">
          <h3>${T('lessons')} <span class="muted">${T('passedN', passedN, LESSONS.length)}</span></h3>
          <ol class="lessons">${LESSONS.map((l, i) => {
            const rec = store.lessons[l.id];
            return `<li class="lesson ${l.id === store.lesson ? 'active' : ''} ${rec?.passed ? 'passed' : ''}" data-lesson="${l.id}">
              <span class="num">${rec?.passed ? '✓' : i + 1}</span>
              <span class="lt">${esc(lessonText(l)[0])}</span>
              ${rec ? `<span class="badge">${rec.bestAcc}%</span>` : ''}
            </li>`;
          }).join('')}</ol>
        </div>
        <button class="btn small ghost" data-act="reset">${T('reset')}</button>`;
    } else if (stage === 2) {
      sb.innerHTML = `
        <div class="side-section"><h3>${T('wordLen')}</h3>
          ${chips('level', ['short', 'medium', 'long', 'mix'].map(k => [k, T('lvl')[k]]))}</div>
        <div class="side-section"><h3>${T('wordCount')}</h3>
          ${chips('count', [25, 50, 100].map(n => [n, T('countN', n)]))}</div>
        <div class="side-section"><h3>${T('advanced')}</h3>
          <div class="chips">${toggleChip('caps', T('capsFirst'))}${toggleChip('punct', T('punct'))}</div></div>
        <button class="btn primary block" data-act="new">${T('newSet')}</button>
        <div class="best">${T('best')}<b>${store.best[2] || 0}</b>WPM</div>
        <div class="side-section tips"><h3>${T('tips')}</h3><ul>
          ${T('tips2').map(t => `<li>${t}</li>`).join('')}
        </ul></div>`;
    } else {
      sb.innerHTML = `
        <div class="side-section"><h3>${T('sentCount')}</h3>
          ${chips('sentences', [1, 3, 5, 8].map(n => [n, T('sentN', n)]))}</div>
        <button class="btn primary block" data-act="new">${T('newSentences')}</button>
        <div class="best">${T('best')}<b>${store.best[3] || 0}</b>WPM</div>
        <div class="side-section tips"><h3>${T('tips')}</h3><ul>
          ${T('tips3').map(t => `<li>${t}</li>`).join('')}
        </ul></div>`;
    }
  }

  function renderHeader() {
    if (stage === 1) {
      const l = LESSONS.find(x => x.id === store.lesson) || LESSONS[0];
      const i = LESSONS.indexOf(l) + 1;
      const [title, desc] = lessonText(l);
      $('#ex-title').textContent = T('lessonHead', i, title);
      $('#ex-desc').textContent = desc;
    } else if (stage === 2) {
      $('#ex-title').textContent = T('s2Title');
      $('#ex-desc').textContent = T('s2Desc');
    } else {
      $('#ex-title').textContent = T('s3Title');
      $('#ex-desc').textContent = T('s3Desc');
    }
  }

  function newExercise() {
    renderHeader();
    if (stage === 1) {
      const l = LESSONS.find(x => x.id === store.lesson) || LESSONS[0];
      store.lesson = l.id;
      startExercise(genDrill(l), true);
    } else if (stage === 2) startExercise(genWords(), false);
    else startExercise(genSentences(), false);
  }

  function retrySame() { startExercise(S.text, S.strict); }

  function setStage(n) {
    stage = n;
    document.body.dataset.stage = n;
    $$('.tab').forEach(t => t.classList.toggle('active', +t.dataset.stage === n));
    renderSidebar();
    newExercise();
  }

  // ---------- 警告 ----------
  const warns = {}; // 存放字串的 key，切換語言時可重新翻譯
  function renderWarn() {
    const m = Object.values(warns).map(k => T(k));
    $('#warn').textContent = m.join('　｜　');
    $('#warn').classList.toggle('show', m.length > 0);
  }
  function setWarn(k, key) {
    if (key) warns[k] = key; else delete warns[k];
    renderWarn();
  }
  function checkCaps(e) {
    if (e.getModifierState) setWarn('caps', e.getModifierState('CapsLock') ? 'warnCaps' : null);
  }

  // ---------- 事件 ----------
  document.addEventListener('keydown', e => {
    const el = codeEl[e.code];
    if (el) el.classList.add('pressed');
    checkCaps(e);

    if (modalOpen()) {
      if (e.key === 'Enter') { e.preventDefault(); modalPrimary(); }
      else if (e.key === 'Escape') { e.preventDefault(); retrySame(); }
      else if (e.key === ' ') e.preventDefault();
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); retrySame(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.isComposing || e.key === 'Process' || e.keyCode === 229) {
      setWarn('ime', 'warnIme');
      return;
    }
    if (e.key === 'Tab') { e.preventDefault(); return; }
    if (S.done) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (!S.strict && S.pos > 0) { S.pos--; setStatus(S.pos, 0); updateCursor(); updateStats(); }
      return;
    }
    if (e.key.length !== 1) return;
    e.preventDefault();
    setWarn('ime', null);
    typeChar(e.key);
  });

  document.addEventListener('keyup', e => {
    const el = codeEl[e.code];
    if (el) el.classList.remove('pressed');
    checkCaps(e);
  });

  window.addEventListener('blur', () => $$('.key.pressed').forEach(k => k.classList.remove('pressed')));

  // 點擊後移除焦點，避免空白鍵觸發按鈕
  document.addEventListener('click', () => setTimeout(() => {
    const a = document.activeElement;
    if (a && a !== document.body && a.blur) a.blur();
  }, 0));

  $$('.tab').forEach(t => t.addEventListener('click', () => setStage(+t.dataset.stage)));

  $('#sidebar').addEventListener('click', e => {
    const t = e.target.closest('button, li[data-lesson]');
    if (!t) return;
    if (t.dataset.lesson) {
      store.lesson = t.dataset.lesson; save(); renderSidebar(); newExercise();
    } else if (t.dataset.v != null) {
      const opt = t.parentElement.dataset.opt;
      store.opts[opt] = /^\d+$/.test(t.dataset.v) ? +t.dataset.v : t.dataset.v;
      save(); renderSidebar(); newExercise();
    } else if (t.dataset.toggle) {
      store.opts[t.dataset.toggle] = !store.opts[t.dataset.toggle];
      save(); renderSidebar(); newExercise();
    } else if (t.dataset.act === 'new') {
      newExercise();
    } else if (t.dataset.act === 'reset') {
      if (confirm(T('confirmReset'))) {
        const { showKb, lang } = store.opts;
        store = defaults(); Object.assign(store.opts, { showKb, lang }); save();
        renderSidebar(); applyHeat(); newExercise();
      }
    }
  });

  function applyKbToggle() {
    document.body.classList.toggle('no-kb', !store.opts.showKb);
    $('#toggle-kb').classList.toggle('on', store.opts.showKb);
  }
  $('#toggle-kb').addEventListener('click', () => { store.opts.showKb = !store.opts.showKb; save(); applyKbToggle(); });
  $('#toggle-heat').addEventListener('click', () => {
    heatOn = !heatOn;
    $('#toggle-heat').classList.toggle('on', heatOn);
    applyHeat();
  });

  // ---------- 介面語言 ----------
  function buildHands() {
    $('#hand-L').innerHTML = handSVG('L');
    $('#hand-R').innerHTML = handSVG('R');
    $('#focus-hands').innerHTML = `<div class="mini-hand">${handSVG('L', true)}</div><div class="mini-hand">${handSVG('R', true)}</div>`;
  }

  function applyStaticText() {
    const lang = I18N[store.opts.lang] ? store.opts.lang : 'en';
    document.documentElement.lang = lang;
    document.title = T('appTitle');
    $$('[data-i18n]').forEach(el => { el.textContent = T(el.dataset.i18n); });
    $$('[data-i18n-html]').forEach(el => { el.innerHTML = T(el.dataset.i18nHtml); });
    $$('[data-i18n-title]').forEach(el => { el.title = T(el.dataset.i18nTitle); });
    $$('.lang-btn').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
  }

  function setLang(lang) {
    store.opts.lang = lang;
    save();
    applyStaticText();
    buildHands();
    renderSidebar();
    renderHeader();
    renderWarn();
    applyHeat();
    if (S.text) {
      if (modalOpen()) newExercise(); // 結果視窗直接換新一組，避免殘留舊語言
      else updateCursor();
    }
  }

  const langSwitch = $('#lang-switch');
  LANG_LIST.forEach(([code, label]) => {
    const b = document.createElement('button');
    b.className = 'lang-btn';
    b.dataset.lang = code;
    b.textContent = label;
    b.addEventListener('click', () => setLang(code));
    langSwitch.appendChild(b);
  });

  // ---------- 初始化 ----------
  buildKeyboard();
  buildHands();
  applyStaticText();
  applyKbToggle();
  applyHeat();
  setStage(1);
})();
