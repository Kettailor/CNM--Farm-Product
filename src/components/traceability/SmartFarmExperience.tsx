"use client";

import React, { useEffect, useMemo, useState } from "react";
import SmartFarmDashboard from "./SmartFarmDashboard";
import styles from "./SmartFarmExperience.module.scss";

type FarmLocation = {
  address: string;
  lat: number;
  lng: number;
  updatedAt: string;
};

const ONBOARDING_STORAGE_KEY = "farmdeck.smart.onboarding";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  farmName: string;
  address: string;
  lat: string;
  lng: string;
  farmTypes: string[];
  resources: string[];
  landArea: string;
  annualRainfall: string;
  unitLength: string;
  unitMass: string;
  hearFrom: string[];
  verifiedLocation: FarmLocation | null;
};

const initialForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  farmName: "",
  address: "",
  lat: "",
  lng: "",
  farmTypes: ["Trồng trọt"],
  resources: ["Bồn chứa nước", "Máy bơm"],
  landArea: "Hecta",
  annualRainfall: "1000",
  unitLength: "Mét (m, km)",
  unitMass: "Kg / Tấn",
  hearFrom: ["Sự kiện"],
  verifiedLocation: null,
};

const stepTitles = [
  "Chào mừng",
  "Thông tin cá nhân",
  "Tên nông trại",
  "Vị trí nông trại",
  "Loại hình & quy mô",
  "Đơn vị & thiết lập",
  "Bạn biết Farmdeck từ đâu?",
  "Hoàn tất",
];

const stepDescriptions = [
  "Thiết lập hệ thống quản lý nông trại và truy xuất nguồn gốc chỉ trong vài bước.",
  "Điền thông tin người quản lý để kích hoạt tài khoản.",
  "Tên hiển thị này sẽ xuất hiện trên dashboard và tem truy xuất.",
  "Xác định vị trí để hệ thống gợi ý khí hậu và bản đồ mùa vụ chính xác hơn.",
  "Chọn nhóm sản xuất và tài nguyên hiện có để cá nhân hóa quy trình.",
  "Thiết lập đơn vị đo phù hợp cho báo cáo và nhật ký vận hành.",
  "Thông tin giúp đội ngũ hỗ trợ kết nối chương trình phù hợp cho bạn.",
  "Hoàn tất đăng ký và bắt đầu quản lý nông trại thông minh.",
];

