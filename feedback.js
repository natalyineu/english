// feedback.js — motivating sounds, confetti, and per-part celebration

window.FB = (() => {
  let _ctx;
  function ctx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    return _ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.28) {
    try {
      const c = ctx();
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.connect(g); g.connect(c.destination);
      osc.type = type; osc.frequency.value = freq;
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      osc.start(); osc.stop(c.currentTime + dur);
    } catch {}
  }

  function playCorrect() {
    tone(880, 0.1); setTimeout(() => tone(1108, 0.12), 70);
  }
  function playWrong() {
    tone(200, 0.18, 'sawtooth', 0.12);
  }
  function playPartDone(pct) {
    if (pct === 100) {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22), i * 75));
    } else if (pct >= 67) {
      [659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.18), i * 85));
    } else {
      tone(440, 0.15);
    }
  }

  // ── Confetti ──────────────────────────────────────────────
  function confetti(n = 90) {
    const colors = ['#7c3aed','#a78bfa','#fbbf24','#34d399','#f472b6','#60a5fa','#fb923c'];
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      const size = 6 + Math.random() * 8;
      el.style.cssText = [
        'position:fixed', 'top:-14px', `left:${Math.random()*100}vw`,
        `width:${size}px`, `height:${size}px`,
        `background:${colors[i % colors.length]}`,
        `border-radius:${Math.random() > .5 ? '50%' : '2px'}`,
        'pointer-events:none', 'z-index:9999',
        `animation:confettiFall ${1.4 + Math.random()*1.8}s ease-in forwards`,
        `animation-delay:${Math.random()*.7}s`,
      ].join(';');
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3200);
    }
  }

  // ── Motivating banner per part ────────────────────────────
  function motivate(score, total, slotId) {
    const pct = Math.round(score / total * 100);
    let emoji, msg, bg, border, textColor;

    if (pct === 100) {
      emoji = '🏆'; msg = `Perfect ${score}/${total}! Incredible — you nailed every single one!`;
      bg = '#d1fae5'; border = '#059669'; textColor = '#065f46';
      confetti(); playPartDone(100);
    } else if (pct >= 83) {
      emoji = '🌟'; msg = `Excellent! ${score}/${total} — only ${total - score} away from perfect!`;
      bg = '#ede9fe'; border = '#7c3aed'; textColor = '#5b21b6';
      playPartDone(83);
    } else if (pct >= 67) {
      emoji = '💪'; msg = `Great work! ${score}/${total} — solid B2 level performance!`;
      bg = '#dbeafe'; border = '#2563eb'; textColor = '#1e40af';
      playPartDone(67);
    } else if (pct >= 50) {
      emoji = '📈'; msg = `${score}/${total} — above halfway! Review the red ones and try again.`;
      bg = '#fef3c7'; border = '#d97706'; textColor = '#92400e';
      playPartDone(50);
    } else {
      emoji = '🎯'; msg = `${score}/${total} — great practice! Use ↺ Reset to try again.`;
      bg = '#fee2e2'; border = '#dc2626'; textColor = '#991b1b';
      playPartDone(0);
    }

    // Remove old
    const old = document.getElementById('fb-' + slotId);
    if (old) old.remove();

    const div = document.createElement('div');
    div.id = 'fb-' + slotId;
    div.style.cssText = [
      'margin-top:12px', `background:${bg}`, `border:1.5px solid ${border}`,
      'border-radius:10px', 'padding:13px 18px',
      'display:flex', 'align-items:center', 'gap:12px',
      'animation:bounceIn .4s ease',
    ].join(';');
    div.innerHTML = `<span style="font-size:1.6rem;flex-shrink:0">${emoji}</span>
      <div style="font-weight:600;color:${textColor};font-size:.92rem;line-height:1.4">${msg}</div>`;
    return div;
  }

  // ── Grand total summary ───────────────────────────────────
  function grandSummary(score, max, passContrib) {
    // passContrib = marks needed from this section to proportionally pass (e.g. 13 for reading)
    const pct = Math.round(score / max * 100);
    const above = score - passContrib;
    let emoji, msg;

    if (pct === 100) {
      emoji = '🏆🎉'; msg = `Perfect ${score}/${max}! You're ${above} marks above the pass threshold — outstanding!`;
    } else if (above >= 5) {
      emoji = '🌟'; msg = `${score}/${max} — that's ${pct}%! You're <strong>${above} marks above</strong> what you need. Well done!`;
    } else if (above >= 0) {
      emoji = '✅'; msg = `${score}/${max} — ${pct}%. You're passing! ${above > 0 ? above + ' marks above threshold.' : 'Right on the pass mark — push for more!'}`;
    } else {
      emoji = '💪'; msg = `${score}/${max} — ${pct}%. Only ${-above} more marks needed to contribute a passing share. Keep practising!`;
    }

    const old = document.getElementById('fb-grand');
    if (old) old.remove();

    const div = document.createElement('div');
    div.id = 'fb-grand';
    div.style.cssText = [
      'margin-top:16px',
      'background:linear-gradient(135deg,#ede9fe,#dbeafe)',
      'border:1.5px solid #7c3aed',
      'border-radius:12px', 'padding:16px 20px',
      'display:flex', 'align-items:center', 'gap:14px',
      'animation:bounceIn .5s ease',
    ].join(';');
    div.innerHTML = `<span style="font-size:2rem;flex-shrink:0">${emoji}</span>
      <div style="font-size:.95rem;color:#312e81;line-height:1.5">${msg}</div>`;
    return div;
  }

  // ── Retry wrong answers ───────────────────────────────────
  function retryWrong(partEl) {
    let count = 0;
    // MC questions
    partEl.querySelectorAll('.question[data-checked]').forEach(q => {
      const hasWrong = q.querySelector('.option-btn.wrong');
      if (hasWrong) {
        delete q.dataset.checked;
        q.querySelectorAll('.option-btn').forEach(btn => {
          btn.classList.remove('selected','correct','wrong');
          btn.disabled = false;
        });
        count++;
      }
    });
    // Gap-fill selects
    partEl.querySelectorAll('.gap-select.wrong, select.wrong').forEach(sel => {
      sel.classList.remove('correct','wrong');
      sel.value = '';
      count++;
    });
    // Gap inputs
    partEl.querySelectorAll('.gf-input.wrong').forEach(inp => {
      inp.classList.remove('correct','wrong');
      inp.value = '';
      count++;
    });
    // Matching selects
    partEl.querySelectorAll('select.wrong, .match-select.wrong').forEach(sel => {
      sel.classList.remove('correct','wrong');
      sel.value = '';
      count++;
    });
    if (count === 0) {
      tone(880, 0.1);
    } else {
      tone(660, 0.12);
      setTimeout(() => tone(880, 0.1), 100);
    }
    return count;
  }

  // Auto-inject retry button when a part-score becomes visible
  document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          const score = node.classList && node.classList.contains('part-score') && node.classList.contains('visible')
            ? node : node.querySelector && node.querySelector('.part-score.visible');
          if (!score) return;
          const partEl = score.closest('.quiz-part');
          if (!partEl || partEl.querySelector('.retry-btn')) return;
          const btn = document.createElement('button');
          btn.className = 'retry-btn check-btn';
          btn.style.cssText = 'background:#f59e0b;border-color:#d97706;margin-top:6px;font-size:.8rem;padding:7px 14px';
          btn.textContent = '🔁 Retry wrong answers';
          btn.onclick = () => {
            const n = retryWrong(partEl);
            btn.textContent = n > 0 ? `🔁 Reset ${n} wrong — try again!` : '✅ No wrong answers to reset';
            setTimeout(() => { btn.textContent = '🔁 Retry wrong answers'; }, 2000);
          };
          score.after(btn);
        });
        // Also catch class changes on existing elements
        if (m.type === 'attributes' && m.target.classList.contains('part-score') && m.target.classList.contains('visible')) {
          const partEl = m.target.closest('.quiz-part');
          if (partEl && !partEl.querySelector('.retry-btn')) {
            const btn = document.createElement('button');
            btn.className = 'retry-btn check-btn';
            btn.style.cssText = 'background:#f59e0b;border-color:#d97706;margin-top:6px;font-size:.8rem;padding:7px 14px';
            btn.textContent = '🔁 Retry wrong answers';
            btn.onclick = () => {
              const n = retryWrong(partEl);
              btn.textContent = n > 0 ? `🔁 Reset ${n} wrong — try again!` : '✅ No wrong answers to reset';
              setTimeout(() => { btn.textContent = '🔁 Retry wrong answers'; }, 2000);
            };
            m.target.after(btn);
          }
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });

  // ── Score history ─────────────────────────────────────────
  function saveHistory(pageId, score, max) {
    const key = 'b2_hist_' + pageId;
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    arr.push({ d: new Date().toISOString().slice(0,10), s: score, m: max });
    if (arr.length > 10) arr = arr.slice(-10);
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function renderHistory(pageId, containerEl) {
    const key = 'b2_hist_' + pageId;
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    if (arr.length < 2) return;
    const wrap = document.createElement('div');
    wrap.className = 'score-history';
    wrap.innerHTML = '<div class="score-history-label">📈 Your last ' + arr.length + ' attempts</div><div class="history-dots" id="hist-dots"></div>';
    containerEl.appendChild(wrap);
    const dots = wrap.querySelector('#hist-dots');
    arr.forEach(function(e) {
      const pct = Math.round(e.s / e.m * 100);
      const h = Math.max(4, Math.round(pct * 32 / 100));
      const d = document.createElement('div');
      d.className = 'history-dot';
      d.title = e.d + ': ' + e.s + '/' + e.m + ' (' + pct + '%)';
      d.innerHTML = '<div class="history-dot-bar" style="height:' + h + 'px;opacity:' + (0.4 + pct/200) + '"></div><div class="history-dot-label">' + pct + '%</div>';
      dots.appendChild(d);
    });
  }

  return { playCorrect, playWrong, motivate, grandSummary, confetti, retryWrong, saveHistory, renderHistory };
})();
