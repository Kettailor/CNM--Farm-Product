# Frontend UI - Farm Product Traceability System

## Full Folder Structure

```txt
frontend/
  app/
    page.tsx
    layout.tsx
    globals.css
    login/page.tsx
    register/page.tsx
    dashboard/page.tsx
    farms/page.tsx
    farms/[id]/page.tsx
    activities/page.tsx
    batches/page.tsx
    batches/[id]/page.tsx
    processing/page.tsx
    supply-chain/page.tsx
    qr/page.tsx
    traceability/[batchCode]/page.tsx
    consumer/[token]/page.tsx
  components/
    layout/PageLayout.tsx
    layout/Sidebar.tsx
    ui/Button.tsx
    ui/Input.tsx
    cards/StatCard.tsx
    charts/StatusBar.tsx
  lib/
    api.ts
    mock-data.ts
  types/
    index.ts
  package.json
  tsconfig.json
  tailwind.config.ts
  postcss.config.js
  next.config.js
```

## API Integration Example

Implemented in `lib/api.ts`:
- `api.login()` → `POST /auth/login`
- `api.register()` → `POST /auth/register`
- `api.farms()` → `GET /farms/owner/:ownerId`
- `api.batches()` → `GET /batches/farm/:farmId`
- `api.traceability(batchCode)` → `GET /traceability/:batchCode`

## Example UI Layout

- Left sidebar navigation for authenticated roles.
- Dashboard cards for production metrics.
- List/detail pages for farms and batches.
- Dedicated consumer QR page for lifecycle transparency.

## Run

```bash
cd frontend
npm install
npm run dev
```
