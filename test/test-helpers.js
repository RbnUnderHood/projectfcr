// Load browser-style scripts into a JSDOM VM so vitest can access window.*
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

export function makeDom(html = '<!doctype html><html><body></body></html>') {
const dom = new JSDOM(html, { url: 'http://localhost
' });
global.window = dom.window;
global.document = dom.window.document;
return dom;
}

export function loadScript(filePath, dom) {
const code = readFileSync(filePath, 'utf8');
return vm.runInContext(code, dom.getInternalVMContext(), { filename: filePath });
}