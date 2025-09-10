'use strict';

// Settings screen (currency)
function renderSettings() {
  var sel = byId('settingsCurrency');
  if (!sel) return;

  // Initialize to saved/default currency
  sel.value = window.defaultCurrency;
  if (typeof updateFlockCostCurrencyBadge === 'function') updateFlockCostCurrencyBadge();


  // Change handler: persist + refresh UI that shows currency symbols
  sel.onchange = function (e) {
    var code = e.target.value;
    if (!code) return;

    // Persist new default
    if (typeof setCurrency === 'function') setCurrency(code);

    // Refresh flocks table (shows price/kg with current symbol)
    if (typeof renderFlocks === 'function') renderFlocks();
    if (typeof updateFlockCostCurrencyBadge === 'function') updateFlockCostCurrencyBadge();


    // If calculator results are visible, keep showing the *entry’s* currency.
    // (We store currency per entry for accurate history.)
    // Still, refresh the visible numbers from the current calculation object.
    var r = window.currentCalculation;
    if (r && r.date) {
      var el;
      el = byId('dailyFeedCost'); if (el) el.textContent = fmtMoney(r.costFeedTotal, r.currencyCode);
      el = byId('costPerEgg');    if (el) el.textContent = fmtMoney(r.costPerEgg,  r.currencyCode);
    }
  };
}

// Expose
window.renderSettings = renderSettings;
