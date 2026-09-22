/* Minimal runtime for the Itqan prototype: renders {{holes}}, <sc-if>, <sc-for> and onClick handlers */
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = null; }
    setState(patch) { this.state = Object.assign({}, this.state || {}, typeof patch === 'function' ? patch(this.state || {}) : patch); render(); }
    forceUpdate() { render(); }
  }
  window.DCLogic = DCLogic;
  let inst, tpl, host;
  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  function lookup(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  }
  function interp(str, scope) {
    return str.replace(HOLE, (_, p) => { const v = lookup(p, scope); return v == null ? '' : String(v); });
  }
  function whole(str) { const m = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/.exec(str); return m ? m[1] : null; }
  function walk(node, scope) {
    const out = [];
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) { out.push(document.createTextNode(interp(n.nodeValue, scope))); return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (tag === 'sc-if') {
        const p = whole(n.getAttribute('value') || '');
        if (p && lookup(p, scope)) walk(n, scope).forEach((c) => out.push(c));
        return;
      }
      if (tag === 'sc-for') {
        const list = lookup(whole(n.getAttribute('list') || '') || '', scope) || [];
        const as = n.getAttribute('as') || 'item';
        list.forEach((item, i) => {
          const s = Object.create(scope); s[as] = item; s.$index = i;
          walk(n, s).forEach((c) => out.push(c));
        });
        return;
      }
      const el = n.namespaceURI === 'http://www.w3.org/2000/svg' ? document.createElementNS(n.namespaceURI, n.tagName) : document.createElement(n.tagName);
      Array.from(n.attributes).forEach((a) => {
        const name = a.name;
        if (name.startsWith('on')) {
          const p = whole(a.value); const fn = p && lookup(p, scope);
          if (typeof fn === 'function') el.addEventListener(name.slice(2), (e) => fn(e));
          return;
        }
        if (name.startsWith('hint-')) return;
        el.setAttribute(name, interp(a.value, scope));
      });
      if (tag === 'input' && n.hasAttribute('checked')) el.checked = true;
      walk(n, scope).forEach((c) => el.appendChild(c));
      out.push(el);
    });
    return out;
  }
  function render() {
    const vals = (inst && inst.renderVals && inst.renderVals()) || {};
    const frag = document.createDocumentFragment();
    walk(tpl.content, vals).forEach((c) => frag.appendChild(c));
    host.replaceChildren(frag);
  }
  window.addEventListener('DOMContentLoaded', () => {
    tpl = document.getElementById('dc-template');
    host = document.getElementById('dc-root');
    const C = window.Component;
    inst = C ? new C({}) : null;
    render();
    if (inst && inst.componentDidMount) inst.componentDidMount();
    fit();
  });
  function fit() {
    const w = Number(document.body.getAttribute('data-w')) || 1440;
    const avail = window.innerWidth;
    document.body.style.zoom = avail < w ? String(avail / w) : '';
  }
  window.addEventListener('resize', fit);
})();
