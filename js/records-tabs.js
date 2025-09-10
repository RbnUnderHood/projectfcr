/* records-tabs.js
   Robust controller for Records → History/Calendar switching.
   - No assumptions about other nav functions.
   - Works via data attributes or button text.
*/
(function () {
  'use strict';

  function byId(id){ return document.getElementById(id); }
  function show(id){ var el = byId(id); if (!el) return; el.style.display = ''; el.classList && el.classList.add('active'); }
  function hide(id){ var el = byId(id); if (!el) return; el.style.display = 'none'; el.classList && el.classList.remove('active'); }

  function renderHistorySafe(){
    if (typeof window.renderHistoryTable === 'function') {
      try { window.renderHistoryTable(); } catch (e) { console.warn('renderHistoryTable threw', e); }
    }
  }
  function renderCalendarSafe(){
  try {
    if (typeof window.gotoTodayOnCalendar === 'function') {
      window.gotoTodayOnCalendar();
    } else if (typeof window.renderCalendar === 'function') {
      window.renderCalendar();
    }
  } catch (e) { console.warn('renderCalendar threw', e); }
}
  function setRecordsTab(which){
    var key = (which && which.toLowerCase().indexOf('cal') !== -1) ? 'calendar' : 'history';
    hide('historyTab'); hide('calendarTab');
    show(key + 'Tab');

    // Segmented highlight if present
    var hb = document.querySelector('#recordsTab [data-tab-btn="history"]');
    var cb = document.querySelector('#recordsTab [data-tab-btn="calendar"]');
    if (hb) hb.classList.toggle('active', key === 'history');
    if (cb) cb.classList.toggle('active', key === 'calendar');

    // Render what’s visible
    if (key === 'calendar') renderCalendarSafe(); else renderHistorySafe();
  }

  function init(){
    var records = byId('recordsTab');
    if (!records) return;

    // Default if neither inner tab is visible
    var h = byId('historyTab'), c = byId('calendarTab');
    var hv = h && h.style.display !== 'none';
    var cv = c && c.style.display !== 'none';
    if (!hv && !cv) setRecordsTab('history');

    // Delegate clicks from segmented buttons (works even if inline onclicks exist or not)
    records.addEventListener('click', function (e) {
      // Prefer data attribute
      var btn = e.target.closest('[data-tab-btn]');
      if (btn) {
        setTimeout(function(){ setRecordsTab(btn.getAttribute('data-tab-btn')); }, 0);
        return;
      }
      // Fallback: infer from button text (History/Calendar)
      var b2 = e.target.closest('button');
      if (b2) {
        var label = (b2.textContent || '').trim().toLowerCase();
        if (label === 'history' || label === 'calendar') {
          setTimeout(function(){ setRecordsTab(label); }, 0);
        }
      }
    });

    // If the user navigates to Records while Calendar is the active button, render it
    document.addEventListener('click', function(e){
      var toRecords = e.target.closest('[data-view-btn="records"]');
      if (!toRecords) return;
      setTimeout(function(){
        var calBtnActive = document.querySelector('#recordsTab [data-tab-btn="calendar"].active');
        if (calBtnActive) setRecordsTab('calendar');
      }, 0);
    });

    // Expose for other scripts (optional)
    window.__setRecordsTab = setRecordsTab;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
