'use strict';

/* ========= New navigation: bottom bar + segmented switches ========= */

// Track inner modes (so we remember which subpanel you last used)
var _recordsMode = 'history';    // 'history' | 'calendar'
var _referenceMode = 'benchmarks'; // 'benchmarks' | 'settings'

// Helper: set active class on bottom nav buttons
function _updateBottomNav(active) {
  var ids = ['navCalculator', 'navRecords', 'navFlocks', 'navReference'];
  for (var i = 0; i < ids.length; i++) {
    var b = byId(ids[i]);
    if (b) b.classList.remove('active');
  }
  var map = {
    calculator: 'navCalculator',
    records: 'navRecords',
    flocks: 'navFlocks',
    reference: 'navReference'
  };
  var btn = byId(map[active]);
  if (btn) btn.classList.add('active');
}

// Top-level view switcher (replaces the old row of tabs)
function switchView(name) { try { localStorage.setItem('fcr.lastView', name); } catch(e){}

  // Hide all top-level views
  var tops = ['calculatorTab', 'recordsTab', 'flocksTab', 'referenceTab'];
  for (var i = 0; i < tops.length; i++) {
    var p = byId(tops[i]);
    if (p) p.classList.remove('active');
  }

  // Show the requested view
  var showId = (name === 'calculator') ? 'calculatorTab'
            : (name === 'records')    ? 'recordsTab'
            : (name === 'flocks')     ? 'flocksTab'
            : (name === 'reference')  ? 'referenceTab'
            : null;
  if (showId) {
    var pane = byId(showId);
    if (pane) pane.classList.add('active');
  }

  // Update bottom nav highlight
  _updateBottomNav(name);

  // Lazy-render per view
  if (name === 'records') {
    if (_recordsMode === 'history') {
      setRecordsMode('history');
    } else {
      setRecordsMode('calendar');
    }
  } else if (name === 'flocks') {
    if (typeof renderFlocks === 'function') renderFlocks();
  } else if (name === 'reference') {
    if (_referenceMode === 'benchmarks') {
      setReferenceMode('benchmarks');
    } else {
      setReferenceMode('settings');
    }
  } else if (name === 'calculator') {
    // Nada; inputs/results are already in DOM
  }
}
window.switchView = switchView;

/* ----- Records segmented switch (History | Calendar) ----- */
function setRecordsMode(mode) {
  _recordsMode = (mode === 'calendar') ? 'calendar' : 'history';
  try { localStorage.setItem('fcr.lastRecordsMode', _recordsMode); } catch(e){}

  var hb = byId('recHistoryBtn'), cb = byId('recCalendarBtn');
  if (hb) hb.classList.toggle('active', _recordsMode === 'history');
  if (cb) cb.classList.toggle('active', _recordsMode === 'calendar');

  var hTab = byId('historyTab'), cTab = byId('calendarTab');
  if (hTab) hTab.classList.toggle('active', _recordsMode === 'history');
  if (cTab) cTab.classList.toggle('active', _recordsMode === 'calendar');

  if (_recordsMode === 'history') {
    if (typeof renderHistoryTable === 'function') renderHistoryTable();
  } else {
    if (typeof renderCalendar === 'function') renderCalendar();
  }
}
// Inner tabs for Flocks (Add vs Management)
window.setFlocksMode = function (mode) {
  // persist the choice
  try { localStorage.setItem('flocksMode', mode === 'manage' ? 'manage' : 'add'); } catch (e) {}

  var addP = document.getElementById('flocksAddPanel');
  var mgP  = document.getElementById('flocksManagePanel');
  var bA   = document.getElementById('flAddBtn');
  var bM   = document.getElementById('flManageBtn');

  var showAdd = (mode !== 'manage');
  if (addP && mgP) {
    addP.classList.toggle('active', showAdd);
    mgP.classList.toggle('active', !showAdd);
  }
  if (bA) bA.classList.toggle('active', showAdd);
  if (bM) bM.classList.toggle('active', !showAdd);
};

// apply last selected inner-tab when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  var m = 'add';
  try { m = localStorage.getItem('flocksMode') || 'add'; } catch (e) {}
  window.setFlocksMode(m);
});

window.setRecordsMode = setRecordsMode;

/* ----- Reference segmented switch (Benchmarks | Settings) ----- */
function setReferenceMode(mode) {
  _referenceMode = (mode === 'settings') ? 'settings' : 'benchmarks';

  var bb = byId('refBenchBtn'), sb = byId('refSettingsBtn');
  if (bb) bb.classList.toggle('active', _referenceMode === 'benchmarks');
  if (sb) sb.classList.toggle('active', _referenceMode === 'settings');

  var bTab = byId('benchmarksTab'), sTab = byId('settingsTab');
  if (bTab) bTab.classList.toggle('active', _referenceMode === 'benchmarks');
  if (sTab) sTab.classList.toggle('active', _referenceMode === 'settings');

  if (_referenceMode === 'settings') {
    if (typeof renderSettings === 'function') renderSettings();
  }
}
window.setReferenceMode = setReferenceMode;

