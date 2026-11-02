// Verifies the real scopePrefix/clearScope implementations extracted from index.html.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function grab(name) {
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('missing ' + name);
  let depth = 0, i = html.indexOf('{', start);
  for (let j = i; j < html.length; j++) {
    if (html[j] === '{') depth++;
    else if (html[j] === '}') { depth--; if (depth === 0) return html.slice(start, j + 1); }
  }
  throw new Error('unbalanced ' + name);
}

function makeSandbox(mode, userId, initial) {
  const store = new Map(Object.entries(initial || {}));
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    get length() { return store.size; },
    key: i => [...store.keys()][i],
  };
  const sandbox = {
    state: { mode, user: userId ? { id: userId } : null },
    localStorage,
    __keys: () => [...store.keys()].sort(),
  };
  sandbox.localStorage = new Proxy(localStorage, {
    get(t, p) { if (p === Symbol.iterator) return undefined; return t[p]; },
    ownKeys() { return [...store.keys()]; },
    getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; },
  });
  vm.createContext(sandbox);
  vm.runInContext(
    `const STORAGE_PREFIX = "duitku.";\n${grab('scopePrefix')}\n${grab('scopeGet')}\n${grab('clearScope')}`,
    sandbox
  );
  vm.runInContext('this.__api = { scopePrefix, clearScope };', sandbox);
  return sandbox;
}

test('local mode keeps the historic duitku. namespace', () => {
  const s = makeSandbox('local', null);
  assert.equal(s.__api.scopePrefix(), 'duitku.');
});
test('each cloud account gets its own namespace with its uuid', () => {
  const a = makeSandbox('cloud', 'aaa-111');
  const b = makeSandbox('cloud', 'bbb-222');
  assert.equal(a.__api.scopePrefix(), 'duitku.u.aaa-111.');
  assert.equal(b.__api.scopePrefix(), 'duitku.u.bbb-222.');
  assert.notEqual(a.__api.scopePrefix(), b.__api.scopePrefix());
});
test('clearing the local sandbox never touches cloud caches or the auth session', () => {
  const s = makeSandbox('local', null, {
    'duitku.transactions': '[]',
    'duitku.ledgerEvents': '[]',
    'duitku.lang': 'id',
    'duitku.u.aaa-111.transactions': '[1]',
    'duitku.auth': 'session',
  });
  s.__api.clearScope('duitku.');
  assert.deepEqual(s.__keys(), ['duitku.auth', 'duitku.lang', 'duitku.u.aaa-111.transactions']);
});
test('clearing one cloud scope leaves the local sandbox and other accounts intact', () => {
  const s = makeSandbox('cloud', 'aaa-111', {
    'duitku.transactions': '[local]',
    'duitku.u.aaa-111.transactions': '[a]',
    'duitku.u.bbb-222.transactions': '[b]',
    'duitku.auth': 'session',
  });
  s.__api.clearScope();
  assert.deepEqual(s.__keys(), ['duitku.auth', 'duitku.transactions', 'duitku.u.bbb-222.transactions']);
});
