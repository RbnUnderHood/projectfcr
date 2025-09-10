import { makeDom, loadScript } from './test-helpers.js';

const ROOT = 'projectfcr/js';

describe('performanceForFcr', () => {
it('classifies thresholds correctly and loads without syntax errors', () => {
const dom = makeDom();
loadScript(${ROOT}/calc/performance.js, dom);
const pf = global.window.performanceForFcr;
expect(pf(1.99).key).toBe('excellent');
expect(pf(2).key).toBe('excellent');
expect(pf(2.1).key).toBe('good');
expect(pf(2.4).key).toBe('good');
expect(pf(2.5).key).toBe('average');
expect(pf(2.8).key).toBe('average');
expect(pf(3.2).key).toBe('poor');
});
});