/* Exam countdown timer — include in listening/reading pages */
window.TIMER = (() => {
  let _interval = null;
  let _el = null;

  function _storageKey() {
    return 'b2_timer_' + location.pathname.replace(/\//g, '_');
  }

  function _format(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function _color(sec, total) {
    const pct = sec / total;
    if (pct > 0.4) return '#16a34a';
    if (pct > 0.15) return '#d97706';
    return '#dc2626';
  }

  function _save(state) {
    try { localStorage.setItem(_storageKey(), JSON.stringify(state)); } catch {}
  }

  function _load() {
    try { return JSON.parse(localStorage.getItem(_storageKey())); } catch { return null; }
  }

  function _tick(state) {
    if (state.remaining <= 0) {
      clearInterval(_interval);
      _render(state, 0);
      _save({...state, running: false, remaining: 0});
      return;
    }
    state.remaining--;
    state.lastTick = Date.now();
    _save(state);
    _render(state, state.totalSec);
  }

  function _render(state, total) {
    if (!_el) return;
    const btn = _el.querySelector('.timer-btn');
    const display = _el.querySelector('.timer-display');
    const sec = state.remaining;
    display.textContent = _format(sec);
    display.style.color = _color(sec, total || state.totalSec);
    if (state.running) {
      btn.textContent = '⏸ Pause';
      btn.dataset.action = 'pause';
    } else if (sec <= 0) {
      btn.textContent = '⏱ Time\'s up!';
      btn.disabled = true;
    } else {
      btn.textContent = sec === state.totalSec ? '▶ Start Timer' : '▶ Resume';
      btn.dataset.action = 'start';
    }
  }

  function init(minutes) {
    const totalSec = minutes * 60;

    // Build timer bar
    _el = document.createElement('div');
    _el.className = 'exam-timer';
    _el.innerHTML = `
      <span class="timer-label">⏱ Exam Timer</span>
      <span class="timer-display">${_format(totalSec)}</span>
      <button class="timer-btn" data-action="start">▶ Start Timer</button>
      <button class="timer-reset" title="Reset">↺</button>
    `;

    // Insert after subtitle
    const subtitle = document.querySelector('.page-subtitle');
    if (subtitle) subtitle.after(_el);
    else document.querySelector('.page-content').prepend(_el);

    // Restore saved state (correcting for time elapsed while tab was closed)
    let state = _load();
    if (state && state.totalSec === totalSec && state.running && state.lastTick) {
      const elapsed = Math.round((Date.now() - state.lastTick) / 1000);
      state.remaining = Math.max(0, state.remaining - elapsed);
      state.lastTick = Date.now();
    } else if (!state || state.totalSec !== totalSec) {
      state = { totalSec, remaining: totalSec, running: false, lastTick: null };
    }
    _save(state);
    _render(state, totalSec);

    if (state.running && state.remaining > 0) {
      _interval = setInterval(() => _tick(state), 1000);
    }

    // Controls
    _el.querySelector('.timer-btn').addEventListener('click', function() {
      if (this.dataset.action === 'start') {
        state.running = true;
        _interval = setInterval(() => _tick(state), 1000);
      } else {
        state.running = false;
        clearInterval(_interval);
        _save(state);
      }
      _render(state, totalSec);
    });

    _el.querySelector('.timer-reset').addEventListener('click', function() {
      clearInterval(_interval);
      state = { totalSec, remaining: totalSec, running: false, lastTick: null };
      _save(state);
      _render(state, totalSec);
    });
  }

  return { init };
})();
