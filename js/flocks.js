'use strict';

/* ========= Flocks: render & CRUD ========= */

// Flock dropdown used in Calculator tab
function renderFlockSelect() {
  var sel = byId('flockSelect');
  var hint = byId('noFlockHint');
  if (!sel) return;

  var html = '';
  if (Array.isArray(window.flocks) && window.flocks.length) {
    for (var i = 0; i < window.flocks.length; i++) {
  var f = window.flocks[i];
  var birds = parseInt(f.birds || f.birdCount || 0, 10);
  var label = f.name + (birds ? ' (' + birds + ')' : '');
  html += '<option value="' + f.id + '">' + label + '</option>';
}

    sel.innerHTML = html;
    sel.disabled = false;
    if (hint) hint.style.display = 'none';
  } else {
    sel.innerHTML = '';
    sel.disabled = true;
    if (hint) hint.style.display = 'block';
  }
}

// Flocks table in Flocks tab
function renderFlocks(){
  var grid = byId('flocksCardsGrid');
  if (!grid) return;

  var fl = Array.isArray(window.flocks) ? window.flocks : [];
  var cc = window.defaultCurrency || 'PYG';
  var html = '';

  for (var i = 0; i < fl.length; i++){
    var f = fl[i];
    var name = f.name || ('Flock ' + (i+1));
    var birds = (f.birds || f.birdCount || 0);
    var age   = (f.ageWeeks != null ? f.ageWeeks + ' wk' : '—');
    var eggW  = (f.eggWeight != null ? (f.eggWeight + ' g') : '—');
    var bagKg = (f.feedBagKg > 0 ? f.feedBagKg : '—');
    var bagCost = (f.feedBagCost > 0
      ? (window.fmtMoney ? window.fmtMoney(cc, f.feedBagCost) : (cc + ' ' + f.feedBagCost))
      : '—');

    var pricePerKg = 0;
    if (f.feedPricePerKg > 0) pricePerKg = f.feedPricePerKg;
    else if (f.feedBagCost > 0 && f.feedBagKg > 0) pricePerKg = f.feedBagCost / f.feedBagKg;
    var priceText = pricePerKg
      ? (window.fmtMoney ? window.fmtMoney(cc, pricePerKg) : (cc + ' ' + pricePerKg.toFixed(2)))
      : '—';

    html += ''
      + '<div class="flock-card" data-index="'+i+'" onclick="openEditFlock('+i+')">'
      +   '<div class="flock-title">🐓 ' + escapeHtml(name) + '</div>'
      +   '<div class="flock-meta">'
      +     '<div class="meta-label">Birds</div><div>' + birds + '</div>'
      +     '<div class="meta-label">Age</div><div>' + age + '</div>'
      +     '<div class="meta-label">Egg wt</div><div>' + eggW + '</div>'
      +     '<div class="meta-label">Bag kg</div><div>' + bagKg + '</div>'
      +     '<div class="meta-label">Bag cost</div><div>' + bagCost + '</div>'
      +     '<div class="meta-label">Price/kg</div><div>' + priceText + '</div>'
      +   '</div>'
      +   '<div class="card-actions">'
      +     '<button type="button" class="calendar-nav-btn" onclick="event.stopPropagation(); openEditFlock('+i+')">Edit</button>'
      +     '<button type="button" class="delete-btn" title="Delete" onclick="event.stopPropagation(); deleteFlock('+i+')">×</button>'
      +   '</div>'
      + '</div>';
  }

  grid.innerHTML = html;
  grid.classList.toggle('single', fl.length === 1);
}
window.renderFlocks = renderFlocks;

function escapeHtml(s){ return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }


