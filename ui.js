// ui.js — shared UI: theme toggle, font size, exam timer

// Apply stored theme immediately (before DOMContentLoaded) to prevent flash
(function () {
  const t = localStorage.getItem('b2_theme');
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
  const f = parseInt(localStorage.getItem('b2_font') || '16');
  document.documentElement.style.fontSize = f + 'px';
})();

window.UI = (() => {
  // ── Font size ──────────────────────────────────────────
  let fontSize = parseInt(localStorage.getItem('b2_font') || '16');

  function applyFont() {
    document.documentElement.style.fontSize = fontSize + 'px';
  }

  function adjustFont(delta) {
    fontSize = Math.max(12, Math.min(22, fontSize + delta));
    localStorage.setItem('b2_font', fontSize);
    applyFont();
  }

  // ── Theme ──────────────────────────────────────────────
  function getTheme() { return localStorage.getItem('b2_theme') || 'auto'; }

  function applyTheme(t) {
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
  }

  function cycleTheme() {
    const order = ['auto', 'dark', 'light'];
    const next = order[(order.indexOf(getTheme()) + 1) % 3];
    localStorage.setItem('b2_theme', next);
    applyTheme(next);
    updateThemeBtn();
  }

  function updateThemeBtn() {
    const btn = document.getElementById('ui-theme-btn');
    if (!btn) return;
    const t = getTheme();
    btn.textContent = t === 'dark' ? '☀️ Light' : t === 'light' ? '🔄 Auto' : '🌙 Dark';
    btn.title = t === 'dark' ? 'Switch to light mode' : t === 'light' ? 'Switch to auto (system)' : 'Switch to dark mode';
  }

  // ── Exam timer ────────────────────────────────────────
  let timerInterval = null;
  let timerSeconds = 0;
  let timerRunning = false;
  const READING_MINS = 65;
  const WRITING_MINS = 65;

  function isReadingPage() { return location.pathname.includes('/reading/'); }
  function isWritingPage() { return location.pathname.includes('/writing/'); }
  function isExamPage()    { return isReadingPage() || isWritingPage(); }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  function tickTimer() {
    if (!timerRunning) return;
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      updateTimerDisplay();
      playBeep();
      if (confirm('⏰ Time is up! Would you like to reset the timer?')) resetTimer();
    }
  }

  function startTimer() {
    if (timerRunning) return;
    if (timerSeconds <= 0) timerSeconds = (isWritingPage() ? WRITING_MINS : READING_MINS) * 60;
    timerRunning = true;
    timerInterval = setInterval(tickTimer, 1000);
    updateTimerDisplay();
  }

  function pauseTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    updateTimerDisplay();
  }

  function resetTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    timerSeconds = (isWritingPage() ? WRITING_MINS : READING_MINS) * 60;
    updateTimerDisplay();
  }

  function toggleTimer() {
    if (timerRunning) pauseTimer(); else startTimer();
  }

  function updateTimerDisplay() {
    const display = document.getElementById('ui-timer-display');
    const btn = document.getElementById('ui-timer-btn');
    if (!display || !btn) return;
    const s = timerSeconds > 0 ? timerSeconds : (isWritingPage() ? WRITING_MINS : READING_MINS) * 60;
    display.textContent = formatTime(s);
    const urgent = timerSeconds > 0 && timerSeconds <= 300; // last 5 min
    display.style.color = urgent ? 'var(--err)' : 'var(--sb-text)';
    btn.textContent = timerRunning ? '⏸ Pause' : timerSeconds > 0 && timerSeconds < (isWritingPage() ? WRITING_MINS : READING_MINS) * 60 ? '▶ Resume' : '▶ Start';
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  // ── Inject sidebar controls ────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    const mins = isWritingPage() ? WRITING_MINS : READING_MINS;
    const timerHtml = isExamPage() ? `
      <div class="ui-timer-block">
        <div id="ui-timer-display" class="ui-timer-display">${String(mins).padStart(2,'0')}:00</div>
        <div class="ui-timer-row">
          <button class="ui-btn" id="ui-timer-btn" onclick="UI.toggleTimer()">▶ Start</button>
          <button class="ui-btn ui-btn-ghost" onclick="UI.resetTimer()">↺ Reset</button>
        </div>
      </div>` : '';

    const section = document.createElement('div');
    section.className = 'nav-section';
    section.innerHTML = `
      <span class="nav-section-label">Display</span>
      ${timerHtml}
      <div class="ui-row">
        <button class="ui-btn" id="ui-theme-btn" onclick="UI.cycleTheme()" title="Toggle theme"></button>
        <div class="ui-font-group">
          <button class="ui-btn ui-btn-ghost" onclick="UI.adjustFont(-1)" title="Decrease font size">A−</button>
          <button class="ui-btn ui-btn-ghost" onclick="UI.adjustFont(1)" title="Increase font size">A+</button>
        </div>
      </div>`;
    nav.appendChild(section);
    updateThemeBtn();
  }

  document.addEventListener('DOMContentLoaded', injectSidebar);

  return { cycleTheme, adjustFont, toggleTimer, resetTimer, startTimer, pauseTimer };
})();
