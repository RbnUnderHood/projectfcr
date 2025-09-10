'use strict';

/* ========= Calendar & Quick Entry =========
   Depends on: byId, showModal, hideModal, todayISO, fmtMoney (from js/utils.js)
               calculationHistory, calendarEvents, currentDate, saveCalendar (from js/state.js)
               computeDerived (from js/calc/compute.js)
               isDuplicate, calculateFCR (from js/calc/flow.js)
               weatherConfig (from js/state.js)
               openEditByRefId (from js/history.js)
*/
// === OPTION A: simple per-day data map that Calendar understands ===
// You can set/override window.calendarByDate from anywhere else too.
window.calendarByDate = window.calendarByDate || {};

/**
 * Build the per-day map for a given month.
 * Return shape:
 * {
 *   "2025-09-02": { emojis: ["🌧️"], hasNote: true },
 *   "2025-09-05": { emojis: ["✅"] },
 *   ...
 * }
 */
window.buildCalendarByDate = function buildCalendarByDate(year, monthIndex) {
  const pad2 = n => (n < 10 ? "0" : "") + n;

  // How many days in this month?
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const base = {};
  const yyyy = String(year);
  const mm = pad2(monthIndex + 1);

  // EXAMPLE DATA (safe to delete later)
  // Put 🌧️ on the 2nd, ✅ on the 5th, note on the 10th, select today if in month.
  for (let d = 1; d <= daysInMonth; d++) {
    const dd = pad2(d);
    const key = `${yyyy}-${mm}-${dd}`;
    // (leave empty unless you want to add something)
    if (d === 2) base[key] = { emojis: ["🌧️"] };
    if (d === 5) base[key] = { emojis: ["✅"] };
    if (d === 10) base[key] = { emojis: ["💨"], hasNote: true };
  }
  // Select today's date if it’s in this month
  const today = new Date();
  if (today.getFullYear() === year && today.getMonth() === monthIndex) {
    const key = `${yyyy}-${mm}-${pad2(today.getDate())}`;
    base[key] = Object.assign({ emojis: [] }, base[key], { selected: true });
  }

  // Merge in any overrides you set elsewhere via window.calendarByDate
  return Object.assign({}, base, window.calendarByDate);
};
function toDateParts(yyyyMmDd){
  const [y,m,d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatLongDate(yyyyMmDd){
  const dt = toDateParts(yyyyMmDd);
  return dt.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric', year:'numeric' });
}
/**
 * calendarEventsByDate shape:
 * {
 *   "2025-09-10": [
 *      { type:"note", title:"Note", body:"asdasdasd", meta:"Weather: Optimal" },
 *      { type:"feed", title:"Feed", body:"10 kg · Starter", meta:"by Sam" }
 *   ]
 * }
 */
window.calendarEventsByDate = window.calendarEventsByDate || {};

function renderCalendarEventsPanel(dateStr){
  const titleSpan = document.querySelector('#calendarTab .calendar-events .selected-title span');
  const addBtn    = document.getElementById('addEntryForDayBtn');
  const listWrap  = document.getElementById('calendarEventsList');

  if (!titleSpan || !addBtn || !listWrap) return;

  // Title
  titleSpan.textContent = `Add entry for ${formatLongDate(dateStr)}`;

  // Show the button now that a day is selected
  addBtn.hidden = false;

  // (Hook this to your real "open entry" function if you have one)
  addBtn.onclick = function(){
    if (typeof openQuickEntryForDate === 'function') {
      openQuickEntryForDate(dateStr);
    } else {
      console.log('[calendar] addEntry for', dateStr);
    }
  };

  // Render list
  const items = window.calendarEventsByDate[dateStr] || [];
  listWrap.textContent = ''; // clear

  if (items.length === 0){
    const empty = document.createElement('div');
    empty.className = 'calendar-event event-empty';
    empty.textContent = 'No entries yet.';
    listWrap.appendChild(empty);
    return;
  }

  items.forEach(ev => {
    const card = document.createElement('div');
    card.className = `calendar-event type-${(ev.type||'note')}`;

    const h = document.createElement('div');
    h.className = 'event-title';
    h.textContent = ev.title || 'Entry';

    const meta = document.createElement('div');
    meta.className = 'event-meta';
    meta.textContent = ev.meta || '';

    const body = document.createElement('div');
    body.className = 'event-body';
    body.textContent = ev.body || '';

    card.appendChild(h);
    if (meta.textContent) card.appendChild(meta);
    if (body.textContent) card.appendChild(body);
    listWrap.appendChild(card);
  });
}

function pad2(n){ return (n<10?'0':'')+n; }

/* Ensure exactly one .calendar-dots per day cell; remove accidental dupes */
function normalizeCalendarDOM(){
  document.querySelectorAll('#calendarTab .calendar-day').forEach(cell=>{
    const dots = cell.querySelectorAll('.calendar-dots');
    if (dots.length === 0){
      const d = document.createElement('div');
      d.className = 'calendar-dots';
      cell.appendChild(d);
    } else {
      dots.forEach((el,i)=>{ if(i>0) el.remove(); });
    }
  });
}

/* Clear + repaint per-date content so nothing accumulates */
function paintCalendarByDate(byDate){
  document.querySelectorAll('#calendarTab .calendar-day').forEach(cell=>{
    const dots = cell.querySelector('.calendar-dots');
    if (dots) dots.textContent = '';
    cell.classList.remove('has-note','is-selected');
  });
  if (!byDate) return;

  Object.entries(byDate).forEach(([date, info])=>{
    const cell = document.querySelector(`#calendarTab .calendar-day[data-date="${date}"]`);
    if (!cell) return;
    const dots = cell.querySelector('.calendar-dots') || (()=> {
      const d = document.createElement('div'); d.className='calendar-dots'; cell.appendChild(d); return d;
    })();
    // Emojis or categories -> render emojis (change to CSS dots if you prefer)
    (info.emojis || info.weather || []).forEach(sym=>{
      const s = document.createElement('span');
      s.className = 'calendar-emoji';
      s.textContent = sym;
      dots.appendChild(s);
    });
    if (info.hasNote) cell.classList.add('has-note');
    if (info.selected) cell.classList.add('is-selected');
  });
}

/* ----- Local date helpers (avoid UTC shift) ----- */
function _pad2(n){ return (n<10?'0':'') + n; }
function _toLocalISO(date){
  return date.getFullYear() + '-' + _pad2(date.getMonth()+1) + '-' + _pad2(date.getDate());
}
function _parseISODateLocal(s){
  if (!s) return new Date();
  var parts = String(s).split('-');
  var y = parseInt(parts[0],10), m = parseInt(parts[1],10)||1, d = parseInt(parts[2],10)||1;
  return new Date(y, m-1, d); // local midnight
}

/* ----- Local helpers (private) ----- */
function _populateWeatherSelect(selectId, selected) {  /* --- replace body: C1.1 --- */
  if (typeof window.buildWeatherSelect === 'function') {
    window.buildWeatherSelect(selectId, selected);
  }
}




function _populateFlockSelect(selectId) {
  var sel = byId(selectId);
  if (!sel) return;
  var fl = Array.isArray(window.flocks) ? window.flocks : [];
  var html = '';
  for (var i = 0; i < fl.length; i++) {
    html += '<option value="' + fl[i].id + '">' + fl[i].name + '</option>';
  }
  sel.innerHTML = html;
}

/* ===== New: attach both tap and long-press to a day cell ===== */
function _attachDayHandlers(cell, dateStr) {
  var pressTimer = null;
  var openedByLongPress = false;
  var LONG_PRESS_MS = 500;

  function clearTimer() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  }

  cell.addEventListener('pointerdown', function() {
    openedByLongPress = false;
    clearTimer();
    pressTimer = setTimeout(function() {
      openedByLongPress = true;
      clearTimer();
      openQuickEntryModal(dateStr);
    }, LONG_PRESS_MS);
  });

  // If the user moves/leaves/cancels before timeout, treat as normal tap
  cell.addEventListener('pointermove', clearTimer);
  cell.addEventListener('pointerup', clearTimer);
  cell.addEventListener('pointerleave', clearTimer);
  cell.addEventListener('pointercancel', clearTimer);

  // Normal tap → open the day panel (unless we already opened quick entry)
  cell.addEventListener('click', function(e) {
    if (openedByLongPress) {
      e.preventDefault();
      e.stopPropagation();
      openedByLongPress = false; // reset for next time
      return;
    }
    openDay(dateStr);
  });
}
/* --- add: FUTURE/TODAY helpers --- */
function _todayYMD(){
  return (typeof todayISO === 'function') ? todayISO() : _toLocalISO(new Date());
}
function _isFutureYMD(ymd){
  return String(ymd) > String(_todayYMD());
}

/* --- add: note-only event (used for future dates) --- */
function addNoteEvent(dateStr, noteText, weather, flock){
  var fName = (flock && flock.name) ? flock.name : 'Unnamed Flock';
  var fId   = (flock && flock.id)   ? flock.id   : '';
  var event = {
    id: 'note-' + Date.now(),
    type: 'note',
    date: dateStr,
    title: 'Note — ' + fName,   // show flock in title
    description: String(noteText || ''),
    notes: noteText || '',
    weather: weather || '',
    flockName: fName,
    flockId: fId,
    performance: ''             // not applicable
  };
  window.calendarEvents.push(event);
  if (typeof saveCalendar === 'function') saveCalendar();
  if (hasClassId('calendarTab', 'active')) renderCalendar();
  if (typeof window.openDay === 'function') openDay(dateStr);
}


/* --- add: jump the calendar to today and select it --- */
function gotoTodayOnCalendar(){
  var ymd = _todayYMD();
  var dt  = _parseISODateLocal(ymd);
  window.currentDate = new Date(dt.getFullYear(), dt.getMonth(), 1); // show month with "today"
  renderCalendar();
  if (typeof openDay === 'function') openDay(ymd); // select/open today's card
}

/* ----- Calendar events API ----- */
function addOrUpdateFcrEvent(rec, oldId) {
  // Remove previous event with old id if editing
  if (oldId) {
    var kept = [];
    for (var i = 0; i < window.calendarEvents.length; i++) {
      var e = window.calendarEvents[i];
      if (!(e.type === 'fcr' && e.refId === oldId)) kept.push(e);
    }
    window.calendarEvents = kept;
  }

  // Build description line
var feedStr = String(rec.feedAmount);
if (rec.altFeedKg && rec.altFeedKg > 0) feedStr += '/' + rec.altFeedKg;
feedStr += 'kg';

var desc = 'Feed: ' + feedStr
         + ', Eggs: ' + rec.eggCount
         + ', Birds: ' + rec.birdCount
         + ', FCR: ' + rec.fcrValue;

if (rec.feedPricePerKg) {
  desc += ', Today’s Feed Cost: ' + fmtMoney(rec.costFeedTotal, rec.currencyCode);
}
if (rec.altFeedKg && rec.altFeedKg > 0 && rec.feedPricePerKg) {
  var saved = rec.altFeedKg * rec.feedPricePerKg;
  desc += ', ≈ Saved Today: ' + fmtMoney(saved, rec.currencyCode);
}


  var event = {
    id: 'fcr-' + Date.now(),
    refId: rec.id,
    type: 'fcr',
    title: (rec.flockName || 'Unnamed Flock'),
    date: rec.date, // keep as YYYY-MM-DD (local)
    description: desc,
    // Use CSS-ready key; fall back to helper if needed
performance: (rec.perfKey || (typeof getPerformanceClass==='function' ? getPerformanceClass(rec.fcrValue) : '') || '').toLowerCase(),
    notes: rec.notes,
    weather: rec.weather
  };

  window.calendarEvents.push(event);
  if (typeof saveCalendar === 'function') saveCalendar();

  if (hasClassId('calendarTab', 'active')) renderCalendar();
}
/* Note-only events for future dates */
function addNoteEvent(dateStr, noteText, weather){
  var event = {
    id: 'note-' + Date.now(),
    type: 'note',
    date: dateStr,
    title: 'Note',
    description: String(noteText || ''),
    performance: '',           // not applicable
    notes: noteText || '',
    weather: weather || ''
  };
  window.calendarEvents.push(event);
  if (typeof saveCalendar === 'function') saveCalendar();
  if (hasClassId('calendarTab', 'active')) renderCalendar();
  // keep the panel in sync
  if (typeof window.openDay === 'function') openDay(dateStr);
}


function renderCalendar() {
  var days = byId('calendarDays');
  var month = byId('calendarMonth');
  if (!days || !month) return;

  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var year = window.currentDate.getFullYear();
  var mIdx = window.currentDate.getMonth();

  // header text
  month.textContent = months[mIdx] + ' ' + year;

  // clear grid
  days.innerHTML = '';

  // compute month layout
  var firstDay = new Date(year, mIdx, 1).getDay();
  var dim = new Date(year, mIdx + 1, 0).getDate();

  // leading blanks
  for (var i=0; i<firstDay; i++){
    var empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    days.appendChild(empty);
  }

  // real days (data-date + number + one dots container)
  for (var d=1; d<=dim; d++){
    var cell = document.createElement('div');
    cell.className = 'calendar-day';

    var yyyy = year;
    var mm = pad2(mIdx+1);
    var dd = pad2(d);
    cell.setAttribute('data-date', yyyy + '-' + mm + '-' + dd);

    var num = document.createElement('div');
    num.className = 'calendar-day-number';
    num.textContent = d;
    cell.appendChild(num);

    var dots = document.createElement('div');
    dots.className = 'calendar-dots';
    cell.appendChild(dots);

    days.appendChild(cell);
  }

  // trailing blanks to complete the last week row
  var totalCells = firstDay + dim;
  var trailing = (7 - (totalCells % 7)) % 7;
  for (var t=0; t<trailing; t++){
    var blank = document.createElement('div');
    blank.className = 'calendar-day empty';
    days.appendChild(blank);
  }

  // normalize (dedupe any stray .calendar-dots) and paint per-day content
  normalizeCalendarDOM();

  // Build or use your per-date dataset, e.g. window.calendarByDate = { "2025-09-02": {emojis:["🌧️"], hasNote:true} }
  var byDate = (typeof window.buildCalendarByDate === 'function')
    ? window.buildCalendarByDate(year, mIdx)
    : (window.calendarByDate || null);

  paintCalendarByDate(byDate);
}
// Wire click once on the days grid (idempotent)
var daysGrid = byId('calendarDays');
if (daysGrid && !daysGrid.__wired){
  daysGrid.addEventListener('click', function(e){
    const cell = e.target.closest('.calendar-day');
    if (!cell || !cell.dataset.date) return;

    // Update selected highlight
    document.querySelectorAll('#calendarTab .calendar-day.is-selected')
      .forEach(el => el.classList.remove('is-selected'));
    cell.classList.add('is-selected');

    renderCalendarEventsPanel(cell.dataset.date);
  });
  daysGrid.__wired = true;
}

// On initial render: pick selected date (or first day) and render panel
var selectedCell = document.querySelector('#calendarTab .calendar-day.is-selected')
                || document.querySelector('#calendarTab .calendar-day[data-date]');
if (selectedCell) renderCalendarEventsPanel(selectedCell.dataset.date);


function changeMonth(delta) {
  window.currentDate.setMonth(window.currentDate.getMonth() + delta);
  renderCalendar();
}

function openDay(dateStr) {
  window.selectedDate = _parseISODateLocal(dateStr);

  var opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  var full = _parseISODateLocal(dateStr).toLocaleDateString('en-US', opts);
  var lbl = byId('selectedDateText'); if (lbl) lbl.textContent = full;

  var btn = byId('addEntryForDayBtn');
  if (btn) {
    btn.style.display = 'inline-block';
    btn.textContent = 'Add entry for ' + full;
    btn.onclick = function(){ openQuickEntryModal(dateStr); };
  }

  showEventsForDate(dateStr);
}

function showEventsForDate(dateStr) {
  var list = byId('calendarEventsList');
  if (!list) return;

  var dayEvents = window.calendarEvents.filter(function(e){ return e.date === dateStr; });
  if (!dayEvents.length) {
    list.innerHTML = '<div class="input-hint" style="text-align:center;">No events for this date</div>';
    return;
  }

  // Build event items with data-ref so we can attach click listeners safely
  var html = '';
  for (var i=0;i<dayEvents.length;i++) {
    var event = dayEvents[i];
    // centralized weather label + emoji
var wxKey   = (typeof window.normalizeWeather === 'function')
  ? window.normalizeWeather(event.weather)
  : String(event.weather || '').toUpperCase();

var wxLabel = (typeof window.weatherFullName === 'function')
  ? window.weatherFullName(wxKey)
  : '';

var wxEmoji = (function(k){
  var B = window.WEATHER_BADGES;
  if (!B) return '';
  if (Array.isArray(B)) {
    for (var i=0;i<B.length;i++){ var b=B[i]; if (b && b.key===k) return b.emoji || b.icon || ''; }
    return '';
  }
  return (B[k] && (B[k].emoji || B[k].icon)) || '';
})(wxKey);

// normalize legacy perf keys (e.g., "ok" → "good")
var perf = String(event.performance || '').toLowerCase();
if (perf === 'ok') perf = 'good';
    var dataRef = encodeURIComponent(event.refId || '');
    html += ''
  + (function(){
    var pc = String(event.performance || '').toLowerCase().replace(/[\s_]+/g,'-');
    if (pc === 'needs-improvement') pc = 'poor';
    if (pc === 'ok') pc = 'good';
    var cls = (event.type === 'note') ? 'calendar-event-item noteonly'
                                  : 'calendar-event-item ' + (pc || 'manual');
return '<div class="' + cls + '" data-ref="' + dataRef + '" data-date="' + event.date + '" data-type="' + (event.type || '') + '">';
  })()
  + ((event.type !== 'note' && wxEmoji) ? '<span class="wx-card-corner' + (wxKey === '...PTIMAL' ? ' wx-optimal' : '') + '">' + wxEmoji + '</span>' : '')


      + '<div class="calendar-event-header"><div>'
      + (String(event.title || '').trim() || 'Unnamed Flock')
      + '</div><div>' + event.date + '</div></div>'
      +   '<div class="input-hint">' + (event.description || '')
      +     +     ((event.type !== 'note' && wxLabel) ? ('<br><strong>Weather:</strong> ' + wxLabel) : '')
      +     (event.notes ? ('<br><em>Notes: ' + event.notes + '</em>') : '')
      +   '</div>'
      + '</div>';
  }
  list.innerHTML = html;

  // Make each item clickable to edit the underlying record
  var items = list.querySelectorAll('.calendar-event-item');
for (var j = 0; j < items.length; j++) {
  items[j].addEventListener('click', function() {
    var ref = decodeURIComponent(this.getAttribute('data-ref') || '');
    if (ref && typeof window.openEditByRefId === 'function') {
      window.openEditByRefId(ref);
      return;
    }
        // Note-only (no ref): open Edit Entry with only Notes editable
    var d = this.getAttribute('data-date') || '';
    if (d && typeof window.openEditNoteForDate === 'function') {
      window.openEditNoteForDate(d);
    }

  });
}

}

/* ----- Quick Entry modal (stay on Calendar) ----- */
function openQuickEntryModal(dateStr) {
  if (!Array.isArray(window.flocks) || !window.flocks.length) {
    alert('Please add a flock first (Flocks tab).');
    return;
  }

  var dt = _parseISODateLocal(dateStr);
  var opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  var full = dt.toLocaleDateString('en-US', opts);

  var txt = byId('qeDateText'); if (txt) txt.textContent = full;
  var hid = byId('qeDate');     if (hid) hid.value = dateStr;

  _populateFlockSelect('qeFlock');
  var fsel = byId('qeFlock'); if (fsel && window.flocks.length) fsel.value = window.flocks[0].id;

  var fa = byId('qeFeed'), eg = byId('qeEggs'), nt = byId('qeNotes');
  if (fa) fa.value = ''; if (eg) eg.value = ''; if (nt) nt.value = '';
  // Alt feed defaults (Quick Entry)
var t = byId('qeAltToggle');
if (t) {
  t.checked = false;
  t.onchange = function(){
    var bx = byId('qeAltBox');
    if (bx) bx.style.display = this.checked ? '' : 'none';
  };
}
var bx = byId('qeAltBox'); if (bx) bx.style.display = 'none';
var ak = byId('qeAltKg');  if (ak) ak.value = '';
var an = byId('qeAltName');if (an) an.value = '';


  _populateWeatherSelect('qeWeather', '');

// future day UX: notes-only → disable inputs
var isFuture = _isFutureYMD(dateStr);
var fa = byId('qeFeed');
var eg = byId('qeEggs');
var wx = byId('qeWeather');

if (fa) { fa.disabled = isFuture; fa.placeholder = isFuture ? 'Feed disabled for future dates' : ''; }
if (eg) { eg.disabled = isFuture; eg.placeholder = isFuture ? 'Eggs disabled for future dates' : ''; }
if (wx) { wx.disabled = isFuture; wx.title = isFuture ? 'Weather selection disabled for future dates' : ''; }

  showModal('quickEntryModal');
}

function closeQuickEntry() { hideModal('quickEntryModal'); }

function submitQuickEntry() {
  var fsel = byId('qeFlock');
  if (!fsel || !fsel.value) { alert('Please select a flock.'); return; }

  // Find selected flock
  var f = null;
  for (var i=0;i<window.flocks.length;i++){
    if (window.flocks[i].id === fsel.value) { f = window.flocks[i]; break; }
  }
  if (!f) { alert('Invalid flock.'); return; }

  var dateStr  = (byId('qeDate') && byId('qeDate').value) ? byId('qeDate').value : todayISO();
  var feedAmt  = parseDec(byId('qeFeed').value);
  var eggCount = parseInt(byId('qeEggs').value, 10);
  var weather  = (byId('qeWeather') || {}).value || '';
  var notes    = (byId('qeNotes') || {}).value || '';
  // Alt feed (Quick Entry)
  var altOn       = !!(byId('qeAltToggle') && byId('qeAltToggle').checked);
  var altFeedKg   = altOn ? parseDec(((byId('qeAltKg') && byId('qeAltKg').value) || '0')) : 0;
  if (!isFinite(altFeedKg) || altFeedKg < 0) altFeedKg = 0;
  var altFeedName = altOn ? String(((byId('qeAltName') && byId('qeAltName').value) || '')).trim() : '';

  /* --- hard rule: no FCR in the future (notes-only allowed) --- */
if (_isFutureYMD(dateStr)) {
  var noteOnly = String(notes || '').trim();
  if (!noteOnly) {
    alert('Future dates allow notes/reminders only.\nPlease enter a note.');
    return;
  }
  // (optional) pick current flock for title; safe if qeFlock exists
  var fidEl = byId('qeFlock');
  var flock = null;
  if (fidEl) {
    var fid = fidEl.value;
    flock = (Array.isArray(window.flocks) ? window.flocks.find(x => String(x.id) === String(fid)) : null)
            || { id: fid, name: (fidEl.options && fidEl.options[fidEl.selectedIndex] ? fidEl.options[fidEl.selectedIndex].text : 'Unnamed Flock') };
  }
  if (typeof addNoteEvent === 'function') addNoteEvent(dateStr, noteOnly, weather, flock);
  hideModal('quickEntryModal');
  renderCalendar();
  if (typeof window.openDay === 'function') openDay(dateStr); // show it immediately
  return; // STOP: no FCR record on future dates
}


    /* --- hard rule: no FCR in the future (notes-only allowed) --- */
  if (_isFutureYMD(dateStr)) {
    var noteOnly = String(notes || '').trim();
    if (!noteOnly) {
      alert('Future dates allow notes/reminders only.\nPlease enter a note.');
      return;
    }
    if (typeof addNoteEvent === 'function') addNoteEvent(dateStr, noteOnly, weather);
    hideModal('quickEntryModal');
    renderCalendar();
    return; // stop here: no FCR record, just a note event
  }


  if (!feedAmt || !eggCount) { alert('Please fill in Feed and Eggs with valid numbers'); return; }

  var eggWeight = parseDec(f.eggWeight || '0');
  if (eggWeight < 10 || eggWeight > 200) { alert('Please set a realistic egg weight (10–200 g) on the Flocks tab'); return; }

  var feedPricePerKg = (f.feedBagCost > 0 && f.feedBagKg > 0) ? (f.feedBagCost / f.feedBagKg) : 0;
  var currencyCode   = window.defaultCurrency;

  // Prepare inputs for calculation
  window.lastInputValues = {
    dateStr: dateStr,
    altFeedKg: altFeedKg,
    altFeedName: altFeedName,
    flockName: f.name,
    flockId: f.id,
    feedAmount: feedAmt,
    eggCount: eggCount,
    birdCount: parseInt(f.birds || '1', 10),
    eggWeight: eggWeight,
    currencyCode: currencyCode,
    feedPricePerKg: feedPricePerKg,
    notes: notes,
    weather: weather
  };

  if (isDuplicate(dateStr, f.id)) {
    showModal('duplicateModal');
    return;
  }
window._persistNow = true;

  calculateFCR();
  hideModal('quickEntryModal');
  renderCalendar();
    if (typeof window.openDay === 'function') openDay(dateStr);
  if (typeof window.renderHistoryTable === 'function') window.renderHistoryTable();
}
/* --- add: C1.0 — helpers for today/future --- */
function _todayYMD(){
  return (typeof todayISO === 'function') ? todayISO() : _toLocalISO(new Date());
}
function _isFutureYMD(ymd){
  return String(ymd) > String(_todayYMD());
}

/* --- add: C1.1 — jump calendar to today and select it --- */
function gotoTodayOnCalendar(){
  try{
    var ymd = _todayYMD();
    var dt  = _parseISODateLocal(ymd);
    // show the month that contains “today”
    window.currentDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
    renderCalendar();
    // select/open the day card
    if (typeof openDay === 'function') openDay(ymd);
  }catch(e){
    renderCalendar();
  }
}

/* ========= Expose ========= */
window.addOrUpdateFcrEvent = addOrUpdateFcrEvent;
window.renderCalendar = renderCalendar;
window.changeMonth = changeMonth;
window.openDay = openDay;
window.showEventsForDate = showEventsForDate;

window.openQuickEntryModal = openQuickEntryModal;
window.closeQuickEntry = closeQuickEntry;
window.submitQuickEntry = submitQuickEntry;
window.addNoteEvent = addNoteEvent;
window.gotoTodayOnCalendar = gotoTodayOnCalendar;
window.gotoTodayOnCalendar = gotoTodayOnCalendar;
window.addNoteEvent = addNoteEvent;
window.gotoTodayOnCalendar = gotoTodayOnCalendar;
