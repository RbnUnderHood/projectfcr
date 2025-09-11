'use strict';

// Paint DHP with a display cap and color band. Raw 'dhp' stays untouched in storage.
function paintDhp(dhpRaw) {
  var CAP = 130; // allow >100 due to timing, but clamp extreme outliers visually
  var v = Math.min(Math.max(Number(dhpRaw || 0), 0), CAP);

  var el = byId('layingPercent');
  if (el) el.textContent = v.toFixed(1) + '%';

  var card = byId('dhpCard');
  if (card) {
    card.classList.remove('great', 'ok', 'low', 'poor');
    var cls = (v >= 85) ? 'great'
      : (v >= 70) ? 'ok'
        : (v >= 50) ? 'low'
          : 'poor';
    card.classList.add(cls);
  }
}

// Paint Feed per Bird/Day with color bands (kg -> grams)
function paintFeedPerBird(feedPerBirdKg) {
  var g = Number(feedPerBirdKg || 0) * 1000;
  var el = byId('feedPerBird');
  if (el) el.textContent = isFinite(g) ? Math.round(g).toLocaleString() + ' g' : '-';

  var card = byId('feedPerBirdCard');
  if (!card) return;

  card.classList.remove('great', 'ok', 'low', 'poor');
  if (!isFinite(g) || g <= 0) return;

  // Simple, layer-friendly ranges
  var cls =
    (g >= 95 && g <= 125) ? 'great' :
      ((g >= 85 && g <= 94) || (g >= 126 && g <= 135)) ? 'ok' :
        ((g >= 70 && g <= 84) || (g >= 136 && g <= 150)) ? 'low' :
          'poor';

  card.classList.add(cls);
}

// Format from kg → grams for display (e.g., 0.105 kg → "105 g")
function fmtGramsFromKg(kg) {
  var g = Math.round(Number(kg || 0) * 1000);
  return isFinite(g) ? g.toLocaleString() + ' g' : '-';
}
// Remember the latest saved calc per flock (offline, localStorage)
// Build a stable key: prefer id; else use name (lowercased)
function _flockKey(id, name) {
  id = (id || '').trim();
  name = (name || '').trim();
  return id ? ('id:' + id) : ('name:' + name.toLowerCase());
}

// Remember the latest saved calc per flock (offline, localStorage)
function _loadLastCalcByFlock(flockId, flockName) {
  try {
    var map = JSON.parse(localStorage.getItem('lastCalcByFlock') || '{}');
    var k = _flockKey(flockId, flockName);
    return map[k] || null;
  } catch (e) { return null; }
}
function _isPastDate(ymd) {
  var today = (typeof _toLocalISO === 'function') ? _toLocalISO(new Date()) : new Date().toISOString().slice(0, 10);
  return String(ymd) < String(today); // YYYY-MM-DD string compare
}
function _setCalcButtonDisabled(disabled, reason) {
  var btn = document.querySelector('.calculate-btn');
  if (!btn) return;
  if (disabled) {
    btn.setAttribute('disabled', 'disabled');
    if (reason) btn.title = reason; else btn.removeAttribute('title');
  } else {
    btn.removeAttribute('disabled');
    btn.removeAttribute('title');
  }
}

function _saveLastCalcByFlock(rec) {
  if (!rec) return;
  var k = _flockKey(rec.flockId, rec.flockName);
  var map;
  try { map = JSON.parse(localStorage.getItem('lastCalcByFlock') || '{}'); } catch (e) { map = {}; }
  map[k] = rec;
  localStorage.setItem('lastCalcByFlock', JSON.stringify(map));
}


// Clear result cards + alert (used when a flock has no prior calc)
function _clearCalcResultsUI() {
  // reset text values
  ['fcrValue', 'fcrDescription', 'feedPerBird', 'feedPerEgg', 'layingPercent', 'dailyFeedCost', 'costPerEgg', 'savedToday']
    .forEach(function (id) { var el = byId(id); if (el) el.textContent = '-'; });

  // remove performance coloring
  var dhpCard = byId('dhpCard'); if (dhpCard) dhpCard.classList.remove('great', 'ok', 'low', 'poor');
  var fcrVal = byId('fcrValue'); if (fcrVal) fcrVal.className = 'result-value';
  var fcrDesc = byId('fcrDescription'); if (fcrDesc) fcrDesc.className = 'result-description';
  var fcrCard = byId('fcrCard'); if (fcrCard) fcrCard.className = 'result-card';
  var fpbdCard = byId('feedPerBirdCard'); if (fpbdCard) fpbdCard.classList.remove('great', 'ok', 'low', 'poor');

  // hide alert
  var alertEl = byId('altFeedAlert'); if (alertEl) alertEl.style.display = 'none';

  // collapse results section
  var res = byId('results'), exp = byId('exportSection');
  if (res) res.classList.remove('show');
  if (exp) exp.style.display = 'none';
}


