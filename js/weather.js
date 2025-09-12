/* --- add: central weather constants & helpers --- */
(function () {
  // Canonical badges (key → emoji + label)
  var BADGES = {
    EXTREME_HEAT: { emoji: '🔥', label: 'Extreme Heat' },
    TEMP_DROP: { emoji: '❄️', label: 'Temp Drop' },
    RAINY: { emoji: '🌧️', label: 'Rainy' },
    WINDY: { emoji: '💨', label: 'Windy' },
    OPTIMAL: { emoji: '✅', label: 'Optimal' },
  };

  // Priority (higher wins) for calendar overlays, etc.
  var PRIORITY = { EXTREME_HEAT: 5, TEMP_DROP: 4, RAINY: 3, WINDY: 2, OPTIMAL: 1 };

  // Normalize legacy/free-text/emojis → canonical keys
  function normalizeWeather(val) {
    if (!val) return '';
    var s = String(val).trim().toLowerCase();
    var map = {
      // Optimal
      sunny: 'OPTIMAL',
      sun: 'OPTIMAL',
      clear: 'OPTIMAL',
      mild: 'OPTIMAL',
      ok: 'OPTIMAL',
      normal: 'OPTIMAL',
      optimal: 'OPTIMAL',
      '✅': 'OPTIMAL',
      // Extreme heat
      hot: 'EXTREME_HEAT',
      heat: 'EXTREME_HEAT',
      'heat wave': 'EXTREME_HEAT',
      heatwave: 'EXTREME_HEAT',
      'extreme heat': 'EXTREME_HEAT',
      '🔥': 'EXTREME_HEAT',
      // Temperature drop / cold
      cold: 'TEMP_DROP',
      'cold snap': 'TEMP_DROP',
      freeze: 'TEMP_DROP',
      freezing: 'TEMP_DROP',
      'temp drop': 'TEMP_DROP',
      '❄️': 'TEMP_DROP',
      // Rainy / wet
      rain: 'RAINY',
      rainy: 'RAINY',
      wet: 'RAINY',
      '🌧️': 'RAINY',
      // Wind
      wind: 'WINDY',
      windy: 'WINDY',
      storm: 'WINDY',
      '💨': 'WINDY',
    };
    return map[s] || s.toUpperCase();
  }

  function weatherFullName(key) {
    var k = normalizeWeather(key);
    if (!k || !BADGES[k]) return '';
    return BADGES[k].label;
  }

  // Rebuild a <select> with emoji + label options (keeps value canonical)
  function buildWeatherSelect(selectId, selected) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var normalized = normalizeWeather(selected);
    sel.innerHTML = '';

    var keys = ['EXTREME_HEAT', 'TEMP_DROP', 'RAINY', 'WINDY', 'OPTIMAL'];
    if (!normalized || keys.indexOf(normalized) === -1) normalized = 'OPTIMAL';

    // no blank option; always select something
    keys.forEach(function (key) {
      var b = BADGES[key];
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = b.emoji + ' ' + b.label;
      if (normalized === key) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.value = normalized; // ensure selection sticks
    sel.required = true; // make “no weather” impossible at the form level too
  }

  // Expose
  window.WEATHER_BADGES = BADGES;
  window.WEATHER_PRIORITY = PRIORITY;
  window.normalizeWeather = normalizeWeather;
  window.weatherFullName = weatherFullName;
  window.buildWeatherSelect = buildWeatherSelect;
  // Auto-build the Calculator's weather select on page load
  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('weather');
    if (el && typeof window.buildWeatherSelect === 'function') {
      window.buildWeatherSelect('weather', el.value);
    }
  });
})();
