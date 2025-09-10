/* nav-safety.js — stable navigation + lifecycle events
   - Guarantees views/tabs show/hide safely (style + class)
   - Dispatches CustomEvents: 'app:view:shown' and 'app:tab:shown'
   - Renders calendar/history when those tabs are shown
*/
(function () {
  'use strict';

  var DEBUG = false; // set true for verbose logs

  // Known containers (adjust if your IDs differ)
  var MAIN_VIEWS     = ['calculatorTab', 'recordsTab', 'flocksTab', 'referenceTab'];
  var RECORDS_TABS   = ['historyTab', 'calendarTab'];
  var REFERENCE_TABS = ['benchmarksTab', 'settingsTab'];

  // ---------- utils ----------
  function byId(id){ return document.getElementById(id); }
  function exists(id){ return !!byId(id); }
  function log(){ if (DEBUG) console.log.apply(console, arguments); }

  function showEl(id){
    var el = byId(id); if (!el) return false;
    el.style.display = ''; // un-hide even if inline "display:none" exists
    if (el.classList) el.classList.add('active');
    return true;
  }
  function hideEl(id){
    var el = byId(id); if (!el) return;
    el.style.display = 'none';
    if (el.classList) el.classList.remove('active');
  }

  function emit(name, detail){
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); }
    catch(_) { /* older browsers: no-op */ }
  }

  // DOM ready queue
  var ready = (document.readyState === 'interactive' || document.readyState === 'complete');
  var q = [];
  function onReady(fn){ if (ready) { try{ fn(); } catch(e){ console.error(e);} } else { q.push(fn); } }
  document.addEventListener('DOMContentLoaded', function(){
    ready = true;
    while (q.length) { try { q.shift()(); } catch(e){ console.error(e);} }

    // Ensure one main view visible
    var anyVisible = MAIN_VIEWS.some(function(id){
      var el = byId(id); return el && el.style.display !== 'none';
    });
    if (!anyVisible) {
      if (!showEl('calculatorTab')) {
        for (var i=0;i<MAIN_VIEWS.length;i++){ if (showEl(MAIN_VIEWS[i])) break; }
      }
    }

    // Default inner tabs if their container is visible
    if (exists('recordsTab') && byId('recordsTab').style.display !== 'none') {
      var h = byId('historyTab'), c = byId('calendarTab');
      var hv = h && h.style.display !== 'none';
      var cv = c && c.style.display !== 'none';
      if (!hv && !cv) { showEl('historyTab'); _highlightSegmented('records','history'); emit('app:tab:shown', { group:'records', tab:'history' }); }
    }
    if (exists('referenceTab') && byId('referenceTab').style.display !== 'none') {
      var b = byId('benchmarksTab'), s = byId('settingsTab');
      var bv = b && b.style.display !== 'none';
      var sv = s && s.style.display !== 'none';
      if (!bv && !sv) { showEl('benchmarksTab'); _highlightSegmented('reference','benchmarks'); emit('app:tab:shown', { group:'reference', tab:'benchmarks' }); }
    }

    _syncBottomNav();
    log('nav-safety: DOM ready ✓');
  });

  // ---------- bottom-nav highlight ----------
  function _idToView(id){
    if (id === 'calculatorTab') return 'calculator';
    if (id === 'recordsTab')    return 'records';
    if (id === 'flocksTab')     return 'flocks';
    if (id === 'referenceTab')  return 'reference';
    return '';
  }
  function _activeViewId(){
    for (var i=0;i<MAIN_VIEWS.length;i++){
      var el = byId(MAIN_VIEWS[i]);
      if (el && el.style.display !== 'none') return MAIN_VIEWS[i];
    }
    return null;
  }
  function _syncBottomNav(activeId){
    var vid = activeId || _activeViewId();
    var view = _idToView(vid || '');
    var btns = document.querySelectorAll('[data-view-btn]');
    for (var i=0;i<btns.length;i++){
      var key = btns[i].getAttribute('data-view-btn');
      btns[i].classList.toggle('active', key === view);
    }
  }

  // ---------- segmented highlight ----------
  function _highlightSegmented(group, tabKey){
    var scope = (group === 'records') ? '#recordsTab' : '#referenceTab';
    var btns = document.querySelectorAll(scope + ' [data-tab-btn]');
    for (var i=0;i<btns.length;i++){
      var k = btns[i].getAttribute('data-tab-btn');
      btns[i].classList.toggle('active', k === tabKey);
    }
  }

  // ---------- switchers ----------
  function _safeSwitchViewImpl(name){
    if (!name) return;
    onReady(function(){
      // Hide all
      for (var i=0;i<MAIN_VIEWS.length;i++) hideEl(MAIN_VIEWS[i]);

      // Resolve name → id
      var id = (name.endsWith && name.endsWith('Tab')) ? name : (name + 'Tab');
      if (!exists(id)) {
        if (!exists(name)) { log('nav-safety: view not found:', name); return; }
        id = name;
      }

      showEl(id);
      _syncBottomNav(id);
      emit('app:view:shown', { viewId:id, view:_idToView(id) });
      log('nav-safety: switchView →', id);
    });
  }

  function _safeSwitchRecordsTab(tab){
    var key = (tab === 'calendar' || tab === 'calendarTab') ? 'calendar' : 'history';
    hideEl('historyTab'); hideEl('calendarTab');
    showEl(key + 'Tab');

    // Render on demand (kept here for convenience)
    if (key === 'calendar' && typeof window.renderCalendar === 'function') {
      try { window.renderCalendar(); } catch(e){ console.warn('nav-safety: renderCalendar failed', e); }
    }
    if (key === 'history' && typeof window.renderHistoryTable === 'function') {
      try { window.renderHistoryTable(); } catch(e){ console.warn('nav-safety: renderHistoryTable failed', e); }
    }

    _highlightSegmented('records', key);
    _safeSwitchViewImpl('records');
    emit('app:tab:shown', { group:'records', tab:key });
  }

  function _safeSwitchReferenceTab(tab){
    var key = (tab === 'settings' || tab === 'settingsTab') ? 'settings' : 'benchmarks';
    hideEl('benchmarksTab'); hideEl('settingsTab');
    showEl(key + 'Tab');
    _highlightSegmented('reference', key);
    _safeSwitchViewImpl('reference');
    emit('app:tab:shown', { group:'reference', tab:key });
  }

  function _safeSwitchTabImpl(group, tab){
    onReady(function(){
      if (!tab && group) { tab = group; group = undefined; }
      if (!tab) return;

      var t = String(tab).toLowerCase();
      if (group === 'records' || (!group && (t.indexOf('history') !== -1 || t.indexOf('calendar') !== -1))) {
        _safeSwitchRecordsTab(t.indexOf('calendar') !== -1 ? 'calendar' : 'history');
        log('nav-safety: switchTab(records) →', t);
        return;
      }
      if (group === 'reference' || (!group && (t.indexOf('benchmarks') !== -1 || t.indexOf('settings') !== -1))) {
        _safeSwitchReferenceTab(t.indexOf('settings') !== -1 ? 'settings' : 'benchmarks');
        log('nav-safety: switchTab(reference) →', t);
        return;
      }

      // Fallback: main view name passed to switchTab
      _safeSwitchViewImpl(tab);
    });
  }

  // ---------- wrap originals ----------
  var origSwitchView = window.switchView;
  var origSwitchTab  = window.switchTab;

  window.switchView = function(name){
    try {
      if (typeof origSwitchView === 'function') {
        try { origSwitchView(name); } catch(e){ console.warn('nav-safety: original switchView threw', e); }
      }
      _safeSwitchViewImpl(name);
    } catch(e){ console.error('nav-safety: switchView failed', e); }
  };

  window.switchTab = function(a,b){
    try {
      if (typeof origSwitchTab === 'function') {
        try { origSwitchTab(a,b); } catch(e){ console.warn('nav-safety: original switchTab threw', e); }
      }
      _safeSwitchTabImpl(a,b);
    } catch(e){ console.error('nav-safety: switchTab failed', e); }
  };

  // ---------- self-test ----------
  window.__navSafetySelfTest = function(){
  try {
    // Ensure at least one main view is visible; do not change current selection otherwise.
    var hasActive = MAIN_VIEWS.some(function(id){ var el=byId(id); return el && el.style.display !== 'none'; });
    if (!hasActive) _safeSwitchViewImpl('calculator');
    // quiet log; no view/tab switching here
    // console.log('Nav safety ready ✅');
  } catch (e) {
    console.error('Nav safety test failed', e);
  }
};

  onReady(function(){ window.__navSafetySelfTest(); });

})();
