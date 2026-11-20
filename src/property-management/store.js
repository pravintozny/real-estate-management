export const PROPERTY_TYPES = ['apartment', 'house', 'condo', 'commercial', 'land'];
export const PROPERTY_STATUSES = ['available', 'occupied', 'maintenance', 'sold'];

export function validateProperty(input) {
  const errors = {};
  if (!input.name || !String(input.name).trim()) errors.name = 'Name is required';
  if (!input.address || !String(input.address).trim()) errors.address = 'Address is required';
  if (!PROPERTY_TYPES.includes(input.type)) errors.type = 'Invalid type';
  if (!PROPERTY_STATUSES.includes(input.status)) errors.status = 'Invalid status';
  const price = Number(input.price);
  if (input.price === '' || input.price == null || !Number.isFinite(price) || price < 0)
    errors.price = 'Price must be a non-negative number';
  return errors;
}

function normalize(input) {
  return {
    name: String(input.name).trim(),
    address: String(input.address).trim(),
    type: input.type,
    status: input.status,
    price: Number(input.price),
    notes: input.notes ? String(input.notes).trim() : '',
  };
}

/** In-memory property store with optional persistence and change listeners. */
export class PropertyStore {
  constructor(initial = [], storage = null, key = 'properties') {
    this.storage = storage;
    this.key = key;
    this.listeners = new Set();
    this.nextId = 1;
    this.items = initial;
    if (storage) {
      try {
        const raw = storage.getItem(key);
        if (raw) this.items = JSON.parse(raw);
      } catch { /* ignore corrupt storage */ }
    }
    this.nextId = this.items.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _commit() {
    if (this.storage) this.storage.setItem(this.key, JSON.stringify(this.items));
    this.listeners.forEach((fn) => fn(this.items));
  }

  list({ search = '', type = '', status = '' } = {}) {
    const q = search.trim().toLowerCase();
    return this.items.filter(
      (p) =>
        (!type || p.type === type) &&
        (!status || p.status === status) &&
        (!q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
    );
  }

  get(id) {
    return this.items.find((p) => p.id === id);
  }

  add(input) {
    const errors = validateProperty(input);
    if (Object.keys(errors).length) throw Object.assign(new Error('Validation failed'), { errors });
    const property = { id: this.nextId++, ...normalize(input) };
    this.items = [...this.items, property];
    this._commit();
    return property;
  }

  update(id, input) {
    const existing = this.get(id);
    if (!existing) throw new Error(`Property ${id} not found`);
    const merged = { ...existing, ...input };
    const errors = validateProperty(merged);
    if (Object.keys(errors).length) throw Object.assign(new Error('Validation failed'), { errors });
    const updated = { id, ...normalize(merged) };
    this.items = this.items.map((p) => (p.id === id ? updated : p));
    this._commit();
    return updated;
  }

  remove(id) {
    if (!this.get(id)) return false;
    this.items = this.items.filter((p) => p.id !== id);
    this._commit();
    return true;
  }

  summary() {
    const byStatus = Object.fromEntries(PROPERTY_STATUSES.map((s) => [s, 0]));
    let totalValue = 0;
    for (const p of this.items) {
      byStatus[p.status]++;
      totalValue += p.price;
    }
    return { total: this.items.length, byStatus, totalValue };
  }
}