// Reset calculator inputs to defaults for a flock
function _resetCalculatorFormForFlock(flockId) {
  // blank common numeric fields
  ['feedAmount', 'eggCount', 'eggWeight', 'altFeedKg', 'altFeedName', 'notes'].forEach(function (id) {
    var el = byId(id); if (el) el.value = '';
  });
  // default weather (if present)
  var w = byId('weather'); if (w) w.value = w.options && w.options[0] ? w.options[0].value : (w.value || 'OPTIMAL');
  // birds from flock defaults if available
  var birdsEl = byId('birdCount');
  if (birdsEl && Array.isArray(window.flocks)) {
    for (var i = 0; i < window.flocks.length; i++) {
      var f = window.flocks[i];
      if (f && (f.id === flockId || f.name === flockId)) { birdsEl.value = f.birdCount || ''; break; }
    }
  }
  // set date to today
  var dateEl = byId('entryDate');
  var today = (typeof _toLocalISO === 'function') ? _toLocalISO(new Date()) : new Date().toISOString().slice(0, 10);
  if (dateEl) dateEl.value = today;
}

/* ========= Local helpers (Calculator flow) ========= */
function getSelectedFlock() {
  var sel = byId('flockSelect');
  var id = sel ? sel.value : null;
  var fl = window.flocks || [];
  for (var i = 0; i < fl.length; i++) {
    if (fl[i].id === id) return fl[i];
  }
  return null;
}
function requireFlockSelected() {
  var sel = byId('flockSelect');
  var hint = byId('noFlockHint');
  if (!Array.isArray(window.flocks) || !window.flocks.length) {
    if (hint) hint.style.display = 'block';
    alert('Please add a flock first (Flocks tab).');
    return false;
  }
  if (sel && !sel.value) { alert('Please select a flock.'); return false; }
  if (hint) hint.style.display = 'none';
  return true;
}
function isDuplicate(dateStr, flockId) {
  var list = window.calculationHistory || [];
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (c.date === dateStr && c.flockId === flockId) return true;
  }
  return false;
}

