import { makeDom, loadScript } from './test-helpers.js';

const ROOT = 'projectfcr/js';

function lsMock(seed = {}) {
const store = new Map(Object.entries(seed));
global.localStorage = {
getItem: (k) => store.get(k) ?? null,
setItem: (k, v) => store.set(k, String(v)),
removeItem: (k) => store.delete(k)
};
}

describe('history migration', () => {
it('adds missing fields without losing existing data', () => {
const dom = makeDom();
lsMock({ 'fcr_history_v1': JSON.stringify([{ feedAmount: 10, eggCount: 20 }]) });

loadScript(`${ROOT}/state.js`, dom);
loadScript(`${ROOT}/calc/migration.js`, dom);

expect(Array.isArray(global.window.calculationHistory)).toBe(true);
const rec = global.window.calculationHistory[0];

// Existing fields preserved
expect(rec.feedAmount).toBe(10);
expect(rec.eggCount).toBe(20);

// New fields present (contract-safe defaults)
expect(rec.birdCount).toBeDefined();


});
});