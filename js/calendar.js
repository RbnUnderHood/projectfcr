'use strict';

// ---- Day-level weather (one per date) ----
window.dayWeather = window.dayWeather || {};

function _normalizeWx(x) {
  // prefer your normalizeWeather if present; else uppercase key
  return typeof window.normalizeWeather === 'function'
    ? window.normalizeWeather(x)
    : String(x || '').toUpperCase();
}

function getDayWeather(dateStr) {
  const w = window.dayWeather[dateStr];
  return w ? _normalizeWx(w) : '';
}

function setDayWeather(dateStr, weather) {
  const key = _normalizeWx(weather);
  if (!key) return;
  window.dayWeather[dateStr] = key;

  // sync all events on that date to the canonical day weather
  const arr = Array.isArray(window.calendarEvents)
    ? window.calendarEvents
    : (window.calendarEvents = []);
  for (const ev of arr) {
    if (ev && (ev.date === dateStr || ev.isoDate === dateStr)) {
      ev.weather = key;
    }
  }
  if (typeof saveCalendar === 'function') saveCalendar();
}

// Rebuild dayWeather on load (so it persists via events)
function bootstrapDayWeatherFromEvents() {
  const arr = Array.isArray(window.calendarEvents) ? window.calendarEvents : [];
  for (const ev of arr) {
    if (!ev || !ev.date || !ev.weather) continue;
    if (!window.dayWeather[ev.date]) {
      window.dayWeather[ev.date] = _normalizeWx(ev.weather);
    }
  }
}
document.addEventListener('DOMContentLoaded', bootstrapDayWeatherFromEvents);

// Legacy painter disabled (kept as no-ops to avoid accidental calls)
function normalizeCalendarDOM() {}
function paintCalendarByDate() {}
window.calendarByDate = {};
window.buildCalendarByDate = function () {
  return {};
};

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