/* ========= UI painter (now also syncs date + flock select) ========= */
function paintCalculatorFromRecord(rec) {
  if (!rec) return;

  // recompute with current math
  var d = computeDerived({
    feedAmount: rec.feedAmount,
    eggCount: rec.eggCount,
    eggWeight: rec.eggWeight,
    birdCount: rec.birdCount,
    feedPricePerKg: rec.feedPricePerKg || 0
  });

  // FCR card
  var fcrValueEl = byId('fcrValue'), fcrCard = byId('fcrCard');
  if (fcrValueEl) { fcrValueEl.textContent = d.fcrValue; fcrValueEl.className = 'result-value ' + (d.perfKey || ''); }
  var fcrDesc = byId('fcrDescription');
  if (fcrDesc) { fcrDesc.textContent = d.perfDesc; fcrDesc.className = 'result-description ' + (d.perfKey || ''); }
  if (fcrCard) fcrCard.className = 'result-card ' + (d.perfKey || '');

  // secondary metrics
  var el;
  paintFeedPerBird(d.feedPerBird);
  if (el) el.textContent = fmtGramsFromKg(d.feedPerBird);
  paintDhp(d.layingPercentage);
  el = byId('feedPerEgg'); if (el) el.textContent = fmtGramsFromKg(d.feedPerEgg);

  // costs
  el = byId('dailyFeedCost'); if (el) el.textContent = fmtMoney(d.costFeedTotal, rec.currencyCode);
  el = byId('costPerEgg'); if (el) el.textContent = fmtMoney(d.costPerEgg, rec.currencyCode);

  // ≈ Saved today
  var savedEl = byId('savedToday');
  if (savedEl) {
    var altKg = Number(rec.altFeedKg || 0);
    var price = Number(rec.feedPricePerKg || 0);
    var saved = altKg * price;
    savedEl.textContent = (price > 0 && altKg > 0) ? fmtMoney(saved, rec.currencyCode) : '-';
  }

  // Alt-feed ratio alert (10% notice, 20% warning) under FCR card
  var alertEl = byId('altFeedAlert');
  if (alertEl) {
    var paid = Number(rec.feedAmount || 0);
    var alt = Number(rec.altFeedKg || 0);
    var total = paid + alt;
    var pct = total > 0 ? (alt / total) : 0;

    if (pct >= 0.20) {
      alertEl.className = 'alert warning';
      alertEl.textContent =
        'Warning: Alt feed is about ' + Math.round(pct * 100) + '% of today’s ration. ' +
        'High substitution can reduce egg output unless it is a full, balanced mix.';
      alertEl.style.display = '';
    } else if (pct >= 0.10) {
      alertEl.className = 'alert notice';
      alertEl.textContent =
        'Notice: Alt feed is about ' + Math.round(pct * 100) + '% of today’s ration. ' +
        'Most flocks tolerate ~10% without performance loss; monitor results.';
      alertEl.style.display = '';
    } else {
      alertEl.style.display = 'none';
    }
  }

  // remember latest
  window.currentCalculation = Object.assign({}, rec, d);

  // ensure results are visible
  var res = byId('results'), exp = byId('exportSection');
  if (res) res.classList.add('show');
  if (exp) exp.style.display = 'block';

  // swap Calculator cards (centralized here so both preview & save paths work)
  var resultsCard = byId('calcResultsCard');
  if (resultsCard) resultsCard.hidden = false;

}
// Compute & show results WITHOUT saving (enables the Save button)
function previewFCR() {
  if (!requireFlockSelected()) return;

  var f = getSelectedFlock();
  var flockName = f.name, flockId = f.id;

  // Collect inputs (same fields used by checkForDuplicate)
  var dateEl = byId('entryDate');
  var dateStr = (dateEl && dateEl.value) ? dateEl.value : todayISO();

  var feedAmount = parseDec(byId('feedAmount').value);
  var eggCount = parseInt(byId('eggCount').value, 10);
  var notes = byId('notes').value;
  var weather = byId('weather').value;

  // Alt feed (optional)
  var altOn = !!(byId('altFeedToggle') && byId('altFeedToggle').checked);
  var altFeedKg = altOn ? parseDec(byId('altFeedKg').value) : 0;
  if (!isFinite(altFeedKg) || altFeedKg < 0) altFeedKg = 0;
  var altFeedName = altOn ? String(byId('altFeedName').value || '').trim() : '';

  var birdCount = parseInt(f.birds || '1', 10);
  var eggWeight = parseDec(f.eggWeight || '0');
  var feedPricePerKg = (f.feedBagCost > 0 && f.feedBagKg > 0) ? (f.feedBagCost / f.feedBagKg) : 0;
  var currencyCode = window.defaultCurrency;

  // Basic validations (same spirit as checkForDuplicate)
  if (!feedAmount || !eggCount) { alert('Please fill in Feed and Eggs with valid numbers'); return; }
  if (eggWeight < 10 || eggWeight > 200) { alert('Please set a realistic egg weight (10–200 g) on the Flocks tab'); return; }

  // DHP clamp guard (130% max)
  var MAX_DHP = 130;
  var hens = Number(birdCount || 0);
  var dhp = hens > 0 ? (Number(eggCount || 0) / hens) * 100 : 0;
  if (isFinite(dhp) && dhp > MAX_DHP) {
    openValidationModal(
      'This entry gives % of hens laying (DHP) ≈ ' + dhp.toFixed(1) +
      '%. For data quality we only accept up to ' + MAX_DHP + '%.'
    );
    return;
  }

  // Stash for later Save (so Save uses your existing duplicate flow)
  window.lastInputValues = {
    dateStr: dateStr, flockName: flockName, flockId: flockId,
    feedAmount: feedAmount, eggCount: eggCount, birdCount: birdCount, eggWeight: eggWeight,
    currencyCode: currencyCode, feedPricePerKg: feedPricePerKg, notes: notes, weather: weather,
    altFeedKg: altFeedKg, altFeedName: altFeedName
  };

  // Compute & paint results ONLY (no save)
  var d = computeDerived({
    feedAmount: feedAmount, eggCount: eggCount, eggWeight: eggWeight,
    birdCount: birdCount, feedPricePerKg: feedPricePerKg
  });

  paintCalculatorFromRecord({
    date: dateStr, flockId: flockId, flockName: flockName,
    feedAmount: feedAmount, eggCount: eggCount, birdCount: birdCount, eggWeight: eggWeight,
    notes: notes, weather: weather, feedPricePerKg: feedPricePerKg, currencyCode: currencyCode,
    fcrValue: d.fcr, layingPercentage: d.dhp, feedPerEgg: d.feedPerEgg, feedPerBird: d.feedPerBird,
    costPerEgg: d.costPerEgg, feedPerDayTotal: d.feedAmount, performanceCategory: d.band && d.band.key,
    dailyFeedCost: d.costFeedTotal, approxSaved: ((altFeedKg || 0) * (feedPricePerKg || 0)),
    altFeedKg: altFeedKg, altFeedName: altFeedName
  });

  // Enable Save and jump to results
  var saveBtn = byId('saveDayBtn'); if (saveBtn) saveBtn.disabled = false;
  if (typeof scrollToResults === 'function') scrollToResults();
}

