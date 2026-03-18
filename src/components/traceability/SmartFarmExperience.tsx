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

type LocationMode = "search" | "link" | "manual";

type FormState = {
  fullName: string;
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
  otherFarmType: string;
  otherResource: string;
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
  otherFarmType: "",
  otherResource: "",
  annualRainfall: "1000",
  animalLoadUnit: "DSE",
  landArea: "Hectare",
  carryingCapacity: "1",
  carryingUnit: "SDH/100mm",
  unitLength: "Metric (metres, kilometres)",
  unitMass: "Metric (kg, tonnes)",
  springStart: "1st September",
  unitTemperature: "Celcius (°C)",
  unitVolume: "Metric (litres, megalitres)",
  hearFrom: [],
  hearFromEventDetails: [],
  hearFromNewsDetails: [],
  hearFromOtherText: "",
  verifiedLocation: null,
};

const stepTitles = [
  "Farmdeck Onboarding",
  "Farm Name",
  "Locate Your Farm",
  "Farm Type & Size",
  "Units & Settings",
  "How did you hear about Farmdeck?",
  "Congratulations! 🎉",
];

const sourceOptions = [
  "Event",
  "Newspaper",
  "Online blog or publication",
  "Peer recommendation",
  "Radio",
  "Search engine (Google, Yahoo, etc.)",
  "Social Media",
  "Television",
  "Billboard",
  "Other (please specify)",
];

const eventOptions = [
  "AgQuip",
  "AgSmart Expo",
  "AgTech Field Day",
  "Beef Week",
  "Elders FarmFest",
  "IoT Impact Conference and Expo",
  "Sheepvention",
  "Tamworth Career Expo",
  "Tocal Field Days",
  "Other",
];

const newspaperOptions = [
  "The Farmer",
  "The Land",
  "Ad Journal",
  "Queensland Country Life",
  "Stock & Land",
  "Stock Journal",
  "Farm Weekly",
  "Other",
];

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

