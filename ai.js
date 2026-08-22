// ai.js — AI writing feedback via Groq (free tier, user-supplied key)

window.AI = (() => {
  const API_URL   = 'https://api.groq.com/openai/v1/chat/completions';
  const KEY_STORE = 'b2_groq_key';
  const MODELS    = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'llama-3.1-8b-instant'];
  let   modelIdx  = 0;

  function getKey() {
    return localStorage.getItem(KEY_STORE) || '';
  }

  function saveKey(k) {
    localStorage.setItem(KEY_STORE, k.trim());
  }

  function clearKey() {
    localStorage.removeItem(KEY_STORE);
    modelIdx = 0;
  }

  const SYSTEM_PROMPT = `You are an experienced LanguageCert B2 Communicator examiner.
You assess writing tasks against the official B2 criteria:
1. Communicative Achievement (0-5): Does the text achieve its purpose? Appropriate register and format?
2. Content (0-5): Is the task fully addressed? Relevant ideas developed?
3. Organisation (0-5): Logical structure, cohesion, paragraphing?
4. Language (0-5): Range and accuracy of vocabulary and grammar?

For each criterion give a score out of 5, a one-sentence justification, and one specific improvement tip.
Then give a total out of 20 and an overall band descriptor (Below B2 / B2 / Above B2).
End with 2-3 specific sentences the candidate could rewrite to improve.

Reply in this exact JSON format:
{
  "criteria": {
    "communicative": {"score": 4, "comment": "...", "tip": "..."},
    "content":       {"score": 3, "comment": "...", "tip": "..."},
    "organisation":  {"score": 4, "comment": "...", "tip": "..."},
    "language":      {"score": 3, "comment": "...", "tip": "..."}
  },
  "total": 14,
  "band": "B2",
  "rewrites": ["original sentence → improved version", "original → improved"]
}`;

  async function checkEssay(taskText, essayText, resultEl) {
    const apiKey = getKey();
    if (!apiKey) {
      renderKeyPrompt(resultEl, () => checkEssay(taskText, essayText, resultEl));
      return;
    }

    resultEl.innerHTML = '<div class="ai-loading">⏳ Checking your writing…</div>';
    resultEl.style.display = 'block';

    const userMsg = `WRITING TASK:\n${taskText}\n\nCANDIDATE'S RESPONSE:\n${essayText}`;

    // Try each model in order until one works
    for (let i = modelIdx; i < MODELS.length; i++) {
      try {
        const resp = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            model: MODELS[i],
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user',   content: userMsg },
            ],
            max_tokens: 800,
            temperature: 0.3,
          }),
        });

        if (resp.status === 401) {
          clearKey();
          renderKeyPrompt(resultEl, () => checkEssay(taskText, essayText, resultEl), 'Invalid API key. Please enter a valid Groq key.');
          return;
        }
        if (resp.status === 404) { modelIdx = i + 1; continue; } // try next model
        if (!resp.ok) {
          const err = await resp.text();
          throw new Error('API error ' + resp.status + ': ' + err.slice(0, 200));
        }

        modelIdx = i; // remember the working model
        const data = await resp.json();
        const raw  = data.choices[0].message.content.trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Could not parse AI response');
        renderResult(JSON.parse(jsonMatch[0]), resultEl);
        return;
      } catch (e) {
        if (i === MODELS.length - 1) {
          resultEl.innerHTML = `<div class="ai-error">❌ ${e.message}</div>`;
        }
      }
    }
    if (modelIdx >= MODELS.length) {
      resultEl.innerHTML = '<div class="ai-error">❌ No available model found. Please try again later.</div>';
    }
  }

  function renderKeyPrompt(el, onSuccess, msg) {
    el.style.display = 'block';
    el.innerHTML = `
      <div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:20px 22px">
        <div style="font-size:.85rem;font-weight:700;color:var(--text);margin-bottom:6px">🔑 Groq API Key required</div>
        <div style="font-size:.78rem;color:var(--muted);margin-bottom:12px;line-height:1.6">
          ${msg || 'This checker uses the <a href="https://console.groq.com/keys" target="_blank" style="color:var(--indigo)">Groq free API</a> — add your key once and it stays in your browser only (never sent to any server except Groq).'}
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="ai-key-input" type="password" placeholder="gsk_…"
            style="flex:1;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-family:monospace;font-size:.85rem"
            onkeydown="if(event.key==='Enter')AI._saveKey(this,arguments[0])">
          <button onclick="AI._saveKey(document.getElementById('ai-key-input'))"
            style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-family:inherit;font-size:.85rem;font-weight:600;cursor:pointer;white-space:nowrap">
            Save &amp; check
          </button>
        </div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:8px">
          Get a free key at <a href="https://console.groq.com/keys" target="_blank" style="color:var(--indigo)">console.groq.com/keys</a> · stored only in your browser
        </div>
      </div>`;
    // Store callback so the save handler can call it
    el._onSuccess = onSuccess;
  }

  function renderResult(r, el) {
    const c = r.criteria;
    const total = r.total ?? (c.communicative.score + c.content.score + c.organisation.score + c.language.score);
    const pct   = Math.round(total / 20 * 100);
    const bandColor = r.band === 'Above B2' ? '#059669' : r.band === 'B2' ? '#2563eb' : '#dc2626';
    const bandBg    = r.band === 'Above B2' ? '#d1fae5' : r.band === 'B2' ? '#dbeafe' : '#fee2e2';

    const rows = [
      ['Communicative Achievement', c.communicative],
      ['Content',                   c.content],
      ['Organisation',              c.organisation],
      ['Language',                  c.language],
    ];

    const rowsHtml = rows.map(([name, d]) => {
      const pips = Array.from({length: 5}, (_, i) =>
        `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:2px;background:${i < d.score ? '#7c3aed' : '#e5e7eb'}"></span>`
      ).join('');
      return `<div style="margin-bottom:12px;padding:10px 14px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <strong style="font-size:.85rem;color:var(--text)">${name}</strong>
          <span style="font-size:.85rem;font-weight:700;color:#7c3aed">${d.score}/5 ${pips}</span>
        </div>
        <div style="font-size:.8rem;color:var(--muted);margin-bottom:4px">${d.comment}</div>
        <div style="font-size:.78rem;color:#7c3aed;font-style:italic">💡 ${d.tip}</div>
      </div>`;
    }).join('');

    const rewritesHtml = (r.rewrites || []).map(rw => {
      const parts = rw.split('→');
      if (parts.length === 2) {
        return `<div style="margin-bottom:8px;font-size:.82rem">
          <div style="color:#dc2626;text-decoration:line-through;margin-bottom:2px">${parts[0].trim()}</div>
          <div style="color:#059669">→ ${parts[1].trim()}</div>
        </div>`;
      }
      return `<div style="font-size:.82rem;color:var(--text);margin-bottom:6px">• ${rw}</div>`;
    }).join('');

    el.innerHTML = `
      <div class="ai-result">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding:14px 18px;background:${bandBg};border-radius:10px;border:1.5px solid ${bandColor}">
          <div style="font-size:2rem">🤖</div>
          <div>
            <div style="font-size:1.1rem;font-weight:800;color:${bandColor}">${total}/20 · ${pct}%</div>
            <div style="font-size:.88rem;font-weight:600;color:${bandColor}">${r.band}</div>
          </div>
        </div>
        ${rowsHtml}
        ${rewritesHtml ? `<div style="margin-top:12px;padding:12px 16px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
          <div style="font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:8px">✏️ Suggested rewrites</div>
          ${rewritesHtml}
        </div>` : ''}
      </div>`;
  }

  // ── Inject AI checker into writing pages ──────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const isWriting = location.pathname.includes('/writing/');
    if (!isWriting) return;

    // Find all writing task blocks and add a checker after each
    document.querySelectorAll('.writing-task, .task-box, .task-card').forEach((taskEl, i) => {
      injectChecker(taskEl, i);
    });

    // Fallback: if page has no .writing-task, inject once after page-content h1
    if (!document.querySelector('.writing-task, .task-box, .task-card')) {
      const content = document.querySelector('.page-content');
      if (content) injectChecker(content, 0);
    }
  });

  function injectChecker(afterEl, idx) {
    const id = 'ai-checker-' + idx;
    const wrap = document.createElement('div');
    wrap.className = 'ai-checker-wrap';
    wrap.style.cssText = 'margin-top:20px;margin-bottom:8px';
    wrap.innerHTML = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden">
        <button class="ai-checker-toggle" onclick="this.nextElementSibling.classList.toggle('open')"
          style="width:100%;background:none;border:none;padding:14px 18px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:.88rem;font-weight:700;color:var(--text);text-align:left">
          <span style="font-size:1.1rem">🤖</span> AI Writing Checker
          <span style="margin-left:auto;font-size:.75rem;color:var(--muted);font-weight:400">Paste your answer · get B2 feedback</span>
          <span style="font-size:.7rem;color:var(--muted)">▾</span>
        </button>
        <div class="ai-checker-body" style="display:none;padding:16px 18px;border-top:1px solid var(--border)">
          <div style="font-size:.8rem;color:var(--muted);margin-bottom:8px">
            Paste or type your essay below, then click Check:
          </div>
          <textarea id="${id}-essay" rows="10" placeholder="Write your essay here…"
            style="width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.88rem;line-height:1.6;resize:vertical;font-family:inherit"></textarea>
          <div style="margin-top:10px;display:flex;align-items:center;gap:12px">
            <button onclick="AI.check('${id}')"
              style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:10px 22px;font-size:.88rem;font-weight:600;cursor:pointer">
              ✅ Check my writing
            </button>
            <span style="font-size:.76rem;color:var(--muted)">Powered by Groq · Llama 3.3 70B · Free</span>
          </div>
          <div id="${id}-result" style="display:none;margin-top:14px"></div>
        </div>
      </div>`;

    // Toggle open class
    const body = wrap.querySelector('.ai-checker-body');
    wrap.querySelector('.ai-checker-toggle').onclick = () => {
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
    };

    afterEl.insertAdjacentElement('afterend', wrap);
  }

  function check(id) {
    const essayEl = document.getElementById(id + '-essay');
    const resultEl = document.getElementById(id + '-result');
    if (!essayEl || !resultEl) return;

    const essay = essayEl.value.trim();
    if (essay.length < 50) {
      resultEl.innerHTML = '<div class="ai-error">Please write at least a few sentences first.</div>';
      resultEl.style.display = 'block';
      return;
    }

    // Extract task text from the page (first .task-box or .writing-task above)
    const taskEl = document.querySelector('.writing-task, .task-box, .task-card, .instructions');
    const taskText = taskEl ? taskEl.innerText.slice(0, 600) : 'B2 writing task';

    checkEssay(taskText, essay, resultEl);
  }

  function checkById(textareaId, resultId) {
    const essayEl  = document.getElementById(textareaId);
    const resultEl = document.getElementById(resultId);
    if (!essayEl || !resultEl) return;

    const essay = essayEl.value.trim();
    if (essay.length < 50) {
      resultEl.innerHTML = '<div class="ai-error">Please write at least a few sentences first.</div>';
      resultEl.style.display = 'block';
      return;
    }

    const taskEl  = essayEl.closest('.task-card') || document.querySelector('.writing-task, .task-box, .task-card');
    const taskText = taskEl ? taskEl.innerText.slice(0, 600) : 'B2 writing task';
    checkEssay(taskText, essay, resultEl);
  }

  function _saveKey(inputEl) {
    const k = inputEl ? inputEl.value.trim() : '';
    if (!k.startsWith('gsk_') || k.length < 20) {
      inputEl.style.borderColor = '#dc2626';
      inputEl.placeholder = 'Must start with gsk_…';
      return;
    }
    saveKey(k);
    // Find the nearest result container and trigger the stored callback
    const resultEl = inputEl.closest('[id$="-result"]') ||
                     document.querySelector('[id$="-result"]');
    if (resultEl && typeof resultEl._onSuccess === 'function') {
      resultEl._onSuccess();
    }
  }

  return { check, checkById, _saveKey };
})();
