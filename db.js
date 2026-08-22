// Central Supabase client — included on every page
window.DB = (() => {
  const URL  = 'https://olsxxfwvwsycwzihbmdn.supabase.co';
  const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sc3h4Znd2d3N5Y3d6aWhibWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMzk4MzAsImV4cCI6MjA5NTcxNTgzMH0.kZrQ9Q42wt4eIBU5dtu22jqbg2_GWtPrnsqF8zswbeg';
  const USER = 'natasha';
  const HDR  = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

  const timers = {};

  async function sbGet(table, filter) {
    try {
      const r = await fetch(`${URL}/rest/v1/${table}?${filter}`, { headers: HDR });
      const rows = await r.json();
      return rows[0] || null;
    } catch { return null; }
  }

  function sbUpsert(table, body, delay = 800) {
    const key = table + JSON.stringify(Object.keys(body));
    clearTimeout(timers[key]);
    timers[key] = setTimeout(async () => {
      try {
        await fetch(`${URL}/rest/v1/${table}`, {
          method: 'POST',
          headers: { ...HDR, Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ ...body, updated_at: new Date().toISOString() })
        });
      } catch {}
    }, delay);
  }

  return {
    // ── Roadmap progress ──────────────────────────────
    async loadRoadmap() {
      const row = await sbGet('b2_progress', `user_id=eq.${USER}`);
      return row ? { tasks: row.tasks || {}, examDate: row.exam_date || '' } : null;
    },
    saveRoadmap(tasks, examDate) {
      localStorage.setItem('b2_progress', JSON.stringify(tasks));
      if (examDate !== undefined) localStorage.setItem('b2_exam_date', examDate || '');
      sbUpsert('b2_progress', { user_id: USER, tasks, exam_date: examDate ?? localStorage.getItem('b2_exam_date') ?? null });
    },

    // ── Page data (reading answers, writing text) ─────
    async loadPage(pageId) {
      const local = (() => { try { return JSON.parse(localStorage.getItem('b2_page_' + pageId)); } catch { return null; } })();
      const row   = await sbGet('b2_pages', `user_id=eq.${USER}&page_id=eq.${pageId}`);
      if (row?.data) {
        localStorage.setItem('b2_page_' + pageId, JSON.stringify(row.data));
        return row.data;
      }
      return local;
    },
    savePage(pageId, data) {
      localStorage.setItem('b2_page_' + pageId, JSON.stringify(data));
      sbUpsert('b2_pages', { user_id: USER, page_id: pageId, data });
    },
  };
})();