export default function SmartFarmExperience() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [step, setStep] = useState(0);
  const [locationMode, setLocationMode] = useState<LocationMode>("search");
  const [form, setForm] = useState<FormState>(initialForm);

  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(form.farmName.trim());
    if (step === 2) return Boolean(form.verifiedLocation);
    if (step === 3) return form.farmTypes.length > 0;
    if (step === 5) return form.hearFrom.length > 0;
    return true;
  }, [form, step]);

  const mapQuery = form.lat && form.lng ? `${form.lat},${form.lng}` : form.address || "Vietnam";
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`;

  const saveForm = (nextForm: FormState) => {
    setForm(nextForm);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(nextForm));
  };

  const validateLocation = () => {
    const nextForm = { ...form };

    if (locationMode === "link") {
      const coords = extractCoordinatesFromGoogleMapsLink(form.mapLink);
      if (coords) {
        nextForm.lat = coords.lat;
        nextForm.lng = coords.lng;
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

  if (completed) {
    return (
      <SmartFarmDashboard
        profile={{
          fullName: form.fullName || "Nguyễn Văn A",
          farmName: form.farmName || "Ket Farm",
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
        <p>Theo dõi lô nông sản, giám sát IoT, và truy xuất nguồn gốc minh bạch từ nông trại đến người dùng.</p>
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
                    Welcome to <b>Farmdeck</b> - your all-in-one platform for smarter, more efficient farm
                    management. Whether you are tracking livestock, monitoring paddocks, managing water resources,
                    or handling daily operations, Farmdeck helps you stay in control.
                  </p>
                  <p>
                    To make your experience as seamless as possible, let's start by learning a little about your
                    farm, operations, and business goals. This quick setup takes less than a minute.
                  </p>
                  <p>When you are ready, click Continue.</p>
                </div>
              )}

              {step === 1 && (
                <div className={styles.stepBody}>
                  <p>Let us begin with your farm name.</p>
                  <input
                    placeholder="Farm name"
                    value={form.farmName}
                    onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                  />
                  <p>When you are done, click Continue.</p>
                </div>
              )}

              {step === 2 && (
                <div className={styles.stepBody}>
                  <p>
                    Help us tailor Farmdeck to your needs by letting us know where your farm is located. A full
                    address is best as it centres your homestead on the map.
                  </p>
                  <p className={styles.tip}>💡 TIP: Chọn 1 trong 3 cách: nhập địa chỉ để xem live map, dán link Google Maps, hoặc nhập tọa độ.</p>
                  <p>How would you like to share your location? (Select one option)</p>

                  <div className={styles.radioGroup}>
                    <label>
                      <input type="radio" checked={locationMode === "search"} onChange={() => setLocationMode("search")} />
                      Nhập địa chỉ / vị trí và xem live preview
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
                      <textarea
                        placeholder="Nhập địa chỉ, tên khu vực hoặc Plus Code"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value, verifiedLocation: null })}
                      />
                      <iframe title="Google map live preview" className={styles.googleMap} src={mapEmbedUrl} loading="lazy" />
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
                            lat: coords?.lat ?? form.lat,
                            lng: coords?.lng ?? form.lng,
                            verifiedLocation: null,
                          });
                        }}
                      />
                      <textarea
                        placeholder="Mô tả vị trí / địa chỉ hiển thị trên bản đồ"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value, verifiedLocation: null })}
                      />
                      <iframe title="Google map live preview" className={styles.googleMap} src={mapEmbedUrl} loading="lazy" />
                    </>
                  )}

                  {locationMode === "manual" && (
                    <div className={styles.coordRow}>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Latitude"
                        value={form.lat}
                        onChange={(e) => setForm({ ...form, lat: e.target.value, verifiedLocation: null })}
                      />
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Longitude"
                        value={form.lng}
                        onChange={(e) => setForm({ ...form, lng: e.target.value, verifiedLocation: null })}
                      />
                      <button className={styles.backBtn} type="button" onClick={validateLocation}>✥ Validate</button>
                    </div>
                  )}

                  {locationMode === "manual" && <iframe title="Google map live preview" className={styles.googleMap} src={mapEmbedUrl} loading="lazy" />}
                  {locationMode !== "manual" && (
                    <button className={styles.backBtn} type="button" onClick={validateLocation}>
                      ✥ Validate
                    </button>
                  )}
                  {form.verifiedLocation && <p className={styles.validText}>✓ Location verified</p>}
                  <p>When you are done, click Continue.</p>
                </div>
              )}

              {step === 3 && (
                <div className={styles.stepBody}>
                  <p>
                    We would love to learn more about your operation. What does your farm include? (Select all that
                    apply, at least one option is required)
                  </p>

                  <div className={styles.checkGroup}>
                    <label>
                      <input
                        type="checkbox"
                        checked={form.farmTypes.includes("Livestock")}
                        onChange={(e) => setForm({ ...form, farmTypes: toggleValue(form.farmTypes, "Livestock", e.target.checked) })}
                      />
                      🐂 Livestock - Manage cattle, sheep, goats, and more.
                    </label>
                    {form.farmTypes.includes("Livestock") && (
                      <div className={styles.subGroup}>
                        <p>Livestock Farming? Let us get the details. Select the animals you raise on your farm:</p>
                        {[
                          "Cattle",
                          "Sheep",
                          "Goats",
                          "Horses",
                          "Pigs",
                          "Poultry",
                          "Alpacas",
                          "Other",
                        ].map((item) => (
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
                        checked={form.farmTypes.includes("Crops")}
                        onChange={(e) => setForm({ ...form, farmTypes: toggleValue(form.farmTypes, "Crops", e.target.checked) })}
                      />
                      🌾 Crops - From pastures to orchards.
                    </label>
                    {form.farmTypes.includes("Crops") && (
                      <div className={styles.subGroup}>
                        <p>Crops Growing food, fodder, or commercial crops? Let us know what is in your paddocks:</p>
                        {["Pastures", "Fruit Production", "Nut Farming", "Grain Farming", "Vegetable Farming", "Other"].map((item) => (
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
                        checked={form.farmTypes.includes("Farming Resources & Equipment")}
                        onChange={(e) =>
                          setForm({ ...form, farmTypes: toggleValue(form.farmTypes, "Farming Resources & Equipment", e.target.checked) })
                        }
                      />
                      🚜 Farming Resources & Equipment - Track water, machinery, farm tools.
                    </label>
                    {form.farmTypes.includes("Farming Resources & Equipment") && (
                      <div className={styles.subGroup}>
                        <p>Keeping your farm running smoothly takes the right resources. What do you use?</p>
                        {[
                          "Water Tanks",
                          "Troughs",
                          "Dams",
                          "Rain Gauges",
                          "Pumps",
                          "Tractor",
                          "Other Farming Equipment",
                        ].map((item) => (
                          <label key={item}>
                            <input
                              type="checkbox"
                              checked={form.resources.includes(item)}
                              onChange={(e) => setForm({ ...form, resources: toggleValue(form.resources, item, e.target.checked) })}
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                    )}

                    <label>
                      <input
                        type="checkbox"
                        checked={form.farmTypes.includes("Other")}
                        onChange={(e) => setForm({ ...form, farmTypes: toggleValue(form.farmTypes, "Other", e.target.checked) })}
                      />
                      ❔ Other (please specify).
                    </label>
                    {form.farmTypes.includes("Other") && (
                      <input
                        placeholder="Please specify"
                        value={form.otherFarmType}
                        onChange={(e) => setForm({ ...form, otherFarmType: e.target.value })}
                      />
                    )}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className={styles.stepBody}>
                  <p>
                    Every farm operates differently, so let's make sure Farmdeck presents information in the units
                    that best suits your operation.
                  </p>
                  <p className={styles.tip}>💡 TIP: If the defaults work for you, feel free to skip this step.</p>
                  <p>Select your preferred units:</p>

                  <div className={styles.unitsGrid}>
                    <label>Animal Load Units:</label>
                    <select value={form.animalLoadUnit} onChange={(e) => setForm({ ...form, animalLoadUnit: e.target.value })}><option>DSE</option></select>
                    <label>Annual Rainfall (mm):</label>
                    <input value={form.annualRainfall} onChange={(e) => setForm({ ...form, annualRainfall: e.target.value })} />
                    <label>Land Area Measurement:</label>
                    <select value={form.landArea} onChange={(e) => setForm({ ...form, landArea: e.target.value })}><option>Hectare</option></select>
                    <label>Carrying Capacity:</label>
                    <input value={form.carryingCapacity} onChange={(e) => setForm({ ...form, carryingCapacity: e.target.value })} />
                    <label>Carrying Capacity Units:</label>
                    <select value={form.carryingUnit} onChange={(e) => setForm({ ...form, carryingUnit: e.target.value })}><option>SDH/100mm</option></select>
                    <label>Length Units:</label>
                    <select value={form.unitLength} onChange={(e) => setForm({ ...form, unitLength: e.target.value })}><option>Metric (metres, kilometres)</option></select>
                    <label>Mass Units:</label>
                    <select value={form.unitMass} onChange={(e) => setForm({ ...form, unitMass: e.target.value })}><option>Metric (kg, tonnes)</option></select>
                    <label>Spring Start:</label>
                    <select value={form.springStart} onChange={(e) => setForm({ ...form, springStart: e.target.value })}><option>1st September</option></select>
                    <label>Temperature Units:</label>
                    <select value={form.unitTemperature} onChange={(e) => setForm({ ...form, unitTemperature: e.target.value })}><option>Celcius (°C)</option></select>
                    <label>Volume Units:</label>
                    <select value={form.unitVolume} onChange={(e) => setForm({ ...form, unitVolume: e.target.value })}><option>Metric (litres, megalitres)</option></select>
                  </div>
                  <p>When you are done, click Continue.</p>
                </div>
              )}

              {step === 5 && (
                <div className={styles.stepBody}>
                  <p>
                    We would love to know how you found out about Farmdeck! Understanding where our community comes
                    from helps us improve and reach more farmers like you.
                  </p>
                  <p>Did you hear about us at a field day, through a mate, or online? Select all that apply.</p>
                  <p>Select at least one option:</p>

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

                    {form.hearFrom.includes("Event") && (
                      <div className={styles.subGroup}>
                        <p>Which event did you hear about us at?</p>
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

                    {form.hearFrom.includes("Newspaper") && (
                      <div className={styles.subGroup}>
                        <p>Which publication did you see us in?</p>
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

                    {form.hearFrom.includes("Other (please specify)") && (
                      <>
                        <p>Please tell us how you heard about us:</p>
                        <input
                          placeholder="Please specify"
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
                  <p>You are all set up and ready to go.</p>
                  <p>Click Done to explore your dashboard and start using Farmdeck today!</p>
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
                  ↑ Back
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
                    ↓ Continue
                  </button>
                ) : (
                  <button className={styles.nextBtn} onClick={() => setCompleted(true)}>
                    ▣ Done
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