/* ========= Public flow functions ========= */
function checkForDuplicate() {
  if (!requireFlockSelected()) return;

  var f = getSelectedFlock();
  var flockName = f.name, flockId = f.id;

  var dateEl = byId('entryDate');
  var dateStr = (dateEl && dateEl.value) ? dateEl.value : todayISO();

  var feedAmount = parseDec(byId('feedAmount').value);
  var eggCount = parseInt(byId('eggCount').value, 10);
  var notes = byId('notes').value;
  var weather = byId('weather').value;

  // Alt feed (optional)
  var altOn = !!(byId('altFeedToggle') && byId('altFeedToggle').checked);
  var altFeedKg = altOn ? parseDec(byId('altFeedKg').value) : 0;
  if (!isFinite(altFeedKg) || altFeedKg < 0) altFeedKg = 0;
  var altFeedName = altOn ? String(byId('altFeedName').value || '').trim() : '';

  var birdCount = parseInt(f.birds || '1', 10);
  var eggWeight = parseDec(f.eggWeight || '0');

  if (!feedAmount || !eggCount) { alert('Please fill in Feed and Eggs with valid numbers'); return; }
  if (eggWeight < 10 || eggWeight > 200) { alert('Please set a realistic egg weight (10–200 g) on the Flocks tab'); return; }

  var feedPricePerKg = (f.feedBagCost > 0 && f.feedBagKg > 0) ? (f.feedBagCost / f.feedBagKg) : 0;
  var currencyCode = window.defaultCurrency;

  // Stash for compute
  window.lastInputValues = {
    dateStr: dateStr, flockName: flockName, flockId: flockId,
    feedAmount: feedAmount, eggCount: eggCount, birdCount: birdCount, eggWeight: eggWeight,
    currencyCode: currencyCode, feedPricePerKg: feedPricePerKg, notes: notes, weather: weather,
    altFeedKg: altFeedKg, altFeedName: altFeedName
  };

  // Which row would be replaced if user confirms
  window._dupKeyToReplace = dateStr + '|' + (flockName || 'default');

  // 1) PREVIEW: compute & show results without saving
  window._persistNow = false;
  calculateFCR();

  // 2) ASK TO SAVE
  if (isDuplicate(dateStr, flockId)) {
    // A record already exists for this flock+date → use the existing duplicate modal
    showModal('duplicateModal');
  } else {
    // New day for this flock → confirm save
    openLogConfirm(flockName, dateStr);
  }
}

function cancelDuplicate() { hideModal('duplicateModal'); }
function openLogConfirm(flockName, dateStr) {
  var el = byId('logConfirmText');
  if (el) el.textContent = 'Log day for "' + flockName + '" on ' + dateStr + '?';
  showModal('logConfirmModal');
}
function confirmLogConfirm() {
  hideModal && hideModal('logConfirmModal');
  window._persistNow = true;       // enable saving
  window._overrideDuplicate = false;
  if (typeof calculateFCR === 'function') calculateFCR();
  
  // Refresh UI so the new record appears immediately
try { if (typeof window.renderHistoryTable === 'function') window.renderHistoryTable(); } catch(e){}
try { if (typeof window.renderCalendar === 'function') window.renderCalendar(); } catch(e){}

}

