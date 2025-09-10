/* calendar-listener.js
   Renders calendar when appropriate via lifecycle events.
   Keeps future features clean: just listen to events.
*/
(function () {
  'use strict';

  function safeRenderCalendar() {
    if (typeof window.renderCalendar === 'function' && document.getElementById('calendarDays')) {
      try { window.renderCalendar(); } catch (e) { console.warn('renderCalendar threw', e); }
    }
  }

  // When Records → Calendar tab becomes visible
  document.addEventListener('app:tab:shown', function (e) {
    var d = e && e.detail || {};
    if (d.group === 'records' && d.tab === 'calendar') {
      safeRenderCalendar();
    }
  });

  // If user switches to the Records view while Calendar is already the active inner tab
  document.addEventListener('app:view:shown', function (e) {
    var d = e && e.detail || {};
    if (d.view === 'records') {
      var cal = document.getElementById('calendarTab');
      var hist = document.getElementById('historyTab');
      if (cal && hist && cal.style.display !== 'none' && hist.style.display === 'none') {
        safeRenderCalendar();
      }
    }
  });

  // First load: if Calendar DOM is present and visible, render once
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      var cal = document.getElementById('calendarTab');
      if (cal && cal.style.display !== 'none') safeRenderCalendar();
    });
  } else {
    var cal = document.getElementById('calendarTab');
    if (cal && cal.style.display !== 'none') safeRenderCalendar();
  }
})();
