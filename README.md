# real-estate-management

## Property Management component

Dependency-free ES-module component in `src/property-management/`.

- `PropertyStore` – CRUD, validation, search/type/status filtering, summary stats, optional storage persistence.
- `PropertyManagement` – UI: summary bar, add/edit form with validation, filters, property table.

```js
import { PropertyManagement, PropertyStore } from './src/property-management/index.js';
new PropertyManagement(document.getElementById('app'), { store: new PropertyStore([], localStorage) });
```

Run `npm test` for tests; serve the repo root (e.g. `npx serve .`) and open `index.html` for a demo.
