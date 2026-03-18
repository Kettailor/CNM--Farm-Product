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

type LocationMode = "search" | "pin" | "manual";

type FormState = {
  fullName: string;
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  phone: string;
  farmName: string;
  address: string;
  lat: string;
  lng: string;
  farmTypes: string[];
  cropTypes: string[];
  livestockTypes: string[];
  resources: string[];
  annualRainfall: string;
  animalLoadUnit: string;
  landArea: string;
  carryingCapacity: string;
  carryingUnit: string;
  unitLength: string;
  unitMass: string;
  springStart: string;
  unitTemperature: string;
  unitVolume: string;
  hearFrom: string[];
  hearFromEventDetails: string[];
  hearFromNewsDetails: string[];
  hearFromOtherText: string;
  verifiedLocation: FarmLocation | null;
};

const ONBOARDING_STORAGE_KEY = "farmdeck.smart.onboarding";

const initialForm: FormState = {
  fullName: "",
  username: "",
  password: "",
  confirmPassword: "",
  email: "",
  phone: "",
  farmName: "",
  address: "",
  lat: "",
  lng: "",
  farmTypes: [],
  cropTypes: [],
  livestockTypes: [],
  resources: [],
  annualRainfall: "1000",
  animalLoadUnit: "DSE",
  landArea: "Hecta",
  carryingCapacity: "1",
  carryingUnit: "SDH/100mm",
  unitLength: "Mét (m, km)",
  unitMass: "Mét (kg, tấn)",
  springStart: "01 Tháng 09",
  unitTemperature: "Độ C (°C)",
  unitVolume: "Mét (lít, megalit)",
  hearFrom: [],
  hearFromEventDetails: [],
  hearFromNewsDetails: [],
  hearFromOtherText: "",
  verifiedLocation: null,
};

const stepTitles = [
  "Giới thiệu hệ thống",
  "Thông tin tài khoản",
  "Định vị nông trại",
  "Loại hình & quy mô nông trại",
  "Đơn vị đo & cài đặt",
  "Bạn biết Farmdeck từ đâu?",
  "Hoàn tất đăng ký 🎉",
];

const sourceOptions = [
  "Sự kiện",
  "Báo in",
  "Blog hoặc ấn phẩm trực tuyến",
  "Người quen giới thiệu",
  "Radio",
  "Công cụ tìm kiếm (Google, Yahoo,...)",
  "Mạng xã hội",
  "Truyền hình",
  "Biển quảng cáo",
  "Khác (vui lòng ghi rõ)",
];

const eventOptions = ["AgQuip", "AgSmart Expo", "AgTech Field Day", "Beef Week", "Khác"];
const newspaperOptions = ["The Farmer", "The Land", "Stock Journal", "Farm Weekly", "Khác"];

const toggleValue = (list: string[], value: string, checked: boolean) =>
  checked ? [...list, value] : list.filter((item) => item !== value);