/* ========= Backward-compat: keep switchTab(name) working =========
   Old names map to new views/modes.
*/
function switchTab(name) {
  if (!name) return;
  var n = String(name).toLowerCase();

  if (n === 'calculator') return switchView('calculator');
  if (n === 'flocks')     return switchView('flocks');
  if (n === 'history')    { switchView('records'); return setRecordsMode('history'); }
  if (n === 'calendar')   { switchView('records'); return setRecordsMode('calendar'); }
  if (n === 'benchmarks') { switchView('reference'); return setReferenceMode('benchmarks'); }
  if (n === 'settings')   { switchView('reference'); return setReferenceMode('settings'); }

  // New container names just work too:
  if (n === 'records' || n === 'reference') return switchView(n);
}
window.switchTab = switchTab;

// Open Settings from inline hints
function openSettingsFromHint(ev){
  if (ev) ev.preventDefault();
  // use existing navigation mapping
  if (typeof switchTab === 'function') switchTab('settings');
  // focus currency select for convenience
  var sel = byId('settingsCurrency');
  if (sel) { sel.focus(); sel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}
window.openSettingsFromHint = openSettingsFromHint;

/* ----- Init (DOM ready) ----- */
function init() {
  // Ensure modals overlay correctly
  var modalIds = ['duplicateModal','deleteModal','notesModal','editModal','editFlockModal','quickEntryModal'];
  for (var i = 0; i < modalIds.length; i++) {
    var m = byId(modalIds[i]);
    if (m && m.parentElement !== document.body) document.body.appendChild(m);
  }

  // Alt feed toggle (calculator)
  var altT = byId('altFeedToggle'), altB = byId('altFeedBox');
  if (altT && altB) {
    altB.style.display = altT.checked ? '' : 'none';
    altT.addEventListener('change', function(){ altB.style.display = this.checked ? '' : 'none'; });
  }

  // Restore last inner flocks tab
  try { if (window.setFlocksMode) window.setFlocksMode(localStorage.getItem('flocksMode') || 'add'); } catch(e){}

  // Start on last-opened TOP tab (fallback: calculator)
  var startView = 'calculator';
  var recMode   = 'history';
  try { startView = localStorage.getItem('fcr.lastView') || 'calculator'; } catch(e){}
  try { recMode   = localStorage.getItem('fcr.lastRecordsMode') || 'history'; } catch(e){}

  if (startView === 'records') {
    setRecordsMode(recMode);       // set inner mode first (prevents flicker)
    switchView('records');
  } else {
    switchView(startView);
  }
if (typeof renderFlockPickers === 'function') renderFlockPickers();

  // Ensure Reference shows something
  setReferenceMode('benchmarks');
}

/* ========= Quick self-tests ========= */
function runSelfTests() {
  try {
    console.log('--- Running quick tests ---');

    // 1) public API presence
    if (!(typeof window.switchTab === 'function')) throw new Error('switchTab not global');
    if (!(typeof window.switchView === 'function')) throw new Error('switchView missing');
    if (!(typeof computeDerived === 'function')) throw new Error('computeDerived missing');
    if (!(typeof openQuickEntryModal === 'function')) throw new Error('quick-entry modal fn missing');

    // 2) date input exists and defaulted
    var de = byId('entryDate');
    if (!de) throw new Error('date input missing');
    if (!de.value) throw new Error('date not defaulted');

    // 3) math sanity
    var d = computeDerived({ feedAmount: 2.4, eggCount: 20, eggWeight: 60, birdCount: 10, feedPricePerKg: 1000 });
    if (d.fcrValue !== '2.00') throw new Error('FCR calc');
    if (d.feedPerBird !== '0.24') throw new Error('feed per bird');
    if (d.costFeedTotal !== 2400) throw new Error('cost total');
    if (d.layingPercentage !== '200.0') throw new Error('laying %');

    // 4) duplicate detection wiring
    var fakeId = 'flock-test';
    var was = (window.calculationHistory || []).length;
    (window.calculationHistory || []).push({ date: de.value, flockId: fakeId, id: de.value + '|x' });
    if (!(typeof isDuplicate === 'function' && isDuplicate(de.value, fakeId))) throw new Error('duplicate detect');
    (window.calculationHistory || []).pop();
    if ((window.calculationHistory || []).length !== was) throw new Error('cleanup');

    console.log('All tests passed ✅');
  } catch (e) {
    console.error('Self tests failed ❌', e && e.message ? e.message : e);
  }
}
if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
