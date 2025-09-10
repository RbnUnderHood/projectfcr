import { makeDom, loadScript } from './test-helpers.js';

const ROOT = 'projectfcr/js';

describe('computeDerived', () => {
it('computes stable outputs', () => {
const dom = makeDom();
loadScript(${ROOT}/calc/performance.js, dom);
loadScript(${ROOT}/calc/compute.js, dom);

const d = global.window.computeDerived({
  feedAmount: 50,   // kg
  eggCount: 100,    // eggs
  eggWeight: 60,    // g
  birdCount: 50,    // birds
  feedPricePerKg: 3 // currency units
});

expect(d.fcrValue).toBeGreaterThan(0);
expect(d.fcrValue).toBeCloseTo(50 / (100 * 0.06), 2); // 8.333...
expect(['excellent', 'good', 'average', 'poor']).toContain(d.perfKey);


});
});