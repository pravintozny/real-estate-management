import { UnitStore, UNIT_TYPES, UNIT_STATUSES } from './store.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const options = (list, sel = '') =>
  list.map((v) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');
const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

/**
 * Unit Management component.
 * Usage: new UnitManagement(containerElement, { store })
 */
export class UnitManagement {
  constructor(root, { store = new UnitStore() } = {}) {
    this.root = root;
    this.store = store;
    this.filters = { search: '', type: '', status: '' };
    this.editingId = null;
    this.editingData = null;
    this.errors = {};
    this.unsubscribe = store.subscribe(() => this.render());
    this.onSubmit = this.onSubmit.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onFilter = this.onFilter.bind(this);
    root.addEventListener('submit', this.onSubmit);
    root.addEventListener('click', this.onClick);
    root.addEventListener('input', this.onFilter);
    this.render();
  }

  destroy() {
    this.unsubscribe();
    this.root.removeEventListener('submit', this.onSubmit);
    this.root.removeEventListener('click', this.onClick);
    this.root.removeEventListener('input', this.onFilter);
    this.root.innerHTML = '';
  }

  onFilter(e) {
    const f = e.target.closest('[data-filter]');
    if (!f) return;
    this.filters[f.dataset.filter] = f.value;
    this.renderList();
  }

  onSubmit(e) {
    const form = e.target.closest('form[data-form="unit"]');
    if (!form) return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      if (this.editingId != null) this.store.update(this.editingId, data);
      else this.store.add(data);
      this.editingId = null;
      this.editingData = null;
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
    return `<div class="um-summary">
      <span>Total: <strong>${s.total}</strong></span>
      ${UNIT_STATUSES.map((k) => `<span>${k}: <strong>${s.byStatus[k]}</strong></span>`).join('')}
      <span>Occupancy: <strong>${Math.round(s.occupancyRate * 100)}%</strong></span>
      <span>Monthly rent roll: <strong>${money(s.monthlyRent)}</strong></span>
    </div>`;
  }

  renderForm() {
    const u = this.editingData || (this.editingId != null ? this.store.get(this.editingId) : {}) || {};
    const err = (k) => (this.errors[k] ? `<small class="um-error">${esc(this.errors[k])}</small>` : '');
    const editing = this.editingId != null;
    return `<form data-form="unit" class="um-form" novalidate>
      <h3>${editing ? 'Edit unit' : 'Add unit'}</h3>
      <label>Unit number <input name="number" value="${esc(u.number ?? '')}">${err('number')}</label>
      <label>Property ID <input name="propertyId" value="${esc(u.propertyId ?? '')}">${err('propertyId')}</label>
      <label>Type <select name="type">${options(UNIT_TYPES, u.type ?? 'studio')}</select>${err('type')}</label>
      <label>Status <select name="status">${options(UNIT_STATUSES, u.status ?? 'vacant')}</select>${err('status')}</label>
      <label>Monthly rent <input name="rent" type="number" min="0" step="any" value="${esc(u.rent ?? '')}">${err('rent')}</label>
      <label>Area (sq ft) <input name="area" type="number" min="0" step="any" value="${esc(u.area ?? '')}">${err('area')}</label>
      <label>Notes <textarea name="notes">${esc(u.notes ?? '')}</textarea></label>
      <button type="submit">${editing ? 'Save' : 'Add'}</button>
      ${editing ? '<button type="button" data-action="cancel">Cancel</button>' : ''}
    </form>`;
  }

  renderListBody() {
    const rows = this.store.list(this.filters);
    if (!rows.length) return '<p class="um-empty">No units found.</p>';
    return `<table class="um-table"><thead><tr><th>Unit</th><th>Property</th><th>Type</th><th>Status</th><th>Area</th><th>Rent</th><th></th></tr></thead><tbody>${rows
      .map(
        (u) => `<tr>
        <td>${esc(u.number)}</td><td>${esc(u.propertyId)}</td><td>${esc(u.type)}</td>
        <td><span class="um-badge um-${esc(u.status)}">${esc(u.status)}</span></td>
        <td>${esc(u.area)} sq ft</td><td>${money(u.rent)}</td>
        <td><button data-action="edit" data-id="${u.id}">Edit</button>
            <button data-action="delete" data-id="${u.id}">Delete</button></td></tr>`
      )
      .join('')}</tbody></table>`;
  }

  renderList() {
    const el = this.root.querySelector('[data-list]');
    if (el) el.innerHTML = this.renderListBody();
  }

  render() {
    this.root.innerHTML = `<section class="um">
      <h2>Unit Management</h2>
      ${this.renderSummary()}
      ${this.renderForm()}
      <div class="um-filters">
        <input data-filter="search" placeholder="Search unit or property" value="${esc(this.filters.search)}">
        <select data-filter="type"><option value="">All types</option>${options(UNIT_TYPES, this.filters.type)}</select>
        <select data-filter="status"><option value="">All statuses</option>${options(UNIT_STATUSES, this.filters.status)}</select>
      </div>
      <div data-list>${this.renderListBody()}</div>
    </section>`;
  }
}
