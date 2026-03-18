# Smart Farm & Traceability Database Design

Tài liệu này mô tả CSDL PostgreSQL để quản lý đầy đủ các khối nghiệp vụ xuất hiện trong ảnh dashboard:

- Livestock, animal counting (video/BLE), livestock tracking.
- Paddocks & fields, grazing planner, fencing assets.
- Water resources, rainfall, soil health, air quality.
- Cold storage, chemical products, energy consumption.
- Vehicles, vehicle counting, video surveillance.
- Alerts & notifications.
- Truy xuất nguồn gốc từ đầu vào trang trại tới bán hàng.

## Nhóm bảng chính

### 1. Dữ liệu lõi
- `farms`, `farm_users`
- `device_gateways`, `sensors`, `cameras`

### 2. Quản lý đất đai và chăn thả
- `paddocks`, `fields`
- `fencing_assets`, `energizers`
- `grazing_plans`, `grazing_plan_items`

### 3. Chăn nuôi và theo dõi vật nuôi
- `animal_groups`, `mobs`, `animals`
- `animal_weights`, `animal_locations`
- `animal_counts`, `animal_count_details`, `animal_events`

### 4. Môi trường và tài nguyên
- `water_assets`, `water_measurements`
- `weather_stations`, `rainfall_measurements`
- `soil_sites`, `soil_measurements`
- `air_quality_sites`, `air_quality_measurements`

### 5. Kho lạnh, hóa chất, năng lượng
- `storage_units`, `storage_measurements`
- `chemical_products`, `chemical_usage_logs`
- `energy_assets`, `energy_measurements`

### 6. Phương tiện và giám sát
- `vehicles`, `vehicle_trip_logs`, `vehicle_counts`
- `surveillance_zones`, `surveillance_events`

### 7. Cảnh báo và tài liệu
- `alert_rules`, `alerts`, `notifications`
- `documents`

### 8. Truy xuất nguồn gốc
- `product_catalog`
- `traceability_lots`, `traceability_events`
- `feed_lots`, `animal_feed_logs`, `health_treatments`

## Những điểm thiết kế quan trọng

1. **Tách master data và time-series**: thông tin danh mục/thiết bị nằm riêng, dữ liệu đo đạc nằm ở các bảng measurement để scale tốt hơn.
2. **Hỗ trợ IoT đa nguồn**: mọi measurement/event có thể nối với `sensor`, `camera`, `gateway` hoặc nhập tay.
3. **Theo dõi vật nuôi chi tiết**:
   - cá thể (`animals`)
   - nhóm (`animal_groups`)
   - mob di chuyển (`mobs`)
   - lịch sử vị trí BLE/video/manual (`animal_locations`)
   - đếm đàn (`animal_counts`)
4. **Truy xuất nguồn gốc end-to-end**:
   - lô sản phẩm (`traceability_lots`)
   - nhật ký sự kiện (`traceability_events`)
   - liên kết tới động vật, lô thức ăn, điều trị, phương tiện vận chuyển.
5. **Có thể mở rộng dashboard** bằng các `view` như:
   - `v_livestock_dashboard`
   - `v_sensor_inventory`
   - `v_traceability_chain`

## Gợi ý triển khai thực tế

- Dùng PostgreSQL + TimescaleDB nếu dữ liệu sensor lớn.
- Dùng PostGIS nếu muốn lưu polygon paddock/field chính xác hơn GeoJSON.
- Tách schema `farm` như trong file SQL để dễ quản trị.
- Nếu cần multi-tenant mạnh hơn, có thể thêm row-level security theo `farm_id`.
- Với camera/video AI, nên lưu metadata và link media ngoài object storage thay vì nhúng binary vào DB.

## Cách dùng

```sql
\i docs/database/farm_traceability_schema.sql
```

Sau đó có thể seed dữ liệu mẫu cho từng module dashboard.