// Add new flock (from inputs in Flocks tab)
function addFlock(){
  // null-safe helpers
  function el(id){ return document.getElementById(id); }
  function sval(id){ var e = el(id); return e ? String(e.value || '').trim() : ''; }
  function num(id){
    var s = sval(id).replace(',', '.');
    var n = parseFloat(s);
    return (isFinite(n) ? n : NaN);
  }
  function int(id){
    var v = parseInt(sval(id), 10);
    return (isFinite(v) ? v : NaN);
  }

  // read fields (all null-safe)
  var name   = sval('newFlockName') || 'Unnamed Flock';
  var birds  = int('newFlockBirds');
  if (!isFinite(birds) || birds <= 0){ alert('Please enter a valid number of birds'); return; }

  // optional fields (existence-tolerant)
  var ageWeeksEl = el('newFlockAgeWeeks') || el('flockAgeWeeks'); // tolerate either id
  var ageWeeks   = ageWeeksEl ? parseInt(ageWeeksEl.value, 10) : NaN;
  if (!isFinite(ageWeeks) || ageWeeks < 0) ageWeeks = null;

  var eggW   = num('newFlockEggWeight'); if (!isFinite(eggW)) eggW = null;
  var bagKg  = num('newFlockBagKg');     if (!isFinite(bagKg) || bagKg < 0) bagKg = 0;
  var bagCost= num('newFlockBagCost');   if (!isFinite(bagCost) || bagCost < 0) bagCost = 0;
  var notes  = sval('newFlockNotes');
function getCurrencySymbol(code){
  // quick map; extend as needed
  var m = { PYG:'₲', USD:'$', EUR:'€', GBP:'£', BRL:'R$', ARS:'$', CLP:'$', COP:'$', ZAR:'R', NGN:'₦', KES:'KSh' };
  return m[code] || code || '$';
}
function openSettingsFromHint(ev){
  if (ev) ev.preventDefault();

  // Prefer your app’s tab switcher if it exists
  if (typeof showTab === 'function') {
    showTab('settingsTab');
  } else {
    // Fallbacks: try clicking a nav button or switch manually
    var btn = document.querySelector('[data-target="#settingsTab"], [data-target="settingsTab"], .nav-btn-settings');
    if (btn && btn.click) btn.click();
    else {
      document.querySelectorAll('.tab-content').forEach(function(el){
        el.style.display = (el.id === 'settingsTab') ? '' : 'none';
      });
    }
  }

  // Nice UX: focus currency selector
  var sel = document.getElementById('settingsCurrency');
  if (sel) { sel.focus(); sel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}
window.openSettingsFromHint = openSettingsFromHint;

function updateFlockCostCurrencyBadge(){
  var cc = window.defaultCurrency || 'PYG';
  var sym = (window.fmtCurrencySymbol ? window.fmtCurrencySymbol(cc) : getCurrencySymbol(cc));
  var wrap = byId && byId('newFlockBagCostWrap');
  if (wrap) wrap.setAttribute('data-curr', sym);
}
window.updateFlockCostCurrencyBadge = updateFlockCostCurrencyBadge;

// run once when the DOM is ready (safe if the field isn't on-screen yet)
if (document.readyState !== 'loading') {
  updateFlockCostCurrencyBadge();
} else {
  document.addEventListener('DOMContentLoaded', updateFlockCostCurrencyBadge);
}

  // assemble flock
  var id = 'flock-' + Date.now();
  var flock = {
    id: id,
    name: name,
    birds: birds,
    eggWeight: eggW,          // can be null
    feedBagKg: bagKg,
    feedBagCost: bagCost,
    notes: notes,
    ageWeeks: ageWeeks        // can be null
  };
function setFlocksMode(mode){
  var addP = byId('flocksAddPanel'), mgP = byId('flocksManagePanel');
  var bA = byId('flAddBtn'), bM = byId('flManageBtn');
  if (!addP || !mgP) return;
  var showAdd = (mode !== 'manage');
  addP.classList.toggle('active', showAdd);
  mgP.classList.toggle('active', !showAdd);
  if (bA) bA.classList.toggle('active', showAdd);
  if (bM) bM.classList.toggle('active', !showAdd);
  try{ localStorage.setItem('flocksMode', showAdd ? 'add' : 'manage'); }catch(e){}
}
window.setFlocksMode = setFlocksMode;

// restore last inner-tab on load
(function(){
  try{
    var m = localStorage.getItem('flocksMode');
    if (m) setFlocksMode(m);
  }catch(e){}
})();

  // persist
  window.flocks = Array.isArray(window.flocks) ? window.flocks : [];
  window.flocks.push(flock);

  if (typeof window.saveFlocks === 'function') {
    window.saveFlocks();
  } else {
    try { localStorage.setItem('fcrFlocks', JSON.stringify(window.flocks)); } catch(e){}
  }

  // clear inputs if present
  ['newFlockName','newFlockBirds','newFlockEggWeight','newFlockBagKg','newFlockBagCost','newFlockNotes','newFlockAgeWeeks']
    .forEach(function(id){ var e = el(id); if (e) e.value = ''; });

  // re-render views
  if (typeof window.renderFlocks === 'function') window.renderFlocks();
  if (typeof window.renderFlockSelect === 'function') window.renderFlockSelect();

  // small UX: focus name for quick next entry
  var nameEl = el('newFlockName'); if (nameEl) nameEl.focus();
}


// Open edit flock modal
function openEditFlock(i) {
  window.editFlockIndex = i;
  var f = window.flocks[i];
  if (!f) return;

  byId('efName').value = f.name;
  byId('efBirds').value = f.birds;
  byId('efEggW').value = f.eggWeight;
  byId('efBagKg').value = f.feedBagKg || '';
  byId('efBagCost').value = f.feedBagCost || '';
  byId('efNotes').value = f.notes || '';

  showModal('editFlockModal');
}

// Close edit flock modal
function closeEditFlock() {
  window.editFlockIndex = null;
  hideModal('editFlockModal');
}

// Save edits from modal
function saveEditFlock() {
  if (window.editFlockIndex == null) return;

  var f = window.flocks[window.editFlockIndex];
  if (!f) return;

  var newName = (byId('efName').value || '').trim();
  var newBirds = parseInt(byId('efBirds').value || f.birds, 10);
  var newAgeWeeks = parseInt((byId('efAgeWeeks') && byId('efAgeWeeks').value) || '', 10);
if (!isFinite(newAgeWeeks) || newAgeWeeks < 0) newAgeWeeks = null;
  var newEggW = parseFloat(byId('efEggW').value || f.eggWeight);
  var newBagKg = parseFloat(byId('efBagKg').value || f.feedBagKg || 0);
  var newBagCost = parseFloat(byId('efBagCost').value || f.feedBagCost || 0);
  var newNotes = byId('efNotes').value || '';

  f.name = newName || f.name;
  f.birds = newBirds;
  f.ageWeeks = (newAgeWeeks != null ? newAgeWeeks : f.ageWeeks);
  f.eggWeight = newEggW;
  f.feedBagKg = newBagKg;
  f.feedBagCost = newBagCost;
  f.notes = newNotes;

  if (typeof saveFlocks === 'function') saveFlocks();

  closeEditFlock();
  renderFlocks();
  renderFlockSelect();
}

// Delete flock (does not remove history)
function deleteFlock(i) {
  if (!confirm('Delete this flock? This does not remove history records.')) return;
  if (!Array.isArray(window.flocks) || i < 0 || i >= window.flocks.length) return;

  window.flocks.splice(i, 1);
  if (typeof saveFlocks === 'function') saveFlocks();

  renderFlocks();
  renderFlockSelect();
}

/* ========= Expose for inline handlers ========= */
window.renderFlockSelect = renderFlockSelect;
window.renderFlocks = renderFlocks;
window.addFlock = addFlock;
window.openEditFlock = openEditFlock;
window.closeEditFlock = closeEditFlock;
window.saveEditFlock = saveEditFlock;
window.deleteFlock = deleteFlock;