function cancelLogConfirm() {
  hideModal && hideModal('logConfirmModal'); // keep the preview, don’t save
}

// --- Validation modal helpers ---
function openValidationModal(msg) {
  var box = byId('validationModal');
  var text = byId('validationMessage');
  if (text) text.textContent = msg;
  if (box) { box.style.display = 'flex'; box.setAttribute('aria-hidden', 'false'); }
}
function closeValidationModal() {
  var box = byId('validationModal');
  if (box) { box.style.display = 'none'; box.setAttribute('aria-hidden', 'true'); }

  // If a duplicate modal was open underneath, close it too
  var dup = byId('duplicateModal');
  if (dup && dup.style.display === 'flex') {
    hideModal && hideModal('duplicateModal'); // or: dup.style.display = 'none';
  }
}
function openValidationModal(msg) {
  var text = byId('validationMessage');
  if (text) text.textContent = msg;

  var dup = byId('duplicateModal');
  if (dup && dup.style.display === 'flex') { dup.style.display = 'none'; }

  var box = byId('validationModal');
  if (box) { box.style.display = 'flex'; box.setAttribute('aria-hidden', 'false'); }
}

function confirmDuplicate() {
  // Overwrite the existing flock+date entry on save
  window._overrideDuplicate = true;
  window._persistNow = true;
  hideModal && hideModal('duplicateModal');

  // Continue the normal flow (recompute + save)
  if (typeof calculateFCR === 'function') calculateFCR();

  // If Quick Entry modal was open, close and refresh views
  var q = byId && byId('quickEntryModal');
  if (q && q.style.display === 'flex') {
    hideModal && hideModal('quickEntryModal');
    if (typeof window.renderCalendar === 'function') window.renderCalendar();
    if (typeof window.renderHistoryTable === 'function') window.renderHistoryTable();
  }
}

