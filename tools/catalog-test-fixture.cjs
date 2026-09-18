const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const products = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/productos.json'), 'utf8'));
const copy = x => JSON.parse(JSON.stringify(x));
const gitSha = text => createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
function mockRepository(initial = products) {
  const state = { text: JSON.stringify(copy(initial), null, 2) + '\n', head: 'head-1', tree: 'tree-1', requests: [], blobs: [], trees: [], commits: [], writes: 0, race: '', failure: '' };
  const response = (status, value) => ({ ok: status >= 200 && status < 300, status, json: async () => value });
  async function fetch(url, options = {}) {
    const method = options.method || 'GET'; const route = new URL(url).pathname.replace('/repos/alejoherrera05-del/Maderarte', '');
    const body = options.body ? JSON.parse(options.body) : null;
    state.requests.push({ route, method, body });
    if (options.headers?.Authorization === 'Bearer invalid-test-token') return response(401, {});
    if (state.failure && state.failure === route) return response(403, {});
    if (!route) return response(200, { full_name: 'alejoherrera05-del/Maderarte', permissions: { push: true } });
    if (route === '/git/ref/heads/main') return response(200, { object: { sha: state.head } });
    if (route.startsWith('/git/commits/') && method === 'GET') return response(200, { tree: { sha: state.tree } });
    if (route === '/contents/data/productos.json') return response(200, { encoding: 'base64', content: Buffer.from(state.text).toString('base64'), sha: gitSha(state.text) });
    if (route === '/git/blobs') { const sha = `blob-${state.blobs.length + 1}`; state.blobs.push({ ...body, sha }); return response(201, { sha }); }
    if (route === '/git/trees') { const sha = `new-tree-${state.trees.length + 1}`; state.trees.push({ ...body, sha }); return response(201, { sha }); }
    if (route === '/git/commits' && method === 'POST') { const sha = `new-commit-${state.commits.length + 1}`; state.commits.push({ ...body, sha }); return response(201, { sha }); }
    if (route === '/git/refs/heads/main' && method === 'PATCH') {
      if (state.race) {
        const race = state.race; state.race = ''; state.head = 'concurrent-head'; state.tree = 'concurrent-tree';
        if (race === 'product') { const current = JSON.parse(state.text); current[0].descripcion = 'Cambio de otro equipo'; state.text = JSON.stringify(current); }
        return response(422, {});
      }
      const commit = state.commits.find(c => c.sha === body.sha); const tree = state.trees.find(t => t.sha === commit.tree);
      state.text = tree.tree.find(t => t.path === 'data/productos.json').content; state.head = commit.sha; state.tree = tree.sha; state.writes++;
      if (state.ambiguous) { state.ambiguous = false; throw new Error('Simulated lost response'); }
      return response(200, { object: { sha: state.head } });
    }
    throw new Error(`Unexpected mocked request ${method} ${route}`);
  }
  return { state, fetch, get sha() { return gitSha(state.text); } };
}
module.exports = { products, copy, gitSha, mockRepository };
