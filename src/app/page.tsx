"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type StepKey = 1 | 2 | 3 | 4 | 5 | 6;
type LastSource = "name" | "link" | "coord";
type Suggestion = { name: string; lat: string; lng: string };

const STEPS = ["B1 · Thông tin cá nhân", "B2 · Đặt tên trang trại", "B3 · Vị trí trang trại", "B4 · Loại hình và quy mô", "B5 · Đơn vị và cài đặt", "B6 · Nguồn biết đến hệ thống"];
const LIVESTOCK = ["Gia súc", "Cừu", "Dê", "Ngựa", "Lợn", "Gia cầm", "Alpacas", "Khác"];
const CROPS = ["Đồng cỏ", "Trái cây", "Hạt", "Ngũ cốc", "Rau", "Khác"];
const RESOURCES = ["Bể chứa nước", "Máng", "Đập", "Máy đo mưa", "Máy bơm", "Máy kéo", "Thiết bị khác"];
const HEARD = ["Sự kiện", "Báo chí", "Blog hoặc ấn phẩm trực tuyến", "Đề xuất ngang hàng", "Đài phát thanh", "Công cụ tìm kiếm", "Truyền thông xã hội", "Truyền hình", "Biển quảng cáo", "Khác"];
const decimalRegex = /^[-]?[0-9]+\.[0-9]{4,}$/;
const isCoordValid = (lat: string, lng: string) => decimalRegex.test(lat) && decimalRegex.test(lng) && Number(lat) >= -90 && Number(lat) <= 90 && Number(lng) >= -180 && Number(lng) <= 180;

