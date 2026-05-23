# Precomputed Lookup Adapter

## Current approach

The app currently loads `data/precomputed_spots.sqlite` through a small `precomputedStore` adapter in `app.js`.
The browser runtime uses `sql.js` from `vendor/sql.js/` and fetches the generated SQLite artifact directly.

The UI depends on only two operations:

- `load()`: prepare the reference data.
- `find(query)`: return the closest precomputed spot, exact/approx status, and rounding reasons.

This keeps the UI independent from the storage format.

## Candidate storage backends

### SQLite in browser

Decision: selected.

Pros:
- Closest to the generated `precomputed_spots.sqlite` artifact.
- Queries normalized tables directly.
- Better fit for larger indexed datasets than loading a full JSON lookup document.
- Keeps the static app deployment model.

Cons:
- Requires a browser SQLite runtime.
- Adds `sql-wasm.js` and `sql-wasm.wasm` to static assets.
- Needs mobile performance validation as the dataset grows.

### JSON

Pros:
- Simple fallback format.
- Easy to inspect and test.

Cons:
- Loads the whole dataset.
- Lookup remains in memory and client-side.
- Large datasets will increase initial transfer size.

### IndexedDB

Pros:
- Native browser storage.
- Can cache generated lookup records locally.
- Good fit for repeated mobile use after first load.

Cons:
- Requires an import/sync step from generated artifacts.
- Query logic must be implemented around object stores and indexes.
- More migration/versioning work.

## Adapter shape

The UI uses this store API:

```text
load() -> Promise<void>
find(query) -> { exact, reasons, spot } | null
```

Future IndexedDB or remote adapters should keep this API and pass the existing Exact and Approx smoke tests without changing UI code.