export default function SmartFarmExperience() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);

  const canContinue = useMemo(() => {
    if (step === 1) return form.fullName && form.email && form.phone;
    if (step === 2) return form.farmName;
    if (step === 3) {
      const lat = Number(form.lat);
      const lng = Number(form.lng);
      return Boolean(
        form.address.trim() &&
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          Math.abs(lat) <= 90 &&
          Math.abs(lng) <= 180
      );
    }
    if (step === 4) return form.farmTypes.length > 0;
    if (step === 6) return form.hearFrom.length > 0;
    return true;
  }, [form, step]);

  const saveForm = (nextForm: FormState) => {
    setForm(nextForm);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(nextForm));
  };

  const saveVerifiedLocation = () => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.address.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    saveForm({
      ...form,
      verifiedLocation: {
        address: form.address.trim(),
        lat,
        lng,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as FormState;
        setForm({ ...initialForm, ...parsed });
      } catch {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("dashboard") === "1") {
      setForm({
        ...initialForm,
        fullName: "Nguyễn Văn A",
        farmName: "Ket Farm",
        address: "Long Thành, Đồng Nai",
        lat: "10.8082",
        lng: "106.8464",
        verifiedLocation: {
          address: "Long Thành, Đồng Nai",
          lat: 10.8082,
          lng: 106.8464,
          updatedAt: new Date().toISOString(),
        },
      });
      setCompleted(true);
    }
  }, []);

  if (completed) {
    return (
      <SmartFarmDashboard
        profile={{
          fullName: form.fullName,
          farmName: form.farmName,
          address: form.address,
          lat: form.verifiedLocation?.lat,
          lng: form.verifiedLocation?.lng,
        }}
      />
    );
  }

  return (
    <div className={styles.wrapper}>
      <section className={styles.hero}>
        <h1>Nền tảng quản lý nông sản thông minh</h1>
        <p>
          Theo dõi lô nông sản, giám sát thiết bị IoT, và truy xuất nguồn gốc minh bạch từ nông
          trại đến người tiêu dùng.
        </p>
        <button onClick={() => setShowOnboarding(true)}>Đăng ký & bắt đầu quản lý</button>
      </section>

      {showOnboarding && (
        <section className={styles.modalOverlay}>
          <div className={styles.modal}>
            <aside className={styles.stepper}>
              <p className={styles.stepperTitle}>Quy trình đăng ký</p>
              {stepTitles.map((title, index) => (
                <div key={title} className={styles.stepRow}>
                  <span
                    className={
                      index === step
                        ? styles.activeCircle
                        : index < step
                          ? styles.doneCircle
                          : styles.circle
                    }
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className={index === step ? styles.activeTitle : ""}>{title}</p>
                    <small>{stepDescriptions[index]}</small>
                  </div>
                </div>
              ))}
            </aside>

            <div className={styles.content}>
              {step === 0 && (
                <>
                  <h2>Chào mừng đến với Farmdeck</h2>
                  <p>
                    Chúng tôi sẽ giúp bạn thiết lập tài khoản với thông tin cá nhân và thông tin
                    nông trại chỉ trong vài phút.
                  </p>
                </>
              )}

              {step === 1 && (
                <>
                  <h2>Thông tin cá nhân</h2>
                  <div className={styles.formGrid}>
                    <input
                      placeholder="Họ và tên"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    />
                    <input
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    <input
                      placeholder="Số điện thoại"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2>Tên nông trại</h2>
                  <input
                    placeholder="Nhập tên nông trại"
                    value={form.farmName}
                    onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                  />
                </>
              )}

              {step === 3 && (
                <>
                  <h2>Vị trí nông trại</h2>
                  <p className={styles.note}>
                    Vị trí này là dữ liệu xác thực cho tracking toàn nông trại. Hãy nhập địa chỉ và
                    tọa độ thực tế để phục vụ bản đồ vận hành và truy xuất nguồn gốc.
                  </p>
                  <textarea
                    placeholder="Nhập địa chỉ nông trại"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                  <div className={styles.formGrid}>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Vĩ độ (lat)"
                      value={form.lat}
                      onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    />
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Kinh độ (lng)"
                      value={form.lng}
                      onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    />
                  </div>
                  <img src="/assets/img/gallery/gl1.jpg" alt="Bản đồ" className={styles.mapPreview} />
                  {form.verifiedLocation && (
                    <p className={styles.savedLocation}>
                      Vị trí đã lưu: {form.verifiedLocation.lat.toFixed(4)}, {form.verifiedLocation.lng.toFixed(4)}
                    </p>
                  )}
                </>
              )}

              {step === 4 && (
                <>
                  <h2>Loại hình & quy mô</h2>
                  <div className={styles.checkGroup}>
                    {["Chăn nuôi", "Trồng trọt", "Nông nghiệp hữu cơ", "Nuôi trồng thủy sản"].map((item) => (
                      <label key={item}>
                        <input
                          type="checkbox"
                          checked={form.farmTypes.includes(item)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...form.farmTypes, item]
                              : form.farmTypes.filter((f) => f !== item);
                            setForm({ ...form, farmTypes: next });
                          }}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>

                  <h3>Tài nguyên đang có</h3>
                  <div className={styles.checkGroup}>
                    {["Bồn chứa nước", "Máy bơm", "Máy kéo", "Cảm biến mưa"].map((item) => (
                      <label key={item}>
                        <input
                          type="checkbox"
                          checked={form.resources.includes(item)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...form.resources, item]
                              : form.resources.filter((f) => f !== item);
                            setForm({ ...form, resources: next });
                          }}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {step === 5 && (
                <>
                  <h2>Đơn vị & thiết lập</h2>
                  <div className={styles.formGrid}>
                    <select
                      value={form.landArea}
                      onChange={(e) => setForm({ ...form, landArea: e.target.value })}
                    >
                      <option>Hecta</option>
                      <option>Mẫu</option>
                    </select>
                    <input
                      value={form.annualRainfall}
                      onChange={(e) => setForm({ ...form, annualRainfall: e.target.value })}
                      placeholder="Lượng mưa năm (mm)"
                    />
                    <select
                      value={form.unitLength}
                      onChange={(e) => setForm({ ...form, unitLength: e.target.value })}
                    >
                      <option>Mét (m, km)</option>
                      <option>Feet</option>
                    </select>
                    <select
                      value={form.unitMass}
                      onChange={(e) => setForm({ ...form, unitMass: e.target.value })}
                    >
                      <option>Kg / Tấn</option>
                      <option>Pound</option>
                    </select>
                  </div>
                </>
              )}

              {step === 6 && (
                <>
                  <h2>Bạn biết Farmdeck từ đâu?</h2>
                  <div className={styles.checkGroup}>
                    {["Sự kiện", "Báo chí", "Mạng xã hội", "Bạn bè giới thiệu", "Radio"].map((item) => (
                      <label key={item}>
                        <input
                          type="checkbox"
                          checked={form.hearFrom.includes(item)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...form.hearFrom, item]
                              : form.hearFrom.filter((f) => f !== item);
                            setForm({ ...form, hearFrom: next });
                          }}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {step === 7 && (
                <>
                  <h2>Chúc mừng!</h2>
                  <p>Tài khoản của bạn đã sẵn sàng. Nhấn Hoàn tất để vào hệ thống quản lý.</p>
                </>
              )}

              <div className={styles.actions}>
                <button
                  className={styles.backBtn}
                  onClick={() => {
                    if (step === 0) {
                      setShowOnboarding(false);
                      return;
                    }
                    setStep((prev) => prev - 1);
                  }}
                >
                  ← Quay lại
                </button>

                {step < 7 ? (
                  <button
                    className={styles.nextBtn}
                    disabled={!canContinue}
                    onClick={() => {
                      if (step === 3) {
                        saveVerifiedLocation();
                      } else {
                        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(form));
                      }
                      setStep((prev) => prev + 1);
                    }}
                  >
                    Tiếp tục →
                  </button>
                ) : (
                  <button
                    className={styles.nextBtn}
                    onClick={() => {
                      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(form));
                      setCompleted(true);
                    }}
                  >
                    Hoàn tất
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
