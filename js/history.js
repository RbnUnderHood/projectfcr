'use strict';
// Pretty-print kg values and render paid/alt with a wrap point
function _fmtKgShort(n){
  var v = Number(n);
  if (!isFinite(v)) return '';
  var d = v >= 100 ? 0 : (v >= 10 ? 1 : 2); // fewer decimals for big numbers
  return v.toFixed(d).replace(/\.?0+$/, '');
}
function _feedCellHTML(row){
  var paid = _fmtKgShort(row.feedAmount);
  if (row.altFeedKg && row.altFeedKg > 0) {
    var alt = _fmtKgShort(row.altFeedKg);
    return paid + '<wbr>/' + alt; // <wbr> lets browser wrap at slash
  }
  return paid;
}

/* ========= History table & Edit/Delete =========
   Depends on: computeDerived, getPerformanceClass (js/calc/compute.js)
               weatherConfig, saveHistory, saveCalendar (js/state.js)
               addOrUpdateFcrEvent, renderCalendar, openDay, showEventsForDate (js/calendar.js)
               paintCalculatorFromRecord (js/calc/flow.js)
*/

var _historyDeleteIndex = null;

/* local date helper (avoid UTC) */
function _pad2(n){ return (n<10?'0':'') + n; }
function _toLocalISO(date){
  return date.getFullYear() + '-' + _pad2(date.getMonth()+1) + '-' + _pad2(date.getDate());
}

function _populateWeatherSelect(selectId, selected) {  if (typeof window.buildWeatherSelect === 'function') {
    window.buildWeatherSelect(selectId, selected);
  }
}

function renderHistoryTable() {
  var body = byId('historyTableBody');
  var msg  = byId('noHistoryMessage');
  if (!body || !msg) return;

  var list = Array.isArray(window.calculationHistory) ? window.calculationHistory : [];
  if (!list.length) { msg.style.display = 'block'; body.innerHTML = ''; return; }
  msg.style.display = 'none';

  var sorted = list.slice().sort(function(a,b){ return new Date(b.date) - new Date(a.date); });

  // --- safe weather cell renderer (array/object/emoji aware) ---
  function _wxCellHTML(val){
    try{
      var key = (typeof window.normalizeWeather === 'function')
        ? window.normalizeWeather(val)
        : String(val || '').toUpperCase();

      var emoji = '', label = key.replace(/_/g,' ').toLowerCase();
      var B = window.WEATHER_BADGES;

      if (B) {
        if (Array.isArray(B)) {
          for (var i=0;i<B.length;i++){
            var b=B[i]; if (b && b.key===key){ emoji=b.emoji||b.icon||''; label=b.label||label; break; }
          }
        } else if (B[key]) {
          emoji = B[key].emoji || B[key].icon || '';
          label = B[key].label || label;
        }
      } else {
        // minimal fallback for raw emojis → keys
        var m = {'🔥':'EXTREME_HEAT','❄️':'TEMP_DROP','🌧️':'RAINY','💨':'WINDY','✅':'OPTIMAL'};
        if (m[val]) key = m[val];
      }

      return emoji ? '<span class="wx" title="'+label+'">'+emoji+'</span>' : '';
    } catch(e){
      console.warn('[history] weather cell render failed:', e);
      return '';
    }
  }

  var html = '';
  for (var i = 0; i < sorted.length; i++) {
    var row = sorted[i];

    // find the original index for the click handler
    var idx = -1;
    for (var j = 0; j < list.length; j++) { if (list[j].id === row.id) { idx = j; break; } }

    var perfClass = getPerformanceClass(row.fcrValue);
    var wb = _wxCellHTML(row.weather);

    var titleFeed = _fmtKgShort(row.feedAmount)
      + (row.altFeedKg && row.altFeedKg > 0 ? ('/' + _fmtKgShort(row.altFeedKg)) : '');

    html += ''
      + '<tr class="row-click" onclick="openEdit(' + idx + ')" title="Tap to edit">'
      +   '<td>' + row.date + '</td>'
      +   '<td>' + (row.flockName || '') + '</td>'
      +   '<td class="feed-cell" title="' + titleFeed + '">' + _feedCellHTML(row) + '</td>'
      +   '<td>' + row.eggCount + '</td>'
      +   '<td class="' + perfClass + '">' + row.fcrValue + '</td>'
      +   '<td>' + wb + '</td>'
      + '</tr>';
  }

  body.innerHTML = html;

  // keep header and body columns aligned even when a scrollbar appears
  (function syncHistoryHeaderPadding(){
    var sc = document.querySelector('#historyTab .history-scroll');
    var head = document.querySelector('#historyTab .history-head');
    if (!sc || !head) return;
    var sbw = sc.offsetWidth - sc.clientWidth;           // scrollbar width
    head.style.setProperty('--sbw', (sbw > 0 ? sbw : 0) + 'px');
  })();
}


