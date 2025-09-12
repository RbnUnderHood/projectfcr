'use strict';

// ---------- DOM helpers ----------
function byId(id) {
  return document.getElementById(id);
}
function hasClassId(id, cls) {
  var el = byId(id);
  return !!(el && el.classList && el.classList.contains(cls));
}

// ---------- Modal helpers ----------
function showModal(id) {
  var m = byId(id);
  if (!m) return;

  // keep modals directly under <body> so they overlay correctly
  if (m.parentElement !== document.body) {
    document.body.appendChild(m);
  }

  m.style.display = 'flex';
  m.setAttribute('aria-hidden', 'false');

  // lock background (CSS: body.modal-open { overflow:hidden; } etc.)
  document.body.classList.add('modal-open');
}

function hideModal(id) {
  var m = byId(id);
  if (!m) return;

  m.style.display = 'none';
  m.setAttribute('aria-hidden', 'true');

  // remove lock only if no other modal is still visible
  var anyVisible = Array.prototype.some.call(
    document.querySelectorAll('.modal'),
    function (el) { return getComputedStyle(el).display !== 'none'; }
  );
  if (!anyVisible) document.body.classList.remove('modal-open');
}

// ---------- Date helper ----------
function todayISO() {
  // Keep behavior consistent with previous versions (UTC date part)
  return new Date().toISOString().split('T')[0];
}

// ---------- Currency helpers ----------
// NOTE: These depend on CURRENCY_SYMBOLS and DECIMALS_MAP,
// which are defined in js/state.js loaded after this file.
// That's OK because functions are evaluated when called.
function currencySymbol(code) {
  /* global CURRENCY_SYMBOLS */
  return (typeof CURRENCY_SYMBOLS !== 'undefined' && CURRENCY_SYMBOLS[code]) ? CURRENCY_SYMBOLS[code] : code;
}
function currencyDecimals(code) {
  /* global DECIMALS_MAP */
  return (typeof DECIMALS_MAP !== 'undefined' && Object.prototype.hasOwnProperty.call(DECIMALS_MAP, code))
    ? DECIMALS_MAP[code]
    : 2;
}
function fmtMoney(n, code) {
  if (n == null || isNaN(n)) return '-';
  var dec = currencyDecimals(code);
  return currencySymbol(code) + ' ' + Number(n).toLocaleString(undefined, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

// Expose helpers if needed (for inline onclicks, tests, etc.)
window.byId = byId;
window.showModal = showModal;
window.hideModal = hideModal;
window.todayISO = todayISO;
window.currencySymbol = currencySymbol;
window.fmtMoney = fmtMoney;

// ---------- Flexible decimal parser (accepts "2.5" and "2,5") ----------
function parseDec(val) {
  if (val == null) return NaN;
  if (typeof val === 'number') return val;
  var s = String(val).trim();
  if (!s) return NaN;
  // normalize comma to dot
  s = s.replace(/,/g, '.');
  // keep digits and a single dot
  var out = '';
  var dotSeen = false;
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    if (ch >= '0' && ch <= '9') out += ch;
    else if (ch === '.' && !dotSeen) { out += '.'; dotSeen = true; }
  }
  return out ? parseFloat(out) : NaN;
}

window.parseDec = parseDec;
// ---- Quick Entry modal: Cancel / Delete (Clear) ----
document.addEventListener('DOMContentLoaded', function () {
  // Helper: clear all QE fields and hide the alt-feed box
  function resetQuickEntryForm() {
    var ids = ['qeFeedAmount','qeEggCount','qeNotes','qeWeather','qeAltFeedKg','qeAltFeedName'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') el.value = '';
      else el.value = '';
    });
    var t = document.getElementById('qeAltFeedToggle'); if (t) t.checked = false;
    var box = document.getElementById('qeAltFeedBox');   if (box) box.style.display = 'none';
  }

  var cancelBtn = document.getElementById('qeCancelBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', function () {
    resetQuickEntryForm();
    hideModal('quickEntryModal');
  });

  var delBtn = document.getElementById('qeDeleteBtn'); // “Delete” behaves as Clear here
  if (delBtn) delBtn.addEventListener('click', function () {
    if (!confirm('Clear this quick entry?')) return;
    resetQuickEntryForm();
    hideModal('quickEntryModal');
  });
});