export default function SmartFarmExperience() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [step, setStep] = useState(0);
  const [locationMode, setLocationMode] = useState<LocationMode>("search");
  const [form, setForm] = useState<FormState>(initialForm);
  const [mapHistory, setMapHistory] = useState<string[]>([]);

  const isAccountValid = useMemo(() => {
    const hasValues =
      form.fullName.trim() &&
      form.username.trim() &&
      form.password.trim() &&
      form.confirmPassword.trim() &&
      form.farmName.trim();
    return Boolean(hasValues && form.password === form.confirmPassword);
  }, [form]);

  const canContinue = useMemo(() => {
    if (step === 1) return isAccountValid;
    if (step === 2) return Boolean(form.verifiedLocation);
    if (step === 3) return form.farmTypes.length > 0;
    if (step === 5) return form.hearFrom.length > 0;
    return true;
  }, [form, isAccountValid, step]);

  const mapQuery = form.lat && form.lng ? `${form.lat},${form.lng}` : form.address || "Việt Nam";
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`;

  const saveForm = (nextForm: FormState) => {
    setForm(nextForm);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(nextForm));
  };

  const validateLocation = () => {
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
  }, []);

  useEffect(() => {
    if (step !== 2 || !mapQuery.trim()) return;

    const timer = setTimeout(() => {
      setMapHistory((prev) => {
        if (prev[0] === mapQuery) return prev;
        const next = [mapQuery, ...prev.filter((item) => item !== mapQuery)].slice(0, 6);
        return next;
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [mapQuery, step]);

  if (completed) {
    return (
      <SmartFarmDashboard
        profile={{
          fullName: form.fullName || "Nguyễn Văn A",
          farmName: form.farmName || "Nông trại mẫu",
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
        <p>Theo dõi lô nông sản, giám sát IoT và truy xuất nguồn gốc minh bạch từ nông trại đến người dùng.</p>
        <button onClick={() => setShowOnboarding(true)}>Đăng ký & bắt đầu quản lý</button>
      </section>

      {showOnboarding && (
        <section className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.content}>
              {step > 0 && (
                <div className={styles.stepPreviewMuted}>
                  <span>{step}</span>
                  <p>{stepTitles[step - 1]}</p>
                </div>
              )}

              <div className={styles.stepPreviewActive}>
                <span>{step + 1}</span>
                <p>{stepTitles[step]}</p>
              </div>

              {step === 0 && (
                <div className={styles.stepBody}>
                  <p>
                    Chào mừng bạn đến với <b>Farmdeck</b> - nền tảng tất cả trong một để quản lý nông trại hiệu quả,
                    theo dõi vận hành hằng ngày và truy xuất nguồn gốc sản phẩm.
                  </p>
                  <p>
                    Thiết lập này chỉ mất chưa đến một phút. Chúng tôi sẽ thu thập thông tin cơ bản để cá nhân hoá hệ
                    thống theo mô hình nông trại của bạn.
                  </p>
                  <p>Khi sẵn sàng, bấm "Tiếp tục".</p>
                </div>
              )}

              {step === 1 && (
                <div className={styles.stepBody}>
                  <p>Vui lòng nhập thông tin tài khoản để phục vụ đăng nhập và quản lý nông trại.</p>
                  <input
                    placeholder="Họ và tên"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                  <input
                    placeholder="Tên tài khoản đăng nhập"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                  <input
                    type="password"
                    placeholder="Mật khẩu"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  />
                  <input
                    placeholder="Tên nông trại"
                    value={form.farmName}
                    onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                  />
                  {!isAccountValid && <p className={styles.tip}>Tên tài khoản/mật khẩu chưa hợp lệ hoặc chưa khớp.</p>}
                </div>
              )}

              {step === 2 && (
                <div className={styles.stepBody}>
                  <p>Vui lòng chia sẻ vị trí nông trại để hệ thống theo dõi bản đồ và truy xuất chính xác hơn.</p>
                  <p className={styles.tip}>💡 Bạn có thể chọn 1 trong 3 cách. Dù chọn cách nào vẫn có live view bản đồ.</p>

                  <div className={styles.radioGroup}>
                    <label>
                      <input type="radio" checked={locationMode === "search"} onChange={() => setLocationMode("search")} />
                      Tìm kiếm địa chỉ bằng Google Maps
                    </label>
                    <label>
                      <input type="radio" checked={locationMode === "pin"} onChange={() => setLocationMode("pin")} />
                      Chọn vị trí trực tiếp trên bản đồ
                    </label>
                    <label>
                      <input type="radio" checked={locationMode === "manual"} onChange={() => setLocationMode("manual")} />
                      Nhập thủ công kinh độ / vĩ độ (>= 4 chữ số thập phân)
                    </label>
                  </div>

                  <textarea
                    placeholder="Nhập địa chỉ hoặc Plus Code"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value, verifiedLocation: null })}
                  />

                  {(locationMode === "manual" || locationMode === "pin") && (
                    <div className={styles.coordRow}>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Vĩ độ"
                        value={form.lat}
                        onChange={(e) => setForm({ ...form, lat: e.target.value, verifiedLocation: null })}
                      />
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Kinh độ"
                        value={form.lng}
                        onChange={(e) => setForm({ ...form, lng: e.target.value, verifiedLocation: null })}
                      />
                      <button className={styles.backBtn} type="button" onClick={validateLocation}>
                        Xác thực vị trí
                      </button>
                    </div>
                  )}

                  <iframe title="Bản đồ Google" className={styles.googleMap} src={mapEmbedUrl} loading="lazy" />
                  <p className={styles.tip}>Danh sách theo dõi truy vấn Google Maps:</p>
                  <ul className={styles.mapHistory}>
                    {mapHistory.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                  {form.verifiedLocation && <p className={styles.validText}>✓ Đã xác thực vị trí thành công</p>}
                </div>
              )}

              {step === 3 && (
                <div className={styles.stepBody}>
                  <p>Vui lòng chọn loại hình đang có trên nông trại (chọn ít nhất 1 mục).</p>

                  <div className={styles.checkGroup}>
                    <label>
                      <input
                        type="checkbox"
                        checked={form.farmTypes.includes("Chăn nuôi")}
                        onChange={(e) => setForm({ ...form, farmTypes: toggleValue(form.farmTypes, "Chăn nuôi", e.target.checked) })}
                      />
                      🐂 Chăn nuôi
                    </label>
                    {form.farmTypes.includes("Chăn nuôi") && (
                      <div className={styles.subGroup}>
                        <p>Chọn vật nuôi bạn đang nuôi:</p>
                        {["Bò", "Cừu", "Dê", "Ngựa", "Heo", "Gia cầm", "Khác"].map((item) => (
                          <label key={item}>
                            <input
                              type="checkbox"
                              checked={form.livestockTypes.includes(item)}
                              onChange={(e) =>
                                setForm({ ...form, livestockTypes: toggleValue(form.livestockTypes, item, e.target.checked) })
                              }
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                    )}

                    <label>
                      <input
                        type="checkbox"
                        checked={form.farmTypes.includes("Cây trồng")}
                        onChange={(e) => setForm({ ...form, farmTypes: toggleValue(form.farmTypes, "Cây trồng", e.target.checked) })}
                      />
                      🌾 Cây trồng
                    </label>
                    {form.farmTypes.includes("Cây trồng") && (
                      <div className={styles.subGroup}>
                        <p>Chọn nhóm cây trồng chính:</p>
                        {["Đồng cỏ", "Cây ăn quả", "Ngũ cốc", "Rau màu", "Khác"].map((item) => (
                          <label key={item}>
                            <input
                              type="checkbox"
                              checked={form.cropTypes.includes(item)}
                              onChange={(e) => setForm({ ...form, cropTypes: toggleValue(form.cropTypes, item, e.target.checked) })}
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                    )}

                    <label>
                      <input
                        type="checkbox"
                        checked={form.farmTypes.includes("Tài nguyên & thiết bị")}
                        onChange={(e) =>
                          setForm({ ...form, farmTypes: toggleValue(form.farmTypes, "Tài nguyên & thiết bị", e.target.checked) })
                        }
                      />
                      🚜 Tài nguyên & thiết bị
                    </label>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className={styles.stepBody}>
                  <p>Thiết lập đơn vị đo để bảng điều khiển phù hợp với nhu cầu vận hành của bạn.</p>
                  <div className={styles.unitsGrid}>
                    <label>Đơn vị tải vật nuôi:</label>
                    <select value={form.animalLoadUnit} onChange={(e) => setForm({ ...form, animalLoadUnit: e.target.value })}>
                      <option>DSE</option>
                    </select>
                    <label>Lượng mưa năm (mm):</label>
                    <input value={form.annualRainfall} onChange={(e) => setForm({ ...form, annualRainfall: e.target.value })} />
                    <label>Đơn vị diện tích đất:</label>
                    <select value={form.landArea} onChange={(e) => setForm({ ...form, landArea: e.target.value })}>
                      <option>Hecta</option>
                    </select>
                    <label>Sức tải:</label>
                    <input value={form.carryingCapacity} onChange={(e) => setForm({ ...form, carryingCapacity: e.target.value })} />
                    <label>Đơn vị sức tải:</label>
                    <select value={form.carryingUnit} onChange={(e) => setForm({ ...form, carryingUnit: e.target.value })}>
                      <option>SDH/100mm</option>
                    </select>
                    <label>Đơn vị chiều dài:</label>
                    <select value={form.unitLength} onChange={(e) => setForm({ ...form, unitLength: e.target.value })}>
                      <option>Mét (m, km)</option>
                    </select>
                    <label>Đơn vị khối lượng:</label>
                    <select value={form.unitMass} onChange={(e) => setForm({ ...form, unitMass: e.target.value })}>
                      <option>Kg, tấn</option>
                    </select>
                    <label>Mốc bắt đầu mùa xuân:</label>
                    <select value={form.springStart} onChange={(e) => setForm({ ...form, springStart: e.target.value })}>
                      <option>01 Tháng 09</option>
                    </select>
                    <label>Đơn vị nhiệt độ:</label>
                    <select
                      value={form.unitTemperature}
                      onChange={(e) => setForm({ ...form, unitTemperature: e.target.value })}
                    >
                      <option>Độ C (°C)</option>
                    </select>
                    <label>Đơn vị thể tích:</label>
                    <select value={form.unitVolume} onChange={(e) => setForm({ ...form, unitVolume: e.target.value })}>
                      <option>Lít, megalit</option>
                    </select>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className={styles.stepBody}>
                  <p>Bạn biết Farmdeck từ kênh nào? (chọn tất cả mục phù hợp)</p>

                  <div className={styles.checkGroup}>
                    {sourceOptions.map((item) => (
                      <label key={item}>
                        <input
                          type="checkbox"
                          checked={form.hearFrom.includes(item)}
                          onChange={(e) => setForm({ ...form, hearFrom: toggleValue(form.hearFrom, item, e.target.checked) })}
                        />
                        {item}
                      </label>
                    ))}

                    {form.hearFrom.includes("Sự kiện") && (
                      <div className={styles.subGroup}>
                        <p>Bạn biết qua sự kiện nào?</p>
                        {eventOptions.map((item) => (
                          <label key={item}>
                            <input
                              type="checkbox"
                              checked={form.hearFromEventDetails.includes(item)}
                              onChange={(e) =>
                                setForm({ ...form, hearFromEventDetails: toggleValue(form.hearFromEventDetails, item, e.target.checked) })
                              }
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                    )}

                    {form.hearFrom.includes("Báo in") && (
                      <div className={styles.subGroup}>
                        <p>Bạn thấy chúng tôi trên báo nào?</p>
                        {newspaperOptions.map((item) => (
                          <label key={item}>
                            <input
                              type="checkbox"
                              checked={form.hearFromNewsDetails.includes(item)}
                              onChange={(e) =>
                                setForm({ ...form, hearFromNewsDetails: toggleValue(form.hearFromNewsDetails, item, e.target.checked) })
                              }
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                    )}

                    {form.hearFrom.includes("Khác (vui lòng ghi rõ)") && (
                      <>
                        <p>Vui lòng ghi rõ:</p>
                        <input
                          placeholder="Nhập nội dung"
                          value={form.hearFromOtherText}
                          onChange={(e) => setForm({ ...form, hearFromOtherText: e.target.value })}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className={styles.stepBody}>
                  <p>Bạn đã hoàn tất đăng ký.</p>
                  <p>Nhấn "Hoàn tất" để vào bảng điều khiển và bắt đầu quản lý truy xuất nông sản.</p>
                </div>
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

                {step < 6 ? (
                  <button
                    className={styles.nextBtn}
                    disabled={!canContinue}
                    onClick={() => {
                      if (step !== 2) {
                        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(form));
                      }
                      setStep((prev) => prev + 1);
                    }}
                  >
                    Tiếp tục →
                  </button>
                ) : (
                  <button className={styles.nextBtn} onClick={() => setCompleted(true)}>
                    Hoàn tất
                  </button>
                )}
              </div>

              {step < 6 && (
                <div className={styles.stepPreviewMuted}>
                  <span>{step + 2}</span>
                  <p>{stepTitles[step + 1]}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