function clearHistory() {
  if (!confirm('Clear ALL history?')) return;
  window.calculationHistory = [];
  if (typeof saveHistory === 'function') saveHistory();
  window.calendarEvents = Array.isArray(window.calendarEvents) ? window.calendarEvents : [];
  window.calendarEvents = window.calendarEvents.filter(function(e){ return e.type !== 'fcr'; });
  if (typeof saveCalendar === 'function') saveCalendar();
  renderHistoryTable();
  if (hasClassId('calendarTab','active') && typeof window.renderCalendar === 'function') window.renderCalendar();
}

function showNotes(i) {
  var list = window.calculationHistory || [];
  var e = list[i]; if (!e || !e.notes) return;
  byId('notesModalText').textContent = e.notes;
  showModal('notesModal');
}

function showDeleteConfirm(i) { _historyDeleteIndex = i; showModal('deleteModal'); }
function cancelDelete() { _historyDeleteIndex = null; hideModal('deleteModal'); }
function confirmDelete() {
  if (_historyDeleteIndex == null) return;
  var list = window.calculationHistory || [];
  var old = list[_historyDeleteIndex];
  list.splice(_historyDeleteIndex, 1);
  if (typeof saveHistory === 'function') saveHistory();
  if (Array.isArray(window.calendarEvents)) {
    window.calendarEvents = window.calendarEvents.filter(function(e){ return !(e.type === 'fcr' && e.refId === old.id); });
    if (typeof saveCalendar === 'function') saveCalendar();
  }
  renderHistoryTable();
  if (hasClassId('calendarTab','active') && typeof window.renderCalendar === 'function') window.renderCalendar();
  cancelDelete();
}

function openEdit(i) {
  var list = window.calculationHistory || [];
  var r = list[i]; if (!r) return;

  // local helper: set value only if the element exists
  function setVal(id, v){
    var el = byId(id);
    if (el) el.value = v;
  }

  _populateWeatherSelect('editWeather', r.weather);

  // Some fields may be removed/hidden in Edit modal: tolerate missing nodes
  setVal('editDate', r.date);
  setVal('editFlock', r.flockName || '');
  setVal('editFeed', r.feedAmount);
  setVal('editEggs', r.eggCount);
  setVal('editBirds', r.birdCount);          // ok if missing
  setVal('editEggWeight', r.eggWeight);      // ok if missing
  setVal('editNotes', r.notes || '');

  // Alt feed UI (tolerant if not present)
  var altOn = !!(r.altFeedKg && r.altFeedKg > 0);
  var t = byId('editAltToggle');
  if (t) {t.checked = !!altOn;
  t.onchange = function () {
    var bx = byId('editAltBox');
    if (bx) bx.style.display = this.checked ? '' : 'none';
  };
}
var bx = byId('editAltBox');
if (bx) bx.style.display = (t && t.checked) ? '' : 'none';

  if (altOn) {
    setVal('editAltKg', r.altFeedKg);
    setVal('editAltName', r.altFeedName || '');
  } else {
    setVal('editAltKg', '');
    setVal('editAltName', '');
  }

  window.editIndex = i;
  showModal('editModal');
}


