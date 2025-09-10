/* FCR Tracker — Nav persistence (Milestone 2)
   Remembers last opened view and Records submode across reloads.
   Non-invasive: prefers calling existing app functions if present. */
(function(){
  var KEY_VIEW = 'fcr.lastView';
  var KEY_REC  = 'fcr.lastRecordsMode';
  var panes = ['calculator','records','flocks','reference']; // logical names

  function qs(id){ return document.getElementById(id); }
  function visible(el){
    if(!el) return false;
    if(el.hidden) return false;
    var cs = getComputedStyle(el);
    return cs && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }
  function currentView(){
    // Prefer class "active" if used; else visibility
    var map = {calculator:'calculatorTab', records:'recordsTab', flocks:'flocksTab', reference:'referenceTab'};
    for(var k in map){
      var el = qs(map[k]);
      if(!el) continue;
      if(el.classList.contains('active') || visible(el)) return k;
    }
    return 'calculator';
  }
  function setView(name){
    try{
      if(typeof window.switchView === 'function'){
        window.switchView(name);
      }else{
        // Fallback: direct hide/show without touching your app functions
        var map = {calculator:'calculatorTab', records:'recordsTab', flocks:'flocksTab', reference:'referenceTab'};
        Object.keys(map).forEach(function(k){
          var el = qs(map[k]);
          if(!el) return;
          if(k === name){ el.removeAttribute('hidden'); el.style.removeProperty('display'); el.classList.add('active'); }
          else { el.setAttribute('hidden',''); el.style.display='none'; el.classList.remove('active'); }
        });
        // Update nav button highlight if present
        var navMap = {calculator:'navCalculator',records:'navRecords',flocks:'navFlocks',reference:'navReference'};
        Object.keys(navMap).forEach(function(k){
          var b = qs(navMap[k]); if(!b) return;
          b.classList.toggle('active', k===name);
        });
      }
    }catch(e){}
  }
  function currentRecordsMode(){
    var historyOn = visible(qs('historyTab'));
    var calendarOn= visible(qs('calendarTab'));
    if(calendarOn && !historyOn) return 'calendar';
    return 'history';
  }
  function setRecordsMode(mode){
    try{
      if(typeof window.setRecordsMode === 'function'){
        window.setRecordsMode(mode);
      }else{
        var h = qs('historyTab'), c = qs('calendarTab');
        if(!h || !c) return;
        if(mode === 'calendar'){ c.removeAttribute('hidden'); c.style.removeProperty('display'); h.setAttribute('hidden',''); h.style.display='none'; }
        else { h.removeAttribute('hidden'); h.style.removeProperty('display'); c.setAttribute('hidden',''); c.style.display='none'; }
        // segmented buttons (optional)
        var hb = qs('recHistoryBtn'), cb = qs('recCalendarBtn');
        if(hb && cb){ hb.classList.toggle('active', mode!=='calendar'); cb.classList.toggle('active', mode==='calendar'); }
      }
    }catch(e){}
  }

  function saveView(){ try{ localStorage.setItem(KEY_VIEW, currentView()); }catch(e){} }
  function saveRec(){  try{ localStorage.setItem(KEY_REC,  currentRecordsMode()); }catch(e){} }

  function attachListeners(){
    // Bottom nav buttons if present
    [['navCalculator','calculator'],['navRecords','records'],['navFlocks','flocks'],['navReference','reference']].forEach(function(pair){
      var btn = qs(pair[0]);
      if(btn){ btn.addEventListener('click', function(){ try{ localStorage.setItem(KEY_VIEW, pair[1]); }catch(e){} }); }
    });
    // Records segmented buttons
    var hb = qs('recHistoryBtn'), cb = qs('recCalendarBtn');
    if(hb) hb.addEventListener('click', function(){ try{ localStorage.setItem(KEY_REC,'history'); }catch(e){} });
    if(cb) cb.addEventListener('click', function(){ try{ localStorage.setItem(KEY_REC,'calendar'); }catch(e){} });
    // Fallback: save on page hide
    document.addEventListener('visibilitychange', function(){ if(document.hidden){ saveView(); saveRec(); } });
  }

  function restore(){
    var v = null, r = null;
    try{ v = localStorage.getItem(KEY_VIEW) || 'calculator'; }catch(e){ v = 'calculator'; }
    try{ r = localStorage.getItem(KEY_REC)  || 'history'; }catch(e){ r = 'history'; }
    // Defer a tick so boot/init code runs first
    setTimeout(function(){
      setView(v);
      if(v === 'records'){ setRecordsMode(r); }
    }, 0);
  }

  document.addEventListener('DOMContentLoaded', function(){
  // boot.js handles initial restore; we only attach listeners here
  attachListeners();
});

})();