'use strict';

/* ========= Migration for older saved rows =========
   Depends on: computeDerived (from js/calc/compute.js),
               defaultCurrency, calculationHistory, saveHistory (from js/state.js)
*/
function migrateHistory() {
  var list = window.calculationHistory || [];
  var mutated = false;

  for (var i = 0; i < list.length; i++) {
    var n = list[i];
    if (!n || typeof n !== 'object') continue;
    if (n.altFeedKg === undefined)   { n.altFeedKg = 0;   mutated = true; }
if (n.altFeedName === undefined) { n.altFeedName = ''; mutated = true; }


    // Remove deprecated fields
    if (Object.prototype.hasOwnProperty.call(n, 'deaths')) {
      delete n.deaths;
      mutated = true;
    }

    // Ensure per-entry currency (keeps history accurate if user changes settings later)
    if (!n.currencyCode) {
      n.currencyCode = window.defaultCurrency || 'PYG';
      mutated = true;
    }

    // Stable ID
    if (!n.id) {
      n.id = (n.date || '') + '|' + (n.flockName || 'default');
      mutated = true;
    }

    // Recompute/backfill derived values for consistency with latest logic
    var d = computeDerived(n);
    if (n.fcrValue === undefined)            { n.fcrValue = d.fcrValue; mutated = true; }
    if (n.performanceCategory === undefined)  { n.performanceCategory = d.performanceCategory; mutated = true; }
    if (n.feedPerBird === undefined)          { n.feedPerBird = d.feedPerBird; mutated = true; }
    if (n.layingPercentage === undefined)     { n.layingPercentage = d.layingPercentage; mutated = true; }
    if (n.feedPerEgg === undefined)           { n.feedPerEgg = d.feedPerEgg; mutated = true; }
    if (n.costFeedTotal === undefined)        { n.costFeedTotal = d.costFeedTotal; mutated = true; }
    if (n.costPerEgg === undefined)           { n.costPerEgg = d.costPerEgg; mutated = true; }
  }

  if (mutated && typeof window.saveHistory === 'function') {
    window.saveHistory();
  }
}

// Expose
window.migrateHistory = migrateHistory;