function calculateFCR() {
  var v = window.lastInputValues || {};
  // Guard: DHP must not exceed 130% (eggs ÷ hens × 100)
  // Allows slight over-collection timing (>100), but blocks impossible outliers.
  var MAX_DHP = 130;
  var eggs = Number(v.eggCount || 0);
  var hens = Number(v.birdCount || 0);
  var dhp = hens > 0 ? (eggs / hens) * 100 : 0;

  if (isFinite(dhp) && dhp > MAX_DHP) {
    openValidationModal(
      'This entry gives % of hens laying (DHP) ≈ ' + dhp.toFixed(1) +
      '%. For data quality we only accept up to ' + MAX_DHP +
      '%. Please adjust eggs or hens and try again.'
    );
    return; // stop: do not compute or save
  }


  var d = computeDerived({
    feedAmount: v.feedAmount, eggCount: v.eggCount, eggWeight: v.eggWeight, birdCount: v.birdCount, feedPricePerKg: v.feedPricePerKg
  });

  // Paint Calculator from this new record
  paintCalculatorFromRecord({
    date: v.dateStr, flockId: v.flockId, flockName: v.flockName,
    feedAmount: v.feedAmount, eggCount: v.eggCount, birdCount: v.birdCount, eggWeight: v.eggWeight,
    notes: v.notes, weather: v.weather, feedPricePerKg: v.feedPricePerKg, currencyCode: v.currencyCode, altFeedKg: v.altFeedKg,
    altFeedName: v.altFeedName,

  });
  scrollToResults();

  // Persist final record
  window.currentCalculation = {
    id: v.dateStr + '|' + (v.flockName || 'default'),
    flockId: v.flockId, flockName: v.flockName, date: v.dateStr,
    feedAmount: v.feedAmount, eggCount: v.eggCount, birdCount: v.birdCount, eggWeight: v.eggWeight,
    notes: v.notes, weather: v.weather, feedPricePerKg: v.feedPricePerKg, currencyCode: v.currencyCode,
    fcrValue: d.fcrValue, performanceCategory: d.performanceCategory, feedPerBird: d.feedPerBird,
    layingPercentage: d.layingPercentage, feedPerEgg: d.feedPerEgg, costFeedTotal: d.costFeedTotal, costPerEgg: d.costPerEgg, altFeedKg: (v.altFeedKg || 0),
    altFeedName: (v.altFeedName || ''),
    approxSaved: ((v.altFeedKg || 0) * (v.feedPricePerKg || 0)),

  };

  // Only save when a modal has granted permission
  if (!window._persistNow) { return; }


  // === Save (overwrite if same flock+date) ===
  var list = Array.isArray(window.calculationHistory) ? window.calculationHistory : (window.calculationHistory = []);

  // Stable key for flock+date
  var key = window._dupKeyToReplace
    || window.currentCalculation.id
    || (window.currentCalculation.date + '|' + (window.currentCalculation.flockName || 'default'));
  window.currentCalculation.id = key;

  // Look for an existing row to replace
  var idx = -1;
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    if (!r) continue;
    if (r.id === key || (r.date === window.currentCalculation.date && (r.flockName || '') === (window.currentCalculation.flockName || ''))) {
      idx = i; break;
    }
  }

  var replaced = false;
  if (idx >= 0) {
    // Only overwrite after user confirmed the duplicate modal
    if (window._overrideDuplicate) {
      list[idx] = window.currentCalculation;
      replaced = true;
    } else {
      // Shouldn’t happen because we gate with the modal, but bail safely
      if (typeof console !== 'undefined') console.warn('Blocked unintended duplicate save for', key);
      return;
    }
  } else {
    // No duplicate — add new (append to keep your export fallback working)
    list.push(window.currentCalculation);
  }

  // Reset the flag after handling
  window._overrideDuplicate = false;

  if (typeof window.saveHistory === 'function') window.saveHistory();

  // Update calendar; pass oldId when we replaced so the event can be updated in place
  if (typeof window.addOrUpdateFcrEvent === 'function') {
    var oldId = replaced ? key : null;
    window.addOrUpdateFcrEvent(window.currentCalculation, oldId);
    _saveLastCalcByFlock(window.currentCalculation);
    window._persistNow = false;
    window._overrideDuplicate = false;

  }

}
// Find an existing record by date + flock (id or name)
function _findHistoryByDateAndFlock(dateStr, flockId, flockName) {
  var list = Array.isArray(window.calculationHistory) ? window.calculationHistory : [];
  var key = dateStr + '|' + (flockName || 'default');
  var lname = (flockName || '').toLowerCase();

  for (var i = 0; i < list.length; i++) {
    var r = list[i]; if (!r) continue;
    if (r.id === key) return r;
    if (r.date === dateStr && (
      (flockId && r.flockId === flockId) ||
      (lname && (r.flockName || '').toLowerCase() === lname)
    )) return r;
  }
  return null;
}

// Load by current selection: exact date+flock if present, else last-by-flock, else reset
function _loadCalcForSelection(dateStr, flockId, flockName) {
  var rec = _findHistoryByDateAndFlock(dateStr, flockId, flockName);
  var isPast = _isPastDate(dateStr);

  if (rec) {
    window._editingKey = rec.id || (rec.date + '|' + (rec.flockName || 'default'));
    paintCalculatorFromRecord(rec);
    _setCalcButtonDisabled(false);
    return true;
  }

  // PAST date with NO entry → clear and disable (do NOT paint cached)
  if (isPast) {
    window._editingKey = null;
    _resetCalculatorFormForFlock(flockId);
    _clearCalcResultsUI();                           // hide/clear everything
    _setCalcButtonDisabled(true, 'Past date: only existing entries can be edited.');
    return false;
  }

  // TODAY (or future) with no entry → show last-by-flock if we have it, else clear
  var cached = _loadLastCalcByFlock(flockId, flockName);
  window._editingKey = null;
  if (cached) {
    paintCalculatorFromRecord(cached);
  } else {
    _resetCalculatorFormForFlock(flockId);
    _clearCalcResultsUI();
  }
  _setCalcButtonDisabled(false);
  return !!cached;
}