export default function RegistrationPage() {
  const router = useRouter();
  const logoSrc = useMemo(() => "/favcion.png", []);
  const [step, setStep] = useState<StepKey>(1);
  const [loading, setLoading] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [f, setF] = useState({ fullName: "", email: "", password: "", farmName: "", farmArea: "10", locationName: "", mapsLink: "", lat: "10.762622", lng: "106.660172", lastSource: "coord" as LastSource, livestockTypes: [] as string[], livestockQty: {} as Record<string, string>, cropTypes: [] as string[], resourceTypes: [] as string[], otherActivity: "", specialFactors: "", annualRainfall: "1000", carryingCapacity: "11", springStart: "01/09", heardFrom: [] as string[], heardOther: "" });

  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(`${f.lat},${f.lng}`)}&z=15&output=embed`;
  const hasValidLocation = (!!f.locationName.trim() || /^https?:\/\//i.test(f.mapsLink.trim())) && isCoordValid(f.lat, f.lng);
  const pick = (k: "livestockTypes" | "cropTypes" | "resourceTypes" | "heardFrom", v: string) => setF((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  useEffect(() => {
    if (step !== 3 || f.lastSource !== "name" || f.locationName.trim().length < 2) return setSuggestions([]);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(f.locationName)}`);
        const d = (await r.json()) as Array<{ display_name: string; lat: string; lon: string }>;
        setSuggestions(d.map((x) => ({ name: x.display_name, lat: Number(x.lat).toFixed(6), lng: Number(x.lon).toFixed(6) })));
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [f.locationName, f.lastSource, step]);

  const applyLink = (link: string) => {
    const m = link.match(/@([-0-9.]+),([-0-9.]+)/) || link.match(/[?&]q=([-0-9.]+),([-0-9.]+)/);
    if (!m) return setLocationError("Liên kết Google Maps không hợp lệ.");
    const lat = Number(m[1]).toFixed(6);
    const lng = Number(m[2]).toFixed(6);
    if (!isCoordValid(lat, lng)) return setLocationError("Tọa độ trong liên kết không hợp lệ.");
    const name = decodeURIComponent((link.match(/\/place\/([^/]+)/)?.[1] || "").replace(/\+/g, " "));
    setLocationError("");
    setF((p) => ({ ...p, mapsLink: link, locationName: name || `Google Maps ${lat}, ${lng}`, lat, lng, lastSource: "link" }));
  };

  const hasInvalidLivestockQty = f.livestockTypes.some((name) => {
    const qty = Number(f.livestockQty[name]);
    return !Number.isFinite(qty) || qty <= 0;
  });

  const validStep = () => {
    if (step === 1) return !!f.fullName && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) && f.password.length >= 8;
    if (step === 2) return f.farmName.trim().length >= 2 && Number(f.farmArea) > 0;
    if (step === 3) return hasValidLocation;
    if (step === 4) {
      const hasAnyType = f.livestockTypes.length + f.cropTypes.length + f.resourceTypes.length + (f.otherActivity ? 1 : 0) > 0;
      return hasAnyType && !hasInvalidLivestockQty;
    }
    if (step === 5) return !!f.annualRainfall && !!f.carryingCapacity && !!f.springStart;
    return f.heardFrom.length > 0;
  };

  const buildPayload = () => ({
    owner: { fullName: f.fullName.trim(), email: f.email.trim(), password: f.password },
    farm: { name: f.farmName.trim(), areaHectare: Number(f.farmArea), specialFactors: f.specialFactors.trim() || undefined, otherActivity: f.otherActivity.trim() || undefined },
    location: { locationName: f.locationName.trim() || undefined, mapsLink: f.mapsLink.trim() || undefined, lat: f.lat, lng: f.lng },
    production: {
      livestock: f.livestockTypes.map((name) => ({ name, quantity: Number(f.livestockQty[name]) })),
      crops: f.cropTypes,
      resources: f.resourceTypes,
    },
    settings: { annualRainfall: Number(f.annualRainfall), carryingCapacity: Number(f.carryingCapacity), springStart: f.springStart.trim() },
    referral: { channels: f.heardFrom, otherNote: f.heardFrom.includes("Khác") ? f.heardOther.trim() || undefined : undefined },
  });

  const onNext = async () => {
    setError("");
    if (!validStep()) return setError("Dữ liệu của bước hiện tại chưa hợp lệ. Vui lòng kiểm tra lại.");

    if (step === 1) {
      setEmailChecking(true);
      try {
        const checkRes = await fetch("/api/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: f.email.trim() }),
        });
        const checkData = (await checkRes.json()) as { exists?: boolean; can_check?: boolean; message?: string };
        if (checkRes.ok && checkData.can_check !== false && checkData.exists) {
          return setError("Email đã tồn tại trong hệ thống. Vui lòng dùng email khác.");
        }
        if (!checkRes.ok && checkData.message) {
          setError(checkData.message);
        }
      } catch {
        setError("Không thể kiểm tra email lúc này, hệ thống sẽ tiếp tục bước đăng ký.");
      } finally {
        setEmailChecking(false);
      }
    }

    if (step < 6) return setStep((s) => (s + 1) as StepKey);

    setLoading(true);
    try {
      const res = await fetch("/api/registration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) });
      const p = (await res.json()) as { message?: string };
      if (!res.ok) return setError(p.message || "Lưu thông tin thất bại. Vui lòng thử lại.");
      router.push("/login");
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return <main className="registration-page"><section className="registration-card"><aside className="registration-aside"><div className="registration-brand"><img src={logoSrc} alt="logo" onError={(e) => (e.currentTarget.src = "/favicon.ico")} /><strong>KetKat-EcoFarm</strong></div><h1>Đăng ký thông tin trang trại</h1><ul className="registration-steps">{STEPS.map((s, i) => <li key={s} className={i + 1 === step ? "active-step" : ""}><span>{String(i + 1).padStart(2, "0")}</span>{s}</li>)}</ul></aside>
    <div className="registration-content"><p className="form-kicker">BƯỚC {step}/6</p><h2>{STEPS[step - 1]}</h2><div className="form-grid">
      {step === 1 && <><div className="form-field"><label>Họ và tên *</label><input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div><div className="form-field"><label>Email *</label><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div><div className="form-field full"><label>Mật khẩu *</label><input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div></>}
      {step === 2 && <><div className="form-field full"><label>Tên trang trại *</label><input value={f.farmName} onChange={(e) => setF({ ...f, farmName: e.target.value })} /></div><div className="form-field"><label>Diện tích trang trại (ha) *</label><input type="number" min="0.01" step="0.01" value={f.farmArea} onChange={(e) => setF({ ...f, farmArea: e.target.value })} /></div></>}
      {step === 3 && <><div className="form-field full suggest-wrap"><label>Tên vị trí</label><input value={f.locationName} onChange={(e) => { setLocationError(""); setF({ ...f, locationName: e.target.value, lastSource: "name" }); }} />{suggestions.length > 0 && <ul className="suggest-list">{suggestions.map((s) => <li key={`${s.lat}-${s.lng}-${s.name}`}><button type="button" onClick={() => { setSuggestions([]); setF((p) => ({ ...p, locationName: s.name, lat: s.lat, lng: s.lng, mapsLink: `https://www.google.com/maps?q=${s.lat},${s.lng}`, lastSource: "name" })); }}>{s.name}</button></li>)}</ul>}</div><div className="form-field full"><label>Liên kết Google Maps</label><input value={f.mapsLink} onChange={(e) => { const v = e.target.value; setF((p) => ({ ...p, mapsLink: v })); if (/^https?:\/\//i.test(v)) applyLink(v); }} /></div><div className="form-field"><label>Vĩ độ</label><input value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value, lastSource: "coord" })} /></div><div className="form-field"><label>Kinh độ</label><input value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value, lastSource: "coord" })} /></div><div className="form-field full map-wrap"><iframe title="Bản đồ vị trí" src={mapEmbed} loading="lazy" /></div>{locationError && <p className="form-error">{locationError}</p>}</>}
      {step === 4 && <><div className="form-field full"><label>Chăn nuôi</label><div className="check-grid">{LIVESTOCK.map((x) => <label key={x} className="check-item"><input type="checkbox" checked={f.livestockTypes.includes(x)} onChange={() => pick("livestockTypes", x)} />{x}</label>)}</div></div>{f.livestockTypes.map((x) => <div className="form-field" key={`qty-${x}`}><label>Số lượng {x} *</label><input type="number" min="1" value={f.livestockQty[x] || ""} onChange={(e) => setF((p) => ({ ...p, livestockQty: { ...p.livestockQty, [x]: e.target.value } }))} />{(!f.livestockQty[x] || Number(f.livestockQty[x]) <= 0) && <p className="form-error">Vui lòng nhập số lượng lớn hơn 0 cho {x}.</p>}</div>)}<div className="form-field full"><label>Cây trồng</label><div className="check-grid">{CROPS.map((x) => <label key={x} className="check-item"><input type="checkbox" checked={f.cropTypes.includes(x)} onChange={() => pick("cropTypes", x)} />{x}</label>)}</div></div><div className="form-field full"><label>Tài nguyên và thiết bị nông nghiệp</label><div className="check-grid">{RESOURCES.map((x) => <label key={x} className="check-item"><input type="checkbox" checked={f.resourceTypes.includes(x)} onChange={() => pick("resourceTypes", x)} />{x}</label>)}</div></div><div className="form-field"><label>Khác (mô tả)</label><input value={f.otherActivity} onChange={(e) => setF({ ...f, otherActivity: e.target.value })} /></div><div className="form-field full"><label>Yếu tố đặc thù của trang trại</label><textarea rows={3} value={f.specialFactors} onChange={(e) => setF({ ...f, specialFactors: e.target.value })} /></div></>}
      {step === 5 && <><div className="form-field"><label>Đơn vị tải vật nuôi</label><input value="DSE" readOnly /></div><div className="form-field"><label>Lượng mưa năm (mm)</label><input value={f.annualRainfall} onChange={(e) => setF({ ...f, annualRainfall: e.target.value })} /></div><div className="form-field"><label>Đơn vị diện tích đất</label><input value="Hecta" readOnly /></div><div className="form-field"><label>Sức tải</label><input value={f.carryingCapacity} onChange={(e) => setF({ ...f, carryingCapacity: e.target.value })} /></div><div className="form-field"><label>Đơn vị sức tải</label><input value="SDH/100mm" readOnly /></div><div className="form-field"><label>Đơn vị chiều dài</label><input value="Mét, kilômét" readOnly /></div><div className="form-field"><label>Đơn vị khối lượng</label><input value="Kg, tấn" readOnly /></div><div className="form-field"><label>Mốc bắt đầu mùa xuân</label><input value={f.springStart} onChange={(e) => setF({ ...f, springStart: e.target.value })} /></div><div className="form-field"><label>Đơn vị nhiệt độ</label><input value="Độ C (°C)" readOnly /></div><div className="form-field"><label>Đơn vị thể tích</label><input value="Lít, megalít" readOnly /></div></>}
      {step === 6 && <><div className="form-field full"><label>Chọn ít nhất một nguồn</label><div className="check-grid">{HEARD.map((x) => <label key={x} className="check-item"><input type="checkbox" checked={f.heardFrom.includes(x)} onChange={() => pick("heardFrom", x)} />{x}</label>)}</div></div>{f.heardFrom.includes("Khác") && <div className="form-field full"><label>Nguồn khác (ghi rõ)</label><input value={f.heardOther} onChange={(e) => setF({ ...f, heardOther: e.target.value })} /></div>}</>}
    </div><div className="wizard-actions"><button type="button" className="secondary-btn" disabled={step === 1 || loading || emailChecking} onClick={() => setStep((s) => (s > 1 ? ((s - 1) as StepKey) : s))}>Quay lại</button><button type="button" className="submit-btn" disabled={!validStep() || loading || emailChecking} onClick={onNext}>{loading ? "Đang lưu..." : emailChecking ? "Đang kiểm tra email..." : step === 6 ? "Hoàn tất" : "Tiếp tục"}</button></div>{error && <p className="form-error">{error}</p>}<p style={{ marginTop: 12, fontSize: 14, color: "#475569" }}>Đã có tài khoản? <a href="/login" style={{ color: "#047857", fontWeight: 600 }}>Đăng nhập</a>.</p></div></section></main>;
}
