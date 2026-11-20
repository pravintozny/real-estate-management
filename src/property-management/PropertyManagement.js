import { PropertyStore, PROPERTY_TYPES, PROPERTY_STATUSES } from './store.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const options = (list, sel = '') =>
  list.map((v) => `<option value="${v}"${v === sel ? ' selected' : ''}>${v}</option>`).join('');
const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

/**
 * Property Management component.
 * Usage: new PropertyManagement(containerElement, { store })
 */
export class PropertyManagement {
  constructor(root, { store = new PropertyStore() } = {}) {
    this.root = root;
    this.store = store;
    this.filters = { search: '', type: '', status: '' };
    this.editingId = null;
    this.errors = {};
    this.unsubscribe = store.subscribe(() => this.render());
    root.addEventListener('submit', (e) => this.onSubmit(e));
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('input', (e) => this.onFilter(e));
    this.render();
  }

  destroy() {
    this.unsubscribe();
    this.root.innerHTML = '';
  }

  onFilter(e) {
    const f = e.target.closest('[data-filter]');
    if (!f) return;
    this.filters[f.dataset.filter] = f.value;
    this.renderList();
  }

  onSubmit(e) {
    const form = e.target.closest('form[data-form="property"]');
    if (!form) return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      if (this.editingId != null) this.store.update(this.editingId, data);
      else this.store.add(data);
      this.editingId = null;
      this.errors = {};
    } catch (err) {
      if (!err.errors) throw err;
      this.errors = err.errors;
      this.editingData = data;
      this.render();
    }
  }

  onClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === 'edit') {
      this.editingId = id;
      this.errors = {};
      this.editingData = null;
      this.render();
    } else if (btn.dataset.action === 'delete') {
      if (this.editingId === id) this.editingId = null;
      this.store.remove(id);
    } else if (btn.dataset.action === 'cancel') {
      this.editingId = null;
      this.errors = {};
      this.editingData = null;
      this.render();
    }
  }

  renderSummary() {
    const s = this.store.summary();
    return `<div class="pm-summary">
      <span>Total: <strong>${s.total}</strong></span>
      ${PROPERTY_STATUSES.map((k) => `<span>${k}: <strong>${s.byStatus[k]}</strong></span>`).join('')}
      <span>Portfolio value: <strong>${money(s.totalValue)}</strong></span>
    </div>`;
  }

  renderForm() {
    const p = this.editingData || (this.editingId != null ? this.store.get(this.editingId) : {}) || {};
    const err = (k) => (this.errors[k] ? `<small class="pm-error">${esc(this.errors[k])}</small>` : '');
    return `<form data-form="property" class="pm-form" novalidate>
      <h3>${this.editingId != null ? 'Edit property' : 'Add property'}</h3>
      <label>Name <input name="name" value="${esc(p.name ?? '')}">${err('name')}</label>
      <label>Address <input name="address" value="${esc(p.address ?? '')}">${err('address')}</label>
      <label>Type <select name="type">${options(PROPERTY_TYPES, p.type ?? 'apartment')}</select>${err('type')}</label>
      <label>Status <select name="status">${options(PROPERTY_STATUSES, p.status ?? 'available')}</select>${err('status')}</label>
      <label>Price <input name="price" type="number" min="0" step="any" value="${esc(p.price ?? '')}">${err('price')}</label>
      <label>Notes <textarea name="notes">${esc(p.notes ?? '')}</textarea></label>
      <button type="submit">${this.editingId != null ? 'Save' : 'Add'}</button>
      ${this.editingId != null ? '<button type="button" data-action="cancel">Cancel</button>' : ''}
    </form>`;
  }

  renderListBody() {
    const rows = this.store.list(this.filters);
    if (!rows.length) return '<p class="pm-empty">No properties found.</p>';
    return `<table class="pm-table"><thead><tr><th>Name</th><th>Address</th><th>Type</th><th>Status</th><th>Price</th><th></th></tr></thead><tbody>${rows
      .map(
        (p) => `<tr>
        <td>${esc(p.name)}</td><td>${esc(p.address)}</td><td>${esc(p.type)}</td>
        <td><span class="pm-badge pm-${esc(p.status)}">${esc(p.status)}</span></td>
        <td>${money(p.price)}</td>
        <td><button data-action="edit" data-id="${p.id}">Edit</button>
            <button data-action="delete" data-id="${p.id}">Delete</button></td></tr>`
      )
      .join('')}</tbody></table>`;
  }

  renderList() {
    const el = this.root.querySelector('[data-list]');
    if (el) el.innerHTML = this.renderListBody();
  }

  render() {
    this.root.innerHTML = `<section class="pm">
      <h2>Property Management</h2>
      ${this.renderSummary()}
      ${this.renderForm()}
      <div class="pm-filters">
        <input data-filter="search" placeholder="Search name or address" value="${esc(this.filters.search)}">
        <select data-filter="type"><option value="">All types</option>${options(PROPERTY_TYPES, this.filters.type)}</select>
        <select data-filter="status"><option value="">All statuses</option>${options(PROPERTY_STATUSES, this.filters.status)}</select>
      </div>
      <div data-list>${this.renderListBody()}</div>
    </section>`;
  }
}
