// ui.js — shared UI: theme toggle, font size, exam timer, sidebar collapse

// Apply stored theme + font immediately (prevents flash)
(function () {
  const t = localStorage.getItem('b2_theme');
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
  const f = parseInt(localStorage.getItem('b2_font') || '16');
  document.documentElement.style.fontSize = f + 'px';
  if (localStorage.getItem('b2_sidebar') === 'collapsed') {
    document.documentElement.classList.add('sidebar-collapsed');
  }
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
    btn.title = t === 'dark' ? 'Switch to light' : t === 'light' ? 'Switch to auto' : 'Switch to dark';
  }

  // ── Sidebar collapse / focus mode ─────────────────────
  function isSidebarCollapsed() {
    return document.documentElement.classList.contains('sidebar-collapsed');
  }

  function toggleSidebar() {
    const collapsed = isSidebarCollapsed();
    document.documentElement.classList.toggle('sidebar-collapsed', !collapsed);
    localStorage.setItem('b2_sidebar', !collapsed ? 'collapsed' : 'open');
    updateCollapseBtn();
  }

  function updateCollapseBtn() {
    const btn = document.getElementById('ui-collapse-btn');
    if (!btn) return;
    btn.textContent = isSidebarCollapsed() ? '→ Show menu' : '← Focus mode';
    btn.title = isSidebarCollapsed() ? 'Show sidebar' : 'Hide sidebar for focus';
  }

  // ── Exam timer ────────────────────────────────────────
  let timerInterval = null;
  let timerSeconds = 0;
  let timerRunning = false;
  const READING_MINS = 65;
  const WRITING_MINS = 65;
  const LISTENING_MINS = 30;

  function isReadingPage()   { return location.pathname.includes('/reading/'); }
  function isWritingPage()   { return location.pathname.includes('/writing/'); }
  function isListeningPage() { return location.pathname.includes('/listening/'); }
  function isExamPage()      { return isReadingPage() || isWritingPage() || isListeningPage(); }

  function getTimerMins() {
    if (isListeningPage()) return LISTENING_MINS;
    if (isWritingPage()) return WRITING_MINS;
    return READING_MINS;
  }

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
      if (confirm('⏰ Time is up! Reset the timer?')) resetTimer();
    }
  }

  function startTimer() {
    if (timerRunning) return;
    if (timerSeconds <= 0) timerSeconds = getTimerMins() * 60;
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
    timerSeconds = getTimerMins() * 60;
    updateTimerDisplay();
  }

  function toggleTimer() {
    if (timerRunning) pauseTimer(); else startTimer();
  }

  function updateTimerDisplay() {
    const display = document.getElementById('ui-timer-display');
    const btn = document.getElementById('ui-timer-btn');
    if (!display || !btn) return;
    const s = timerSeconds > 0 ? timerSeconds : getTimerMins() * 60;
    display.textContent = formatTime(s);
    const urgent = timerSeconds > 0 && timerSeconds <= 300;
    display.style.color = urgent ? '#fca5a5' : '';
    btn.textContent = timerRunning ? '⏸ Pause' : timerSeconds > 0 && timerSeconds < getTimerMins() * 60 ? '▶ Resume' : '▶ Start';
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

    const mins = getTimerMins();
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
          <button class="ui-btn ui-btn-ghost" onclick="UI.adjustFont(-1)" title="Smaller text">A−</button>
          <button class="ui-btn ui-btn-ghost" onclick="UI.adjustFont(1)" title="Larger text">A+</button>
        </div>
      </div>
      <div style="padding: 8px 20px 4px">
        <button class="ui-btn ui-focus-btn" id="ui-collapse-btn" onclick="UI.toggleSidebar()"></button>
      </div>`;
    nav.appendChild(section);
    updateThemeBtn();
    updateCollapseBtn();
  }

  // Floating "show menu" button when sidebar is collapsed
  function injectFloatingBtn() {
    const fab = document.createElement('button');
    fab.id = 'ui-fab';
    fab.className = 'ui-fab';
    fab.onclick = () => UI.toggleSidebar();
    fab.title = 'Show menu';
    fab.textContent = '☰';
    document.body.appendChild(fab);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectSidebar();
    injectFloatingBtn();
  });

  return { cycleTheme, adjustFont, toggleTimer, resetTimer, startTimer, pauseTimer, toggleSidebar };
})();
