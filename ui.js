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

  // ── Sidebar accordion ────────────────────────────────
  function initSidebarAccordion() {
    const path = location.pathname;
    const section = path.includes('/reading/') ? 'Reading'
      : path.includes('/listening/') ? 'Listening'
      : path.includes('/writing/') ? 'Writing'
      : path.includes('/speaking/') ? 'Speaking'
      : path.includes('roadmap') ? 'Overview'
      : 'Overview';

    document.querySelectorAll('.sidebar-nav .nav-section').forEach(el => {
      const label = el.querySelector('.nav-section-label');
      if (!label) return;
      const labelText = label.textContent.trim();
      const isDisplay = labelText === 'Display';
      if (isDisplay) return;

      const links = el.querySelectorAll('.nav-link');
      const isActive = labelText === section;

      // Wrap links in collapsible div
      const wrap = document.createElement('div');
      wrap.className = 'nav-section-links';
      wrap.style.cssText = isActive
        ? 'overflow:hidden;transition:max-height .25s ease'
        : 'overflow:hidden;max-height:0;transition:max-height .25s ease';
      links.forEach(l => wrap.appendChild(l));
      el.appendChild(wrap);

      // Make label a toggle
      label.style.cssText = 'cursor:pointer;user-select:none;display:flex;justify-content:space-between;align-items:center';
      const arrow = document.createElement('span');
      arrow.className = 'nav-arrow';
      arrow.textContent = isActive ? '▾' : '▸';
      arrow.style.cssText = 'font-size:.7rem;opacity:.6;transition:transform .2s';
      label.appendChild(arrow);

      if (isActive) wrap.style.maxHeight = wrap.scrollHeight + 'px';

      label.addEventListener('click', () => {
        const open = wrap.style.maxHeight && wrap.style.maxHeight !== '0px';
        if (open) {
          wrap.style.maxHeight = '0';
          arrow.textContent = '▸';
        } else {
          wrap.style.maxHeight = wrap.scrollHeight + 'px';
          arrow.textContent = '▾';
        }
      });
    });
  }

  // ── Inject sidebar controls ────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    const mins = getTimerMins();
    // Skip sidebar timer if the page already has its own timer.js widget
    const hasPageTimer = typeof window.TIMER !== 'undefined';
    const timerHtml = isExamPage() && !hasPageTimer ? `
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

  // ── Mobile bottom nav ─────────────────────
  function injectMobileNav() {
    const path = location.pathname;
    const isIndex    = path.endsWith('index.html') || path.endsWith('/english/') || path.endsWith('/english');
    const isRoadmap  = path.includes('roadmap');
    const isRead     = path.includes('/reading/');
    const isListen   = path.includes('/listening/');
    const isWrite    = path.includes('/writing/');
    const root = path.includes('/reading/') || path.includes('/listening/') ||
                 path.includes('/writing/') || path.includes('/speaking/') ||
                 path.includes('/vocabulary/') || path.includes('/grammar/') ? '../' : '';

    const nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.innerHTML = `<div class="mobile-nav-inner">
      <a href="${root}index.html" class="mobile-nav-item ${isIndex?'active':''}"><span>🏠</span><span>Home</span></a>
      <a href="${root}roadmap.html" class="mobile-nav-item ${isRoadmap?'active':''}"><span>🗺️</span><span>Roadmap</span></a>
      <a href="${root}reading/paper1.html" class="mobile-nav-item ${isRead?'active':''}"><span>📖</span><span>Reading</span></a>
      <a href="${root}listening/paper1.html" class="mobile-nav-item ${isListen?'active':''}"><span>🎧</span><span>Listen</span></a>
      <a href="${root}writing/paper1.html" class="mobile-nav-item ${isWrite?'active':''}"><span>✍️</span><span>Writing</span></a>
    </div>`;
    document.body.appendChild(nav);
  }

  // ── Keyboard shortcuts (reading/listening quiz pages) ─────
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      // Ignore when typing in an input
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      const key = e.key;

      // 1/2/3 → select option a/b/c in the next unanswered question
      if (['1','2','3'].includes(key)) {
        const idx = {'1':'a','2':'b','3':'c'}[key];
        const q = document.querySelector('.question:not([data-checked]) .option-btn[data-value="' + idx + '"]');
        if (q) { q.click(); e.preventDefault(); }
      }

      // Enter → click the first visible "Check answers" button
      if (key === 'Enter') {
        const btn = document.querySelector('.check-btn:not(.retry-btn)');
        if (btn) { btn.click(); e.preventDefault(); }
      }
    });
  }

  // ── Sidebar nav badge status ──────────────────────────
  function updateSidebarBadges() {
    function getLocal(pageId) {
      try { return JSON.parse(localStorage.getItem('b2_page_' + pageId)); } catch { return null; }
    }
    function isDone(pageId, d) {
      if (!d) return false;
      if (pageId.startsWith('reading_'))   return !!(d.p1_checked && d.p2_checked && d.p3_checked);
      if (pageId.startsWith('listening_')) return !!(d.p1_checked && d.p4_checked);
      if (pageId.startsWith('writing_'))   return (d.task1?.length > 30) || (d.task2?.length > 30);
      return false;
    }
    function hrefToPageId(href) {
      const m = href.match(/\/(reading|writing|listening|speaking)\/paper(\d+)\.html/);
      return m ? m[1] + '_paper' + m[2] : null;
    }

    document.querySelectorAll('.sidebar-nav .nav-link').forEach(a => {
      const badge = a.querySelector('.badge');
      if (!badge) return;
      const pageId = hrefToPageId(a.getAttribute('href'));
      if (!pageId || pageId.startsWith('speaking_')) return; // speaking has no auto-check
      const d = getLocal(pageId);
      if (isDone(pageId, d)) {
        badge.textContent = '✓ Done';
        badge.className = 'badge done-badge';
      } else if (d && Object.keys(d).length > 0) {
        badge.textContent = '⟳ Started';
        badge.className = 'badge started-badge';
      } else {
        badge.textContent = '—';
        badge.className = 'badge not-started-badge';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectSidebar();
    initSidebarAccordion();
    injectFloatingBtn();
    injectMobileNav();
    updateSidebarBadges();
    if (document.querySelector('.option-btn')) initKeyboardShortcuts();
  });

  return { cycleTheme, adjustFont, toggleTimer, resetTimer, startTimer, pauseTimer, toggleSidebar };
})();
