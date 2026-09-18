/* GitHub is the authorization boundary. Both catalogues and new photos share one commit. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalog-order.js'));
  else root.CatalogStore = factory(root.CatalogOrder);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Order) {
  'use strict';
  class ConflictError extends Error {
    constructor() { super('El catálogo cambió en otro equipo. Tu borrador se conserva: descarga un respaldo y recarga lo publicado antes de continuar.'); this.name = 'ConflictError'; }
  }
  const decode = text => new TextDecoder().decode(Uint8Array.from(atob(String(text).replace(/\s/g, '')), c => c.charCodeAt(0)));
  async function blobSha(text) {
    const bytes = new TextEncoder().encode(text);
    const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
    const joined = new Uint8Array(header.length + bytes.length); joined.set(header); joined.set(bytes, header.length);
    const hash = await globalThis.crypto.subtle.digest('SHA-1', joined);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  }
  class Repository {
    constructor({ owner = 'alejoherrera05-del', repo = 'Maderarte', branch = 'main', token, fetchImpl = globalThis.fetch }) {
      this.base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
      this.fullName = `${owner}/${repo}`; this.branch = branch; this.token = token; this.fetch = fetchImpl.bind(globalThis);
      this.ref = branch.split('/').map(encodeURIComponent).join('/');
    }
    async request(path, method = 'GET', body) {
      if (!this.token) throw new Error('Conecta tu cuenta antes de publicar.');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      let response;
      try {
        response = await this.fetch(this.base + path, { method, cache: 'no-store', signal: controller.signal,
          headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', ...(body ? { 'Content-Type': 'application/json' } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}) });
      } catch (error) { throw new Error(error.name === 'AbortError' ? 'La conexión tardó demasiado. Tu borrador sigue guardado.' : 'No se pudo contactar a GitHub. Tu borrador no se ha descartado.'); }
      finally { clearTimeout(timer); }
      if (!response.ok) {
        const messages = { 401: 'Token inválido o vencido. Vuelve a conectar.', 403: 'GitHub rechazó el permiso o alcanzó su límite de solicitudes. Revisa acceso de escritura a Contents.', 404: 'No se encontró el repositorio o el catálogo. Revisa los permisos del token.', 409: 'La rama cambió durante la publicación.', 422: 'GitHub rechazó la actualización de la rama. Puede haber cambios simultáneos o una regla de protección.' };
        const error = new Error(messages[response.status] || `GitHub respondió con un error (${response.status}). Tu borrador se conserva.`);
        error.status = response.status; throw error;
      }
      return response.json();
    }
    async verifyAccess() {
      const repo = await this.request('');
      if (repo.full_name.toLowerCase() !== this.fullName.toLowerCase() || repo.permissions?.push === false) throw new Error('Esta cuenta no tiene acceso de escritura al repositorio Maderarte.');
      return repo;
    }
    async read() {
      const head = await this.request(`/git/ref/heads/${this.ref}`);
      const commit = await this.request(`/git/commits/${head.object.sha}`);
      const file = await this.request(`/contents/data/productos.json?ref=${head.object.sha}`);
      if (file.encoding !== 'base64' || typeof file.content !== 'string') throw new Error('No se pudo leer el archivo completo del catálogo. No se publicará sobre datos incompletos.');
      const products = JSON.parse(decode(file.content));
      if (!Array.isArray(products)) throw new Error('El archivo del catálogo no tiene el formato esperado.');
      return { products, sha: file.sha, head: head.object.sha, tree: commit.tree.sha };
    }
    async publish(products, baseSha, progress = () => {}) {
      const errors = Order.validate(products);
      if (errors.length) throw new Error(errors.slice(0, 5).join('\n'));
      if (!baseSha) throw new Error('Primero carga el catálogo publicado para evitar sobrescribir cambios de otro equipo.');
      let snapshot = await this.read();
      if (snapshot.sha !== baseSha) throw new ConflictError();
      const staged = Order.sortProducts(JSON.parse(JSON.stringify(products)));
      const imageEntries = [], uploaded = new Map();
      let photoCount = 0;
      for (const p of staged) for (const src of p.imagenes) if (src.startsWith('data:')) photoCount++;
      let done = 0;
      for (const product of staged) {
        for (let i = 0; i < product.imagenes.length; i++) {
          const src = product.imagenes[i]; if (!src.startsWith('data:')) continue;
          if (!uploaded.has(src)) {
            progress(`Preparando foto ${done + 1} de ${photoCount}…`);
            const ext = /^data:image\/([^;]+)/.exec(src)[1].replace('jpeg', 'jpg');
            const path = `img/p_${Date.now()}_${globalThis.crypto.randomUUID()}.${ext}`;
            const blob = await this.request('/git/blobs', 'POST', { content: src.split(',')[1], encoding: 'base64' });
            imageEntries.push({ path, mode: '100644', type: 'blob', sha: blob.sha }); uploaded.set(src, `/${path}`);
          }
          product.imagenes[i] = uploaded.get(src); done++;
        }
      }
      const privateText = JSON.stringify(staged, null, 2) + '\n';
      const publicText = JSON.stringify(Order.publicProducts(staged), null, 2) + '\n';
      const nextSha = await blobSha(privateText);
      const entries = [...imageEntries,
        { path: 'data/productos.json', mode: '100644', type: 'blob', content: privateText },
        { path: 'data/productos-publicos.json', mode: '100644', type: 'blob', content: publicText }];
      for (let attempt = 0; attempt < 3; attempt++) {
        progress('Publicando fotos y catálogo en una sola actualización…');
        const tree = await this.request('/git/trees', 'POST', { base_tree: snapshot.tree, tree: entries });
        const commit = await this.request('/git/commits', 'POST', { message: 'Actualizar catálogo por categorías desde ADMIN', tree: tree.sha, parents: [snapshot.head] });
        try {
          await this.request(`/git/refs/heads/${this.ref}`, 'PATCH', { sha: commit.sha, force: false });
          return { products: staged, sha: nextSha, commit: commit.sha };
        } catch (error) {
          // A lost PATCH response may still mean success; confirm before suggesting a retry.
          const latest = await this.read();
          if (latest.sha === nextSha) return { products: staged, sha: nextSha, commit: latest.head };
          if (latest.sha !== baseSha) throw new ConflictError();
          if (![409, 422].includes(error.status) || attempt === 2) throw error;
          snapshot = latest; // An unrelated SEO commit is safe to include, never force-push.
        }
      }
      throw new Error('No se confirmó la publicación. Tu borrador se conserva.');
    }
  }
  return Object.freeze({ Repository, ConflictError, blobSha });
});
