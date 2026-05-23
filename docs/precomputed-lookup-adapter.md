# Precomputed Lookup Adapter

## Current approach

The app currently loads `data/precomputed_spots.json` through a small `precomputedStore` adapter in `app.js`.

The UI depends on only two operations:

- `load()`: prepare the reference data.
- `find(query)`: return the closest precomputed spot, exact/approx status, and rounding reasons.

This keeps the UI independent from the storage format.

## Candidate storage backends

### JSON

Pros:
- Already implemented.
- Works in a static app without new dependencies.
- Easy to inspect and test.

Cons:
- Loads the whole dataset.
- Lookup remains in memory and client-side.
- Large datasets will increase initial transfer size.

### SQLite in browser

Pros:
- Closest to the generated `precomputed_spots.sqlite` artifact.
- Can query normalized tables directly.
- Better fit for larger indexed datasets.

Cons:
- Requires a browser SQLite runtime.
- Adds bundle size and initialization complexity.
- Needs mobile performance validation.

### IndexedDB

Pros:
- Native browser storage.
- Can cache generated lookup records locally.
- Good fit for repeated mobile use after first load.

Cons:
- Requires an import/sync step from generated artifacts.
- Query logic must be implemented around object stores and indexes.
- More migration/versioning work.

## Next PoC shape

Keep the current `precomputedStore` API and add one alternative adapter behind the same boundary:

```text
load() -> Promise<void>
find(query) -> { exact, reasons, spot } | null
```

The PoC should pass the existing Exact and Approx smoke tests without changing UI code.
