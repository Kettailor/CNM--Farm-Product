"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import SmartFarmDashboard from "./SmartFarmDashboard";
import styles from "./SmartFarmExperience.module.scss";

type FarmLocation = {
  address: string;
  lat: number;
  lng: number;
  updatedAt: string;
};

type LocationMode = "search" | "link" | "manual";

type LocationSuggestion = {
  label: string;
  lat: string;
  lng: string;
};


type FormState = {
  fullName: string;
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  phone: string;
  farmName: string;
  address: string;
  mapLink: string;
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

const ONBOARDING_STORAGE_KEY = "ketkat.ecofarm.onboarding";
const ONBOARDING_UI_STORAGE_KEY = "ketkat.ecofarm.onboarding-ui";

const initialForm: FormState = {
  fullName: "",
  username: "",
  password: "",
  confirmPassword: "",
  email: "",
  phone: "",
  farmName: "",
  address: "",
  mapLink: "",
  lat: "",
  lng: "",
  farmTypes: [],
  cropTypes: [],
  livestockTypes: [],
  resources: [],
  annualRainfall: "",
  animalLoadUnit: "",
  landArea: "",
  carryingCapacity: "",
  carryingUnit: "",
  unitLength: "",
  unitMass: "",
  springStart: "",
  unitTemperature: "",
  unitVolume: "",
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
  "Bạn biết KetKat-EcoFarm từ đâu?",
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

const extractCoordinatesFromGoogleMapsLink = (value: string) => {
  if (!value.trim()) return null;

  const directMatch = value.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (directMatch) {
    return { lat: directMatch[1], lng: directMatch[2] };
  }

  const qMatch = value.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (qMatch) {
    return { lat: qMatch[1], lng: qMatch[2] };
  }

  return null;
};


const getLocationLabel = (value: string) => value.split(",").slice(0, 3).join(", ").trim();

export default function SmartFarmExperience() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [step, setStep] = useState(0);
  const [locationMode, setLocationMode] = useState<LocationMode>("search");
  const [form, setForm] = useState<FormState>(initialForm);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [locationHint, setLocationHint] = useState("");
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const reverseLookupRef = useRef(0);

  const isAccountValid = useMemo(() => {
    const hasValues =
      form.fullName.trim() &&
      form.username.trim() &&
      form.password.trim() &&
      form.confirmPassword.trim() &&
      form.farmName.trim();
    return Boolean(hasValues && form.password === form.confirmPassword);
  }, [form]);

  const accountErrors = useMemo(() => {
    const fullName = form.fullName.trim().length === 0 ? "Vui lòng nhập họ và tên." : "";
    const username = form.username.trim().length < 4 ? "Tên đăng nhập phải có ít nhất 4 ký tự." : "";
    const password = form.password.trim().length < 6 ? "Mật khẩu phải có ít nhất 6 ký tự." : "";
    const confirmPassword = form.confirmPassword !== form.password ? "Mật khẩu xác nhận chưa khớp." : "";
    const farmName = form.farmName.trim().length === 0 ? "Vui lòng nhập tên nông trại." : "";

    return { fullName, username, password, confirmPassword, farmName };
  }, [form]);

  const canContinue = useMemo(() => {
    if (step === 1) return isAccountValid;
    if (step === 2) return Boolean(form.verifiedLocation);
    if (step === 3) return form.farmTypes.length > 0;
    if (step === 5) return form.hearFrom.length > 0;
    return true;
  }, [form, isAccountValid, step]);

  const mapQuery = form.lat && form.lng ? `${form.lat},${form.lng}` : form.address || "";
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`;

  const saveForm = (nextForm: FormState) => {
    setForm(nextForm);
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(nextForm));
    }
  };

  const validateLocation = () => {
    const nextForm = { ...form };

    if (locationMode === "link") {
      const coords = extractCoordinatesFromGoogleMapsLink(form.mapLink);
      if (coords) {
        nextForm.lat = coords.lat;
        nextForm.lng = coords.lng;
        if (!nextForm.address.trim()) {
          nextForm.address = locationHint || `${coords.lat}, ${coords.lng}`;
        }
      }
    }

    const lat = Number(nextForm.lat);
    const lng = Number(nextForm.lng);
    const hasAddress = nextForm.address.trim().length > 0;
    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

    if (!hasAddress && !hasCoordinates) return;

    saveForm({
      ...nextForm,
      verifiedLocation: {
        address: nextForm.address.trim() || `${lat}, ${lng}`,
        lat: hasCoordinates ? lat : 0,
        lng: hasCoordinates ? lng : 0,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  useEffect(() => {
    const storedForm = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (storedForm) {
      try {
        const parsed = JSON.parse(storedForm) as FormState;
        setForm({ ...initialForm, ...parsed });
      } catch {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      }
    }

    const storedUi = localStorage.getItem(ONBOARDING_UI_STORAGE_KEY);
    if (storedUi) {
      try {
        const parsed = JSON.parse(storedUi) as {
          showOnboarding?: boolean;
          completed?: boolean;
          step?: number;
          locationMode?: LocationMode;
        };

        setShowOnboarding(Boolean(parsed.showOnboarding));
        setCompleted(Boolean(parsed.completed));
        setStep(typeof parsed.step === "number" ? parsed.step : 0);
        setLocationMode(parsed.locationMode ?? "search");
      } catch {
        localStorage.removeItem(ONBOARDING_UI_STORAGE_KEY);
      }
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    localStorage.setItem(
      ONBOARDING_UI_STORAGE_KEY,
      JSON.stringify({
        showOnboarding,
        completed,
        step,
        locationMode,
      })
    );
  }, [completed, isHydrated, locationMode, showOnboarding, step]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(form));
  }, [form, isHydrated]);

  useEffect(() => {
    if (step !== 2 || locationMode !== "search") {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    const query = form.address.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsLoadingSuggestions(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          }
        );
        if (!response.ok) {
          throw new Error("Failed to load location suggestions");
        }

        const results = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>;
        setSuggestions(
          results.map((item) => ({
            label: getLocationLabel(item.display_name),
            lat: item.lat,
            lng: item.lon,
          }))
        );
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSuggestions(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [form.address, locationMode, step]);

  useEffect(() => {
    if (step !== 2) return;

    const shouldReverseLookup =
      (locationMode === "manual" && form.lat.trim() && form.lng.trim()) ||
      (locationMode === "link" && form.mapLink.trim() && form.lat.trim() && form.lng.trim());

    if (!shouldReverseLookup) {
      setLocationHint("");
      setIsResolvingLocation(false);
      return;
    }

    const lookupId = reverseLookupRef.current + 1;
    reverseLookupRef.current = lookupId;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsResolvingLocation(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(form.lat)}&lon=${encodeURIComponent(form.lng)}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to reverse geocode location");
        }

        const result = (await response.json()) as { display_name?: string };
        if (controller.signal.aborted || reverseLookupRef.current !== lookupId) return;

        const nextAddress = result.display_name ? getLocationLabel(result.display_name) : `${form.lat}, ${form.lng}`;
        setLocationHint(nextAddress);
        setForm((prev) => {
          if (prev.address === nextAddress) return prev;
          return { ...prev, address: nextAddress, verifiedLocation: null };
        });
      } catch {
        if (!controller.signal.aborted && reverseLookupRef.current === lookupId) {
          const fallback = `${form.lat}, ${form.lng}`;
          setLocationHint(fallback);
          setForm((prev) => {
            if (prev.address === fallback) return prev;
            return { ...prev, address: fallback, verifiedLocation: null };
          });
        }
      } finally {
        if (!controller.signal.aborted && reverseLookupRef.current === lookupId) {
          setIsResolvingLocation(false);
        }
      }
    }, 450);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [form.lat, form.lng, form.mapLink, locationMode, step]);

  if (!isHydrated) {
    return null;
  }

  if (completed) {
    return (
        <SmartFarmDashboard
        profile={{
          fullName: form.fullName || "",
          farmName: form.farmName || "",
          address: form.address,
          lat: form.verifiedLocation?.lat,
          lng: form.verifiedLocation?.lng,
          defaultGridArea: Number.isFinite(Number(form.carryingCapacity)) ? Number(form.carryingCapacity) : 0,
          areaUnit: form.landArea || "",
        }}
      />
    );
  }

  return (
    <div className={styles.wrapper}>
      <section className={styles.hero}>
        <p className={styles.heroBadge}>KetKat-EcoFarm</p>
        <h1>Đăng ký hệ thống quản trị nông trại thông minh</h1>
        <p>
          Chuẩn hóa dữ liệu nông trại, thiết lập bản đồ vận hành và kích hoạt quy trình truy xuất nguồn gốc ngay từ bước
          khởi tạo.
        </p>
        <button onClick={() => setShowOnboarding(true)}>Đăng ký thông tin</button>
      </section>

      {showOnboarding && (
        <section className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.content}>
              <aside className={styles.stepRail}>
                <p className={styles.stepLabel}>Lộ trình thiết lập</p>
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
                {step < 6 && (
                  <div className={styles.stepPreviewMuted}>
                    <span>{step + 2}</span>
                    <p>{stepTitles[step + 1]}</p>
                  </div>
                )}
              </aside>

              <div className={styles.formPanel}>

              {step === 0 && (
                <div className={styles.stepBody}>
                  <h2>Khởi tạo hồ sơ KetKat-EcoFarm</h2>
                  <p>
                    Chào mừng bạn đến với <b>KetKat-EcoFarm</b>. Bộ thiết lập này giúp chuẩn hóa thông tin tài khoản,
                    nông trại, vị trí và đơn vị vận hành để bạn bắt đầu quản trị nhanh chóng.
                  </p>
                  <div className={styles.infoCard}>
                    <p>✅ Thời gian thao tác: khoảng 1–2 phút.</p>
                    <p>✅ Bạn có thể cập nhật lại thông tin sau khi hoàn tất đăng ký.</p>
                  </div>
                  <p>Khi sẵn sàng, nhấn <b>Tiếp tục</b> để bắt đầu.</p>
                </div>
              )}

              {step === 1 && (
                <div className={styles.stepBody}>
                  <h2>Thông tin tài khoản & nông trại</h2>
                  <p>Vui lòng nhập đầy đủ các trường bắt buộc để kích hoạt không gian quản trị của bạn.</p>

                  <div className={styles.formGroup}>
                    <label>Họ và tên *</label>
                    <input
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    />
                    {accountErrors.fullName && <p className={styles.errorText}>{accountErrors.fullName}</p>}
                  </div>

                  <div className={styles.formGroup}>
                    <label>Tên đăng nhập *</label>
                    <input
                      placeholder="Tối thiểu 4 ký tự"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />
                    {accountErrors.username && <p className={styles.errorText}>{accountErrors.username}</p>}
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Mật khẩu *</label>
                      <input
                        type="password"
                        placeholder="Tối thiểu 6 ký tự"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                      {accountErrors.password && <p className={styles.errorText}>{accountErrors.password}</p>}
                    </div>
                    <div className={styles.formGroup}>
                      <label>Xác nhận mật khẩu *</label>
                      <input
                        type="password"
                        placeholder="Nhập lại mật khẩu"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      />
                      {accountErrors.confirmPassword && <p className={styles.errorText}>{accountErrors.confirmPassword}</p>}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Tên nông trại *</label>
                    <input
                      placeholder="Ví dụ: Nông trại Hữu Cơ Miền Tây"
                      value={form.farmName}
                      onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                    />
                    {accountErrors.farmName && <p className={styles.errorText}>{accountErrors.farmName}</p>}
                  </div>

                  {!isAccountValid && <p className={styles.tip}>Vui lòng hoàn tất đúng các trường bắt buộc để tiếp tục.</p>}
                </div>
              )}

              {step === 2 && (
                <div className={styles.stepBody}>
                  <p>
                    Hãy cho chúng tôi biết vị trí nông trại của bạn để KetKat-EcoFarm cấu hình bản đồ và dữ liệu
                    phù hợp. Nên nhập địa chỉ đầy đủ để hệ thống định tâm chính xác trên bản đồ.
                  </p>
                  <p className={styles.tip}>💡 Mẹo: Chọn 1 trong 3 cách: nhập địa chỉ để xem bản đồ trực tiếp, dán link Google Maps hoặc nhập tọa độ.</p>
                  <p>Bạn muốn chia sẻ vị trí theo cách nào? (chọn 1 phương án)</p>

                  <div className={styles.radioGroup}>
                    <label>
                      <input type="radio" checked={locationMode === "search"} onChange={() => setLocationMode("search")} />
                      Nhập địa chỉ / vị trí và xem bản đồ trực tiếp
                    </label>
                    <label>
                      <input type="radio" checked={locationMode === "link"} onChange={() => setLocationMode("link")} />
                      Dán link Google Maps
                    </label>
                    <label>
                      <input type="radio" checked={locationMode === "manual"} onChange={() => setLocationMode("manual")} />
                      Nhập tọa độ Latitude / Longitude
                    </label>
                  </div>

                  {locationMode === "search" && (
                    <>
                      <div className={styles.searchBox}>
                        <textarea
                          placeholder="Nhập địa chỉ, tên khu vực hoặc Plus Code"
                          value={form.address}
                          onChange={(e) => {
                            setForm({ ...form, address: e.target.value, lat: "", lng: "", verifiedLocation: null });
                          }}
                        />
                        {isLoadingSuggestions && <p className={styles.tip}>Đang tìm vị trí phù hợp...</p>}
                        {suggestions.length > 0 && (
                          <div className={styles.suggestionList}>
                            {suggestions.map((item) => (
                              <button
                                key={`${item.label}-${item.lat}-${item.lng}`}
                                type="button"
                                className={styles.suggestionItem}
                                onClick={() => {
                                  setForm({
                                    ...form,
                                    address: item.label,
                                    lat: item.lat,
                                    lng: item.lng,
                                    verifiedLocation: null,
                                  });
                                  setSuggestions([]);
                                }}
                              >
                                <strong>{item.label}</strong>
                                <span>
                                  {Number(item.lat).toFixed(5)}, {Number(item.lng).toFixed(5)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <iframe title="Bản đồ Google xem trực tiếp" className={styles.googleMap} src={mapEmbedUrl} loading="lazy" />
                    </>
                  )}

                  {locationMode === "link" && (
                    <>
                      <input
                        type="url"
                        placeholder="Dán link Google Maps tại đây"
                        value={form.mapLink}
                        onChange={(e) => {
                          const coords = extractCoordinatesFromGoogleMapsLink(e.target.value);
                          setForm({
                            ...form,
                            mapLink: e.target.value,
                            lat: coords?.lat ?? "",
                            lng: coords?.lng ?? "",
                            address: coords ? form.address : "",
                            verifiedLocation: null,
                          });
                        }}
                      />
                      <textarea
                        placeholder="Tên vị trí sẽ tự đọc từ link tracking"
                        value={form.address}
                        readOnly
                      />
                      <p className={styles.tip}>
                        {form.mapLink.trim()
                          ? isResolvingLocation
                            ? "Đang đọc link map và lấy tên vị trí..."
                            : "Ô địa chỉ đã được khóa khi dùng link map. Hệ thống tự động hiển thị tên vị trí từ link."
                          : "Dán link Google Maps để hệ thống tự lấy tọa độ và tên vị trí."}
                      </p>
                      <iframe title="Bản đồ Google xem trực tiếp" className={styles.googleMap} src={mapEmbedUrl} loading="lazy" />
                    </>
                  )}

                  {locationMode === "manual" && (
                    <>
                      <div className={styles.coordRow}>
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="Vĩ độ"
                          value={form.lat}
                          onChange={(e) => setForm({ ...form, lat: e.target.value, mapLink: "", verifiedLocation: null })}
                        />
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="Kinh độ"
                          value={form.lng}
                          onChange={(e) => setForm({ ...form, lng: e.target.value, mapLink: "", verifiedLocation: null })}
                        />
                        <button className={styles.backBtn} type="button" onClick={validateLocation}>
                          Xác thực vị trí
                        </button>
                      </div>
                      <textarea
                        placeholder="Tên vị trí theo tọa độ sẽ hiển thị ở đây"
                        value={form.address}
                        readOnly
                      />
                      <p className={styles.tip}>
                        {form.lat && form.lng
                          ? isResolvingLocation
                            ? "Đang tìm tên vị trí theo tọa độ..."
                            : `Tên vị trí theo tọa độ: ${locationHint || form.address || `${form.lat}, ${form.lng}`}`
                          : "Nhập tọa độ để hệ thống tự hiển thị tên vị trí tương ứng."}
                      </p>
                    </>
                  )}

                  {locationMode === "manual" && <iframe title="Bản đồ Google xem trực tiếp" className={styles.googleMap} src={mapEmbedUrl} loading="lazy" />}
                  {locationMode !== "manual" && (
                    <button className={styles.backBtn} type="button" onClick={validateLocation}>
                      ✥ Xác thực
                    </button>
                  )}
                  {form.verifiedLocation && <p className={styles.validText}>✓ Đã xác thực vị trí</p>}
                  <p>Khi hoàn tất, bấm "Tiếp tục".</p>
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
                      <option value="">Chưa chọn</option>
                      <option>DSE</option>
                    </select>
                    <label>Lượng mưa năm (mm):</label>
                    <input value={form.annualRainfall} onChange={(e) => setForm({ ...form, annualRainfall: e.target.value })} />
                    <label>Đơn vị diện tích đất:</label>
                    <select value={form.landArea} onChange={(e) => setForm({ ...form, landArea: e.target.value })}>
                      <option value="">Chưa chọn</option>
                      <option>Hecta</option>
                    </select>
                    <label>Sức tải:</label>
                    <input value={form.carryingCapacity} onChange={(e) => setForm({ ...form, carryingCapacity: e.target.value })} />
                    <label>Đơn vị sức tải:</label>
                    <select value={form.carryingUnit} onChange={(e) => setForm({ ...form, carryingUnit: e.target.value })}>
                      <option value="">Chưa chọn</option>
                      <option>SDH/100mm</option>
                    </select>
                    <label>Đơn vị chiều dài:</label>
                    <select value={form.unitLength} onChange={(e) => setForm({ ...form, unitLength: e.target.value })}>
                      <option value="">Chưa chọn</option>
                      <option>Mét (m, km)</option>
                    </select>
                    <label>Đơn vị khối lượng:</label>
                    <select value={form.unitMass} onChange={(e) => setForm({ ...form, unitMass: e.target.value })}>
                      <option value="">Chưa chọn</option>
                      <option>Kg, tấn</option>
                    </select>
                    <label>Mốc bắt đầu mùa xuân:</label>
                    <select value={form.springStart} onChange={(e) => setForm({ ...form, springStart: e.target.value })}>
                      <option value="">Chưa chọn</option>
                      <option>01 Tháng 09</option>
                    </select>
                    <label>Đơn vị nhiệt độ:</label>
                    <select
                      value={form.unitTemperature}
                      onChange={(e) => setForm({ ...form, unitTemperature: e.target.value })}
                    >
                      <option value="">Chưa chọn</option>
                      <option>Độ C (°C)</option>
                    </select>
                    <label>Đơn vị thể tích:</label>
                    <select value={form.unitVolume} onChange={(e) => setForm({ ...form, unitVolume: e.target.value })}>
                      <option value="">Chưa chọn</option>
                      <option>Lít, megalit</option>
                    </select>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className={styles.stepBody}>
                  <p>Bạn biết KetKat-EcoFarm từ kênh nào? (chọn tất cả mục phù hợp)</p>

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
                  <p>Nhấn &quot;Hoàn tất&quot; để vào bảng điều khiển và bắt đầu quản lý truy xuất nông sản.</p>
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
                  {step === 0 ? "Đóng" : "← Quay lại"}
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
                  <button
                    className={styles.nextBtn}
                    onClick={() => {
                      setCompleted(true);
                      setShowOnboarding(false);
                    }}
                  >
                    Hoàn tất đăng ký
                  </button>
                )}
              </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
