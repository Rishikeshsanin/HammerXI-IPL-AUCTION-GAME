const root = { innerHTML: '' };
const toastRoot = { appendChild() {}, innerHTML: '' };

globalThis.document = {
  activeElement: null,
  querySelector(selector) {
    if (selector === '#app') return root;
    if (selector === '#toast-root') return toastRoot;
    return null;
  },
  addEventListener() {},
  createElement() {
    return {
      style: {},
      appendChild() {},
      click() {},
      getContext() { return null; },
    };
  },
};

globalThis.window = { addEventListener() {} };
globalThis.navigator = {};
globalThis.location = { host: 'smoke.hammerxi.test' };

await import('../app.js?startup-smoke=1');

if (!root.innerHTML.includes('HAMMER')) {
  throw new Error('HammerXI startup smoke failed: app did not mount');
}

if (!root.innerHTML.includes('Host an auction')) {
  throw new Error('HammerXI startup smoke failed: landing controls missing');
}

console.log('HammerXI startup smoke PASS');
