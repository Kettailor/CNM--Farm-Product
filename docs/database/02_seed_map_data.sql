set search_path to farm;

insert into farms (
  id, code, name, description, timezone, latitude, longitude, address_line1, city, state, country, postal_code, status
)
values (
  '11111111-1111-1111-1111-111111111111',
  'KETKAT-01',
  'KetKat-EcoFarm',
  'Nông trại thông minh phục vụ truy xuất nguồn gốc nông sản.',
  'Asia/Ho_Chi_Minh',
  10.8216,
  106.6295,
  'Khu nông nghiệp công nghệ cao',
  'TP. Hồ Chí Minh',
  'TP. Hồ Chí Minh',
  'Việt Nam',
  '700000',
  'active'
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  address_line1 = excluded.address_line1,
  city = excluded.city,
  state = excluded.state,
  country = excluded.country,
  postal_code = excluded.postal_code,
  status = excluded.status,
  updated_at = now();

insert into paddocks (
  id, farm_id, paddock_code, name, area_ha, crop_type, grazing_status, rest_days_target, water_access, notes, boundary_geojson, status
)
values
(
  '22222222-2222-2222-2222-222222222221',
  '11111111-1111-1111-1111-111111111111',
  'A1',
  'Khu rau thủy canh',
  1.8,
  'Rau ăn lá',
  'Đang vận hành',
  7,
  true,
  'Khu trồng chính gần trạm bơm.',
  '{"status":"healthy","occupancy":82,"coverage":"1.8 ha","geo":{"lat":10.8221,"lng":106.6291,"latSpan":0.0015,"lngSpan":0.0019},"metadata":{"areaHecta":1.8,"usage":"Rau thủy canh","soilType":"Giá thể hữu cơ","waterSource":"Bể tuần hoàn","manager":"Nguyễn Văn A","plantingStatus":"Đang canh tác","priority":"medium","notes":"Theo dõi pH mỗi 6 giờ","farmType":"crop","shapeRatio":1.4,"rotationDeg":0},"resources":[{"id":"r-a1-1","type":"water","name":"Bể tuần hoàn số 1","status":"healthy","lastSeen":"08:10","quantity":1},{"id":"r-a1-2","type":"sensors","name":"Cảm biến pH A1","status":"healthy","lastSeen":"08:12","quantity":3}]}'::jsonb,
  'active'
),
(
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'A2',
  'Khu chăn nuôi gia cầm',
  2.4,
  'Gia cầm',
  'Cần kiểm tra nhiệt độ',
  5,
  true,
  'Khu gần cổng phụ.',
  '{"status":"warning","occupancy":64,"coverage":"2.4 ha","geo":{"lat":10.8212,"lng":106.6302,"latSpan":0.0018,"lngSpan":0.0021},"metadata":{"areaHecta":2.4,"usage":"Nuôi gà đẻ","soilType":"Nền đệm lót sinh học","waterSource":"Giếng khoan","manager":"Trần Thị B","plantingStatus":"Chuồng đang hoạt động","priority":"high","notes":"Cần tăng thông gió","farmType":"poultry","shapeRatio":1.3,"rotationDeg":6},"resources":[{"id":"r-a2-1","type":"livestock","name":"Đàn gà mái","status":"warning","lastSeen":"07:55","quantity":320},{"id":"r-a2-2","type":"sensors","name":"Cảm biến nhiệt độ A2","status":"warning","lastSeen":"08:05","quantity":2}]}'::jsonb,
  'active'
)
on conflict (paddock_code) do update set
  name = excluded.name,
  area_ha = excluded.area_ha,
  crop_type = excluded.crop_type,
  grazing_status = excluded.grazing_status,
  rest_days_target = excluded.rest_days_target,
  water_access = excluded.water_access,
  notes = excluded.notes,
  boundary_geojson = excluded.boundary_geojson,
  status = excluded.status;

