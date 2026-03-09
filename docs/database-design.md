# Farm Product Traceability System - Relational Database Design

## 1) ERD Description

The schema is organized into 9 bounded module groups with strict relational links to maintain end-to-end provenance:

1. **Authentication & Authorization**
   - `users` ↔ `user_roles` ↔ `roles` ↔ `role_permissions` ↔ `permissions`
2. **Farm Management**
   - `farms` → `farm_plots` → `crops`
3. **Farming Activities**
   - `farming_activities` references `farms`, `farm_plots`, `crops`, and optional `fertilizers` / `pesticides`
   - `irrigation_logs` references `farm_plots`
4. **Harvest & Batch**
   - `harvest_records` references farm hierarchy
   - `batches` aggregates harvest into traceable units
   - `batch_items` bridges batch↔crop/harvest granularity
   - `batch_history` stores status transitions
5. **Processing**
   - `processing_records` references `batches`
   - `processed_products` references processing outputs
   - `packaging` references `batches` and optional processed SKU outputs
6. **Supply Chain**
   - `supply_chain_actors` normalizes farm/processor/logistics/retailer organizations
   - `shipments` + `shipment_tracking` trace movement
   - `warehouses` + `warehouse_logs` track inventory movement
7. **QR Traceability**
   - `qr_codes` references `batches`
   - `qr_scan_logs` captures scan telemetry and user context
8. **Certification & Inspection**
   - `certifications` references `batches`
   - `inspection_reports` references batch and optional certification
9. **Traceability Projection**
   - `traceability_logs` is immutable event timeline by batch and stage
   - `product_lifecycle` is the current-state projection per batch

This structure is in **3NF**:
- Many-to-many relations are decomposed via junction tables.
- Reusable master data (`roles`, `permissions`, `fertilizers`, `pesticides`, `supply_chain_actors`) is separated from transaction/event tables.
- Derived/current-state data (`product_lifecycle`) is isolated from append-only history (`traceability_logs`, `batch_history`).

## 2) Table List

- `users`, `roles`, `permissions`, `user_roles`, `role_permissions`
- `farms`, `farm_plots`, `crops`
- `fertilizers`, `pesticides`, `farming_activities`, `irrigation_logs`
- `harvest_records`, `batches`, `batch_items`, `batch_history`
- `processing_records`, `processed_products`, `packaging`
- `supply_chain_actors`, `warehouses`, `warehouse_logs`, `shipments`, `shipment_tracking`
- `qr_codes`, `qr_scan_logs`
- `certifications`, `inspection_reports`
- `traceability_logs`, `product_lifecycle`

## 3) Column Definitions (Conventions)

- **PK**: every table uses UUID (`String @db.Uuid` with `@default(uuid())`).
- **Audit columns**: every table has:
  - `created_at` (`createdAt`) default `now()`
  - `updated_at` (`updatedAt`) auto-updated via `@updatedAt`
- **FK columns** follow `*_id` naming with explicit relation behavior (`Cascade`, `Restrict`, or `SetNull`).
- **High-precision quantity fields** use `Decimal(14,3)` or `Decimal(12,2)`.
- **Temporal lineage fields** include `event_time`, `process_date`, `harvest_date`, `inspection_date`, etc.

## 4) Relationships

### Core trace chain
- `farms (1) -> (N) harvest_records`
- `harvest_records (N) -> (N) batches` via `batch_items`
- `batches (1) -> (N) processing_records`
- `processing_records (1) -> (N) processed_products`
- `batches (1) -> (N) shipments`
- `shipments (1) -> (N) shipment_tracking`
- `batches (1) -> (N) qr_codes -> (N) qr_scan_logs`
- `batches (1) -> (N) certifications -> (N) inspection_reports`
- `batches (1) -> (N) traceability_logs`
- `batches (1) -> (1) product_lifecycle`

### Security model
- `users (N) <-> (N) roles` via `user_roles`
- `roles (N) <-> (N) permissions` via `role_permissions`

### Inventory/logistics model
- `supply_chain_actors (1) -> (N) warehouses`
- `warehouses (1) -> (N) warehouse_logs`
- `supply_chain_actors (1) -> (N) shipments` as source/destination

## 5) Prisma Schema

The full executable Prisma schema is defined at:
- `backend/prisma/schema.prisma`

It includes all required modules/tables, UUID keys, created/updated timestamps, foreign keys, and performance indexes.

## 6) Example Queries for Traceability

### A. Full timeline for a batch code (farm → consumer scan)

```sql
SELECT
  b.batch_code,
  tl.stage,
  tl.event_time,
  tl.description,
  tl.metadata
FROM batches b
JOIN traceability_logs tl ON tl.batch_id = b.id
WHERE b.batch_code = $1
ORDER BY tl.event_time ASC;
```

### B. Batch provenance with harvest sources and plots

```sql
SELECT
  b.batch_code,
  f.name AS farm_name,
  fp.name AS plot_name,
  c.crop_name,
  hr.harvest_date,
  bi.quantity_kg
FROM batches b
JOIN batch_items bi ON bi.batch_id = b.id
LEFT JOIN harvest_records hr ON hr.id = bi.harvest_record_id
LEFT JOIN crops c ON c.id = bi.crop_id
LEFT JOIN farm_plots fp ON fp.id = hr.farm_plot_id
JOIN farms f ON f.id = b.farm_id
WHERE b.batch_code = $1;
```

### C. Processing + packaging summary for a batch

```sql
SELECT
  b.batch_code,
  pr.processing_type,
  pr.process_date,
  pp.sku,
  pp.product_name,
  p.package_type,
  p.unit_count
FROM batches b
LEFT JOIN processing_records pr ON pr.batch_id = b.id
LEFT JOIN processed_products pp ON pp.processing_record_id = pr.id
LEFT JOIN packaging p ON p.batch_id = b.id
WHERE b.batch_code = $1
ORDER BY pr.process_date;
```

### D. Logistics path with tracking points

```sql
SELECT
  b.batch_code,
  s.shipment_code,
  s.status,
  st.event_time,
  st.location_text,
  st.status_message
FROM batches b
JOIN shipments s ON s.batch_id = b.id
LEFT JOIN shipment_tracking st ON st.shipment_id = s.id
WHERE b.batch_code = $1
ORDER BY st.event_time;
```

### E. Consumer scan analytics by day

```sql
SELECT
  DATE(qsl.scanned_at) AS scan_day,
  COUNT(*) AS total_scans
FROM qr_scan_logs qsl
JOIN qr_codes qc ON qc.id = qsl.qr_code_id
JOIN batches b ON b.id = qc.batch_id
WHERE b.batch_code = $1
GROUP BY DATE(qsl.scanned_at)
ORDER BY scan_day;
```
