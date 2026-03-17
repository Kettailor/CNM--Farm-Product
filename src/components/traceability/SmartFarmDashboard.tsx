"use client";

import React, { useMemo, useState } from "react";
import styles from "./SmartFarmDashboard.module.scss";

type BatchRecord = {
  id: string;
  product: string;
  farm: string;
  plot: string;
  harvestedAt: string;
  status: "Đang vận chuyển" | "Đã nhập kho" | "Đã bán";
  quality: string;
  quantityKg: number;
  cert: string;
  log: { step: string; date: string; actor: string }[];
};

const menuItems = [
  "Tổng quan",
  "Bản đồ nông trại",
  "Mùa vụ",
  "Nhật ký IoT",
  "Truy xuất nguồn gốc",
  "Kho vận",
  "Báo cáo",
];

const batches: BatchRecord[] = [
  {
    id: "VN-DRP-2026-001",
    product: "Dứa Queen",
    farm: "HTX Nông nghiệp Xanh Đắk Lắk",
    plot: "Lô A3",
    harvestedAt: "12/03/2026",
    status: "Đang vận chuyển",
    quality: "Loại 1",
    quantityKg: 620,
    cert: "VietGAP + QR Blockchain",
    log: [
      { step: "Gieo trồng", date: "03/12/2025", actor: "Nông hộ Nguyễn Văn Khoa" },
      { step: "Thu hoạch", date: "12/03/2026", actor: "Tổ thu hoạch số 2" },
      { step: "Đóng gói", date: "13/03/2026", actor: "Kho sơ chế Farmdeck" },
      { step: "Vận chuyển", date: "14/03/2026", actor: "Xe lạnh 51H-236.89" },
    ],
  },
  {
    id: "VN-MNG-2026-014",
    product: "Xoài cát Chu",
    farm: "Trang trại Thông Minh Cần Thơ",
    plot: "Lô C1",
    harvestedAt: "10/03/2026",
    status: "Đã nhập kho",
    quality: "Loại 1",
    quantityKg: 480,
    cert: "GlobalG.A.P",
    log: [
      { step: "Gieo trồng", date: "01/11/2025", actor: "Nông hộ Trần Minh" },
      { step: "Thu hoạch", date: "10/03/2026", actor: "Tổ thu hoạch số 1" },
      { step: "Kiểm định", date: "11/03/2026", actor: "Trung tâm kiểm nghiệm" },
      { step: "Nhập kho", date: "11/03/2026", actor: "Kho miền Tây" },
    ],
  },
  {
    id: "VN-AVO-2026-022",
    product: "Bơ Booth",
    farm: "Nông trại Công nghệ Gia Lai",
    plot: "Lô B2",
    harvestedAt: "08/03/2026",
    status: "Đã bán",
    quality: "Loại đặc biệt",
    quantityKg: 350,
    cert: "OCOP 4 sao",
    log: [
      { step: "Gieo trồng", date: "20/10/2025", actor: "Nông hộ Lê Hiền" },
      { step: "Thu hoạch", date: "08/03/2026", actor: "Tổ thu hoạch số 4" },
      { step: "Phân phối", date: "09/03/2026", actor: "Siêu thị SmartFood" },
      { step: "Bán lẻ", date: "12/03/2026", actor: "Chuỗi cửa hàng EcoMart" },
    ],
  },
];

const sensorCards = [
  { title: "Độ ẩm đất", value: "68%", note: "Ổn định" },
  { title: "Nhiệt độ", value: "27°C", note: "Tối ưu cây ăn trái" },
  { title: "EC dinh dưỡng", value: "1.7 mS/cm", note: "Đạt chuẩn" },
  { title: "Lượng mưa 24h", value: "12 mm", note: "Tưới tự động đã giảm 15%" },
];

type DashboardProfile = {
  fullName: string;
  farmName: string;
  address: string;
};

type SmartFarmDashboardProps = {
  profile?: DashboardProfile;
};

export default function SmartFarmDashboard({ profile }: SmartFarmDashboardProps) {
  const [selectedMenu, setSelectedMenu] = useState("Truy xuất nguồn gốc");
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0].id);

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? batches[0],
    [selectedBatchId]
  );

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <h2 className={styles.logo}>farmdeck</h2>
        <p className={styles.sidebarTitle}>{profile?.farmName || "Smart Agriculture"}</p>
        <ul>
          {menuItems.map((item) => (
            <li key={item}>
              <button
                className={item === selectedMenu ? styles.menuActive : styles.menuBtn}
                onClick={() => setSelectedMenu(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1>Quản lý nông sản thông minh {profile?.fullName ? `- ${profile.fullName}` : ""}</h1>
            <p>Giám sát mùa vụ, theo dõi lô hàng và truy xuất nguồn gốc theo thời gian thực.</p>
            {profile?.address && <small>Địa chỉ nông trại: {profile.address}</small>}
          </div>
          <button className={styles.actionButton}>+ Tạo lô mới</button>
        </header>

        <section className={styles.sensorGrid}>
          {sensorCards.map((sensor) => (
            <article key={sensor.title} className={styles.sensorCard}>
              <h3>{sensor.title}</h3>
              <p className={styles.sensorValue}>{sensor.value}</p>
              <span>{sensor.note}</span>
            </article>
          ))}
        </section>

        <section className={styles.contentGrid}>
          <article className={styles.batchList}>
            <div className={styles.sectionHeader}>
              <h2>Danh sách lô nông sản</h2>
              <small>Nhấn để xem chi tiết</small>
            </div>
            {batches.map((batch) => (
              <button
                key={batch.id}
                className={batch.id === selectedBatch.id ? styles.batchActive : styles.batchItem}
                onClick={() => setSelectedBatchId(batch.id)}
              >
                <div>
                  <strong>{batch.product}</strong>
                  <p>{batch.id}</p>
                </div>
                <span>{batch.status}</span>
              </button>
            ))}
          </article>

          <article className={styles.batchDetail}>
            <div className={styles.sectionHeader}>
              <h2>Thông tin truy xuất</h2>
              <small>Mã QR: {selectedBatch.id}</small>
            </div>

            <div className={styles.detailRows}>
              <p><b>Nông trại:</b> {selectedBatch.farm}</p>
              <p><b>Khu vực:</b> {selectedBatch.plot}</p>
              <p><b>Ngày thu hoạch:</b> {selectedBatch.harvestedAt}</p>
              <p><b>Khối lượng:</b> {selectedBatch.quantityKg} kg</p>
              <p><b>Phân hạng:</b> {selectedBatch.quality}</p>
              <p><b>Chứng nhận:</b> {selectedBatch.cert}</p>
            </div>

            <h3>Nhật ký hành trình</h3>
            <ul className={styles.timeline}>
              {selectedBatch.log.map((item) => (
                <li key={`${item.step}-${item.date}`}>
                  <div>
                    <strong>{item.step}</strong>
                    <span>{item.actor}</span>
                  </div>
                  <time>{item.date}</time>
                </li>
              ))}
            </ul>
          </article>

          <article className={styles.mapCard}>
            <h2>Bản đồ vùng trồng</h2>
            <img src="/assets/img/gallery/gl1.jpg" alt="Bản đồ vệ tinh vùng trồng" />
            <p>
              Vị trí GPS: 12.6651, 108.0376 • Cảnh báo sâu bệnh: <b>Mức thấp</b>
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
