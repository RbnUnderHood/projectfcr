'use strict';
(function () {
var KEY = 'fcr_features';

function read() {
try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
catch (e) { return {}; }
}
function write(map) {
localStorage.setItem(KEY, JSON.stringify(map || {}));
}

window.feature = {
isEnabled: function (name) { return !!read()[name]; },
enable: function (name) { var m = read(); m[name] = true; write(m); },
disable: function (name) { var m = read(); delete m[name]; write(m); }
};
})();