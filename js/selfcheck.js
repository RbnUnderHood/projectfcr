/* FCR Tracker — Self-check (refined)
   - Tolerates live-reload/HMR scripts
   - Uses this project's actual DOM ids
   - Non-intrusive; banner only if something looks off
*/
(function(){
  var REPORT = { issues: [] };

  function exists(id){ return !!document.getElementById(id); }
  function warn(msg){ REPORT.issues.push(msg); }

  function buildBanner(text, details){
    if(document.getElementById('fcr-panic-banner')) return;
    var bar = document.createElement('div');
    bar.id = 'fcr-panic-banner';
    bar.setAttribute('role','alert');
    bar.style.cssText = [
      'position:fixed','top:0','left:0','right:0','z-index:2000',
      'background:#B71C1C','color:#fff','padding:10px 12px',
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif',
      'box-shadow:0 2px 8px rgba(0,0,0,0.3)'
    ].join(';');
    var strong = document.createElement('strong');
    strong.textContent = 'FCR Self-check: ' + text + ' ';
    var btnCopy = document.createElement('button');
    btnCopy.textContent = 'Copy report';
    btnCopy.style.cssText = 'margin-left:8px;background:#fff;color:#B71C1C;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-weight:700';
    btnCopy.onclick = function(){
      var payload = [
        '[FCR Self-check Report]',
        'Time: ' + new Date().toISOString(),
        'Issues:\n - ' + (REPORT.issues.length ? REPORT.issues.join('\n - ') : 'none')
      ].join('\n');
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(payload).catch(function(){});
      }
    };
    var btnClose = document.createElement('button');
    btnClose.textContent = 'Dismiss';
    btnClose.style.cssText = 'margin-left:8px;background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.6);border-radius:6px;padding:4px 8px;cursor:pointer';
    btnClose.onclick = function(){ bar.remove(); };
    var small = document.createElement('div');
    small.style.marginTop = '4px';
    small.style.opacity = '0.9';
    small.textContent = details;
    bar.appendChild(strong);
    bar.appendChild(btnCopy);
    bar.appendChild(btnClose);
    bar.appendChild(small);
    document.body.appendChild(bar);
    setTimeout(function(){ if(bar && bar.parentNode) bar.parentNode.removeChild(bar); }, 20000);
  }

  function checkBootLast(){
    try{
      var scripts = Array.prototype.slice.call(document.scripts);
      var excludes = /(livereload|live-server|browser-sync|hot-update|webpack|vite|hmr)/i;
      // find the last app script tag whose src starts with "js/"
      for(var i=scripts.length-1; i>=0; i--){
        var src = (scripts[i].getAttribute('src')||'');
        if(!src) continue;
        if(excludes.test(src)) continue;
        if(/^js\//i.test(src)){
          if(!/js\/boot\.js(\?|$)/i.test(src)){
            warn('boot.js is not the last application <script> (found: ' + src + ')');
          }
          break;
        }
      }
    }catch(e){}
  }

  function checkDOM(){
    // Tabs & key panels present?
    ['calculatorTab','recordsTab','flocksTab','referenceTab',
     'historyTab','calendarTab','results'].forEach(function(id){
      if(!exists(id)) warn('Missing element #' + id);
    });

    // Calculator inputs
    ['entryDate','flockSelect','feedAmount','eggCount','weather'].forEach(function(id){
      if(!exists(id)) warn('Missing calculator input #' + id);
    });

    // Records/Calendar specifics (based on your markup)
    ['historyTableBody','calendarDays','calendarMonth','selectedDateText'].forEach(function(id){
      if(!exists(id)) warn('Missing records/calendar element #' + id);
    });

    // Modals present?
    ['duplicateModal','editModal','deleteModal','notesModal','editFlockModal','quickEntryModal'].forEach(function(id){
      if(!exists(id)) warn('Missing modal #' + id);
    });

    // [hidden] must hide
    try{
      var test = document.getElementById('recordsTab');
      if(test){
        test.setAttribute('hidden','');
        var cs = window.getComputedStyle(test);
        if(cs && cs.display !== 'none'){
          warn('[hidden] is not hiding elements (CSS override detected)');
        }
        test.removeAttribute('hidden');
      }
    }catch(e){}
  }

  function run(){
    checkBootLast();
    checkDOM();
    if(REPORT.issues.length){
      console.warn('[FCR Self-check]\\n - ' + REPORT.issues.join('\\n - '));
      buildBanner(REPORT.issues.length + ' issue(s) found', 'Open DevTools > Console for details.');
    }else{
      console.log('[FCR Self-check] OK');
    }
  }

  window.addEventListener('load', function(){ setTimeout(run, 50); });
})();