function exportToCSV() {
  var r = (window.currentCalculation && window.currentCalculation.date)
    ? window.currentCalculation
    : (window.calculationHistory[window.calculationHistory.length - 1]);
  if (!r) { alert('Please calculate first.'); return; }

  var headers = [
    'Flock Name', 'Date', 'Feed Amount (kg)', 'Egg Count', 'Bird Count', 'Egg Weight (g)',
    'Weather', 'Notes', 'FCR', 'Performance Category', 'Feed per Bird (kg)',
    'Laying Percentage (%)', 'Feed Price per kg', 'Currency', "Today's Feed Cost", 'Cost per Egg',
    'Alt Feed (kg)', 'Alt Feed Name'
  ];

  function _wxLabel(val) {
    try {
      var k = (typeof window.normalizeWeather === 'function')
        ? window.normalizeWeather(val)
        : String(val || '').toUpperCase();

      if (typeof window.weatherFullName === 'function')
        return window.weatherFullName(k) || '';

      var B = window.WEATHER_BADGES;
      if (B) {
        if (Array.isArray(B)) {
          for (var i = 0; i < B.length; i++) { var b = B[i]; if (b && b.key === k) return b.label || ''; }
        } else if (B[k]) {
          return B[k].label || '';
        }
      }
      return '';
    } catch (e) { console.warn('[csv] weather label fail', e); return ''; }
  }
  var weatherName = _wxLabel(r.weather);
  function csvEscape(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }
  var values = [
    csvEscape(r.flockName || ''), r.date, r.feedAmount, r.eggCount, r.birdCount, r.eggWeight,
    csvEscape(weatherName), csvEscape(r.notes || ''), r.fcrValue, r.performanceCategory,
    r.feedPerBird, r.layingPercentage, (r.feedPricePerKg || 0), r.currencyCode,
    (r.costFeedTotal != null ? r.costFeedTotal : ''), (r.costPerEgg != null ? r.costPerEgg : ''),
    (r.altFeedKg != null ? r.altFeedKg : ''), csvEscape(r.altFeedName || '')
  ];

  var csvContent = headers.join(',') + '\n' + values.join(',');
  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  var url = URL.createObjectURL(blob);
  var formattedDate = todayISO();
  var flockNameSlug = String(r.flockName || 'flock').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  link.setAttribute('href', url);
  link.setAttribute('download', 'FCR_' + flockNameSlug + '_' + formattedDate + '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function resetToToday() { var el = byId('entryDate'); if (el) el.value = todayISO(); }
// When user changes flock in the Calculator, show that flock's last calc (or reset)
window.addEventListener('load', function () {
  var sel = byId('flockSelect');
  if (!sel) return;

  sel.addEventListener('change', function () {
    var flockId = sel.value;
    var opt = sel.options[sel.selectedIndex];
    var flockName = opt ? (opt.getAttribute('data-name') || opt.text || '') : '';

    var cached = _loadLastCalcByFlock(flockId, flockName);
    if (cached) {
      paintCalculatorFromRecord(cached);
    } else {
      _resetCalculatorFormForFlock(flockId);
      _clearCalcResultsUI();
    }
  });
});
// When flock or date changes, load matching record (or last-by-flock) into the UI
window.addEventListener('load', function () {
  var sel = byId('flockSelect');
  var dateEl = byId('entryDate');
  if (!sel || !dateEl) return;

  function refreshFromSelection() {
    var flockId = sel.value;
    var opt = sel.options[sel.selectedIndex];
    var flockName = opt ? (opt.getAttribute('data-name') || opt.text || '') : '';
    var dateStr = dateEl.value || (typeof _toLocalISO === 'function' ? _toLocalISO(new Date()) : new Date().toISOString().slice(0, 10));
    _loadCalcForSelection(dateStr, flockId, flockName);
  }

  sel.addEventListener('change', refreshFromSelection);
  dateEl.addEventListener('change', refreshFromSelection); refreshFromSelection(); // set initial state on page load

});
// Smooth-scroll to the FCR result card (fallback to instant on old browsers)
function scrollToResults() {
  var el = byId('fcrCard') || byId('results');
  if (!el) return;
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    el.scrollIntoView(true); // older Android fallback
  }
}

/* ========= Expose ========= */
window.getSelectedFlock = getSelectedFlock;
window.requireFlockSelected = requireFlockSelected;
window.isDuplicate = isDuplicate;

window.paintCalculatorFromRecord = paintCalculatorFromRecord;

window.checkForDuplicate = checkForDuplicate;
window.confirmDuplicate = confirmDuplicate;
window.cancelDuplicate = cancelDuplicate;
window.calculateFCR = calculateFCR;

window.exportToCSV = exportToCSV;
window.resetToToday = resetToToday;