function openEditByRefId(refId) {
  var list = window.calculationHistory || [];
  var i, idx = -1;
  for (i = 0; i < list.length; i++) { if (list[i].id === refId) { idx = i; break; } }
  if (idx === -1) { alert('Entry not found for editing.'); return; }
  openEdit(idx);
}
// Open Edit Entry modal for a *note-only* day (future or past)
function openEditNoteForDate(dateStr){
  // stash mode so saveEdit() knows to only update note events
  window.editNoteOnly = dateStr;

  // Set modal title to make it clear
  var ttl = document.querySelector('#editModal .modal-title');
  if (ttl) ttl.textContent = '✏️ Edit Note';

  // Disable all inputs except Notes
  // Alt feed: force OFF, hide, and disable controls
var t = byId('editAltToggle');
if (t) { t.checked = false; t.disabled = true; }
['editAltKg','editAltName'].forEach(function(id){
  var el = byId(id); if (el){ el.value=''; el.disabled = true; }
});
var bx = byId('editAltBox'); if (bx) bx.style.display = 'none';

  function dis(id){ var el = byId(id); if (el){ el.disabled = true; el.setAttribute('aria-disabled','true'); } }
  ['editFlock','editFeed','editEggs','editWeather','editAltToggle','editAltKg','editAltName'].forEach(dis);
  var bx = byId('editAltBox'); if (bx) bx.style.display = 'none';

  // Preload existing note text (if any) from calendar events
  var evs = {};
  try { evs = JSON.parse(localStorage.getItem('fcrCalendarEvents') || '{}'); } catch(e){}
  var day = evs[dateStr];
  var arr = Array.isArray(day) ? day : (day && Array.isArray(day.events) ? day.events : []);
  var noteTxt = '';
  for (var i=0;i<arr.length;i++){
    var e = arr[i];
    if (e && e.type === 'note'){
      noteTxt = String(e.notes || e.description || e.title || '');
      break;
    }
  }
  var n = byId('editNotes'); if (n) n.value = noteTxt;

  // Show modal
  showModal('editModal');
}

function closeEditModal() { window.editIndex = null; hideModal('editModal'); }

