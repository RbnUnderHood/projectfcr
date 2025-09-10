/* === FILE: js/flocks.list.js ===
   Flocks — List-first (Step 1c, flag-gated, inline Add button, manage form hidden by default)
   Changes:
     - Hides the Manage Flocks form by default.
     - Shows "Add Flock" inline (top if empty, below list if not).
     - Clicking "Add Flock" reveals the manage form and hides the inline button.
*/
(function(){
  'use strict';

  /* ---------- Feature flag ---------- */
  function flagOn(){
    try { return !!(window.FCR_FLAGS && window.FCR_FLAGS.flocksList); } catch(e){ return false; }
  }
  if (!flagOn()) { return; }

  /* ---------- Utilities ---------- */
  function $id(id){ return document.getElementById(id); }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function toNum(v){
    if (v===null || v===undefined) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'string'){ var n = parseFloat(v.replace(',','.')); return isNaN(n) ? null : n; }
    return null;
  }
  function flockId(f){
    return (f && (f.id || f.flock_id || f.name)) ? (f.id || f.flock_id || f.name) : null;
  }

  /* ---------- Data (read-only) ---------- */
  function getFlocks(){
    try{ if (typeof window.getFlocks === 'function') return window.getFlocks() || []; }catch(e){}
    if (window.FCR_STATE && window.FCR_STATE.flocks) return window.FCR_STATE.flocks;
    try{
      var raw = localStorage.getItem('flocks') || localStorage.getItem('FCR_FLOCKS');
      if (raw){ var arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
    }catch(e){}
    return [];
  }
  function getHistory(){
    try{ if (typeof window.getCalendarEntries === 'function') return window.getCalendarEntries() || []; }catch(e){}
    if (window.FCR_STATE && Array.isArray(window.FCR_STATE.history)) return window.FCR_STATE.history;
    try{
      var raw = localStorage.getItem('fcrHistory') || localStorage.getItem('history') || localStorage.getItem('records');
      if (raw){ var arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
    }catch(e){}
    return [];
  }
  function avgFCRForFlock(f){
    var hist = getHistory();
    var sumFeed = 0, sumEggs = 0, any = false;
    for (var i=0;i<hist.length;i++){
      var e = hist[i];
      var en = e.flock || e.flockName || e.flock_id || e.flockId || e.name;
      var id = flockId(f);
      var match = (id && String(en) === String(id)) || (f && f.name && en && String(en) === String(f.name));
      if (!match) continue;
      var feed = toNum(e.feed) || toNum(e.feedKg) || toNum(e.feed_used) || toNum(e.feedAmount) || toNum(e.feed_used_today);
      var eggs = toNum(e.eggs) || toNum(e.eggCount) || toNum(e.eggsCollected) || toNum(e.collected) || toNum(e.eggs_today);
      if (feed && eggs && eggs > 0){ sumFeed += feed; sumEggs += eggs; any = true; }
    }
    if (!any || sumEggs <= 0) return null;
    return sumFeed / sumEggs;
  }

  /* ---------- Scoped CSS ---------- */
  function injectCSS(){
    if ($id('flxlist-css')) return;
    var css = ""
      + ".flxlist-section{background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:12px;margin-bottom:12px}"
      + ".flxlist-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}"
      + ".flxlist-title{font-weight:800;font-size:1rem}"
      + ".flxlist-list{display:grid;grid-template-columns:1fr;gap:10px}"
      + "@media(min-width:560px){.flxlist-list{grid-template-columns:1fr 1fr}}"
      + ".flxlist-item{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid rgba(0,0,0,.08);border-radius:10px;background:#fff;transition:background .12s ease, box-shadow .12s ease}"
      + ".flxlist-item:hover{background:#F9FBE7;box-shadow:0 2px 6px rgba(0,0,0,.06)}"
      + ".flxlist-name{font-weight:700;flex:1;min-width:0}"
      + ".flxlist-meta{font-size:.9rem;color:#33691E;margin-left:6px;white-space:nowrap}"
      + ".flxlist-actions{margin-top:10px}"
      + ".flxlist-add{display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;background:var(--accent,#2E7D32);color:#fff;border:none;border-radius:12px;font-weight:800;width:100%;box-shadow:0 2px 0 rgba(0,0,0,.06)}"
      + ".flxlist-add:active{transform:translateY(1px)}"
      + ".flxlist-empty{padding:10px;border:1px dashed rgba(0,0,0,.2);border-radius:10px;background:#FFFDF5;color:#6D4C41;margin-bottom:10px}";
    var el = document.createElement('style');
    el.id = 'flxlist-css';
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---------- Manage section helpers ---------- */
  function findFlocksTab(){
    return $id('flocksTab') || qs('#flocks') || qs('[data-tab=\"flocks\"]');
  }
  function findManageSection(tab){
    if (!tab) return null;
    // Prefer a form in the flocks tab
    var form = qs('form', tab);
    if (form) return form;
    // else: any section that contains inputs
    var candidates = qsa('.result-card, .history-section, section, .card', tab);
    for (var i=0;i<candidates.length;i++){
      if (qs('input,select,textarea,button', candidates[i])) return candidates[i];
    }
    return null;
  }
  function hideManage(){
    var tab = findFlocksTab();
    var sec = findManageSection(tab);
    if (!sec) return;
    try{ sec.setAttribute('hidden',''); }catch(e){}
    try{ sec.style.display = 'none'; }catch(e){}
    try{ sec.setAttribute('aria-hidden','true'); }catch(e){}
  }
  function revealManage(){
    var tab = findFlocksTab();
    var sec = findManageSection(tab);
    if (!sec) return;
    try{ sec.removeAttribute('hidden'); }catch(e){}
    try{ sec.style.display = ''; }catch(e){}
    try{ sec.removeAttribute('aria-hidden'); }catch(e){}
    try{ sec.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){ sec.scrollIntoView(); }
  }

  /* ---------- Add button ---------- */
  function buildAddButton(){
    var btn = document.createElement('button');
    btn.id = 'flxlist-add';
    btn.className = 'flxlist-add';
    btn.textContent = 'Add Flock';
    btn.addEventListener('click', function(){
      // Hide this button once the form is shown
      try{ var b = $id('flxlist-add'); if (b) b.style.display = 'none'; }catch(e){}
      revealManage();
      try{ var evt = new CustomEvent('fcr-add-flock'); window.dispatchEvent(evt); }catch(e){}
    });
    return btn;
  }

  /* ---------- Rendering ---------- */
  function renderList(){
    var tab = findFlocksTab();
    if (!tab) return;

    // Create/locate host
    var host = $id('flxlist-section');
    if (!host){
      host = document.createElement('section');
      host.id = 'flxlist-section';
      host.className = 'flxlist-section';
      host.innerHTML = ''
        + '<div class=\"flxlist-header\">'
        + '  <div class=\"flxlist-title\">Flocks</div>'
        + '</div>'
        + '<div id=\"flxlist\" class=\"flxlist-list\"></div>'
        + '<div id=\"flxlist-actions\" class=\"flxlist-actions\"></div>';
      tab.insertBefore(host, tab.firstChild);
    }

    // Ensure manage form is hidden initially (prevents duplicate "Add Flock" visually)
    hideManage();

    // Reset containers
    var listEl = $id('flxlist');
    var actionsEl = $id('flxlist-actions');
    if (!listEl || !actionsEl) return;
    listEl.innerHTML = '';
    actionsEl.innerHTML = '';

    // Remove any stray inline button
    var stray = $id('flxlist-add'); if (stray && stray.parentNode) stray.parentNode.removeChild(stray);

    // Data
    var flocks = getFlocks();

    if (!flocks || !flocks.length){
      // Empty: Add button ON TOP (above list)
      var addTop = buildAddButton();
      host.insertBefore(addTop, listEl);
      listEl.innerHTML = '<div class=\"flxlist-empty\">No flocks yet.</div>';
      return;
    }

    // Populate list
    for (var i=0;i<flocks.length;i++){
      var f = flocks[i];
      var name = f.name || f.id || ('Flock ' + (i+1));
      var fcr = avgFCRForFlock(f);
      var item = document.createElement('div');
      item.className = 'flxlist-item';
      item.innerHTML = '<div class=\"flxlist-name\" title=\"'+ name +'\">'+ name +'</div>'
                     + (fcr!=null ? '<div class=\"flxlist-meta\">Avg FCR '+ fcr.toFixed(2) +'</div>' : '');
      listEl.appendChild(item);
    }

    // After list: inline Add button BELOW
    var addBelow = buildAddButton();
    actionsEl.appendChild(addBelow);
  }

  /* ---------- Init ---------- */
  function init(){
    injectCSS();
    renderList();
  }

  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }

})();