function toDateParts(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatLongDate(yyyyMmDd) {
  const dt = toDateParts(yyyyMmDd);
  return dt.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

/* ----- Local date helpers (avoid UTC shift) ----- */
function _pad2(n) {
  return (n < 10 ? '0' : '') + n;
}
function _toLocalISO(date) {
  return date.getFullYear() + '-' + _pad2(date.getMonth() + 1) + '-' + _pad2(date.getDate());
}
function _parseISODateLocal(s) {
  if (!s) return new Date();
  var parts = String(s).split('-');
  var y = parseInt(parts[0], 10),
    m = parseInt(parts[1], 10) || 1,
    d = parseInt(parts[2], 10) || 1;
  return new Date(y, m - 1, d); // local midnight
}

/* ----- Local helpers (private) ----- */
function _populateWeatherSelect(selectId, selected) {
  /* --- replace body: C1.1 --- */
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
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  cell.addEventListener('pointerdown', function () {
    openedByLongPress = false;
    clearTimer();
    pressTimer = setTimeout(function () {
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
  cell.addEventListener('click', function (e) {
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
function _todayYMD() {
  return typeof todayISO === 'function' ? todayISO() : _toLocalISO(new Date());
}
function _isFutureYMD(ymd) {
  return String(ymd) > String(_todayYMD());
}
// zero-pad 1→"01"
function pad2(n) {
  return String(n).padStart(2, '0');
}

/* --- add: note-only event (used for future dates) --- */
function addNoteEvent(dateStr, noteText, weather, flock) {
  var fName = flock && flock.name ? flock.name : 'Unnamed Flock';
  var fId = flock && flock.id ? flock.id : '';
  var event = {
    id: 'note-' + Date.now(),
    type: 'note',
    date: dateStr,
    title: 'Note — ' + fName, // show flock in title
    description: String(noteText || ''),
    notes: noteText || '',
    weather: weather || '',
    flockName: fName,
    flockId: fId,
    performance: '', // not applicable
  };
  window.calendarEvents.push(event);
  if (typeof saveCalendar === 'function') saveCalendar();
  if (hasClassId('calendarTab', 'active')) renderCalendar();
  if (typeof window.openDay === 'function') openDay(dateStr);
}

/* --- add: jump the calendar to today and select it --- */
function gotoTodayOnCalendar() {
  var ymd = _todayYMD();
  var dt = _parseISODateLocal(ymd);
  window.currentDate = new Date(dt.getFullYear(), dt.getMonth(), 1); // show month with "today"
  renderCalendar();
  if (typeof openDay === 'function') openDay(ymd); // select/open today's card
}

/* ----- Calendar events API ----- */
function addOrUpdateFcrEvent(rec, oldId) {
  // === SPEC-1 PATCH A2: Canonical weather on save ===
  try {
    const ymd = String(rec?.date || rec?.isoDate || '');
    if (ymd && rec?.weather) {
      setDayWeather(ymd, rec.weather); // normalizes + updates all same-day events + save
    }
  } catch (e) {
    console.warn('SPEC-1 A2: setDayWeather failed', e);
  }
  // === end SPEC-1 PATCH A2 ===

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

  var desc =
    'Feed: ' +
    feedStr +
    ', Eggs: ' +
    rec.eggCount +
    ', Birds: ' +
    rec.birdCount +
    ', FCR: ' +
    rec.fcrValue;

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
    title: rec.flockName || 'Unnamed Flock',
    date: rec.date, // keep as YYYY-MM-DD (local)
    description: desc,
    // Use CSS-ready key; fall back to helper if needed
    performance: (
      rec.perfKey ||
      (typeof getPerformanceClass === 'function' ? getPerformanceClass(rec.fcrValue) : '') ||
      ''
    ).toLowerCase(),
    notes: rec.notes,
    weather: rec.weather,
  };

  window.calendarEvents.push(event);
  if (typeof saveCalendar === 'function') saveCalendar();

  if (hasClassId('calendarTab', 'active')) renderCalendar();
}
/* Note-only events for future dates */
function addNoteEvent(dateStr, noteText, weather) {
  var event = {
    id: 'note-' + Date.now(),
    type: 'note',
    date: dateStr,
    title: 'Note',
    description: String(noteText || ''),
    performance: '', // not applicable
    notes: noteText || '',
    weather: weather || '',
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

  var months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
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
  for (var i = 0; i < firstDay; i++) {
    var empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    days.appendChild(empty);
  }

  // real days (data-date + number + one dots container)
  for (var d = 1; d <= dim; d++) {
    var cell = document.createElement('div');
    cell.className = 'calendar-day';

    var yyyy = year;
    var mm = pad2(mIdx + 1);
    var dd = pad2(d);
    cell.setAttribute('data-date', yyyy + '-' + mm + '-' + dd);

    var num = document.createElement('div');
    num.className = 'calendar-day-number';
    num.textContent = d;
    cell.appendChild(num);
    days.appendChild(cell);
  }

  // trailing blanks to complete the last week row
  var totalCells = firstDay + dim;
  var trailing = (7 - (totalCells % 7)) % 7;
  for (var t = 0; t < trailing; t++) {
    var blank = document.createElement('div');
    blank.className = 'calendar-day empty';
    days.appendChild(blank);
  }
  // === SPEC-1 PATCH A3 (rev): Bootstrap when first run OR when map is empty ===
  const __wxEmpty = !window.dayWeather || Object.keys(window.dayWeather).length === 0;
  if (!window.__wxBootstrapped || __wxEmpty) {
    window.__wxBootstrapped = true;
    try {
      bootstrapDayWeatherFromEvents();
    } catch (e) {
      console.warn('SPEC-1 A3: bootstrap error', e);
    }
  }
  try {
    decorateCalendarMonth();
  } catch (e) {
    console.warn('SPEC-1 A3: decorate error', e);
  }
  // === end SPEC-1 PATCH A3 (rev) ===
}
// Wire click once on the days grid (idempotent)
var daysGrid = byId('calendarDays');
if (daysGrid && !daysGrid.__wired) {
  daysGrid.addEventListener('click', function (e) {
    const cell = e.target.closest('.calendar-day');
    if (!cell || !cell.dataset.date) return;

    // Update selected highlight
    document
      .querySelectorAll('#calendarTab .calendar-day.is-selected')
      .forEach((el) => el.classList.remove('is-selected'));
    cell.classList.add('is-selected');

    if (typeof openDay === 'function') openDay(cell.dataset.date);
    else if (typeof showEventsForDate === 'function') showEventsForDate(cell.dataset.date);
  });
  daysGrid.__wired = true;
}

// On initial render: pick selected date (or first day) and render panel
var selectedCell =
  document.querySelector('#calendarTab .calendar-day.is-selected') ||
  document.querySelector('#calendarTab .calendar-day[data-date]');
if (selectedCell) {
  if (typeof openDay === 'function') openDay(selectedCell.dataset.date);
  else if (typeof showEventsForDate === 'function') showEventsForDate(selectedCell.dataset.date);
}

function changeMonth(delta) {
  window.currentDate.setMonth(window.currentDate.getMonth() + delta);
  renderCalendar();
}

function openDay(dateStr) {
  window.selectedDate = _parseISODateLocal(dateStr);

  var opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  var full = _parseISODateLocal(dateStr).toLocaleDateString('en-US', opts);
  var lbl = byId('selectedDateText');
  if (lbl) lbl.textContent = full;

  var btn = byId('addEntryForDayBtn');
  if (btn) {
    btn.style.display = 'inline-block';
    btn.textContent = 'Add entry for ' + full;
    btn.onclick = function () {
      openQuickEntryModal(dateStr);
    };
  }

  showEventsForDate(dateStr);
}

function showEventsForDate(dateStr) {
  const list = document.getElementById('calendarEventsList');
  if (!list) return;

  const events = (window.calendarEvents || []).filter((e) => e.date === dateStr);
  list.innerHTML = '';

  if (events.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'input-hint';
    empty.style.textAlign = 'center';
    empty.textContent = 'No entries yet.';
    list.appendChild(empty);
    return;
  }

  events.forEach((ev) => {
    // card container + performance class for left border
    const card = document.createElement('div');
    card.className = 'calendar-event-item';
    let perf = ev.type === 'note' ? 'noteonly' : String(ev.performance || '').toLowerCase();
    if (perf === 'ok') perf = 'good';
    if (perf === 'needs-improvement') perf = 'poor';
    if (perf) card.classList.add(perf);

    // data for editors
    card.dataset.ref = ev.refId || '';
    card.dataset.type = ev.type || '';
    card.dataset.date = ev.date || '';

    // header row: title | date
    const header = document.createElement('div');
    header.className = 'calendar-event-header';

    const hLeft = document.createElement('div');
    hLeft.textContent =
      ev.title || (ev.type === 'note' ? 'Note' : ev.flockName || ev.flock || 'Entry');

    const hRight = document.createElement('div');
    hRight.textContent = ev.date || '';

    header.append(hLeft, hRight);
    card.append(header);

    // meta/description block
    const meta = document.createElement('div');
    meta.className = 'input-hint';

    const wxKey =
      typeof window.normalizeWeather === 'function'
        ? window.normalizeWeather(ev.weather)
        : String(ev.weather || '').toUpperCase();
    const wxLabel =
      typeof window.weatherFullName === 'function' ? window.weatherFullName(wxKey) : '';

    const bits = [];
    if (ev.description) bits.push(ev.description);
    if (ev.type !== 'note' && wxLabel) bits.push('<strong>Weather:</strong> ' + wxLabel);
    if (ev.notes) bits.push('<em>Notes: ' + ev.notes + '</em>');
    meta.innerHTML = bits.join('<br>');

    if (meta.innerHTML) card.append(meta);

    list.append(card);
  });

  // click-to-edit
  list.querySelectorAll('.calendar-event-item').forEach((el) => {
    el.addEventListener('click', () => {
      const ref = el.dataset.ref;
      if (ref && typeof window.openEditByRefId === 'function') {
        window.openEditByRefId(ref);
        return;
      }
      if (el.dataset.type === 'note' && typeof window.openEditNoteForDate === 'function') {
        window.openEditNoteForDate(el.dataset.date);
      }
    });
  });
}

/* ----- Quick Entry modal (stay on Calendar) ----- */
function openQuickEntryModal(dateStr) {
  if (!Array.isArray(window.flocks) || !window.flocks.length) {
    alert('Please add a flock first (Flocks tab).');
    return;
  }

  var dt = _parseISODateLocal(dateStr);
  var opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  var full = dt.toLocaleDateString('en-US', opts);

  var txt = byId('qeDateText');
  if (txt) txt.textContent = full;
  var hid = byId('qeDate');
  if (hid) hid.value = dateStr;

  _populateFlockSelect('qeFlock');
  var fsel = byId('qeFlock');
  if (fsel && window.flocks.length) fsel.value = window.flocks[0].id;

  var fa = byId('qeFeed'),
    eg = byId('qeEggs'),
    nt = byId('qeNotes');
  if (fa) fa.value = '';
  if (eg) eg.value = '';
  if (nt) nt.value = '';
  // Alt feed defaults (Quick Entry)
  var t = byId('qeAltToggle');
  if (t) {
    t.checked = false;
    t.onchange = function () {
      var bx = byId('qeAltBox');
      if (bx) bx.style.display = this.checked ? '' : 'none';
    };
  }
  var bx = byId('qeAltBox');
  if (bx) bx.style.display = 'none';
  var ak = byId('qeAltKg');
  if (ak) ak.value = '';
  var an = byId('qeAltName');
  if (an) an.value = '';

  _populateWeatherSelect('qeWeather', getDayWeather(dateStr) || '');

  // future day UX: notes-only → disable inputs
  var isFuture = _isFutureYMD(dateStr);
  var fa = byId('qeFeed');
  var eg = byId('qeEggs');
  var wx = byId('qeWeather');

  if (fa) {
    fa.disabled = isFuture;
    fa.placeholder = isFuture ? 'Feed disabled for future dates' : '';
  }
  if (eg) {
    eg.disabled = isFuture;
    eg.placeholder = isFuture ? 'Eggs disabled for future dates' : '';
  }
  if (wx) {
    wx.disabled = isFuture;
    wx.title = isFuture ? 'Weather selection disabled for future dates' : '';
  }

  showModal('quickEntryModal');
}

function closeQuickEntry() {
  hideModal('quickEntryModal');
}

function submitQuickEntry() {
  var fsel = byId('qeFlock');
  if (!fsel || !fsel.value) {
    alert('Please select a flock.');
    return;
  }

  // Find selected flock
  var f = null;
  for (var i = 0; i < window.flocks.length; i++) {
    if (window.flocks[i].id === fsel.value) {
      f = window.flocks[i];
      break;
    }
  }
  if (!f) {
    alert('Invalid flock.');
    return;
  }

  var dateStr = byId('qeDate') && byId('qeDate').value ? byId('qeDate').value : todayISO();
  var feedAmt = parseDec(byId('qeFeed').value);
  var eggCount = parseInt(byId('qeEggs').value, 10);
  var weather = (byId('qeWeather') || {}).value || '';
  var notes = (byId('qeNotes') || {}).value || '';

  // Alt feed (Quick Entry)
  var altOn = !!(byId('qeAltToggle') && byId('qeAltToggle').checked);
  var altFeedKg = altOn ? parseDec((byId('qeAltKg') && byId('qeAltKg').value) || '0') : 0;
  if (!isFinite(altFeedKg) || altFeedKg < 0) altFeedKg = 0;
  var altFeedName = altOn
    ? String((byId('qeAltName') && byId('qeAltName').value) || '').trim()
    : '';

  // --- FUTURE DATES: notes-only; enforce day-level weather as well ---
  if (_isFutureYMD(dateStr)) {
    var noteOnly = String(notes || '').trim();
    if (!noteOnly) {
      alert('Future dates allow notes/reminders only.\nPlease enter a note.');
      return;
    }

    // Canonicalize weather for the day (set if provided; otherwise keep existing)
    if (weather) setDayWeather(dateStr, weather);
    else weather = getDayWeather(dateStr) || '';

    if (typeof addNoteEvent === 'function') addNoteEvent(dateStr, noteOnly, weather);
    hideModal('quickEntryModal');
    renderCalendar();
    if (typeof window.openDay === 'function') openDay(dateStr);
    return; // stop here: no FCR on future dates
  }

  // --- NORMAL DATES: canonicalize weather at the day level ---
  if (weather) setDayWeather(dateStr, weather);
  else weather = getDayWeather(dateStr) || '';

  if (!feedAmt || !eggCount) {
    alert('Please fill in Feed and Eggs with valid numbers');
    return;
  }

  var eggWeight = parseDec(f.eggWeight || '0');
  if (eggWeight < 10 || eggWeight > 200) {
    alert('Please set a realistic egg weight (10–200 g) on the Flocks tab');
    return;
  }

  var feedPricePerKg = f.feedBagCost > 0 && f.feedBagKg > 0 ? f.feedBagCost / f.feedBagKg : 0;
  var currencyCode = window.defaultCurrency;

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
    weather: weather, // <-- canonical day-level weather
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

// @ts-check

/** priority: poor (3) > average (2) > good (1) > excellent (0) */
const PERF_ORDER = { excellent: 0, good: 1, average: 2, poor: 3 };

/** Ensure the three UI zones exist on a day cell */
function ensureCalendarCellUI(cell) {
  if (!cell.querySelector('.day-badge.note')) {
    const n = document.createElement('div');
    n.className = 'day-badge note';
    cell.appendChild(n);
  }
  if (!cell.querySelector('.day-badge.weather')) {
    const w = document.createElement('div');
    w.className = 'day-badge weather';
    cell.appendChild(w);
  }
  if (!cell.querySelector('.dot-strip')) {
    const s = document.createElement('div');
    s.className = 'dot-strip';
    cell.appendChild(s);
  }
}

/** Sort by severity desc, then by startTime asc */
function bySeverityThenTime(a, b) {
  const wa = PERF_ORDER[String(a?.performance || 'excellent').toLowerCase()] ?? 0;
  const wb = PERF_ORDER[String(b?.performance || 'excellent').toLowerCase()] ?? 0;
  if (wb !== wa) return wb - wa;
  return String(a?.startTime || '').localeCompare(String(b?.startTime || ''));
}

/** Decorate all day cells with dots, weather, and note badge */
function decorateCalendarMonth(root = document) {
  /** @type {NodeListOf<HTMLElement>} */
  const cells = root.querySelectorAll('#recordsTab #calendarTab .calendar-day[data-date]');
  for (const cell of cells) {
    const date = cell.getAttribute('data-date');
    if (!date) continue;

    ensureCalendarCellUI(cell);
    const noteBadge = /** @type {HTMLElement} */ (cell.querySelector('.day-badge.note'));
    const wxBadge = /** @type {HTMLElement} */ (cell.querySelector('.day-badge.weather'));
    const strip = /** @type {HTMLElement} */ (cell.querySelector('.dot-strip'));
    noteBadge.textContent = '';
    wxBadge.textContent = '';

    strip.textContent = '';

    // events for that date
    const all = /** @type {any[]} */ (window.calendarEvents || []);
    const events = all.filter((e) => e && (e.date === date || e.isoDate === date));

    // notes → 📝
    const hasNote = events.some((e) => String(e?.note || e?.notes || '').trim().length > 0);
    if (hasNote) noteBadge.textContent = '📝';

    // weather → emoji ONLY (prefer day-level weather if available)
    const normalize =
      typeof window.normalizeWeather === 'function'
        ? window.normalizeWeather
        : (x) => String(x || '').toUpperCase();
    const map = /** @type {Record<string, {emoji:string}>|undefined} */ (window.WEATHER_BADGES);

    const wxEntry = events
      .filter((e) => e?.weather)
      .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))[0];

    const dayWx = typeof getDayWeather === 'function' ? getDayWeather(date) : '';
    const wxKey = dayWx || (wxEntry ? normalize(wxEntry.weather) : '');

    // set emoji and mark key on the element so CSS can target it
    if (wxKey) {
      const emoji = map?.[String(wxKey).toUpperCase()]?.emoji || '';
      wxBadge.textContent = emoji;
      wxBadge.setAttribute('data-wx', String(wxKey).toUpperCase());
    } else {
      wxBadge.textContent = '';
      wxBadge.removeAttribute('data-wx');
    }

    // dots (max 3)
    const ranked = events.filter((e) => e?.performance).sort(bySeverityThenTime);
    const top3 = ranked.slice(0, 3);
    for (const ev of top3) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.setAttribute('data-performance', String(ev.performance).toLowerCase());
      strip.appendChild(dot);
    }

    // aria-label
    const counts = ranked.reduce((acc, ev) => {
      const k = String(ev.performance).toLowerCase();
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, /** @type {Record<string, number>} */ ({}));

    const parts = [];
    if (ranked.length) parts.push(`${ranked.length} events`);

    const perfSummary = Object.entries(counts)
      .map(([k, n]) => `${n} ${k}`)
      .join(', ');
    if (perfSummary) parts.push(perfSummary);

    if (wxKey) {
      const full = /** @type {(x:any)=>string|undefined} */ (window.weatherFullName);
      parts.push(full ? full(wxKey) : 'weather');
    }

    if (hasNote) parts.push('has note');
    if (parts.length) cell.setAttribute('aria-label', `${date}: ${parts.join('; ')}`);
  }
}

/** Re-decorate automatically whenever the month grid is replaced */
function startCalendarDecorationObserver() {
  const container =
    document.querySelector('#recordsTab #calendarTab #calendarDays') ||
    document.querySelector('#calendarDays');
  if (!container) return;

  // decorate now
  decorateCalendarMonth();

  // decorate on month changes (when grid children are replaced)
  const obs = new MutationObserver((mutations) => {
    if (mutations.some((m) => m.type === 'childList')) {
      // wait one frame for the new grid to settle
      requestAnimationFrame(() => decorateCalendarMonth());
    }
  });
  obs.observe(container, { childList: true }); // no subtree -> avoids loops
}

// expose for console/manual use & run on page load
window.decorateCalendarMonth = decorateCalendarMonth;
document.addEventListener('DOMContentLoaded', startCalendarDecorationObserver);

/* --- add: C1.0 — helpers for today/future --- */
function _todayYMD() {
  return typeof todayISO === 'function' ? todayISO() : _toLocalISO(new Date());
}
function _isFutureYMD(ymd) {
  return String(ymd) > String(_todayYMD());
}

/* --- add: C1.1 — jump calendar to today and select it --- */
function gotoTodayOnCalendar() {
  try {
    var ymd = _todayYMD();
    var dt = _parseISODateLocal(ymd);
    // show the month that contains “today”
    window.currentDate = new Date(dt.getFullYear(), dt.getMonth(), 1);
    renderCalendar();
    // select/open the day card
    if (typeof openDay === 'function') openDay(ymd);
  } catch (e) {
    renderCalendar();
  }
}

/* ========= Expose ========= */
Object.assign(window, {
  addOrUpdateFcrEvent,
  renderCalendar,
  changeMonth,
  openDay,
  showEventsForDate,
  openQuickEntryModal,
  closeQuickEntry,
  submitQuickEntry,
  addNoteEvent,
  gotoTodayOnCalendar,
  decorateCalendarMonth,
});