/* ===== Save edits + refresh all dependent UIs ===== */
function saveEdit() {
    // Note-only edit: update calendar note and return
  if (window.editNoteOnly){
    var dateStr = window.editNoteOnly;
    var txt = (byId('editNotes') && byId('editNotes').value) || '';

    // Load, update/insert note event for that date
    var evs = {};
    try { evs = JSON.parse(localStorage.getItem('fcrCalendarEvents') || '{}'); } catch(e){}
    var day = evs[dateStr];
    var arr = Array.isArray(day) ? day : (day && Array.isArray(day.events) ? day.events : []);
    if (!arr) arr = [];

    var found = false;
    for (var i=0;i<arr.length;i++){
      if (arr[i] && arr[i].type === 'note'){ arr[i].notes = txt; found = true; break; }
    }
    if (!found){
      arr.push({ id: 'note-'+Date.now(), type:'note', date: dateStr, title:'Note', notes: txt });
    }

    if (Array.isArray(day)) {
      evs[dateStr] = arr;
    } else {
      evs[dateStr] = Object.assign({}, day || {}, { events: arr });
    }
    localStorage.setItem('fcrCalendarEvents', JSON.stringify(evs));

    // cleanup: re-enable fields for next time
    ['editFlock','editFeed','editEggs','editWeather','editAltToggle','editAltKg','editAltName'].forEach(function(id){
      var el = byId(id); if (el){ el.disabled = false; el.removeAttribute('aria-disabled'); }
    });
    var bx = byId('editAltBox'); if (bx) bx.style.display = 'none';
    var ttl = document.querySelector('#editModal .modal-title'); if (ttl) ttl.textContent = '✏️ Edit Entry';

    hideModal && hideModal('editModal');
    window.editNoteOnly = null;

    if (typeof window.renderCalendar === 'function') window.renderCalendar();
    if (typeof window.renderHistoryTable === 'function') window.renderHistoryTable();
    return;
  }

  try {
    if (window.editIndex == null) { alert('Nothing to save.'); return; }
    var list = window.calculationHistory || [];
    var old = list[window.editIndex]; if (!old) { alert('Original entry not found.'); return; }

    var dateVal      = byId('editDate')?.value || old.date;
    var flockNameVal = byId('editFlock')?.value || old.flockName || 'Unnamed Flock';
    var feedVal      = parseDec(byId('editFeed')?.value ?? old.feedAmount);
    var eggsVal      = parseInt(byId('editEggs')?.value ?? old.eggCount, 10);
    var birdsVal     = old.birdCount;   // locked: change via Edit Flock
    var eggWVal      = old.eggWeight;   // locked: change via Edit Flock

    var weatherVal   = (byId('editWeather') || {}).value || old.weather || '';
    var notesVal     = byId('editNotes')?.value || old.notes || '';

    if (!isFinite(feedVal) || !isFinite(eggsVal)) { alert('Invalid numbers.'); return; }
    if (eggWVal < 10 || eggWVal > 200) { alert('Please set a realistic egg weight (10–200 g).'); return; }
    // Alt feed (Edit Entry)
var altOn       = !!(byId('editAltToggle') && byId('editAltToggle').checked);
var altFeedKg   = altOn ? parseDec(((byId('editAltKg') && byId('editAltKg').value) || '0')) : 0;
if (!isFinite(altFeedKg) || altFeedKg < 0) altFeedKg = 0;
var altFeedName = altOn ? String(((byId('editAltName') && byId('editAltName').value) || '')).trim() : '';


    var feedPricePerKg = (typeof old.feedPricePerKg === 'number') ? old.feedPricePerKg : 0;
    var d = computeDerived({
      feedAmount: feedVal, eggCount: eggsVal, eggWeight: eggWVal, birdCount: birdsVal, feedPricePerKg: feedPricePerKg
    });

    var finalRec = {
      id: (dateVal + '|' + (flockNameVal || 'default')),
      flockId: old.flockId,
      currencyCode: old.currencyCode || window.defaultCurrency || 'PYG',
      feedPricePerKg: feedPricePerKg,
      date: dateVal, flockName: flockNameVal, feedAmount: feedVal, eggCount: eggsVal, birdCount: birdsVal, eggWeight: eggWVal,
      weather: weatherVal, notes: notesVal,
      fcrValue: d.fcrValue, performanceCategory: d.performanceCategory, feedPerBird: d.feedPerBird,
      layingPercentage: d.layingPercentage, feedPerEgg: d.feedPerEgg, costFeedTotal: d.costFeedTotal, costPerEgg: d.costPerEgg, altFeedKg: altFeedKg,
      altFeedName: altFeedName,
      approxSaved: (altFeedKg * feedPricePerKg),

    };

    list[window.editIndex] = finalRec;
    if (typeof saveHistory === 'function') saveHistory();

    try {
      if (typeof window.addOrUpdateFcrEvent === 'function') window.addOrUpdateFcrEvent(finalRec, old.id);
    } catch (calErr) { console.error('Calendar update failed:', calErr); }

    if (typeof renderHistoryTable === 'function') renderHistoryTable();
    if (typeof window.renderCalendar === 'function') window.renderCalendar();

    // Open the selected date panel (or the new date if changed)
    if (typeof window.openDay === 'function') {
      window.openDay(finalRec.date);
    } else if (typeof window.showEventsForDate === 'function') {
      var iso = (window.selectedDate instanceof Date) ? _toLocalISO(window.selectedDate) : finalRec.date;
      window.showEventsForDate(iso);
    }

    // Repaint calculator to match this edited record
    if (typeof window.paintCalculatorFromRecord === 'function') window.paintCalculatorFromRecord(finalRec);

    closeEditModal();
  } catch (e) {
    console.error('Save edit failed:', e);
    alert('Could not save changes: ' + (e && e.message ? e.message : e));
  }
}

function deleteFromEdit() {
  if (window.editIndex == null) return;
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  var list = window.calculationHistory || [];
  var old = list[window.editIndex];
  list.splice(window.editIndex, 1);
  if (typeof saveHistory === 'function') saveHistory();
  if (Array.isArray(window.calendarEvents)) {
    window.calendarEvents = window.calendarEvents.filter(function(e){ return !(e.type === 'fcr' && e.refId === old.id); });
    if (typeof saveCalendar === 'function') saveCalendar();
  }
  renderHistoryTable();
  if (typeof window.renderCalendar === 'function') window.renderCalendar();
  if (typeof window.showEventsForDate === 'function' && window.selectedDate instanceof Date) {
    window.showEventsForDate(_toLocalISO(window.selectedDate));
  }
  closeEditModal();
}

/* ========= Expose ========= */
window.renderHistoryTable = renderHistoryTable;
window.clearHistory = clearHistory;
window.showNotes = showNotes;
window.showDeleteConfirm = showDeleteConfirm;
window.cancelDelete = cancelDelete;
window.confirmDelete = confirmDelete;
window.openEdit = openEdit;
window.openEditByRefId = openEditByRefId;
window.closeEditModal = closeEditModal;
window.saveEdit = saveEdit;
window.deleteFromEdit = deleteFromEdit;
