'use strict';

/* ========= Pure calculations =========
   Depends on: performanceForFcr (from js/calc/performance.js)
*/

// Returns all derived metrics for a single entry input
function computeDerived(input) {
  var feedAmount     = Number(input.feedAmount || 0);
  var eggCount       = Number(input.eggCount || 0);
  var eggWeight      = Number(input.eggWeight || 0);
  var birdCount      = Number(input.birdCount || 1);
  var feedPricePerKg = Number(input.feedPricePerKg || 0);

  // Core FCR math
  var eggMassKg = eggCount * (eggWeight / 1000);
  var fcr       = eggMassKg > 0 ? (feedAmount / eggMassKg) : NaN;

  // Performance band info
  var perf = isFinite(fcr) ? performanceForFcr(fcr) : { key:'', label:'-', desc:'-' };

  // Secondary metrics
  var feedPerBird      = feedAmount / (birdCount || 1);
  var layingPercentage = (eggCount / (birdCount || 1)) * 100;
  var feedPerEgg       = eggCount > 0 ? (feedAmount / eggCount) : NaN;

  // Cost metrics
  var costFeedTotal = feedPricePerKg * feedAmount;                // “Today’s Feed Cost”
  var costPerEgg    = eggCount > 0 ? (costFeedTotal / eggCount) : NaN;

  return {
    fcrValue:            isFinite(fcr)             ? fcr.toFixed(2) : '-',
    performanceCategory: perf.label,
    perfKey:             perf.key,
    perfDesc:            perf.desc,

    feedPerBird:         isFinite(feedPerBird)     ? feedPerBird.toFixed(2) : '-',
    layingPercentage:    isFinite(layingPercentage)? layingPercentage.toFixed(1) : '-',
    feedPerEgg:          isFinite(feedPerEgg)      ? feedPerEgg.toFixed(3) : '-',

    costFeedTotal:       isFinite(costFeedTotal)   ? costFeedTotal : null,
    costPerEgg:          isFinite(costPerEgg)      ? costPerEgg : null
  };
}

// Small helper for coloring FCR in tables
function getPerformanceClass(v) {
  var x = parseFloat(v);
  if (!isFinite(x)) return '';
  if (x <= 2)   return 'excellent';
  if (x <= 2.4) return 'good';
  if (x <= 2.8) return 'average';
  return 'poor';
}

// Expose globally
window.computeDerived = computeDerived;
window.getPerformanceClass = getPerformanceClass;
