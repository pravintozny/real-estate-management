export const UNIT_TYPES = ['studio', '1br', '2br', '3br', 'office', 'retail'];
export const UNIT_STATUSES = ['vacant', 'occupied', 'maintenance', 'reserved'];

export function validateUnit(input) {
  const errors = {};
  if (!input.number || !String(input.number).trim()) errors.number = 'Unit number is required';
  if (!input.propertyId || !String(input.propertyId).trim()) errors.propertyId = 'Property is required';
  if (!UNIT_TYPES.includes(input.type)) errors.type = 'Invalid type';
  if (!UNIT_STATUSES.includes(input.status)) errors.status = 'Invalid status';
  const rent = Number(input.rent);
  if (input.rent === '' || input.rent == null || !Number.isFinite(rent) || rent < 0)
    errors.rent = 'Rent must be a non-negative number';
  const area = Number(input.area);
  if (input.area === '' || input.area == null || !Number.isFinite(area) || area <= 0)
    errors.area = 'Area must be a positive number';
  return errors;
}

function normalize(input) {
  return {
    number: String(input.number).trim(),
    propertyId: String(input.propertyId).trim(),
    type: input.type,
    status: input.status,
    rent: Number(input.rent),
    area: Number(input.area),
    notes: input.notes ? String(input.notes).trim() : '',
  };
}

function fail(errors) {
  return Object.assign(new Error('Validation failed'), { errors });
}

/** In-memory unit store with optional persistence and change listeners. */
export class UnitStore {
  constructor(initial = [], storage = null, key = 'units') {
    this.storage = storage;
    this.key = key;
    this.listeners = new Set();
    this.items = initial;
    if (storage) {
      try {
        const raw = storage.getItem(key);
        if (raw) this.items = JSON.parse(raw);
      } catch { /* ignore corrupt storage */ }
    }
    this.nextId = this.items.reduce((m, u) => Math.max(m, u.id), 0) + 1;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _commit() {
    if (this.storage) this.storage.setItem(this.key, JSON.stringify(this.items));
    this.listeners.forEach((fn) => fn(this.items));
  }

  _duplicate(candidate, exceptId) {
    return this.items.some(
      (u) =>
        u.id !== exceptId &&
        u.propertyId === candidate.propertyId &&
        u.number.toLowerCase() === candidate.number.toLowerCase()
    );
  }

  list({ search = '', type = '', status = '', propertyId = '' } = {}) {
    const q = search.trim().toLowerCase();
    return this.items.filter(
      (u) =>
        (!type || u.type === type) &&
        (!status || u.status === status) &&
        (!propertyId || u.propertyId === propertyId) &&
        (!q || u.number.toLowerCase().includes(q) || u.propertyId.toLowerCase().includes(q))
    );
  }

  get(id) {
    return this.items.find((u) => u.id === id);
  }

  add(input) {
    const errors = validateUnit(input);
    if (Object.keys(errors).length) throw fail(errors);
    const data = normalize(input);
    if (this._duplicate(data)) throw fail({ number: 'Unit number already exists for this property' });
    const unit = { id: this.nextId++, ...data };
    this.items = [...this.items, unit];
    this._commit();
    return unit;
  }

  update(id, input) {
    const existing = this.get(id);
    if (!existing) throw new Error(`Unit ${id} not found`);
    const merged = { ...existing, ...input };
    const errors = validateUnit(merged);
    if (Object.keys(errors).length) throw fail(errors);
    const data = normalize(merged);
    if (this._duplicate(data, id)) throw fail({ number: 'Unit number already exists for this property' });
    const updated = { id, ...data };
    this.items = this.items.map((u) => (u.id === id ? updated : u));
    this._commit();
    return updated;
  }

  remove(id) {
    if (!this.get(id)) return false;
    this.items = this.items.filter((u) => u.id !== id);
    this._commit();
    return true;
  }

  summary() {
    const byStatus = Object.fromEntries(UNIT_STATUSES.map((s) => [s, 0]));
    let monthlyRent = 0;
    let occupiedRent = 0;
    for (const u of this.items) {
      byStatus[u.status]++;
      monthlyRent += u.rent;
      if (u.status === 'occupied') occupiedRent += u.rent;
    }
    const total = this.items.length;
    return {
      total,
      byStatus,
      monthlyRent,
      occupiedRent,
      occupancyRate: total ? byStatus.occupied / total : 0,
    };
  }
}
