'use strict';

/* ========= Currency & formatting ========= */
// Currencies that usually have 0 decimals in everyday pricing
var DECIMALS_MAP = { PYG: 0, CLP: 0, JPY: 0 };
// Symbol map for display. Fallback is code itself.
var CURRENCY_SYMBOLS = {
  PYG: '₲',
  USD: '$',
  BRL: 'R$',
  ARS: 'AR$',
  UYU: '$U',
  PEN: 'S/',
  BOB: 'Bs',
  COP: '$',
  CLP: '$',
  MXN: '$',
  PAB: 'B/.',
  EUR: '€',
  GBP: '£',
};

/* ========= Weather config (shared) ========= */
var weatherConfig = {
  sunny: { label: 'SUN', class: 'weather-sunny', fullName: 'Sunny/Clear' },
  hot: { label: 'HOT', class: 'weather-hot', fullName: 'Hot/Heat wave (>35°C/95°F)' },
  mild: { label: 'MILD', class: 'weather-mild', fullName: 'Normal/Mild (20-30°C/68-86°F)' },
  cold: { label: 'COLD', class: 'weather-cold', fullName: 'Cold snap (<15°C/59°F)' },
  rainy: { label: 'RAIN', class: 'weather-rainy', fullName: 'Rainy/Wet' },
  windy: { label: 'WIND', class: 'weather-windy', fullName: 'Windy/Stormy' },
  humid: { label: 'HUMID', class: 'weather-humid', fullName: 'Humid/Muggy' },
};

/* ========= App-wide state ========= */
var currentCalculation = {};
var lastInputValues = {};
var deleteIndex = null;
var editIndex = null;
var editFlockIndex = null;

var currentDate = new Date(); // calendar’s visible month
var selectedDate = null; // currently selected date in calendar (Date)

/* ========= Storage keys ========= */
var STORAGE = {
  history: 'fcrHistory',
  calendar: 'fcrCalendarEvents',
  currency: 'fcrCurrencyCode',
  flocks: 'fcrFlocks',
};

/* ========= Load persisted data ========= */
var calculationHistory = [];
try {
  calculationHistory = JSON.parse(localStorage.getItem(STORAGE.history) || '[]');
} catch (e) {
  calculationHistory = [];
}

var calendarEvents = [];
try {
  calendarEvents = JSON.parse(localStorage.getItem(STORAGE.calendar) || '[]');
} catch (e) {
  calendarEvents = [];
}

var defaultCurrency = localStorage.getItem(STORAGE.currency) || 'PYG';

var flocks = [];
try {
  flocks = JSON.parse(localStorage.getItem(STORAGE.flocks) || '[]');
} catch (e) {
  flocks = [];
}

/* ========= Persistence helpers ========= */
function saveHistory() {
  localStorage.setItem(STORAGE.history, JSON.stringify(calculationHistory));
}
function saveCalendar() {
  localStorage.setItem(STORAGE.calendar, JSON.stringify(calendarEvents));
  localStorage.setItem('dayWeather', JSON.stringify(window.dayWeather || {})); // NEW
}

function saveFlocks() {
  localStorage.setItem(STORAGE.flocks, JSON.stringify(flocks));
}
function setCurrency(code) {
  defaultCurrency = code;
  localStorage.setItem(STORAGE.currency, code);
}

/* ========= Expose for other modules ========= */
window.DECIMALS_MAP = DECIMALS_MAP;
window.CURRENCY_SYMBOLS = CURRENCY_SYMBOLS;
window.weatherConfig = weatherConfig;

window.currentCalculation = currentCalculation;
window.lastInputValues = lastInputValues;
window.deleteIndex = deleteIndex;
window.editIndex = editIndex;
window.editFlockIndex = editFlockIndex;

window.currentDate = currentDate;
window.selectedDate = selectedDate;

window.STORAGE = STORAGE;
window.calculationHistory = calculationHistory;
window.calendarEvents = calendarEvents;
window.defaultCurrency = defaultCurrency;
window.flocks = flocks;

window.saveHistory = saveHistory;
window.saveCalendar = saveCalendar;
window.saveFlocks = saveFlocks;
window.setCurrency = setCurrency;
